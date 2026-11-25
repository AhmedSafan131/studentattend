import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useAuth, useToast } from '../../../../hooks';
import { useLanguage } from '../../../../i18n';
import {
  ALL_STUDENT_FACULTIES,
  downloadStudentsTemplate,
  parseStudentsWorkbooks,
} from '../utils/importStudentsWorkbook';
import {
  createStudent,
  deleteStudent as deleteStudentApi,
  fetchStudentsPage,
  importStudents,
  updateStudent,
} from '../../../../services/studentsApi';
import { fetchCatalogSubjects } from '../../../../services/catalogApi';
import {
  canDeleteStudentRecord,
  canEditStudentRecord,
  filterStudentsByUserAccess,
  hasPermission,
  isCollegeAllowedForUser,
  PERMISSIONS,
} from '../../../../utils/permissions';
import {
  buildStudentPayload,
  createStudentInternalId,
  DEFAULT_PAGE_SIZE,
  getFacultyOptionsForColleges,
  getCollegeRecord,
  getEmptyRegistrationDraft,
  getEmptyStudentForm,
  normalizeRegistration,
  normalizeStudentRecord,
  validateRegistrationDraft,
  validateStudentPayload,
} from '../utils/studentUtils';

export const useStudentsPageController = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const selectedTermCode = useSelector((state) => state.terms.selectedTermCode);
  const [students, setStudents] = useState([]);
  const [studentsError, setStudentsError] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentsPagination, setStudentsPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [reloadStudentsKey, setReloadStudentsKey] = useState(0);

  const normalizedStudents = useMemo(
    () => students.map((student, index) => normalizeStudentRecord(student, index)),
    [students],
  );

  const accessibleStudents = useMemo(
    () => filterStudentsByUserAccess(user, normalizedStudents),
    [normalizedStudents, user],
  );

  const canViewStudents = hasPermission(user, PERMISSIONS.VIEW_STUDENTS);
  const canEditStudents = hasPermission(user, PERMISSIONS.EDIT_STUDENTS);
  const canDeleteStudents = hasPermission(user, PERMISSIONS.DELETE_STUDENTS);
  const allowedColleges = useMemo(
    () => (user?.allowedColleges?.length ? user.allowedColleges : []),
    [user],
  );
  const importFacultyOptions = useMemo(
    () => [{ value: ALL_STUDENT_FACULTIES, label: t('studentsAllFaculties') }, ...getFacultyOptionsForColleges(allowedColleges).map((option) => ({
      ...option,
      label: t(option.labelKey),
    }))],
    [allowedColleges, t],
  );

  const [form, setForm] = useState(getEmptyStudentForm);
  const [registrationDraft, setRegistrationDraft] = useState(getEmptyRegistrationDraft);
  const [formRegistrations, setFormRegistrations] = useState([]);
  const [editingRegistrationIndex, setEditingRegistrationIndex] = useState(null);
  const [formError, setFormError] = useState('');
  const [editingStudentId, setEditingStudentId] = useState('');
  const [formCatalogSubjects, setFormCatalogSubjects] = useState([]);
  const [isLoadingFormSubjects, setIsLoadingFormSubjects] = useState(false);

  const [search, setSearch] = useState('');
  const [currentTermOnly, setCurrentTermOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [selectedImportFacultyId, setSelectedImportFacultyId] = useState('');
  const [isParsingUpload, setIsParsingUpload] = useState(false);
  const [isApplyingUpload, setIsApplyingUpload] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);

  useEffect(() => {
    if (!canViewStudents) {
      setStudents([]);
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setIsLoadingStudents(true);
      setStudentsError('');

      fetchStudentsPage({
        page: currentPage,
        perPage: pageSize,
        search: search.trim() || undefined,
        current_term_only: currentTermOnly ? 1 : undefined,
      })
        .then(({ students: records, pagination }) => {
          if (!isMounted) return;
          setStudents(records);
          setStudentsPagination(pagination);
        })
        .catch((error) => {
          if (isMounted) {
            setStudents([]);
            setStudentsError(error?.response?.data?.message || error.message || 'Unable to load student records.');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingStudents(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [canViewStudents, currentPage, currentTermOnly, pageSize, reloadStudentsKey, search, selectedTermCode]);

  useEffect(() => {
    const facultyId = getCollegeRecord(form.college)?.facultyId;
    if (!facultyId) {
      setFormCatalogSubjects([]);
      setIsLoadingFormSubjects(false);
      return undefined;
    }

    let isMounted = true;
    setIsLoadingFormSubjects(true);

    fetchCatalogSubjects({ facultyId, termCode: selectedTermCode })
      .then((subjects) => {
        if (isMounted) setFormCatalogSubjects(subjects);
      })
      .catch((error) => {
        console.error('Could not load subjects for the student editor', error);
        if (isMounted) setFormCatalogSubjects([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFormSubjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, [form.college, selectedTermCode]);

  const filteredStudents = accessibleStudents;

  const handleCurrentTermOnlyChange = (event) => {
    setCurrentTermOnly(event.target.checked);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Number(studentsPagination.totalPages) || 1);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStudents = filteredStudents;

  const isEditing = Boolean(editingStudentId);

  const resetForm = () => {
    setForm(getEmptyStudentForm());
    setRegistrationDraft(getEmptyRegistrationDraft());
    setFormRegistrations([]);
    setEditingRegistrationIndex(null);
    setFormError('');
    setEditingStudentId('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError('');
  };

  const handleRegistrationDraftChange = (event) => {
    const { name, value, dataset = {} } = event.target;
    setRegistrationDraft((current) => {
      if (name === 'subjectCode') {
        return {
          ...current,
          subjectCode: value,
          subjectName: dataset.subjectName || '',
          type: '',
          group: '',
        };
      }

      if (name === 'type') {
        return { ...current, type: value, group: '' };
      }

      return { ...current, [name]: value };
    });
    setFormError('');
  };

  const handleRegistrationAdd = () => {
    const registrationError = validateRegistrationDraft(registrationDraft);
    if (registrationError) {
      setFormError(t(registrationError));
      return;
    }

    const nextRegistration = normalizeRegistration(registrationDraft);
    const duplicateRegistration = formRegistrations.some((registration, index) => (
      index !== editingRegistrationIndex
      && registration.subjectCode === nextRegistration.subjectCode
      && registration.type === nextRegistration.type
    ));

    if (duplicateRegistration) {
      showToast({
        tone: 'info',
        title: t('studentsDuplicateRegistrationTitle'),
        message: t('studentsDuplicateRegistrationMessage'),
      });
      return;
    }

    setFormRegistrations((current) => {
      const nextList = editingRegistrationIndex === null
        ? [...current, nextRegistration]
        : current.map((registration, index) => (
          index === editingRegistrationIndex ? nextRegistration : registration
        ));

      const merged = new Map();
      nextList.forEach((registration) => {
        // A student can be registered for more than one teaching type of the
        // same subject and group (Lecture, Section, and Practical). Only merge
        // an exact registration duplicate; otherwise adding one type would
        // silently remove the other types when the student is saved.
        merged.set(`${registration.subjectCode}__${registration.group}__${registration.type}`, registration);
      });

      return [...merged.values()];
    });

    setRegistrationDraft(getEmptyRegistrationDraft());
    setEditingRegistrationIndex(null);
    setFormError('');
  };

  const handleRegistrationRemove = (index) => {
    setFormRegistrations((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setEditingRegistrationIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      if (currentIndex === index) {
        setRegistrationDraft(getEmptyRegistrationDraft());
        return null;
      }

      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });
  };

  const handleRegistrationEditStart = (index) => {
    const targetRegistration = formRegistrations[index];
    if (!targetRegistration) return;

    setRegistrationDraft(targetRegistration);
    setEditingRegistrationIndex(index);
    setFormError('');
  };

  const handleRegistrationEditCancel = () => {
    setRegistrationDraft(getEmptyRegistrationDraft());
    setEditingRegistrationIndex(null);
    setFormError('');
  };

  const handleFormSubmit = async () => {
    if (!canEditStudents) {
      setFormError('You do not have permission to edit student records.');
      return;
    }

    if (!isCollegeAllowedForUser(user, form.college)) {
      setFormError('You can only manage students from your assigned colleges.');
      return;
    }

    const validationError = validateStudentPayload({
      form,
      registrations: formRegistrations,
      students: accessibleStudents,
      editingStudentId,
    });

    if (validationError) {
      setFormError(t(validationError));
      return;
    }

    const existingStudent = accessibleStudents.find((student) => student.id === editingStudentId) || null;
    const payload = buildStudentPayload({
      form,
      registrations: formRegistrations,
      existingStudent,
    });

    setIsSavingStudent(true);

    try {
      if (existingStudent) {
        const updatedStudent = await updateStudent(existingStudent.id, payload);
        setStudents((current) => current.map((student) => (
          student.id === updatedStudent.id ? updatedStudent : student
        )));
        showToast({
          tone: 'success',
          title: t('studentsUpdatedTitle'),
          message: `${payload.name} ${t('studentsUpdatedMessage')}`,
        });
      } else {
        const createdStudent = await createStudent({
          ...payload,
          id: createStudentInternalId(),
        });
        setStudents((current) => [...current, createdStudent]);
        showToast({
          tone: 'success',
          title: t('studentsAddedTitle'),
          message: `${payload.name} ${t('studentsAddedMessage')}`,
        });
      }
    } catch (error) {
      setFormError(error?.response?.data?.message || error.message || 'Unable to save student record.');
      return;
    } finally {
      setIsSavingStudent(false);
    }

    resetForm();
    setReloadStudentsKey((value) => value + 1);
  };

  const handleEditStart = (student) => {
    if (!canEditStudentRecord(user, student)) {
      setFormError('You do not have permission to edit this student.');
      return;
    }

    setEditingStudentId(student.id);
    setForm({
      name: student.name,
      studentId: student.studentId,
      nationalId: student.nationalId,
      college: student.college,
    });
    setFormRegistrations(student.registrations);
    setRegistrationDraft(getEmptyRegistrationDraft());
    setEditingRegistrationIndex(null);
    setFormError('');
  };

  const handleEditCancel = () => {
    resetForm();
  };

  const handleDeleteRequest = (student) => {
    if (!canDeleteStudentRecord(user, student)) {
      showToast({
        tone: 'error',
        title: 'Access denied',
        message: 'You do not have permission to delete this student.',
      });
      return;
    }

    setPendingDeleteStudent(student);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteStudent(null);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteStudent) return;

    setIsDeletingStudent(true);

    try {
      await deleteStudentApi(pendingDeleteStudent.id);
      setStudents((current) => current.filter((student) => student.id !== pendingDeleteStudent.id));
      showToast({
        tone: 'success',
        title: t('studentsDeletedTitle'),
        message: `${pendingDeleteStudent.name} ${t('studentsDeletedMessage')}`,
      });
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'Unable to delete student',
        message: error?.response?.data?.message || error.message || 'Please try again.',
      });
      return;
    } finally {
      setIsDeletingStudent(false);
    }
    setPendingDeleteStudent(null);
    setReloadStudentsKey((value) => value + 1);

    if (editingStudentId === pendingDeleteStudent.id) {
      resetForm();
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (nextSize) => {
    setPageSize(nextSize);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (selectedImportFacultyId && importFacultyOptions.some((option) => option.value === selectedImportFacultyId)) {
      return;
    }

    setSelectedImportFacultyId(importFacultyOptions[0]?.value || '');
  }, [importFacultyOptions, selectedImportFacultyId]);

  const handleImportFacultyChange = (event) => {
    setSelectedImportFacultyId(event.target.value);
    setUploadPreview(null);
    setUploadError('');
  };

  const handleUploadFilePicked = async (files) => {
    if (!canEditStudents) {
      setUploadError('You do not have permission to import student records.');
      return;
    }

    if (!selectedImportFacultyId) {
      setUploadError('Choose a faculty before uploading student sheets.');
      return;
    }

    setUploadError('');
    setIsParsingUpload(true);

    try {
      const catalogSubjects = await fetchCatalogSubjects({
        facultyId: selectedImportFacultyId === ALL_STUDENT_FACULTIES ? '' : selectedImportFacultyId,
        termCode: selectedTermCode || '',
      });
      if (!catalogSubjects.length) {
        throw new Error('Add subjects to the selected faculty catalog before importing student registrations.');
      }

      const parsed = await parseStudentsWorkbooks(files, {
        facultyId: selectedImportFacultyId,
        catalogSubjects,
        allowedFacultyIds: getFacultyOptionsForColleges(allowedColleges).map((option) => option.value),
      });
      setUploadPreview(parsed);
    } catch (error) {
      setUploadPreview(null);
      setUploadError(error.message || 'Unable to parse the selected file.');
    } finally {
      setIsParsingUpload(false);
    }
  };

  const handleUploadClear = () => {
    setUploadPreview(null);
    setUploadError('');
  };

  const handleDownloadTemplate = async () => {
    setUploadError('');

    try {
      downloadStudentsTemplate({
        facultyId: selectedImportFacultyId,
        allowedFacultyIds: getFacultyOptionsForColleges(allowedColleges).map((option) => option.value),
      });
    } catch (error) {
      setUploadError(error.message || 'Unable to build the student demo template.');
    }
  };

  const handleUploadConfirm = async () => {
    if (!canEditStudents) {
      setUploadError('You do not have permission to import student records.');
      return;
    }

    if (!uploadPreview?.students?.length) {
      setUploadError(t('studentsUploadPreviewEmpty'));
      return;
    }

    if (uploadPreview.invalidRows?.length) {
      setUploadError(t('studentsFixImportIssues'));
      return;
    }

    setIsApplyingUpload(true);

    try {
      const { created, updated } = await importStudents(uploadPreview.students);
      setReloadStudentsKey((value) => value + 1);

      showToast({
        tone: 'success',
        title: t('studentsImportedTitle'),
        message: `${created} ${t('studentsCreatedCount')} ${t('andWord')} ${updated} ${t('studentsUpdatedCount')}.`,
      });
    } catch (error) {
      setUploadError(error?.response?.data?.message || error.message || 'Unable to import student records.');
      setIsApplyingUpload(false);
      return;
    }

    setIsApplyingUpload(false);
    setUploadPreview(null);

  };

  return {
    currentTermOnly,
    handleCurrentTermOnlyChange,
    students: normalizedStudents,
    accessibleStudents,
    filteredStudents,
    paginatedStudents,
    currentPage,
    totalPages,
    totalStudents: Number(studentsPagination.total) || 0,
    allStudentsTotal: Number(studentsPagination.allTotal ?? studentsPagination.total) || 0,
    pageSize,
    search,
    form,
    registrationDraft,
    formRegistrations,
    formCatalogSubjects,
    isLoadingFormSubjects,
    editingRegistrationIndex,
    formError,
    isEditing,
    uploadPreview,
    uploadError,
    selectedImportFacultyId,
    importFacultyOptions,
    isParsingUpload,
    isApplyingUpload,
    isSavingStudent,
    isDeletingStudent,
    pendingDeleteStudent,
    studentsError,
    isLoadingStudents,
    canViewStudents,
    canEditStudents,
    canDeleteStudents,
    allowedColleges,
    handleFormChange,
    handleRegistrationDraftChange,
    handleRegistrationAdd,
    handleRegistrationRemove,
    handleRegistrationEditStart,
    handleRegistrationEditCancel,
    handleFormSubmit,
    handleEditStart,
    handleEditCancel,
    handleDeleteRequest,
    handleDeleteCancel,
    handleDeleteConfirm,
    handleSearchChange,
    handlePageChange,
    handlePageSizeChange,
    handleImportFacultyChange,
    handleUploadFilePicked,
    handleUploadConfirm,
    handleUploadClear,
    handleDownloadTemplate,
  };
};
