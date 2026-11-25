import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import CustomDropdown from '../../../components/CustomDropdown';
import CustomInput from '../../../components/CustomInput';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import Pagination from '../../../components/Pagination';
import { Activity, BookOpen, CalendarDays, Check, Clock3, UserCircle2, UsersRound, X } from '../../../assets/icons';
import { useAuth, useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import { fetchCatalogSubjects } from '../../../services/catalogApi';
import { fetchStudentsPage } from '../../../services/studentsApi';
import { administrativeSubjectAbsenceAPI } from '../../../utils/api';
import { createBackgroundPoller } from '../../../utils/backgroundPoller';
import { buildAcademicWeekOptions } from '../../../utils/academicWeek';
import { FACULTY_CATALOG } from '../../../utils/constants';
import {
  getScopedCourseLabel,
  getCatalogAttendanceCourses,
  SESSION_TYPE_OPTIONS,
} from '../../../utils/courseAccess';

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'],
  ['#0891b2', '#22d3ee'],
];

const avatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const DEFAULT_PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const normalizeSessionPart = (value) => String(value || '').trim();

const normalizeCourseKey = (value) => normalizeSessionPart(value).toUpperCase();

const normalizeTypeKey = (value) => {
  const normalized = normalizeSessionPart(value).toLowerCase();
  if (normalized === 'lecture') return 'Lecture';
  if (normalized === 'section') return 'Section';
  if (normalized === 'practical') return 'Practical';
  return normalizeSessionPart(value);
};

const normalizeGroupKey = (value) => normalizeSessionPart(value)
  .toUpperCase()
  .replace(/^GROUP\s+/, '')
  .replace(/^GRP\s+/, '');

const normalizeWeekKey = (value) => {
  const normalized = normalizeSessionPart(value);
  const match = normalized.match(/\d+/);
  return match ? String(Number(match[0])) : normalized;
};

const buildTypedSessionKey = (courseId, lectureType, group, week) => (
  normalizeCourseKey(courseId)
    && normalizeTypeKey(lectureType)
    && normalizeGroupKey(group)
    && normalizeWeekKey(week)
    ? `${normalizeCourseKey(courseId)}__${normalizeTypeKey(lectureType)}__${normalizeGroupKey(group)}__${normalizeWeekKey(week)}`
    : null
);

const buildLegacySessionKey = (courseId, group, week) => (
  normalizeCourseKey(courseId) && normalizeGroupKey(group) && normalizeWeekKey(week)
    ? `${normalizeCourseKey(courseId)}__${normalizeGroupKey(group)}__${normalizeWeekKey(week)}`
    : null
);

const parseSessionKey = (key = '') => {
  const parts = key.split('__');
  if (parts.length === 4) {
    const [course, type, group, week] = parts;
    return {
      course: normalizeCourseKey(course),
      type: normalizeTypeKey(type),
      group: normalizeGroupKey(group),
      week: normalizeWeekKey(week),
    };
  }
  if (parts.length === 3) {
    const [course, group, week] = parts;
    return {
      course: normalizeCourseKey(course),
      type: 'Lecture',
      group: normalizeGroupKey(group),
      week: normalizeWeekKey(week),
    };
  }
  return { course: '', type: 'Lecture', group: '', week: '' };
};

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase();

const studentMatchesIdentifier = (student, normalizedId) => (
  normalizeLookupValue(student.id) === normalizedId
  || normalizeLookupValue(student.studentId) === normalizedId
  || normalizeLookupValue(student.universityId) === normalizedId
  || normalizeLookupValue(student.nationalId) === normalizedId
);

const studentRegistrationMatchesSession = (student, courseId, lectureType, group) => (
  (student.registrations || []).some((registration) => (
    normalizeCourseKey(registration.subjectCode) === normalizeCourseKey(courseId)
    && normalizeTypeKey(registration.type) === normalizeTypeKey(lectureType)
    && normalizeGroupKey(registration.group) === normalizeGroupKey(group)
  ))
);

const getStudentAttendanceId = (student, fallbackId) => (
  String(student?.universityId || student?.studentId || student?.id || fallbackId || '').trim()
);

const AttendancePageTailwind = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const weekOptions = useMemo(
    () => buildAcademicWeekOptions(t('week'), attendanceTerm),
    [attendanceTerm, t],
  );
  const { showToast } = useToast();
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterLectureType, setFilterLectureType] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [addId, setAddId] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);
  const [isDeletingAttendance, setIsDeletingAttendance] = useState(false);
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const [lookupStudents, setLookupStudents] = useState([]);
  const [databaseRecords, setDatabaseRecords] = useState({});
  const paginationRef = useRef(null);

  React.useEffect(() => {
    if (filterWeek && !weekOptions.some((option) => option.value === filterWeek)) {
      setFilterWeek('');
    }
  }, [filterWeek, weekOptions]);

  const canLookupManagedStudents = user?.userRole === 'admin';
  const selectedFaculty = FACULTY_CATALOG.find((faculty) => faculty.id === filterFaculty);
  const facultyOptions = FACULTY_CATALOG.map((faculty) => ({ value: faculty.id, label: faculty.name }));

  React.useEffect(() => {
    let cancelled = false;
    fetchCatalogSubjects({ termCode: selectedTermCode || attendanceTerm?.code || '' })
      .then((subjects) => { if (!cancelled) setCatalogSubjects(subjects); })
      .catch(() => { if (!cancelled) setCatalogSubjects([]); });
    return () => { cancelled = true; };
  }, [attendanceTerm?.code, selectedTermCode]);

  const loadAttendanceRecords = useCallback(async ({ clearOnError = true, throwOnError = false } = {}) => {
    if (!canLookupManagedStudents || !user?.token) {
      setDatabaseRecords({});
      return;
    }

    try {
      const response = await administrativeSubjectAbsenceAPI.getAll();
      const groupedRecords = {};

      (response?.data?.records || []).forEach((record) => {
        if (filterFaculty && record.facultyId !== filterFaculty) return;
        const key = buildTypedSessionKey(record.courseCode, record.lectureType, record.group, record.week);
        if (!key) return;

        const studentId = String(record.studentUniversityId || record.studentId || record.id || '').trim();
        const attendanceRecordId = record.attendanceRecordId || record.id;
        if (!studentId || !attendanceRecordId) return;

        groupedRecords[key] = groupedRecords[key] || [];
        groupedRecords[key].push({
          id: studentId,
          attendanceRecordId,
          facultyId: record.facultyId,
          universityId: studentId,
          name: record.studentName || 'Unknown Student',
          scanTime: record.time || '-',
        });
      });

      setDatabaseRecords(groupedRecords);
    } catch (error) {
      console.error('Could not load stored attendance records', error);
      if (clearOnError) setDatabaseRecords({});
      if (throwOnError) throw error;
    }
  }, [canLookupManagedStudents, filterFaculty, user?.token]);

  React.useEffect(() => {
    const poller = createBackgroundPoller(
      () => loadAttendanceRecords({ clearOnError: false, throwOnError: true }),
      { intervalMs: 30000 },
    );
    return () => poller.stop();
  }, [loadAttendanceRecords]);

  const displayCourses = useMemo(() => {
    if (!filterFaculty) return [];
    return getCatalogAttendanceCourses({
      userRole: 'admin',
      assignedCourses: [],
      catalogSubjects: catalogSubjects.filter((subject) => subject.facultyId === filterFaculty),
      termCode: selectedTermCode || attendanceTerm?.code || '',
    });
  }, [attendanceTerm?.code, catalogSubjects, filterFaculty, selectedTermCode]);

  const courseOptions = useMemo(
    () => displayCourses.map((course) => ({ value: course.id, label: getScopedCourseLabel(course) })),
    [displayCourses],
  );

  const selectedCourse = displayCourses.find((course) => course.id === filterCourse);
  const sectionOptions = useMemo(
    () => (selectedCourse
      ? (selectedCourse.groupsByType?.[filterLectureType] || [])
        .map((section) => ({ value: section, label: `${t('groupLabel')} ${section}` }))
      : []),
    [filterLectureType, selectedCourse, t],
  );
  const lectureTypeOptions = useMemo(
    () => SESSION_TYPE_OPTIONS
      .filter((type) => !selectedCourse || selectedCourse.types?.includes(type))
      .map((type) => ({ value: type, label: t(`studentsTypeOption${type}`) })),
    [selectedCourse, t],
  );

  const sessionKey = buildTypedSessionKey(filterCourse, filterLectureType, filterSection, filterWeek);
  const legacySessionKey = buildLegacySessionKey(filterCourse, filterSection, filterWeek);
  const sessionKeys = useMemo(
    () => [...new Set([sessionKey, legacySessionKey].filter(Boolean))],
    [legacySessionKey, sessionKey],
  );
  const isSessionSelected = Boolean(sessionKey);

  React.useEffect(() => {
    const normalizedId = normalizeLookupValue(addId);
    if (!normalizedId || normalizedId.length < 3 || !canLookupManagedStudents || !isSessionSelected) {
      setLookupStudents([]);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchStudentsPage({ page: 1, perPage: 5, identifier: normalizedId, current_term_only: 1 })
        .then(({ students: records }) => { if (!cancelled) setLookupStudents(records); })
        .catch(() => { if (!cancelled) setLookupStudents([]); });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [addId, canLookupManagedStudents, isSessionSelected]);

  const lookupCandidate = useMemo(() => {
    const normalizedId = normalizeLookupValue(addId);
    if (!normalizedId || !canLookupManagedStudents || !isSessionSelected) return null;
    const collegeNames = new Set((selectedFaculty?.colleges || [])
      .map((college) => String(college.name || '').trim().toLowerCase()));
    return lookupStudents.find((student) => (
      collegeNames.has(String(student.college || '').trim().toLowerCase())
      && studentMatchesIdentifier(student, normalizedId)
    )) || null;
  }, [addId, canLookupManagedStudents, isSessionSelected, lookupStudents, selectedFaculty]);

  const handleFacultyChange = (event) => {
    setFilterFaculty(event.target.value);
    setFilterCourse('');
    setFilterLectureType('');
    setFilterSection('');
    setFilterWeek('');
    setAddId('');
    setAddError('');
    setCurrentPage(1);
  };
  const matchedStudent = useMemo(() => {
    if (!lookupCandidate) return null;
    return studentRegistrationMatchesSession(lookupCandidate, filterCourse, filterLectureType, filterSection)
      ? lookupCandidate
      : null;
  }, [filterCourse, filterLectureType, filterSection, lookupCandidate]);

  const students = useMemo(() => {
    if (!sessionKeys.length) return [];
    const map = new Map();

    sessionKeys.forEach((key) => {
      [...(databaseRecords[key] || [])].forEach((student) => {
        map.set(student.id, student);
      });
      (localOverrides[key] || []).forEach((student) => {
        if (student._deleted) {
          map.delete(student.id);
        } else {
          map.set(student.id, student);
        }
      });
    });

    return [...map.values()];
  }, [databaseRecords, localOverrides, sessionKeys]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return students.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, students]);

  const activeSessionsCount = useMemo(() => {
    if (!filterCourse) return 0;

    const normalizedCourse = normalizeCourseKey(filterCourse);
    const normalizedType = normalizeTypeKey(filterLectureType);

    return [...new Set(
      Object.keys(databaseRecords)
        .filter((key) => {
          const parsed = parseSessionKey(key);
          return parsed.course === normalizedCourse && parsed.type === normalizedType;
        }),
    )].length;
  }, [databaseRecords, filterCourse, filterLectureType]);

  const handleCourseChange = (event) => {
    setFilterCourse(event.target.value);
    setFilterLectureType('');
    setFilterSection('');
    setFilterWeek('');
    setCurrentPage(1);
  };

  const handleLectureTypeChange = (event) => {
    setFilterLectureType(event.target.value);
    setFilterSection('');
    setFilterWeek('');
    setCurrentPage(1);
  };

  const handleSectionChange = (event) => {
    setFilterSection(event.target.value);
    setCurrentPage(1);
  };

  const handleWeekChange = (event) => {
    setFilterWeek(event.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (student) => {
    if (!sessionKey) return;

    if (!student.attendanceRecordId) {
      setPendingDeleteStudent(null);
      showToast({
        tone: 'error',
        title: 'Could not remove attendance',
        message: 'This row is not linked to a saved student record. Refresh the page and try again.',
      });
      return;
    }

    setIsDeletingAttendance(true);

    try {
      await administrativeSubjectAbsenceAPI.delete(student.attendanceRecordId);

      setDatabaseRecords((previous) => ({
        ...previous,
        [sessionKey]: (previous[sessionKey] || []).filter((record) => record.id !== student.id && record.universityId !== student.universityId),
      }));
      setLocalOverrides((previous) => ({
        ...previous,
        [sessionKey]: [
          ...(previous[sessionKey] || []).filter((record) => record.id !== student.id),
          { id: student.id, _deleted: true },
        ],
      }));
      setPendingDeleteStudent(null);
      await loadAttendanceRecords({ clearOnError: false });
      showToast({
        tone: 'success',
        title: 'Attendance removed',
        message: `${student.name} was deleted from the database.`,
      });
    } catch (error) {
      setPendingDeleteStudent(null);
      showToast({
        tone: 'error',
        title: 'Could not remove attendance',
        message: error?.response?.data?.message || 'The attendance record was not deleted from the database.',
      });
    } finally {
      setIsDeletingAttendance(false);
    }
  };

  const handleAdd = async () => {
    if (!sessionKey) {
      setAddError(t('attendanceSelectSessionFirst'));
      return;
    }

    const trimmedId = addId.trim();
    const trimmedName = canLookupManagedStudents ? (matchedStudent?.name || '') : addName.trim();
    const attendanceId = canLookupManagedStudents ? getStudentAttendanceId(matchedStudent, trimmedId) : trimmedId;

    if (!trimmedId) {
      setAddError(t('attendanceStudentIdRequired'));
      return;
    }

    if (!trimmedName) {
      setAddError(canLookupManagedStudents ? t('attendanceStudentNotFound') : t('attendanceStudentNameRequired'));
      return;
    }

    if (students.some((student) => student.id === attendanceId || student.universityId === attendanceId)) {
      setAddError(t('attendanceStudentExists'));
      return;
    }

    setIsAddingAttendance(true);

    try {
      await administrativeSubjectAbsenceAPI.create({
        studentId: attendanceId,
        facultyId: filterFaculty,
        subjectCode: filterCourse,
        lectureType: filterLectureType,
        group: filterSection,
        week: filterWeek,
      });

      setAddId('');
      setAddName('');
      setAddError('');
      await loadAttendanceRecords({ clearOnError: false });
      showToast({
        tone: 'success',
        title: t('attendanceStudentAddedToastTitle'),
        message: `${trimmedName} ${t('attendanceStudentAddedToastMessage')}`,
      });
    } catch (error) {
      setAddError(error?.response?.data?.message || 'Could not save attendance in the database.');
    } finally {
      setIsAddingAttendance(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteStudent) return;
    await handleDelete(pendingDeleteStudent);
  };

  const handlePageSizeChange = (nextPageSize) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };

  const scrollToPagination = () => {
    paginationRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [sessionKey]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="tw-page-shell min-h-full px-2 py-4 md:px-1 md:py-5">
      <div className="flex w-full max-w-none flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6">
            <div className="tw-card p-5 md:p-6">
              <div className="mb-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{t('attendanceFiltersTitle')}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{t('attendanceFiltersDescription')}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <CustomDropdown
                  id="attendance-faculty"
                  name="attendance-faculty"
                  label={t('facultyLabel')}
                  value={filterFaculty}
                  onChange={handleFacultyChange}
                  options={facultyOptions}
                  placeholder={t('selectFaculty')}
                  searchable
                  searchPlaceholder={t('searchLabel')}
                  Icon={() => <BookOpen size={16} />}
                />
                <CustomDropdown
                  id="attendance-course"
                  name="attendance-course"
                  label={t('courseLabel')}
                  value={filterCourse}
                  onChange={handleCourseChange}
                  options={courseOptions}
                  placeholder={t('attendanceSelectCourse')}
                  searchable
                  searchPlaceholder={t('searchLabel')}
                  disabled={!filterFaculty}
                  Icon={() => <BookOpen size={16} />}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <CustomDropdown
                  id="attendance-type"
                  name="attendance-type"
                  label={t('lectureTypeLabel')}
                  value={filterLectureType}
                  onChange={handleLectureTypeChange}
                  options={lectureTypeOptions}
                  placeholder={t('selectLectureType')}
                  disabled={!filterCourse}
                  Icon={() => <BookOpen size={16} />}
                />
                <CustomDropdown
                  id="attendance-section"
                  name="attendance-section"
                  label={t('groupLabel')}
                  value={filterSection}
                  onChange={handleSectionChange}
                  options={sectionOptions}
                  placeholder={t('selectGroup')}
                  disabled={!filterCourse || !filterLectureType}
                  Icon={() => <UsersRound size={16} />}
                />
                <CustomDropdown
                  id="attendance-week"
                  name="attendance-week"
                  label={t('weekLabel')}
                  value={filterWeek}
                  onChange={handleWeekChange}
                  options={weekOptions}
                  placeholder={t('attendanceSelectWeek')}
                  disabled={!filterCourse || !filterLectureType || !filterSection}
                  Icon={() => <CalendarDays size={16} />}
                />
              </div>
            </div>

            {!isSessionSelected ? (
              <div className="tw-card flex min-h-[380px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-accent">
                  <BookOpen size={34} />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-text-primary">{t('attendanceEmptyTitle')}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  {t('attendanceEmptyDescription')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <BookOpen size={14} />
                      {t('attendanceSelectedCourse')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-accent">{filterCourse}</div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {t(`studentsTypeOption${filterLectureType}`)} · {t('groupLabel')} {filterSection}
                    </p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Clock3 size={14} />
                      {t('attendanceWindow')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{`${t('reportsWeekPrefix')} ${filterWeek}`}</div>
                    <p className="mt-1 text-sm text-text-secondary">{students.length} {t('attendanceRecordedStudents')}</p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Activity size={14} />
                      {t('attendanceActiveSessions')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{activeSessionsCount}</div>
                    <p className="mt-1 text-sm text-text-secondary">{t('attendanceActiveSessionsDescription')}</p>
                  </div>
                </div>

                <div className="tw-card overflow-hidden">
                  <div className="flex flex-col gap-2 border-b border-border bg-surface-muted/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{t('attendanceRosterTitle')}</h3>
                      <p className="text-sm text-text-secondary">{t('attendanceRosterDescription')}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {students.length > pageSize ? (
                        <button
                          type="button"
                          onClick={scrollToPagination}
                          className="tw-btn-secondary"
                        >
                          <Clock3 size={16} />
                          {t('attendanceScrollToBottom')}
                        </button>
                      ) : null}
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
                        <UsersRound size={14} />
                        {students.length} {t('attendancePresentCountLabel')}
                      </div>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                        <UsersRound size={28} />
                      </div>
                      <h4 className="mt-4 text-lg font-bold text-text-primary">{t('attendanceNoRecordsTitle')}</h4>
                      <p className="mt-2 max-w-md text-sm text-text-secondary">
                        {t('attendanceNoRecordsDescription')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden">
                        <div className="divide-y divide-border">
                          {paginatedStudents.map((student, index) => {
                            const absoluteIndex = (currentPage - 1) * pageSize + index;
                            const [firstColor, secondColor] = avatarColor(absoluteIndex);

                            return (
                              <div
                                key={student.id}
                                className="flex flex-col gap-4 px-4 py-4"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="mt-2 text-sm font-semibold text-text-muted">
                                    {absoluteIndex + 1}
                                  </span>

                                  <div
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft"
                                    style={{ background: `linear-gradient(135deg, ${firstColor}, ${secondColor})` }}
                                  >
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-text-primary">{student.name}</p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                                      <UserCircle2 size={12} />
                                      {t('attendancePresentStudent')}
                                    </p>
                                    <div className="mt-3 grid gap-2">
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                          {t('attendanceUniversityIdColumn')}
                                        </p>
                                        <p className="mt-1 font-mono text-sm text-text-secondary">{student.universityId}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                          {t('attendanceScanTimeColumn')}
                                        </p>
                                        <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                                          <Clock3 size={13} />
                                          {student.scanTime}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  title={t('attendanceRemoveStudent')}
                                  onClick={() => setPendingDeleteStudent(student)}
                                  disabled={isDeletingAttendance}
                                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition-colors duration-200 hover:bg-danger/20"
                                >
                                  <X size={16} />
                                  {t('attendanceRemoveStudent')}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <div className="min-w-[760px]">
                        <div className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_72px] gap-4 border-b border-border bg-surface-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>#</span>
                          <span>{t('attendanceStudentColumn')}</span>
                          <span>{t('attendanceUniversityIdColumn')}</span>
                          <span>{t('attendanceScanTimeColumn')}</span>
                          <span className="text-center">{t('attendanceActionColumn')}</span>
                        </div>

                        {paginatedStudents.map((student, index) => {
                          const absoluteIndex = (currentPage - 1) * pageSize + index;
                          const [firstColor, secondColor] = avatarColor(absoluteIndex);

                          return (
                            <div
                              key={student.id}
                              className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_72px] items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-200 hover:bg-surface-muted/30"
                            >
                              <span className="text-sm font-semibold text-text-muted">{absoluteIndex + 1}</span>

                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft"
                                  style={{ background: `linear-gradient(135deg, ${firstColor}, ${secondColor})` }}
                                >
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-text-primary">{student.name}</p>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                                    <UserCircle2 size={12} />
                                    {t('attendancePresentStudent')}
                                  </p>
                                </div>
                              </div>

                              <div className="font-mono text-sm text-text-secondary">{student.universityId}</div>

                              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                                <Clock3 size={13} />
                                {student.scanTime}
                              </div>

                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  title={t('attendanceRemoveStudent')}
                                  onClick={() => setPendingDeleteStudent(student)}
                                  disabled={isDeletingAttendance}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger transition-colors duration-200 hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </>
                  )}

                  {students.length > pageSize ? (
                    <div ref={paginationRef} className="border-t border-border px-5 py-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            <div className="tw-card p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-accent">
                  <UserCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{t('attendanceManualEntryTitle')}</h2>
                  <p className="text-sm text-text-secondary">
                    {canLookupManagedStudents ? t('attendanceManualEntryByIdDescription') : t('attendanceManualEntryDescription')}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <CustomInput
                  id="attendance-student-id"
                  name="attendance-student-id"
                  label={t('studentIdLabel')}
                  placeholder={t('attendanceStudentIdPlaceholder')}
                  value={addId}
                  onChange={(event) => {
                    setAddId(event.target.value);
                    setAddError('');
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                  disabled={!isSessionSelected}
                  icon={() => <UsersRound size={16} />}
                />

                {canLookupManagedStudents ? (
                  matchedStudent ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {t('studentNameLabel')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{matchedStudent.name}</p>
                    </div>
                  ) : lookupCandidate ? (
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                      {t('attendanceStudentNotRegistered')}
                    </div>
                  ) : addId.trim() && isSessionSelected ? (
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                      {t('attendanceStudentNotFound')}
                    </div>
                  ) : null
                ) : (
                  <CustomInput
                    id="attendance-student-name"
                    name="attendance-student-name"
                    label={t('studentNameLabel')}
                    placeholder={t('attendanceStudentNamePlaceholder')}
                    value={addName}
                    onChange={(event) => {
                      setAddName(event.target.value);
                      setAddError('');
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
                    disabled={!isSessionSelected}
                    icon={() => <UserCircle2 size={16} />}
                  />
                )}

                {addError ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                    {addError}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="tw-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAdd}
                  disabled={!sessionKey || isAddingAttendance}
                >
                  <Check size={16} />
                  {t('attendanceAddStudent')}
                </button>

                {!isSessionSelected ? (
                  <p className="text-xs leading-5 text-text-muted">
                    {t('attendanceSelectSessionFirst')}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteStudent)}
        onClose={() => setPendingDeleteStudent(null)}
        onConfirm={handleConfirmDelete}
        title={t('attendanceRemoveDialogTitle')}
        message={pendingDeleteStudent ? `${t('attendanceRemoveDialogMessagePrefix')} ${pendingDeleteStudent.name} ${t('attendanceRemoveDialogMessageSuffix')}` : ''}
        confirmText={t('attendanceRemoveConfirm')}
        cancelText={t('attendanceRemoveCancel')}
        loading={isDeletingAttendance}
        loadingText={t('attendanceRemoveConfirm')}
      />
    </div>
  );
};

export default AttendancePageTailwind;
