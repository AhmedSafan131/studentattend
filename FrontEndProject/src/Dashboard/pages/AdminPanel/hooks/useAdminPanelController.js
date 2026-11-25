import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth, useToast } from '../../../../hooks';
import { useLanguage } from '../../../../i18n';
import {
  buildAssignmentFromInput,
  buildCourseUid,
  buildDoctorId,
  buildDoctorLoginEmail,
  countUniqueSubjects,
  createAvatarLabel,
  FACULTY_OPTIONS,
  getDoctorFacultyIds,
  getTeachingFacultyIds,
  isSameAssignment,
  getFacultyColleges,
  getEmptyAssignmentDraft,
  getEmptyDoctorForm,
} from '../utils/adminPanelUtils';
import { downloadAdminImportTemplate, parseAdminImportFile } from '../utils/importWorkbook';
import { fetchCatalogSubjects } from '../../../../services/catalogApi';
import { importDoctors } from '../../../../services/authApi';

export const useAdminPanelController = () => {
  const { doctors, usersStatus, addDoctor, updateDoctor, deleteDoctor, deleteCourse, refreshUsers } = useAuth();
  const selectedTermCode = useSelector((state) => state.terms.selectedTermCode);
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const { showToast } = useToast();
  const { t } = useLanguage();
  const importFacultyOptions = useMemo(
    () => FACULTY_OPTIONS.map((option) => ({
      ...option,
      label: t(option.labelKey),
    })),
    [t],
  );

  const [manualForm, setManualForm] = useState(getEmptyDoctorForm);
  const [manualDraft, setManualDraft] = useState(getEmptyAssignmentDraft);
  const [manualAssignments, setManualAssignments] = useState([]);
  const [manualError, setManualError] = useState('');
  const [editingDoctorId, setEditingDoctorId] = useState('');

  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [selectedImportFacultyId, setSelectedImportFacultyId] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importPreview, setImportPreview] = useState(null);

  const [pendingDeleteDoctor, setPendingDeleteDoctor] = useState(null);
  const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchCatalogSubjects({ termCode: selectedTermCode })
      .then((subjects) => { if (mounted) setCatalogSubjects(subjects); })
      .catch(() => { if (mounted) setCatalogSubjects([]); });
    return () => { mounted = false; };
  }, [selectedTermCode]);

  const totalAssignments = useMemo(
    () => doctors.reduce((sum, doctor) => sum + doctor.courses.length, 0),
    [doctors],
  );

  const uniqueSubjects = useMemo(() => countUniqueSubjects(doctors), [doctors]);
  const normalizeLookup = (value) => String(value || '').trim().toLowerCase();
  const buildImportedDoctorEmail = (item) => (
    item.email || (item.nationalId ? `staff.${item.nationalId}@import.local` : '')
  );
  const isEditingManualDoctor = Boolean(editingDoctorId);

  const resetManualDoctorEditor = () => {
    setEditingDoctorId('');
    setManualForm(getEmptyDoctorForm());
    setManualDraft(getEmptyAssignmentDraft());
    setManualAssignments([]);
    setManualError('');
  };

  const resolveUpdatedDoctorEmail = (doctor, nextNationalId) => {
    const nextGeneratedEmail = buildDoctorLoginEmail(nextNationalId);
    const currentGeneratedEmail = buildDoctorLoginEmail(doctor?.nationalId);
    const normalizedExistingEmail = normalizeLookup(doctor?.email);

    if (!normalizedExistingEmail) {
      return nextGeneratedEmail;
    }

    if (
      normalizedExistingEmail === normalizeLookup(currentGeneratedEmail)
      || normalizedExistingEmail.endsWith('@local')
    ) {
      return nextGeneratedEmail;
    }

    return doctor.email;
  };

  const handleManualFormChange = (event) => {
    const { name, value } = event.target;
    setManualForm((current) => ({ ...current, [name]: value }));
    setManualError('');
  };

  const handleManualFacultyToggle = (facultyId) => {
    setManualForm((current) => ({
      ...current,
      faculties: current.faculties.includes(facultyId)
        ? current.faculties.filter((value) => value !== facultyId)
        : [...current.faculties, facultyId],
    }));
    setManualError('');
  };

  const handleManualDraftChange = (event) => {
    const { name, value, dataset = {} } = event.target;
    setManualDraft((current) => ({
      ...current,
      [name]: value,
      ...(name === 'faculty' ? { college: '', courseCode: '', courseName: '', subjectKey: '' } : {}),
      ...(name === 'subjectKey'
        ? {
            courseCode: dataset.courseCode || '',
            courseName: dataset.courseName || '',
            faculty: dataset.faculty || current.faculty,
            college: dataset.college || '',
          }
        : {}),
    }));
    setManualError('');
  };

  const handleManualAssignmentAdd = () => {
    const result = buildAssignmentFromInput(manualDraft, catalogSubjects);

    if (result.error) {
      setManualError(result.error);
      return;
    }

    if (manualAssignments.some((assignment) => isSameAssignment(assignment, result.assignment))) {
      setManualError(t('adminDuplicateNewDoctorSubject'));
      return;
    }

    setManualAssignments((current) => [...current, result.assignment]);
    setManualDraft(getEmptyAssignmentDraft());
    setManualError('');
  };

  const handleManualAssignmentRemove = (index) => {
    setManualAssignments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleManualDoctorSubmit = async () => {
    if (!manualForm.name.trim()) {
      setManualError(t('adminDoctorNameRequired'));
      return;
    }

    if (!manualForm.nationalId.trim()) {
      setManualError(t('adminDoctorIdRequired'));
      return;
    }

    if (!isEditingManualDoctor && !manualForm.password) {
      setManualError(t('adminDoctorPasswordRequired'));
      return;
    }

    const normalizedDoctorId = manualForm.nationalId.trim();
    const generatedEmail = buildDoctorLoginEmail(normalizedDoctorId);
    const existingDoctor = doctors.find((doctor) => (
      doctor.id !== editingDoctorId && (
      normalizeLookup(doctor.nationalId) === normalizeLookup(normalizedDoctorId)
      || normalizeLookup(doctor.email) === normalizeLookup(generatedEmail)
      )
    ));

    if (existingDoctor) {
      setManualError(t('adminDoctorIdExists'));
      return;
    }

    const allowedColleges = getFacultyColleges([...manualForm.faculties, ...getTeachingFacultyIds(manualAssignments)]);

    setActionLoading('saveDoctor');

    try {
      if (isEditingManualDoctor) {
        const currentDoctor = doctors.find((doctor) => doctor.id === editingDoctorId);

        if (!currentDoctor) {
          setManualError(t('adminSelectedDoctorMissing'));
          return;
        }

        await updateDoctor(editingDoctorId, {
          name: manualForm.name.trim(),
          nationalId: normalizedDoctorId,
          email: resolveUpdatedDoctorEmail(currentDoctor, normalizedDoctorId),
          ...(manualForm.password ? { password: manualForm.password } : {}),
          specialty: manualAssignments[0]?.name || '--',
          avatar: createAvatarLabel(manualForm.name),
          allowedColleges,
          courses: manualAssignments.map((assignment) => ({
            ...assignment,
            uid: assignment.uid || buildCourseUid(assignment.id, assignment.type),
          })),
        });

        showToast({
          tone: 'success',
          title: t('adminDoctorUpdatedTitle'),
          message: `${manualForm.name.trim()} ${t('adminDoctorUpdatedMessagePrefix')} ${manualAssignments.length} ${manualAssignments.length === 1 ? t('adminSingleSubjectWord') : t('adminPluralSubjectsWord')}.`,
        });
      } else {
        const doctorId = buildDoctorId();

        await addDoctor({
          id: doctorId,
          email: generatedEmail,
          password: manualForm.password,
          name: manualForm.name.trim(),
          nationalId: normalizedDoctorId,
          specialty: manualAssignments[0]?.name || '--',
          avatar: createAvatarLabel(manualForm.name),
          userRole: 'staff',
          allowedColleges,
          courses: manualAssignments.map((assignment) => ({
            ...assignment,
            uid: buildCourseUid(assignment.id, assignment.type),
          })),
        });

        showToast({
          tone: 'success',
          title: t('adminDoctorCreatedTitle'),
          message: `${manualForm.name.trim()} ${t('adminDoctorCreatedMessagePrefix')} ${manualAssignments.length} ${manualAssignments.length === 1 ? t('adminSingleSubjectWord') : t('adminPluralSubjectsWord')}.`,
        });
      }

      resetManualDoctorEditor();
    } catch (error) {
      setManualError(error.message || t('adminImportFailed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleManualDoctorEditStart = (doctor) => {
    if (!doctor) return;

    setEditingDoctorId(doctor.id);
    setManualForm({
      name: doctor.name || '',
      nationalId: doctor.nationalId || '',
      password: '',
      faculties: getDoctorFacultyIds(doctor),
      specialty: doctor.specialty || '',
    });
    setManualDraft(getEmptyAssignmentDraft());
    setManualAssignments(
      (doctor.courses || []).map((course) => ({
        id: course.id,
        name: course.name,
        faculty: course.faculty,
        college: course.college,
        type: course.type,
        uid: course.uid,
      })),
    );
    setManualError('');

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAssignmentDeleteRequest = (doctorId, courseUid) => {
    const doctor = doctors.find((item) => item.id === doctorId);
    const assignment = doctor?.courses.find((course) => course.uid === courseUid);

    if (!doctor || !assignment) return;

    setPendingDeleteAssignment({
      doctorId,
      courseUid,
      doctorName: doctor.name,
      subjectCode: assignment.id,
      subjectName: assignment.name,
    });
  };

  const handleDeleteAssignmentDialogClose = () => {
    setPendingDeleteAssignment(null);
  };

  const handleDeleteAssignmentConfirm = async () => {
    if (!pendingDeleteAssignment) return;

    setActionLoading('deleteAssignment');

    try {
      await deleteCourse(pendingDeleteAssignment.doctorId, pendingDeleteAssignment.courseUid);
      showToast({
        tone: 'success',
        title: t('adminAssignmentRemovedTitle'),
        message: t('adminAssignmentRemovedMessage'),
      });
      setPendingDeleteAssignment(null);
    } finally {
      setActionLoading('');
    }
  };

  const handleDoctorDeleteRequest = (doctor) => {
    setPendingDeleteDoctor(doctor);
  };

  const handleDeleteDialogClose = () => {
    setPendingDeleteDoctor(null);
  };

  const handleDoctorDeleteConfirm = async () => {
    if (!pendingDeleteDoctor) return;

    setActionLoading('deleteDoctor');

    try {
      await deleteDoctor(pendingDeleteDoctor.id);
      showToast({
        tone: 'success',
        title: t('adminDoctorRemovedTitle'),
        message: `${pendingDeleteDoctor.name} ${t('adminDoctorRemovedMessage')}`,
      });
      if (pendingDeleteDoctor.id === editingDoctorId) {
        resetManualDoctorEditor();
      }
      setPendingDeleteDoctor(null);
    } finally {
      setActionLoading('');
    }
  };

  const handleImportFilePicked = (file) => {
    setSelectedImportFile(file);
    setSelectedFileName(file.name);
    setImportPreview(null);
    setImportSummary(null);
    setImportError('');
  };

  const handleImportFacultyChange = (event) => {
    setSelectedImportFacultyId(event.target.value);
    setSelectedImportFile(null);
    setSelectedFileName('');
    setImportPreview(null);
    setImportError('');
  };

  const handleImportSubmit = async () => {
    if (!selectedImportFile) {
      setImportError(t('adminChooseImportFileFirst'));
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      if (!importPreview) {
        const parsed = await parseAdminImportFile(selectedImportFile, {
          facultyId: selectedImportFacultyId,
          students: catalogSubjects,
        });
        setImportPreview(parsed);
        return;
      }

      if (importPreview.invalidRows.length || !importPreview.groupedDoctors.length) {
        setImportError(t('adminFixImportIssues'));
        return;
      }

      const parsed = importPreview;
      const result = await importDoctors(parsed.groupedDoctors.map((item) => ({
        ...item,
        email: item.email || buildImportedDoctorEmail(item),
      })));
      await refreshUsers();
      const {
        doctorsCreated = 0,
        doctorsReused = 0,
        doctorsUpdated = 0,
        assignmentsAdded = 0,
        assignmentsSkipped = 0,
      } = result;

      const summary = {
        fileName: selectedImportFile.name,
        sheetName: parsed.sheetName,
        facultyName: selectedImportFacultyId ? t(`faculty_${selectedImportFacultyId}`) : '',
        rowsParsed: parsed.rowCount,
        doctorsCreated,
        doctorsReused,
        doctorsUpdated,
        assignmentsAdded,
        assignmentsSkipped,
        invalidRows: parsed.invalidRows,
      };

      setImportSummary(summary);
      setImportPreview(null);
      setSelectedImportFile(null);
      setSelectedFileName('');

      showToast({
        tone: 'success',
        title: t('adminImportCompletedTitle'),
        message: `${doctorsCreated} ${t('adminDoctorsCreatedCount')}, ${doctorsUpdated} ${t('adminDoctorsUpdatedCount')}, ${assignmentsAdded} ${t('adminAssignmentsAddedCount')}${assignmentsSkipped ? `, ${assignmentsSkipped} ${t('adminAssignmentsSkippedCount')}` : ''}.`,
      });
    } catch (error) {
      setImportError(error.message || t('adminImportFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadAdminImportTemplate({ facultyId: selectedImportFacultyId });
    showToast({
      tone: 'success',
      title: t('adminTemplateReadyTitle'),
      message: t('adminTemplateReadyMessage'),
    });
  };

  return {
    doctors,
    students: catalogSubjects,
    usersStatus,
    totalAssignments,
    uniqueSubjects,
    manualForm,
    manualDraft,
    manualAssignments,
    manualError,
    editingDoctorId,
    isEditingManualDoctor,
    selectedFileName,
    selectedImportFacultyId,
    importFacultyOptions,
    importError,
    isImporting,
    importSummary,
    importPreview,
    pendingDeleteDoctor,
    pendingDeleteAssignment,
    actionLoading,
    handleManualFormChange,
    handleManualFacultyToggle,
    handleManualDraftChange,
    handleManualAssignmentAdd,
    handleManualAssignmentRemove,
    handleManualDoctorSubmit,
    handleManualDoctorEditStart,
    resetManualDoctorEditor,
    handleImportFilePicked,
    handleImportFacultyChange,
    handleImportSubmit,
    handleDownloadTemplate,
    handleDoctorDeleteRequest,
    handleDeleteDialogClose,
    handleDoctorDeleteConfirm,
    handleAssignmentDeleteRequest,
    handleDeleteAssignmentDialogClose,
    handleDeleteAssignmentConfirm,
  };
};
