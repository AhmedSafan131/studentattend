import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import AppHelmet from '../../../components/AppHelmet';
import { ConfirmationDialog, CustomBottom, CustomDropdown, CustomInput, Loading, Pagination } from '../../../components';
import { BookOpen, CalendarDays, Check, Download, Search, Settings2, X } from '../../../assets/icons';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../hooks';
import SectionCard from '../AdminPanel/components/SectionCard';
import { FACULTY_CATALOG } from '../../../utils/constants';
import {
  createCatalogSubject,
  deleteCatalogSubject,
  fetchCatalogSubjects,
  importCatalogSubjects,
  updateCatalogSubject,
} from '../../../services/catalogApi';
import {
  ALL_FACULTIES_OPTION,
  downloadSubjectsTemplate,
  exportSubjectsWorkbook,
  parseSubjectsWorkbook,
} from './utils/importSubjectsWorkbook';

const EMPTY_MANUAL_FORM = {
  facultyId: '',
  subjectName: '',
  subjectCode: '',
  groupCount: '1',
  groupCounts: { Lecture: '1', Section: '0', Practical: '0' },
  types: ['Lecture'],
};

const ALL_TERMS_OPTION = 'all';

const SUBJECT_TYPES = ['Lecture', 'Section', 'Practical'];
const buildGroupLabels = (count) => Array.from(
  { length: Math.max(1, Math.min(26, Number(count) || 1)) },
  (_, index) => String.fromCharCode(65 + index),
);

const buildFacultyOptions = (lang) => ([
  { value: ALL_FACULTIES_OPTION, label: lang === 'ar' ? 'كل الكليات' : 'All faculties' },
  ...FACULTY_CATALOG.map((faculty) => ({
    value: faculty.id,
    label: lang === 'ar'
      ? faculty.name
      : ({
        engineering: 'Faculty of Engineering',
        'computers-ai': 'Faculty of Computers and Artificial Intelligence',
        nursing: 'Faculty of Nursing',
        medicine: 'Faculty of Human Medicine',
        pharmacy: 'Faculty of Pharmacy',
        humanities: 'Humanities',
        'health-sciences-technology': 'Health Sciences Technology',
        dentistry: 'Faculty of Dentistry',
        'veterinary-medicine': 'Faculty of Veterinary Medicine',
        'physical-therapy': 'Faculty of Physical Therapy',
      }[faculty.id] || faculty.name),
  })),
]);

const buildManualFacultyOptions = (lang) => FACULTY_CATALOG.map((faculty) => ({
  value: faculty.id,
  label: lang === 'ar'
    ? faculty.name
    : ({
      engineering: 'Faculty of Engineering',
      'computers-ai': 'Faculty of Computers and Artificial Intelligence',
      nursing: 'Faculty of Nursing',
      medicine: 'Faculty of Human Medicine',
      pharmacy: 'Faculty of Pharmacy',
      humanities: 'Humanities',
      'health-sciences-technology': 'Health Sciences Technology',
      dentistry: 'Faculty of Dentistry',
      'veterinary-medicine': 'Faculty of Veterinary Medicine',
      'physical-therapy': 'Faculty of Physical Therapy',
    }[faculty.id] || faculty.name),
}));

const sortSubjects = (subjects) => [...subjects].sort((left, right) => (
  `${left.facultyName}__${left.subjectCode}__${left.subjectName}`.localeCompare(
    `${right.facultyName}__${right.subjectCode}__${right.subjectName}`,
  )
));

const SubjectsCatalogPage = () => {
  const { lang, isRTL } = useLanguage();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const { selectedTermCode, activeTerm } = useSelector((state) => state.terms);

  const [selectedFacultyId, setSelectedFacultyId] = useState(ALL_FACULTIES_OPTION);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState('');
  const [pendingDeleteSubject, setPendingDeleteSubject] = useState(null);
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [manualForm, setManualForm] = useState({
    ...EMPTY_MANUAL_FORM,
    facultyId: '',
  });

  const copy = useMemo(() => ({
    title: lang === 'ar' ? 'رفع وإدارة كتالوج المواد' : 'Subjects Catalog Upload & Management',
    description: lang === 'ar'
      ? 'استعرض وادارة المواد الدراسية للترم المختار، واضف أو ارفع المواد من شيتات Excel/CSV لكلية واحدة أو لكل الكليات.'
      : 'View and manage subjects for the selected term. Import subjects from Excel or CSV for one faculty or all faculties.',
    eyebrow: lang === 'ar' ? 'الكتالوج والأترام' : 'Catalog & Terms',
    facultyLabel: lang === 'ar' ? 'نطاق الكلية' : 'Faculty Scope',
    facultyPlaceholder: lang === 'ar' ? 'اختر كلية واحدة أو كل الكليات' : 'Choose one faculty or all faculties',
    termLabel: lang === 'ar' ? 'الفصل الدراسي (الترم)' : 'Academic Term',
    termPlaceholder: lang === 'ar' ? 'اختر الفصل الدراسي' : 'Choose Academic Term',
    facultySearchPlaceholder: lang === 'ar' ? 'ابحث عن كلية...' : 'Search faculties...',
    facultyEmptyMessage: lang === 'ar' ? 'لا توجد نتائج.' : 'No matching faculties.',
    facultyHint: lang === 'ar'
      ? 'استخدم "كل الكليات" إذا كان الملف يحتوي على عمود faculty صحيح. واستخدم كلية محددة إذا كان الملف يخص كلية واحدة فقط.'
      : 'Use "All faculties" when the uploaded sheet includes a valid faculty column. Use a specific faculty when the file belongs to one faculty only.',
    chooseFile: lang === 'ar' ? 'اختر شيت المواد' : 'Choose Subject Sheet',
    parsing: lang === 'ar' ? 'جارٍ قراءة الملف...' : 'Parsing file...',
    import: lang === 'ar' ? 'رفع المواد' : 'Import Subjects',
    importing: lang === 'ar' ? 'جارٍ الرفع...' : 'Importing...',
    downloadTemplate: lang === 'ar' ? 'تحميل نموذج' : 'Download Template',
    exportSubjects: lang === 'ar' ? 'تصدير المواد Excel' : 'Export Subjects to Excel',
    exportError: lang === 'ar' ? 'تعذر تصدير المواد.' : 'Unable to export catalog subjects.',
    previewTitle: lang === 'ar' ? 'معاينة الرفع' : 'Upload Preview',
    parsedCount: lang === 'ar' ? 'مادة مقروءة' : 'parsed',
    issuesCount: lang === 'ar' ? 'ملاحظات' : 'issues',
    importedSummary: lang === 'ar' ? 'تم الرفع بنجاح' : 'Imported successfully',
    created: lang === 'ar' ? 'تمت إضافته' : 'created',
    updated: lang === 'ar' ? 'تم تحديثه' : 'updated',
    unchanged: lang === 'ar' ? 'لم يتغير' : 'unchanged',
    manualEyebrow: lang === 'ar' ? 'إدخال يدوي' : 'Manual Entry',
    manualTitle: lang === 'ar' ? 'إضافة أو تعديل مادة' : 'Add or Edit Subject',
    manualDescription: lang === 'ar'
      ? 'أضف مادة جديدة يدويًا للترم المحدد أو عدل مادة موجودة مباشرة.'
      : 'Add a new subject manually for the selected term or edit an existing one.',
    manualFacultyLabel: lang === 'ar' ? 'الكلية' : 'Faculty',
    manualFacultyPlaceholder: lang === 'ar' ? 'اختر الكلية' : 'Choose faculty',
    manualSubjectNameLabel: lang === 'ar' ? 'اسم المادة' : 'Subject Name',
    manualSubjectNamePlaceholder: lang === 'ar' ? 'اكتب اسم المادة (مثال: مهارات التواصل)' : 'Enter subject name',
    manualSubjectCodeLabel: lang === 'ar' ? 'كود المادة' : 'Subject Code',
    manualSubjectCodePlaceholder: lang === 'ar' ? 'اكتب كود المادة (مثال: CS101)' : 'Enter subject code',
    groupCountLabel: lang === 'ar' ? 'عدد الجروبات' : 'Number of Groups',
    groupCountPlaceholder: lang === 'ar' ? 'من 1 إلى 26' : 'From 1 to 26',
    typesLabel: lang === 'ar' ? 'أنواع المادة' : 'Subject Types',
    groupsLabel: lang === 'ar' ? 'الجروبات' : 'Groups',
    primarySourceHint: lang === 'ar'
      ? 'المصدر الأساسي للمواد والجروبات والأنواع هو شيت الطلاب. استخدم هذه الصفحة للإضافة البديلة فقط.'
      : 'Student sheets are the primary source for subjects, groups, and types. Use this page only as an optional fallback.',
    addSubject: lang === 'ar' ? 'إضافة مادة جديدة' : 'Add Subject',
    saveSubject: lang === 'ar' ? 'حفظ التعديل' : 'Save Changes',
    savingSubject: lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...',
    cancelEdit: lang === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit',
    manualRequired: lang === 'ar' ? 'أكمل الكلية والمادة وعدد الجروبات واختر نوعًا واحدًا على الأقل.' : 'Complete the faculty, subject, group count, and select at least one type.',
    manualCreated: lang === 'ar' ? 'تمت إضافة المادة بنجاح.' : 'Subject created successfully.',
    manualUpdated: lang === 'ar' ? 'تم تحديث المادة بنجاح.' : 'Subject updated successfully.',
    manualDeleted: lang === 'ar' ? 'تم حذف المادة بنجاح.' : 'Subject deleted successfully.',
    manualSaveError: lang === 'ar' ? 'تعذر حفظ المادة.' : 'Unable to save subject.',
    manualDeleteError: lang === 'ar' ? 'تعذر حذف المادة.' : 'Unable to delete subject.',
    deleteConfirmTitle: lang === 'ar' ? 'حذف المادة؟' : 'Delete subject?',
    deleteConfirm: lang === 'ar' ? 'هل تريد حذف هذه المادة؟' : 'Do you want to delete this subject?',
    deleteConfirmSuffix: lang === 'ar' ? 'سيتم حذفها من كتالوج المواد المحفوظ.' : 'It will be removed from the stored subjects catalog.',
    dialogCancel: lang === 'ar' ? 'إلغاء' : 'Cancel',
    editButton: lang === 'ar' ? 'تعديل' : 'Edit',
    deleteButton: lang === 'ar' ? 'حذف' : 'Delete',
    editingBadge: lang === 'ar' ? 'وضع التعديل' : 'Editing mode',
    storedEyebrow: lang === 'ar' ? 'المحفوظ' : 'Stored',
    storedTitle: lang === 'ar' ? 'المواد المسجلة بكتالوج الترم' : 'Registered Catalog Subjects',
    storedDescription: lang === 'ar'
      ? 'المواد الدراسية المسجلة حالياً حسب الترم والكلية المحددة.'
      : 'Currently stored subjects filtered by selected faculty and term scope.',
    totalSubjectsLabel: lang === 'ar' ? 'إجمالي المواد' : 'Total Subjects',
    loadingSubjects: lang === 'ar' ? 'جارٍ تحميل المواد من السيرفر...' : 'Loading subjects from server...',
    noSubjects: lang === 'ar' ? 'لا توجد مواد محفوظة لهذا الترم والنطاق المحدد بعد.' : 'No stored subjects yet for this scope.',
    parseFirst: lang === 'ar' ? 'اختر ملفًا صحيحًا واعرض المعاينة أولًا.' : 'Choose and parse a valid subject sheet first.',
    fixImportIssues: lang === 'ar' ? 'راجع وصحح كل الصفوف المعروضة، ثم ارفع الملف المصحح. لم يتم حفظ أي مادة.' : 'Review and fix every listed row, then upload the corrected file. No subjects were saved.',
    parseError: lang === 'ar' ? 'تعذر قراءة الملف المحدد.' : 'Unable to parse the selected file.',
    importError: lang === 'ar' ? 'تعذر رفع كتالوج المواد.' : 'Unable to import subject catalog.',
    loadError: lang === 'ar' ? 'تعذر تحميل المواد.' : 'Unable to load catalog subjects.',
  }), [lang]);

  const facultyOptions = useMemo(() => buildFacultyOptions(lang), [lang]);
  const manualFacultyOptions = useMemo(() => buildManualFacultyOptions(lang), [lang]);

  // Fetch catalog subjects whenever faculty or global term changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');

    fetchCatalogSubjects({
      facultyId: selectedFacultyId === ALL_FACULTIES_OPTION ? '' : selectedFacultyId,
      termCode: selectedTermCode || '',
    })
      .then((subjects) => {
        if (isMounted) {
          setCatalogSubjects(subjects);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setCatalogSubjects([]);
          setError(requestError.message || copy.loadError);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, selectedFacultyId, selectedTermCode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFacultyId, pageSize]);

  useEffect(() => {
    if (selectedFacultyId !== ALL_FACULTIES_OPTION && !editingSubjectId) {
      setManualForm((current) => ({
        ...current,
        facultyId: selectedFacultyId,
      }));
    }
  }, [editingSubjectId, selectedFacultyId]);

  const resetManualForm = () => {
    setEditingSubjectId('');
    setManualForm({
      ...EMPTY_MANUAL_FORM,
      facultyId: selectedFacultyId === ALL_FACULTIES_OPTION ? '' : selectedFacultyId,
    });
  };

  const filteredCatalogSubjects = useMemo(() => {
    if (!searchQuery.trim()) return catalogSubjects;
    const query = searchQuery.toLowerCase();
    return catalogSubjects.filter(
      (s) =>
        (s.subjectName && s.subjectName.toLowerCase().includes(query)) ||
        (s.subjectCode && s.subjectCode.toLowerCase().includes(query)) ||
        (s.facultyName && s.facultyName.toLowerCase().includes(query)) ||
        (s.termCode && s.termCode.toLowerCase().includes(query))
    );
  }, [catalogSubjects, searchQuery]);

  const handleExportSubjects = () => {
    setError('');

    try {
      exportSubjectsWorkbook(filteredCatalogSubjects, {
        facultyId: selectedFacultyId === ALL_FACULTIES_OPTION ? 'all-faculties' : selectedFacultyId,
        termCode: selectedTermCode || activeTerm?.code || '',
      });
    } catch (exportError) {
      setError(exportError.message || copy.exportError);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredCatalogSubjects.length / pageSize));
  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCatalogSubjects.slice(startIndex, startIndex + pageSize);
  }, [filteredCatalogSubjects, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleFilePicked = async (file) => {
    if (!file) return;

    setIsParsing(true);
    setError('');
    setNotice('');
    setSummary(null);

    try {
      const parsed = await parseSubjectsWorkbook(file, { selectedFacultyId });
      setPreview(parsed);
    } catch (parseError) {
      setPreview(null);
      setError(parseError.message || copy.parseError);
      showToast({ tone: 'error', title: copy.parseError, message: parseError.message || copy.parseError });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (preview?.invalidRows?.length) {
      setError(copy.fixImportIssues);
      showToast({ tone: 'error', title: copy.importError, message: copy.fixImportIssues });
      return;
    }

    if (!preview?.subjects?.length) {
      setError(copy.parseFirst);
      showToast({ tone: 'error', title: copy.importError, message: copy.parseFirst });
      return;
    }

    const activeTermCode = selectedTermCode || activeTerm?.code || '';

    setIsImporting(true);
    setError('');
    setNotice('');
    setSummary(null);

    try {
      const response = await importCatalogSubjects({
        facultyId: selectedFacultyId === ALL_FACULTIES_OPTION ? '' : selectedFacultyId,
        termCode: activeTermCode,
        subjects: preview.subjects.map((subject) => ({
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          originalSubjectCode: subject.originalSubjectCode || '',
          faculty: subject.faculty || subject.facultyId,
          groupCount: subject.groupCount,
          groupCounts: subject.groupCounts,
          types: subject.types,
          termCode: activeTermCode,
        })),
      });

      setSummary(response.summary);
      const { created = 0, updated = 0, skipped = 0 } = response.summary;
      showToast({
        tone: 'success',
        title: copy.importedSummary,
        message: lang === 'ar'
          ? `تم رفع جميع المواد بنجاح: ${created} تمت إضافتها، ${updated} تم تحديثها، ${skipped} موجودة بالفعل دون تغيير.`
          : `All subjects uploaded successfully: ${created} created, ${updated} updated, ${skipped} already unchanged.`,
      });
      setPreview(null);
      setCatalogSubjects((current) => {
        const merged = new Map(current.map((subject) => [subject.id, subject]));
        response.subjects.forEach((subject) => {
          merged.set(subject.id, subject);
        });
        return sortSubjects([...merged.values()]);
      });
    } catch (requestError) {
      setError(requestError.message || copy.importError);
      showToast({ tone: 'error', title: copy.importError, message: requestError.message || copy.importError });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualChange = (field) => (event) => {
    const nextValue = field === 'subjectCode'
      ? String(event.target.value || '').toUpperCase()
      : event.target.value;

    setManualForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleTypeToggle = (type) => {
    setManualForm((current) => ({
      ...current,
      types: current.types.includes(type)
        ? current.types.filter((item) => item !== type)
        : [...current.types, type],
      groupCounts: {
        ...current.groupCounts,
        [type]: current.types.includes(type) ? '0' : (Number(current.groupCounts?.[type]) > 0 ? current.groupCounts[type] : '1'),
      },
    }));
  };

  const handleTypeGroupCountChange = (type) => (event) => {
    const value = event.target.value;
    setManualForm((current) => ({
      ...current,
      groupCounts: { ...current.groupCounts, [type]: value },
    }));
  };

  const handleManualSubmit = async () => {
    const activeTermCode = selectedTermCode || activeTerm?.code || '';

    const groupCounts = Object.fromEntries(SUBJECT_TYPES.map((type) => [
      type,
      manualForm.types.includes(type) ? Number(manualForm.groupCounts?.[type] || 0) : 0,
    ]));
    const payload = {
      facultyId: manualForm.facultyId || (selectedFacultyId === ALL_FACULTIES_OPTION ? '' : selectedFacultyId),
      subjectName: manualForm.subjectName.trim(),
      subjectCode: manualForm.subjectCode.trim().toUpperCase(),
      groupCount: Math.max(1, ...Object.values(groupCounts)),
      groupCounts,
      types: manualForm.types,
      termCode: activeTermCode,
    };

    if (
      !payload.facultyId
      || !payload.subjectName
      || !payload.subjectCode
      || !Number.isInteger(payload.groupCount)
      || payload.groupCount < 1
      || payload.groupCount > 26
      || !payload.types.length
      || payload.types.some((type) => !Number.isInteger(payload.groupCounts[type]) || payload.groupCounts[type] < 1 || payload.groupCounts[type] > 26)
    ) {
      setError(copy.manualRequired);
      setNotice('');
      return;
    }

    setIsSavingManual(true);
    setError('');
    setNotice('');
    setSummary(null);

    try {
      const savedSubject = editingSubjectId
        ? await updateCatalogSubject(editingSubjectId, payload)
        : await createCatalogSubject(payload);

      setCatalogSubjects((current) => {
        const withoutOld = current.filter((subject) => subject.id !== savedSubject.id);
        const visibleInScope = selectedFacultyId === ALL_FACULTIES_OPTION || savedSubject.facultyId === selectedFacultyId;
        return visibleInScope
          ? sortSubjects([...withoutOld, savedSubject])
          : sortSubjects(withoutOld);
      });
      setNotice(editingSubjectId ? copy.manualUpdated : copy.manualCreated);
      resetManualForm();
    } catch (requestError) {
      setError(requestError.message || copy.manualSaveError);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleEditStart = (subject) => {
    setEditingSubjectId(subject.id);
    setManualForm({
      facultyId: subject.facultyId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      groupCount: String(subject.groupCount || 1),
      groupCounts: Object.fromEntries(SUBJECT_TYPES.map((type) => [type, String(subject.groupCounts?.[type] || 0)])),
      types: subject.types?.length ? subject.types : ['Lecture'],
    });
    setError('');
    setNotice('');
    setSummary(null);
  };

  const handleDeleteRequest = (subject) => {
    setPendingDeleteSubject(subject);
    setError('');
    setNotice('');
    setSummary(null);
  };

  const handleDeleteCancel = () => {
    if (deletingSubjectId) {
      return;
    }

    setPendingDeleteSubject(null);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteSubject) {
      return;
    }

    setDeletingSubjectId(pendingDeleteSubject.id);
    setError('');
    setNotice('');
    setSummary(null);

    try {
      await deleteCatalogSubject(pendingDeleteSubject.id);
      setCatalogSubjects((current) => current.filter((item) => item.id !== pendingDeleteSubject.id));

      if (editingSubjectId === pendingDeleteSubject.id) {
        resetManualForm();
      }

      setNotice(copy.manualDeleted);
      setPendingDeleteSubject(null);
    } catch (requestError) {
      setError(requestError.message || copy.manualDeleteError);
    } finally {
      setDeletingSubjectId('');
    }
  };

  return (
    <div className="dashboard-responsive-page subjects-catalog-page" style={{ padding: 24, boxSizing: 'border-box', display: 'grid', gap: 22 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <AppHelmet
        titleEn="Subjects Catalog"
        titleAr="كتالوج المواد"
        descriptionEn="Upload and maintain subject catalogs for one faculty or all faculties."
        descriptionAr="ارفع وحدّث كتالوج المواد لكلية واحدة أو لكل الكليات."
      />

      <SectionCard
        icon={<Settings2 size={22} />}
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFilePicked(file);
              event.target.value = '';
            }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', maxWidth: 420 }}>
              <CustomDropdown
                label={copy.facultyLabel}
                name="subjects-catalog-faculty"
                value={selectedFacultyId}
                options={facultyOptions}
                onChange={(event) => {
                  setSelectedFacultyId(event.target.value);
                  setPreview(null);
                  setSummary(null);
                  setError('');
                  setNotice('');
                }}
                placeholder={copy.facultyPlaceholder}
                searchable
                searchPlaceholder={copy.facultySearchPlaceholder}
                emptyMessage={copy.facultyEmptyMessage}
                icon={<BookOpen size={17} />}
              />
            </div>

            {selectedTermCode ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(96,165,250,0.25)',
                  background: 'rgba(96,165,250,0.10)',
                  marginBottom: 2,
                }}
              >
                <CalendarDays size={15} style={{ color: '#93c5fd', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#93c5fd' }}>
                  {selectedTermCode}
                </span>
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {copy.facultyHint}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <CustomBottom
                text={copy.chooseFile}
                onClick={() => fileInputRef.current?.click()}
                loading={isParsing}
                loadingText={copy.parsing}
                rigthIcon={<BookOpen size={16} />}
                background="linear-gradient(135deg, #0f766e, #0891b2)"
                boxShadow="0 16px 34px rgba(8,145,178,0.24)"
              />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <CustomBottom
                text={copy.import}
                onClick={handleImport}
                loading={isImporting}
                loadingText={copy.importing}
                disabled={!preview?.subjects?.length || Boolean(preview?.invalidRows?.length)}
                rigthIcon={<Check size={16} />}
              />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <CustomBottom
                text={copy.downloadTemplate}
                onClick={() => downloadSubjectsTemplate({ selectedFacultyId })}
                rigthIcon={<Download size={16} />}
                background="var(--bg-dark)"
                textColor="var(--text-primary)"
                border="1px solid var(--border)"
                boxShadow="none"
              />
            </div>
          </div>

          {error ? (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>{error}</div>
          ) : null}

          {notice ? (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#34d399' }}>{notice}</div>
          ) : null}

          {summary ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {copy.importedSummary}: {summary.created} {copy.created}, {summary.updated} {copy.updated}, {summary.skipped} {copy.unchanged}.
            </div>
          ) : null}

          {preview ? (
            <div
              style={{
                display: 'grid',
                gap: 16,
                borderRadius: 20,
                border: '1px solid rgba(96,165,250,0.18)',
                background: 'rgba(96,165,250,0.06)',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{copy.previewTitle}</div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {preview.fileName} - {preview.sheetName}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {preview.subjects.length} {copy.parsedCount}
                  </span>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 12.5, fontWeight: 700, color: preview.invalidRows.length ? '#fbbf24' : '#34d399' }}>
                    {preview.invalidRows.length} {copy.issuesCount}
                  </span>
                </div>
              </div>

              {preview.invalidRows.length ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{copy.fixImportIssues}</div>
                  {preview.invalidRows.map((issue) => (
                    <div key={issue} style={{ fontSize: 12.5, color: '#fbbf24' }}>{issue}</div>
                  ))}
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 10 }}>
                {preview.subjects.slice(0, 8).map((subject) => (
                  <div
                    key={`${subject.facultyId}-${subject.subjectCode}`}
                    style={{
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '14px 16px',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{subject.subjectName}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{subject.subjectCode} - {subject.facultyId}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--accent)' }}>
                      {subject.types.map((type) => `${type}: ${buildGroupLabels(subject.groupCounts?.[type] || subject.groupCount).join(', ')}`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="subjects-catalog-main-grid" style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', alignItems: 'start' }}>
        <SectionCard
          icon={<BookOpen size={22} />}
          eyebrow={copy.manualEyebrow}
          title={copy.manualTitle}
          description={copy.manualDescription}
        >
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
              {copy.primarySourceHint}
            </div>
            {editingSubjectId ? (
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fbbf24' }}>{copy.editingBadge}</div>
            ) : null}

            <div className="subjects-catalog-form-grid" style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <CustomDropdown
                label={copy.manualFacultyLabel}
                name="manual-subject-faculty"
                value={manualForm.facultyId}
                options={manualFacultyOptions}
                onChange={handleManualChange('facultyId')}
                placeholder={copy.manualFacultyPlaceholder}
                searchable
                searchPlaceholder={copy.facultySearchPlaceholder}
                emptyMessage={copy.facultyEmptyMessage}
                icon={<BookOpen size={17} />}
              />
              <CustomInput
                label={copy.manualSubjectNameLabel}
                name="manual-subject-name"
                value={manualForm.subjectName}
                onChange={handleManualChange('subjectName')}
                placeholder={copy.manualSubjectNamePlaceholder}
              />
              <CustomInput
                label={copy.manualSubjectCodeLabel}
                name="manual-subject-code"
                value={manualForm.subjectCode}
                onChange={handleManualChange('subjectCode')}
                placeholder={copy.manualSubjectCodePlaceholder}
              />
            </div>

            <div>
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)' }}>
                {copy.typesLabel}
              </div>
              <div className="subjects-catalog-types-grid" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                {SUBJECT_TYPES.map((type) => {
                  const selected = manualForm.types.includes(type);
                  return (
                    <div
                      key={type}
                      style={{
                        borderRadius: 12,
                        border: selected ? '1px solid rgba(52,211,153,0.55)' : '1px solid var(--border)',
                        background: selected ? 'rgba(52,211,153,0.14)' : 'var(--bg-dark)',
                        padding: 12,
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <button type="button" onClick={() => handleTypeToggle(type)} style={{ border: 0, background: 'transparent', color: selected ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', textAlign: 'start', padding: 0 }}>
                        {selected ? '✓ ' : ''}{type}
                      </button>
                      {selected ? (
                        <CustomInput
                          label={`${copy.groupCountLabel} - ${type}`}
                          name={`manual-${type.toLowerCase()}-group-count`}
                          type="number"
                          min="1"
                          max="26"
                          value={manualForm.groupCounts?.[type] || '1'}
                          onChange={handleTypeGroupCountChange(type)}
                          placeholder={copy.groupCountPlaceholder}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 12.5 }}>
                {manualForm.types.map((type) => `${type}: ${buildGroupLabels(manualForm.groupCounts?.[type]).join(', ')}`).join(' · ')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px' }}>
                <CustomBottom
                  text={editingSubjectId ? copy.saveSubject : copy.addSubject}
                  onClick={handleManualSubmit}
                  loading={isSavingManual}
                  loadingText={copy.savingSubject}
                  rigthIcon={<Check size={16} />}
                />
              </div>
              {editingSubjectId ? (
                <div style={{ flex: '1 1 220px' }}>
                  <CustomBottom
                    text={copy.cancelEdit}
                    onClick={resetManualForm}
                    rigthIcon={<X size={16} />}
                    background="var(--bg-dark)"
                    textColor="var(--text-primary)"
                    border="1px solid var(--border)"
                    boxShadow="none"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Download size={22} />}
          eyebrow={copy.storedEyebrow}
          title={copy.storedTitle}
          description={copy.storedDescription}
        >
          <div className="subjects-catalog-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderRadius: 16,
                border: '1px solid rgba(52,211,153,0.18)',
                background: 'rgba(52,211,153,0.08)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {copy.totalSubjectsLabel}
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                {filteredCatalogSubjects.length}
              </span>
            </div>

            <div className="subjects-catalog-toolbar-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flex: '1 1 520px', flexWrap: 'wrap' }}>
              <div style={{ width: '100%', maxWidth: 250 }}>
                <CustomBottom
                  text={copy.exportSubjects}
                  onClick={handleExportSubjects}
                  disabled={isLoading || filteredCatalogSubjects.length === 0}
                  rigthIcon={<Download size={16} />}
                  background="var(--bg-dark)"
                  textColor="var(--text-primary)"
                  border="1px solid var(--border)"
                  boxShadow="none"
                />
              </div>
              <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                <CustomInput
                  type="text"
                  placeholder={lang === 'ar' ? 'ابحث باسم أو كود المادة...' : 'Search by name or code...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              style={{
                borderRadius: 20,
                border: '1px dashed var(--border)',
                padding: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loading />
            </div>
          ) : filteredCatalogSubjects.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {paginatedSubjects.map((subject) => (
                <div
                  key={`${subject.facultyId}-${subject.subjectCode}-${subject.termCode || ''}`}
                  className="subjects-catalog-record"
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{subject.subjectName}</div>
                    <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>{subject.subjectCode}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>
                      {(subject.types || []).map((type) => `${type}: ${(subject.groupsByType?.[type] || buildGroupLabels(subject.groupCounts?.[type] || subject.groupCount)).join(', ')}`).join(' · ')}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#a78bfa' }}>
                      {copy.typesLabel}: {(subject.types || []).join(', ')}
                    </div>
                  </div>

                  <div className="subjects-catalog-record-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {subject.termCode ? (
                      <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.12)', color: '#c084fc', fontSize: 12, fontWeight: 700, border: '1px solid rgba(168,85,247,0.25)' }}>
                        {subject.termCode}
                      </span>
                    ) : null}
                    <span style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                      {subject.facultyName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditStart(subject)}
                      style={{
                        border: '1px solid rgba(96,165,250,0.24)',
                        background: 'rgba(96,165,250,0.10)',
                        color: '#93c5fd',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {copy.editButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(subject)}
                      disabled={deletingSubjectId === subject.id}
                      style={{
                        border: '1px solid rgba(239,68,68,0.24)',
                        background: 'rgba(239,68,68,0.10)',
                        color: '#fca5a5',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: deletingSubjectId === subject.id ? 'not-allowed' : 'pointer',
                        opacity: deletingSubjectId === subject.id ? 0.6 : 1,
                      }}
                    >
                      {deletingSubjectId === subject.id ? copy.savingSubject : copy.deleteButton}
                    </button>
                  </div>
                </div>
              ))}

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 8, 10, 20]}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{copy.noSubjects}</div>
          )}
        </SectionCard>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteSubject)}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={copy.deleteConfirmTitle}
        message={pendingDeleteSubject ? `${pendingDeleteSubject.subjectName} (${pendingDeleteSubject.subjectCode}) - ${copy.deleteConfirmSuffix}` : copy.deleteConfirm}
        confirmText={copy.deleteButton}
        cancelText={copy.dialogCancel}
        tone="danger"
        loading={Boolean(deletingSubjectId)}
        loadingText={copy.savingSubject}
      />
    </div>
  );
};

export default SubjectsCatalogPage;
