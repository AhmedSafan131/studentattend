import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import CustomDropdown from '../../components/CustomDropdown';
import CustomInput from '../../components/CustomInput';
import Pagination from '../../components/Pagination';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  UserCircle2,
  UsersRound,
} from '../../assets/icons';
import { useAuth, useDashboard } from '../../hooks';
import { useLanguage } from '../../i18n';
import {
  getScopedCourseLabel,
  getScopedCourses,
  getScopedLectureTypes,
  isDoctorRole,
  SESSION_TYPE_OPTIONS,
} from '../../utils/courseAccess';
import { attendanceAPI, studentsAPI } from '../../utils/api';



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

const STUDENTS_PER_PAGE = 8;

const weekOptions = Array.from({ length: 14 }, (_, index) => ({
  value: String(index + 1),
  label: `Week ${index + 1}`,
}));

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

const dedupeByStudent = (records = []) => {
  const grouped = new Map();

  records.forEach((record) => {
    const identifiers = getIdentifierCandidates(record);
    const primaryKey = identifiers[0];
    if (!primaryKey) return;

    const existing = grouped.get(primaryKey);
    const existingTime = Date.parse(existing?.scannedAt || existing?.createdAt || existing?.time || 0);
    const currentTime = Date.parse(record?.scannedAt || record?.createdAt || record?.time || 0);

    if (!existing || (!Number.isNaN(currentTime) && (Number.isNaN(existingTime) || currentTime < existingTime))) {
      grouped.set(primaryKey, record);
    }
  });

  return [...grouped.values()];
};

const mergeRosterStudents = (...groups) => {
  const grouped = new Map();

  groups.flat().forEach((student) => {
    const identifiers = getIdentifierCandidates(student);
    const primaryKey = identifiers[0];

    if (!primaryKey) return;

    const existing = grouped.get(primaryKey);

    if (!existing) {
      grouped.set(primaryKey, student);
      return;
    }

    grouped.set(primaryKey, {
      ...student,
      ...existing,
      id: existing.id || student.id,
      studentId: existing.studentId || student.studentId,
      universityId: existing.universityId || student.universityId,
      name: existing.name || student.name,
      isRegistered: Boolean(existing.isRegistered || student.isRegistered),
    });
  });

  return [...grouped.values()];
};

const formatTimeValue = (value) => new Date(value).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const buildScanTime = (value, timestamp, scannedAt, createdAt) => {
  if (Number.isFinite(timestamp)) {
    return formatTimeValue(timestamp);
  }

  if (typeof timestamp === 'string' && timestamp.trim()) {
    const parsedTimestamp = Date.parse(timestamp);
    if (!Number.isNaN(parsedTimestamp)) {
      return formatTimeValue(parsedTimestamp);
    }
  }

  if (scannedAt) {
    const parsedScannedAt = Date.parse(scannedAt);
    if (!Number.isNaN(parsedScannedAt)) {
      return formatTimeValue(parsedScannedAt);
    }
  }

  if (createdAt) {
    const parsedCreatedAt = Date.parse(createdAt);
    if (!Number.isNaN(parsedCreatedAt)) {
      return formatTimeValue(parsedCreatedAt);
    }
  }

  return value || '-';
};

const getIdentifierCandidates = (value = {}) => ([
  value.id,
  value.studentId,
  value.universityId,
  value.studentUniversityId,
  value.nationalId,
  value.email,
]).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);

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

const avatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const ReportsPageTailwind = () => {
  const { t } = useLanguage();
  const { user, reportCourses, students: authStudents = [] } = useAuth();
  const { allSessions = {} } = useDashboard();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ignoreRegistration, setIgnoreRegistration] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [storedAttendanceRecords, setStoredAttendanceRecords] = useState([]);
  const [managedStudents, setManagedStudents] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      try {
        const [attendanceResponse, studentsResponse] = await Promise.allSettled([
          attendanceAPI.getAll(),
          studentsAPI.getAll(),
        ]);

        if (!isMounted) return;

        if (attendanceResponse.status === 'fulfilled') {
          setStoredAttendanceRecords(attendanceResponse.value?.data?.data || []);
        }

        if (studentsResponse.status === 'fulfilled') {
          setManagedStudents(studentsResponse.value?.data?.students || []);
        }
      } catch (error) {
        if (isMounted) {
          setStoredAttendanceRecords([]);
          setManagedStudents([]);
        }
      }
    };

    loadReportData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayCourses = useMemo(() => {
    return getScopedCourses({
      userRole: user?.userRole,
      assignedCourses: reportCourses,
      students: authStudents.length ? authStudents : managedStudents,
    });
  }, [authStudents, managedStudents, reportCourses, user?.userRole]);

  const courseOptions = useMemo(
    () => displayCourses.map((course) => ({ value: course.id, label: getScopedCourseLabel(course) })),
    [displayCourses],
  );

  const selectedCourseMeta = useMemo(
    () => displayCourses.find((course) => course.id === selectedCourse),
    [displayCourses, selectedCourse],
  );

  const courseRecords = useMemo(() => (
    selectedCourse
      ? storedAttendanceRecords.filter((record) => (
        normalizeCourseKey(record.courseCode || record.course) === normalizeCourseKey(selectedCourse)
      ))
      : []
  ), [selectedCourse, storedAttendanceRecords]);

  const attendanceDerivedCourses = useMemo(() => {
    const grouped = new Map();

    storedAttendanceRecords.forEach((record) => {
      const courseId = normalizeCourseKey(record.courseCode || record.course);
      if (!courseId) return;

      if (!grouped.has(courseId)) {
        grouped.set(courseId, {
          value: courseId,
          label: record.course
            ? `${courseId} - ${String(record.course).trim()}`
            : courseId,
        });
      }
    });

    return [...grouped.values()];
  }, [storedAttendanceRecords]);

  const lectureTypeOptions = useMemo(() => {
    const scopedTypes = getScopedLectureTypes({
      userRole: user?.userRole,
      assignedCourses: reportCourses,
      courseId: selectedCourse,
    });
    const attendanceTypes = courseRecords
      .map((record) => normalizeTypeKey(record.lectureType || record.type))
      .filter(Boolean);
    const types = [
      ...(isDoctorRole(user?.userRole) ? scopedTypes : SESSION_TYPE_OPTIONS),
      ...attendanceTypes,
    ];

    return [...new Set(types)].map((type) => ({ value: type, label: t(`studentsTypeOption${type}`) }));
  }, [courseRecords, reportCourses, selectedCourse, t, user?.userRole]);

  const sectionOptions = useMemo(
    () => (
      (() => {
        const sectionValues = new Set(
          (selectedCourseMeta?.sections || []).map((section) => normalizeGroupKey(section)).filter(Boolean),
        );

        courseRecords.forEach((record) => {
          if (!selectedLectureType || normalizeTypeKey(record.lectureType || record.type) === normalizeTypeKey(selectedLectureType)) {
            const group = normalizeGroupKey(record.group);
            if (group) {
              sectionValues.add(group);
            }
          }
        });

        const values = [...sectionValues];

        return values.length
          ? values.map((section) => ({ value: section, label: `${t('groupLabel')} ${section}` }))
          : [{ value: 'A', label: `${t('groupLabel')} A` }, { value: 'B', label: `${t('groupLabel')} B` }];
      })()
    ),
    [courseRecords, selectedCourseMeta, selectedLectureType, t],
  );

  const availableWeekOptions = useMemo(() => {
    const weeks = new Set();

    courseRecords.forEach((record) => {
      const matchesType = !selectedLectureType || normalizeTypeKey(record.lectureType || record.type) === normalizeTypeKey(selectedLectureType);
      const matchesGroup = !selectedSection || normalizeGroupKey(record.group) === normalizeGroupKey(selectedSection);

      if (matchesType && matchesGroup) {
        const week = normalizeWeekKey(record.week);
        if (week) {
          weeks.add(week);
        }
      }
    });

    const values = [...weeks].sort((left, right) => Number(left) - Number(right));
    return values.length
      ? values.map((week) => ({ value: week, label: `Week ${week}` }))
      : weekOptions;
  }, [courseRecords, selectedLectureType, selectedSection]);

  const mergedCourseOptions = useMemo(() => {
    if (isDoctorRole(user?.userRole)) {
      return courseOptions;
    }

    const grouped = new Map();

    [...courseOptions, ...attendanceDerivedCourses].forEach((courseOption) => {
      if (!courseOption?.value) return;
      if (!grouped.has(courseOption.value)) {
        grouped.set(courseOption.value, courseOption);
      }
    });

    return [...grouped.values()];
  }, [attendanceDerivedCourses, courseOptions, user?.userRole]);

  const sessionKey = buildTypedSessionKey(selectedCourse, selectedLectureType, selectedSection, selectedWeek);
  const legacySessionKey = buildLegacySessionKey(selectedCourse, selectedSection, selectedWeek);
  const recordMatchesSelection = useCallback((record, { includeWeek = false } = {}) => (
    normalizeCourseKey(record.courseCode || record.course) === normalizeCourseKey(selectedCourse)
    && normalizeTypeKey(record.lectureType || record.type) === normalizeTypeKey(selectedLectureType)
    && normalizeGroupKey(record.group) === normalizeGroupKey(selectedSection)
    && (!includeWeek || normalizeWeekKey(record.week) === normalizeWeekKey(selectedWeek))
  ), [selectedCourse, selectedLectureType, selectedSection, selectedWeek]);

  const selectedWeekRecords = useMemo(() => (
    sessionKey
      ? dedupeByStudent(storedAttendanceRecords.filter((record) => recordMatchesSelection(record, { includeWeek: true })))
      : []
  ), [recordMatchesSelection, sessionKey, storedAttendanceRecords]);

  const sessionHistoricalRecords = useMemo(() => (
    selectedCourse && selectedSection
      ? storedAttendanceRecords.filter((record) => (
        normalizeCourseKey(record.courseCode || record.course) === normalizeCourseKey(selectedCourse)
        && normalizeTypeKey(record.lectureType || record.type) === normalizeTypeKey(selectedLectureType)
        && normalizeGroupKey(record.group) === normalizeGroupKey(selectedSection)
      ))
      : []
  ), [selectedCourse, selectedLectureType, selectedSection, storedAttendanceRecords]);

  const storedSessionData = useMemo(() => selectedWeekRecords.map((record) => ({
    id: record.studentId || record.studentUniversityId || record.id,
    studentId: record.studentId || record.studentUniversityId || record.id,
    name: record.studentName || 'Unknown Student',
    universityId: record.studentUniversityId || record.studentId || '',
    scanTime: buildScanTime(record.time || record.scanTime, record.timestamp, record.scannedAt, record.createdAt),
    status: 'present',
  })), [selectedWeekRecords]);

  const hasLiveSessionEntry = useMemo(() => {
    if (!sessionKey) return false;

    return Object.prototype.hasOwnProperty.call(allSessions, sessionKey)
      || Object.prototype.hasOwnProperty.call(allSessions, legacySessionKey);
  }, [allSessions, legacySessionKey, sessionKey]);

  const fallbackSessionData = sessionKey
    ? (allSessions[sessionKey] ?? allSessions[legacySessionKey] ?? null)
    : null;
  const sessionData = storedSessionData.length ? storedSessionData : fallbackSessionData;
  const hasSelectedSession = selectedWeekRecords.length > 0 || hasLiveSessionEntry;

  const registeredStudents = useMemo(() => (
    managedStudents.filter((student) => (
      (student.registrations || []).some((registration) => (
        normalizeCourseKey(registration.subjectCode) === normalizeCourseKey(selectedCourse)
        && normalizeTypeKey(registration.type) === normalizeTypeKey(selectedLectureType)
        && normalizeGroupKey(registration.group) === normalizeGroupKey(selectedSection)
      ))
    ))
  ), [managedStudents, selectedCourse, selectedLectureType, selectedSection]);

  const studentKey = (student) => String(student.id || student.studentId || student.universityId || '').trim();
  const studentUniversityId = (student) => String(student.universityId || student.studentId || student.id || '').trim();
  const studentDisplayName = (student) => student.fullName || student.name || student.email || 'Unknown Student';

  const registeredIdentifiers = useMemo(() => {
    const identifiers = new Set();

    registeredStudents.forEach((student) => {
      getIdentifierCandidates(student).forEach((identifier) => identifiers.add(identifier));
    });

    return identifiers;
  }, [registeredStudents]);

  const registeredRosterStudents = useMemo(() => (
    registeredStudents.map((student) => ({
      id: studentKey(student),
      studentId: studentKey(student),
      name: studentDisplayName(student),
      universityId: studentUniversityId(student),
      isRegistered: true,
    }))
  ), [registeredStudents]);

  const sessionRosterStudents = useMemo(() => (
    ((sessionData || []).length ? sessionData : []).map((student) => ({
      id: student.id || student.universityId,
      studentId: student.studentId || student.universityId || student.id,
      name: student.name,
      universityId: student.universityId || student.id,
      isRegistered: getIdentifierCandidates(student).some((identifier) => registeredIdentifiers.has(identifier)),
    }))
  ), [registeredIdentifiers, sessionData]);

  const rosterStudents = useMemo(() => {
    if (ignoreRegistration) {
      return mergeRosterStudents(registeredRosterStudents, sessionRosterStudents);
    }

    if (hasSelectedSession && registeredRosterStudents.length) {
      return registeredRosterStudents;
    }

    return sessionRosterStudents;
  }, [hasSelectedSession, ignoreRegistration, registeredRosterStudents, sessionRosterStudents]);

  const openedWeeksCount = useMemo(() => {
    const openedWeeks = new Set(
      sessionHistoricalRecords
        .map((record) => normalizeWeekKey(record.week))
        .filter(Boolean),
    );

    if (hasSelectedSession) {
      openedWeeks.add(normalizeWeekKey(selectedWeek));
    }

    return openedWeeks.size;
  }, [hasSelectedSession, selectedWeek, sessionHistoricalRecords]);

  const reportStudents = useMemo(() => {
    return rosterStudents.map((student) => {
      const studentIdentifiers = new Set(getIdentifierCandidates(student));
      const attendedWeeks = new Set();

      sessionHistoricalRecords.forEach((record) => {
        const recordIdentifiers = getIdentifierCandidates(record);

        if (recordIdentifiers.some((identifier) => studentIdentifiers.has(identifier))) {
          attendedWeeks.add(normalizeWeekKey(record.week));
        }
      });

      const currentAttendance = (sessionData || []).find((sessionStudent) => (
        getIdentifierCandidates(sessionStudent).some((identifier) => studentIdentifiers.has(identifier))
      ));

      if (currentAttendance && hasSelectedSession) {
        attendedWeeks.add(normalizeWeekKey(selectedWeek));
      }

      const isRegisteredStudent = Boolean(student.isRegistered);
      const attendedCount = isRegisteredStudent
        ? (openedWeeksCount ? attendedWeeks.size : (currentAttendance ? 1 : 0))
        : (currentAttendance ? 1 : attendedWeeks.size);
      const absentSessions = isRegisteredStudent
        ? Math.max(0, openedWeeksCount - attendedCount)
        : 0;
      const attendanceRate = isRegisteredStudent
        ? (openedWeeksCount ? Math.round((attendedCount / openedWeeksCount) * 100) : 0)
        : (attendedCount ? 100 : 0);
      const absenceRate = isRegisteredStudent
        ? (openedWeeksCount ? Math.max(0, 100 - attendanceRate) : 0)
        : (attendedCount ? 0 : 100);

      return {
        ...student,
        scanTime: currentAttendance?.scanTime || '-',
        status: currentAttendance ? 'present' : 'absent',
        attendedCount,
        absentCount: absentSessions,
        attendanceRate,
        absenceRate,
        hasAlert: isRegisteredStudent ? attendanceRate < 75 : false,
      };
    });
  }, [hasSelectedSession, openedWeeksCount, rosterStudents, selectedWeek, sessionData, sessionHistoricalRecords]);

  const totalRosterStudents = reportStudents.length || 0;
  const presentCount = reportStudents.filter((student) => student.status === 'present').length;
  const absentCount = reportStudents.length ? reportStudents.filter((student) => student.status === 'absent').length : (sessionData ? Math.max(0, totalRosterStudents - presentCount) : 0);
  const attendanceRate = reportStudents.length
    ? Math.round((presentCount / reportStudents.length) * 100)
    : ((sessionData && totalRosterStudents) ? Math.round((presentCount / totalRosterStudents) * 100) : 0);
  const allFiltersSet = Boolean(sessionKey);
  const hasReportData = Boolean(reportStudents.length || sessionData?.length || hasSelectedSession);

  const filteredStudents = useMemo(() => {
    if (!reportStudents.length) return [];

    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) return reportStudents;

    return reportStudents.filter((student) => (
      String(student.name || '').toLowerCase().includes(normalizedQuery)
      || String(student.universityId || '').toLowerCase().includes(normalizedQuery)
    ));
  }, [searchTerm, reportStudents]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  }, [currentPage, filteredStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ignoreRegistration, searchTerm, selectedCourse, selectedLectureType, selectedSection, selectedWeek]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
    setSelectedLectureType('');
    setSelectedSection('');
    setSelectedWeek('');
    setSearchTerm('');
  };

  const handleLectureTypeChange = (event) => {
    setSelectedLectureType(event.target.value);
    setSelectedSection('');
    setSelectedWeek('');
    setSearchTerm('');
  };

  const handleExportExcel = () => {
    if (!filteredStudents.length) return;

    const rows = filteredStudents.map((student, index) => ({
      '#': index + 1,
      'Student Name': student.name,
      'University ID': student.universityId,
      'Time Scanned': student.scanTime,
      Status: student.status === 'present' ? 'Present' : 'Absent',
      'Registered In Course': student.isRegistered ? 'Yes' : 'No',
      'Attended Count': student.attendedCount,
      'Absent Count': student.absentCount,
      'Attendance Rate': `${student.attendanceRate}%`,
      'Absence Rate': `${student.absenceRate}%`,
      Alert: student.hasAlert ? 'Alert - absence exceeds 25%' : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 15 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedLectureType} G${selectedSection} - Week ${selectedWeek}`);
    XLSX.writeFile(workbook, `Report_${selectedCourse}_${selectedLectureType}_Group${selectedSection}_Week${selectedWeek}.xlsx`);
  };

  return (
    <div className="tw-page-shell min-h-full px-2 py-4 md:px-1 md:py-5">
      <div className="flex w-full max-w-none flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6">
            <div className="tw-card p-5 md:p-6">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-text-primary">{t('reportsFiltersTitle')}</h2>
                <p className="mt-1 text-sm text-text-secondary">{t('reportsFiltersDescription')}</p>
              </div>

              <div className="grid gap-4">
                <CustomDropdown
                  id="reports-course"
                  name="reports-course"
                  label={t('courseLabel')}
                  value={selectedCourse}
                  onChange={handleCourseChange}
                  options={mergedCourseOptions}
                  placeholder={t('reportsSelectCourse')}
                  searchable
                  searchPlaceholder={t('searchLabel')}
                  Icon={() => <BookOpen size={16} />}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <CustomDropdown
                  id="reports-type"
                  name="reports-type"
                  label={t('lectureTypeLabel')}
                  value={selectedLectureType}
                  onChange={handleLectureTypeChange}
                  options={lectureTypeOptions}
                  placeholder={t('selectLectureType')}
                  disabled={!selectedCourse}
                  Icon={() => <BookOpen size={16} />}
                />
                <CustomDropdown
                  id="reports-section"
                  name="reports-section"
                  label={t('groupLabel')}
                  value={selectedSection}
                  onChange={(event) => { setSelectedSection(event.target.value); setSelectedWeek(''); }}
                  options={sectionOptions}
                  placeholder={t('selectGroup')}
                  disabled={!selectedCourse || !selectedLectureType}
                  Icon={() => <UsersRound size={16} />}
                />
                <CustomDropdown
                  id="reports-week"
                  name="reports-week"
                  label={t('weekLabel')}
                  value={selectedWeek}
                  onChange={(event) => setSelectedWeek(event.target.value)}
                  options={availableWeekOptions}
                  placeholder={t('reportsSelectWeek')}
                  disabled={!selectedCourse || !selectedLectureType || !selectedSection}
                  Icon={() => <CalendarDays size={16} />}
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface-muted/50 px-4 py-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border bg-surface"
                  checked={ignoreRegistration}
                  onChange={(event) => setIgnoreRegistration(event.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-text-primary">{t('reportsIgnoreRegistrationToggle')}</span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">{t('reportsIgnoreRegistrationHint')}</span>
                </span>
              </label>
            </div>

            {!allFiltersSet ? (
              <div className="tw-card flex min-h-[380px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-accent">
                  <Activity size={34} />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-text-primary">{t('reportsEmptyTitle')}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  {t('reportsEmptyDescription')}
                </p>
              </div>
            ) : !hasReportData ? (
              <div className="tw-card flex min-h-[380px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                  <Eye size={34} />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-text-primary">{t('reportsNoRecordsTitle')}</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  {t('reportsNoRecordsDescription')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Check size={14} />
                      {t('reportsPresentMetric')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-accent">{presentCount}</div>
                    <p className="mt-1 text-sm text-text-secondary">{t('reportsPresentMetricDescription')}</p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <UsersRound size={14} />
                      {t('reportsAbsentMetric')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{absentCount}</div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {ignoreRegistration ? t('reportsAbsentMetricDescriptionIgnore') : t('reportsAbsentMetricDescription')}
                    </p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Activity size={14} />
                      {t('reportsRateMetric')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{attendanceRate}%</div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {t('reportsRateMetricPrefix')} {totalRosterStudents} {ignoreRegistration ? t('reportsRateMetricRosterSuffix') : t('reportsRateMetricSuffix')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    className="tw-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    onClick={handleExportExcel}
                    disabled={filteredStudents.length === 0}
                  >
                    <Check size={16} />
                    {t('reportsExport')}
                  </button>
                </div>

                <div className="tw-card overflow-hidden">
                  <div className="flex flex-col gap-4 border-b border-border bg-surface-muted/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">{t('reportsRosterTitle')}</h3>
                      <p className="text-sm text-text-secondary">{t('reportsRosterDescription')}</p>
                    </div>
                    <div className="w-full max-w-sm">
                      <CustomInput
                        id="reports-search"
                        name="reports-search"
                        label={t('searchLabel')}
                        placeholder={t('reportsSearchPlaceholder')}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        icon={() => <UserCircle2 size={16} />}
                      />
                    </div>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                        <UsersRound size={28} />
                      </div>
                      <h4 className="mt-4 text-lg font-bold text-text-primary">{t('reportsSearchEmptyTitle')}</h4>
                      <p className="mt-2 max-w-md text-sm text-text-secondary">
                        {t('reportsSearchEmptyDescription')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden">
                        <div className="divide-y divide-border">
                          {paginatedStudents.map((student, index) => {
                            const absoluteIndex = (currentPage - 1) * STUDENTS_PER_PAGE + index;
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
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-sm font-semibold text-text-primary">{student.name}</p>
                                      {ignoreRegistration && !student.isRegistered ? (
                                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                                          {t('reportsUnregisteredBadge')}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                                      <UserCircle2 size={12} />
                                      {t('reportsRecordedStudent')}
                                    </p>

                                    <div className="mt-3 grid gap-2">
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                          {t('reportsUniversityIdColumn')}
                                        </p>
                                        <p className="mt-1 font-mono text-sm text-text-secondary">{student.universityId}</p>
                                      </div>

                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                          {t('reportsScanTimeColumn')}
                                        </p>
                                        <div className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                                          <Clock3 size={13} />
                                          {student.scanTime}
                                        </div>
                                      </div>

                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                          {t('reportsStatusColumn')}
                                        </p>
                                        <div className={`mt-1 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${student.status === 'present' ? 'bg-primary/10 text-accent' : 'bg-red-500/10 text-red-300'}`}>
                                          <Check size={13} />
                                          {student.status === 'present' ? t('reportsPresentStatus') : 'Absent'}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-muted/50 p-3">
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Attended</p>
                                          <p className="mt-1 text-sm font-bold text-accent">{student.attendedCount}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Absent</p>
                                          <p className="mt-1 text-sm font-bold text-red-300">{student.absentCount}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Attendance %</p>
                                          <p className={`mt-1 text-sm font-bold ${student.hasAlert ? 'text-red-300' : 'text-text-secondary'}`}>
                                            {student.attendanceRate}%
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <div className="min-w-[1180px]">
                        <div className="grid grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_140px_120px_120px_120px_120px_140px] gap-4 border-b border-border bg-surface-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>#</span>
                          <span>{t('reportsStudentColumn')}</span>
                          <span>{t('reportsUniversityIdColumn')}</span>
                          <span>{t('reportsScanTimeColumn')}</span>
                          <span>{t('reportsStatusColumn')}</span>
                          <span>Attended</span>
                          <span>Absent</span>
                          <span>Attendance %</span>
                          <span>Alert</span>
                        </div>

                        {paginatedStudents.map((student, index) => {
                          const absoluteIndex = (currentPage - 1) * STUDENTS_PER_PAGE + index;
                          const [firstColor, secondColor] = avatarColor(absoluteIndex);

                          return (
                            <div
                              key={student.id}
                              className="grid grid-cols-[64px_minmax(0,1.5fr)_minmax(0,1fr)_140px_120px_120px_120px_120px_140px] items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-200 hover:bg-surface-muted/30"
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
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-text-primary">{student.name}</p>
                                    {ignoreRegistration && !student.isRegistered ? (
                                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                                        {t('reportsUnregisteredBadge')}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                                    <UserCircle2 size={12} />
                                    {t('reportsRecordedStudent')}
                                  </p>
                                </div>
                              </div>

                              <div className="font-mono text-sm text-text-secondary">{student.universityId}</div>

                              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                                <Clock3 size={13} />
                                {student.scanTime}
                              </div>

                              <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${student.status === 'present' ? 'bg-primary/10 text-accent' : 'bg-red-500/10 text-red-300'}`}>
                                <Check size={13} />
                                {student.status === 'present' ? t('reportsPresentStatus') : 'Absent'}
                              </div>

                              <div className="text-sm font-bold text-accent">{student.attendedCount}</div>

                              <div className="text-sm font-bold text-red-300">{student.absentCount}</div>

                              <div className="text-sm font-semibold text-text-secondary">{student.attendanceRate}%</div>

                              <div className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${student.hasAlert ? 'bg-red-500/10 text-red-300' : 'bg-surface-muted text-text-secondary'}`}>
                                {student.hasAlert ? 'Alert' : 'OK'}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </>
                  )}

                  {filteredStudents.length > STUDENTS_PER_PAGE ? (
                    <div className="border-t border-border px-5 py-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
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
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{t('reportsSummaryTitle')}</h2>
                  <p className="text-sm text-text-secondary">{t('reportsSummaryDescription')}</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t('reportsCourseLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{selectedCourse || t('reportsNotSelected')}</p>
                  </div>
                  <BookOpen size={18} className="text-accent" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t('reportsSectionLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {selectedSection ? `${t(`studentsTypeOption${selectedLectureType}`)} · ${t('groupLabel')} ${selectedSection}` : t('reportsNotSelected')}
                    </p>
                  </div>
                  <UsersRound size={18} className="text-accent" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t('reportsWeekLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{selectedWeek ? `${t('reportsWeekPrefix')} ${selectedWeek}` : t('reportsNotSelected')}</p>
                  </div>
                  <CalendarDays size={18} className="text-accent" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{t('reportsSearchResultsLabel')}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{filteredStudents.length}</p>
                  </div>
                  <Eye size={18} className="text-accent" />
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default ReportsPageTailwind;
