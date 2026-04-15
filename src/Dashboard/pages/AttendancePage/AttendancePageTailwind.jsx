import React, { useCallback, useMemo, useRef, useState } from 'react';
import CustomDropdown from '../../../components/CustomDropdown';
import CustomInput from '../../../components/CustomInput';
import ConfirmationDialog from '../../../components/ConfirmationDialog';
import Pagination from '../../../components/Pagination';
import { Activity, BookOpen, CalendarDays, Check, Clock3, UserCircle2, UsersRound, X } from '../../../assets/icons';
import { COURSES } from '../../../utils/constants';
import { useDashboard, useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';

function downloadXLSX(rows, headers, filename) {
  const XLSX = window.XLSX;

  if (!XLSX) {
    alert('Excel library not loaded yet. Please refresh the page.');
    return;
  }

  const aoaData = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.max(header.length, ...rows.map((row) => String(row[header] ?? '').length)) + 2,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  XLSX.writeFile(workbook, filename);
}

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

const SEED_RECORDS = {
  CS101__A__1: [
    { id: '20201001', name: 'Ahmed Safan', universityId: '20201001', scanTime: '08:15:02 AM' },
    { id: '20201002', name: 'Liam Carter', universityId: '20201002', scanTime: '08:16:45 AM' },
    { id: '20201003', name: 'Sara Hassan', universityId: '20201003', scanTime: '08:17:10 AM' },
  ],
  CS101__B__2: [
    { id: '20201010', name: 'Omar Khalid', universityId: '20201010', scanTime: '09:02:33 AM' },
  ],
  CS201__A__3: [
    { id: '20201020', name: 'Nora Ali', universityId: '20201020', scanTime: '10:05:11 AM' },
    { id: '20201021', name: 'Karim Samir', universityId: '20201021', scanTime: '10:06:58 AM' },
  ],
};

const avatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const weekOptions = Array.from({ length: 14 }, (_, index) => ({
  value: String(index + 1),
  label: `Week ${index + 1}`,
}));

const DEFAULT_PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const AttendancePageTailwind = () => {
  const { t } = useLanguage();
  const { allSessions = {} } = useDashboard();
  const { showToast } = useToast();
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [addId, setAddId] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);
  const paginationRef = useRef(null);

  const courseOptions = useMemo(
    () => COURSES.map((course) => ({ value: course.id, label: course.name })),
    [],
  );

  const selectedCourse = COURSES.find((course) => course.id === filterCourse);
  const sectionOptions = useMemo(
    () => (selectedCourse ? selectedCourse.sections.map((section) => ({ value: section, label: `Section ${section}` })) : []),
    [selectedCourse],
  );

  const sessionKey = filterCourse && filterSection && filterWeek
    ? `${filterCourse}__${filterSection}__${filterWeek}`
    : null;

  const students = useMemo(() => {
    if (!sessionKey) return [];

    const seed = SEED_RECORDS[sessionKey] || [];
    const live = allSessions[sessionKey] || [];
    const local = localOverrides[sessionKey] || [];
    const map = new Map();

    [...seed, ...live].forEach((student) => map.set(student.id, student));
    local.forEach((student) => {
      if (student._deleted) {
        map.delete(student.id);
      } else {
        map.set(student.id, student);
      }
    });

    return [...map.values()];
  }, [allSessions, localOverrides, sessionKey]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return students.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, students]);

  const activeSessionsCount = useMemo(() => {
    if (!filterCourse) return 0;

    return [...new Set(
      [...Object.keys(SEED_RECORDS), ...Object.keys(allSessions)]
        .filter((key) => key.startsWith(`${filterCourse}__`)),
    )].length;
  }, [allSessions, filterCourse]);

  const handleCourseChange = (event) => {
    setFilterCourse(event.target.value);
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

  const handleDelete = (studentId) => {
    if (!sessionKey) return;

    setLocalOverrides((previous) => ({
      ...previous,
      [sessionKey]: [
        ...(previous[sessionKey] || []).filter((student) => student.id !== studentId),
        { id: studentId, _deleted: true },
      ],
    }));
    setPendingDeleteStudent(null);
  };

  const handleAdd = () => {
    if (!sessionKey) return;

    const trimmedId = addId.trim();
    const trimmedName = addName.trim();

    if (!trimmedId) {
      setAddError(t('attendanceStudentIdRequired'));
      return;
    }

    if (!trimmedName) {
      setAddError(t('attendanceStudentNameRequired'));
      return;
    }

    if (students.some((student) => student.id === trimmedId)) {
      setAddError(t('attendanceStudentExists'));
      return;
    }

    const newStudent = {
      id: trimmedId,
      universityId: trimmedId,
      name: trimmedName,
      scanTime: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setLocalOverrides((previous) => ({
      ...previous,
      [sessionKey]: [
        ...(previous[sessionKey] || []).filter((student) => student.id !== trimmedId),
        newStudent,
      ],
    }));

    setAddId('');
    setAddName('');
    setAddError('');
    showToast({
      tone: 'success',
      title: t('attendanceStudentAddedToastTitle'),
      message: `${trimmedName} ${t('attendanceStudentAddedToastMessage')}`,
    });
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteStudent) return;
    handleDelete(pendingDeleteStudent.id);
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

  const handleExportSession = useCallback(() => {
    if (!sessionKey || students.length === 0) return;

    const headers = ['#', 'Name', 'Student ID', 'Scan Time', 'Course', 'Section', 'Week'];
    const rows = students.map((student, index) => ({
      '#': index + 1,
      Name: student.name,
      'Student ID': student.universityId,
      'Scan Time': student.scanTime,
      Course: filterCourse,
      Section: filterSection,
      Week: `Week ${filterWeek}`,
    }));

    downloadXLSX(rows, headers, `Attendance_${filterCourse}_Sec${filterSection}_Week${filterWeek}.xlsx`);
  }, [filterCourse, filterSection, filterWeek, sessionKey, students]);

  const handleExportAll = useCallback(() => {
    if (!filterCourse) return;

    const allKeys = [...new Set(
      [...Object.keys(SEED_RECORDS), ...Object.keys(allSessions)]
        .filter((key) => key.startsWith(`${filterCourse}__`)),
    )];

    if (allKeys.length === 0) return;

    const rows = [];

    allKeys.forEach((key) => {
      const [, section, week] = key.split('__');
      const map = new Map();

      [...(SEED_RECORDS[key] || []), ...(allSessions[key] || [])].forEach((student) => map.set(student.id, student));
      (localOverrides[key] || []).forEach((student) => {
        if (student._deleted) {
          map.delete(student.id);
        } else {
          map.set(student.id, student);
        }
      });

      [...map.values()].forEach((student, index) => {
        rows.push({
          '#': index + 1,
          Name: student.name,
          'Student ID': student.universityId,
          'Scan Time': student.scanTime,
          Course: filterCourse,
          Section: section,
          Week: `Week ${week}`,
        });
      });
    });

    if (rows.length === 0) return;

    downloadXLSX(rows, ['#', 'Name', 'Student ID', 'Scan Time', 'Course', 'Section', 'Week'], `Attendance_${filterCourse}_AllSessions.xlsx`);
  }, [allSessions, filterCourse, localOverrides]);

  const isSessionSelected = Boolean(sessionKey);

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
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-surface-card via-surface-card to-surface-muted px-6 py-7 shadow-float md:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                <Activity size={14} />
                {t('attendanceWorkspace')}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                {t('attendanceHeroTitle')}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary md:text-base">
                {t('attendanceHeroDescription')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <BookOpen size={14} />
                  {t('attendanceCourseCard')}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{filterCourse || '--'}</div>
              </div>
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <CalendarDays size={14} />
                  {t('attendanceWeekCard')}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{filterWeek ? `${t('reportsWeekPrefix')} ${filterWeek}` : '--'}</div>
              </div>
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <UsersRound size={14} />
                  {t('attendancePresentCard')}
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{students.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6">
            <div className="tw-card p-5 md:p-6">
              <div className="mb-5">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{t('attendanceFiltersTitle')}</h2>
                  <p className="mt-1 text-sm text-text-secondary">{t('attendanceFiltersDescription')}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <CustomDropdown
                  id="attendance-course"
                  name="attendance-course"
                  label={t('courseLabel')}
                  value={filterCourse}
                  onChange={handleCourseChange}
                  options={courseOptions}
                  placeholder={t('attendanceSelectCourse')}
                  Icon={() => <BookOpen size={16} />}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <CustomDropdown
                  id="attendance-section"
                  name="attendance-section"
                  label={t('sectionLabel')}
                  value={filterSection}
                  onChange={handleSectionChange}
                  options={sectionOptions}
                  placeholder={t('attendanceSelectSection')}
                  disabled={!filterCourse}
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
                  disabled={!filterCourse}
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
                    <p className="mt-1 text-sm text-text-secondary">{t('attendanceCurrentGroup')} {filterSection}</p>
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

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="tw-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleExportSession}
                    disabled={students.length === 0}
                  >
                    <Check size={16} />
                    {t('attendanceExportWeek')}
                  </button>
                  <button
                    type="button"
                    className="tw-btn-secondary"
                    onClick={handleExportAll}
                  >
                    <Activity size={16} />
                    {t('attendanceExportAll')}
                  </button>
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
                    <div className="overflow-x-auto">
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
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger transition-colors duration-200 hover:bg-danger/20"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                  <p className="text-sm text-text-secondary">{t('attendanceManualEntryDescription')}</p>
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
                  icon={() => <UsersRound size={16} />}
                />

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
                  icon={() => <UserCircle2 size={16} />}
                />

                {addError ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                    {addError}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="tw-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleAdd}
                  disabled={!sessionKey}
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
      />
    </div>
  );
};

export default AttendancePageTailwind;
