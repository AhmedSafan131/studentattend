import React, { useCallback, useMemo, useState } from 'react';
import CustomDropdown from '../../../components/CustomDropdown';
import CustomInput from '../../../components/CustomInput';
import { Activity, BookOpen, CalendarDays, Check, Clock3, UserCircle2, UsersRound, X } from '../../../assets/icons';
import { COURSES } from '../../../utils/constants';
import { useDashboard } from '../../../hooks';

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

const AttendancePageTailwind = () => {
  const { allSessions = {} } = useDashboard();
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [addId, setAddId] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');
  const [localOverrides, setLocalOverrides] = useState({});

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
  };

  const handleAdd = () => {
    if (!sessionKey) return;

    const trimmedId = addId.trim();
    const trimmedName = addName.trim();

    if (!trimmedId) {
      setAddError('Student ID is required.');
      return;
    }

    if (!trimmedName) {
      setAddError('Student name is required.');
      return;
    }

    if (students.some((student) => student.id === trimmedId)) {
      setAddError('A student with this ID already exists in this session.');
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

  return (
    <div className="tw-page-shell overflow-y-auto px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-surface-card via-surface-card to-surface-muted px-6 py-7 shadow-float md:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-primary/10 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                <Activity size={14} />
                Attendance Workspace
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                Attendance records, redesigned for faster review.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary md:text-base">
                Filter by course, section, and week, then review live and seeded attendance, export reports, or add manual entries without leaving the page.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <BookOpen size={14} />
                  Course
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{filterCourse || '--'}</div>
              </div>
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <CalendarDays size={14} />
                  Week
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{filterWeek ? `Week ${filterWeek}` : '--'}</div>
              </div>
              <div className="tw-card min-w-[160px] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  <UsersRound size={14} />
                  Present
                </div>
                <div className="mt-2 text-lg font-bold text-text-primary">{students.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <div className="tw-card p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Session filters</h2>
                  <p className="mt-1 text-sm text-text-secondary">Use the shared dropdowns to isolate a specific attendance window.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted">
                  <Check size={14} className="text-accent" />
                  Tailwind + shared inputs
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <CustomDropdown
                  id="attendance-course"
                  name="attendance-course"
                  label="COURSE"
                  value={filterCourse}
                  onChange={handleCourseChange}
                  options={courseOptions}
                  placeholder="Select course"
                  Icon={() => <BookOpen size={16} />}
                />
                <CustomDropdown
                  id="attendance-section"
                  name="attendance-section"
                  label="SECTION"
                  value={filterSection}
                  onChange={(event) => setFilterSection(event.target.value)}
                  options={sectionOptions}
                  placeholder="Select section"
                  disabled={!filterCourse}
                  Icon={() => <UsersRound size={16} />}
                />
                <CustomDropdown
                  id="attendance-week"
                  name="attendance-week"
                  label="WEEK"
                  value={filterWeek}
                  onChange={(event) => setFilterWeek(event.target.value)}
                  options={weekOptions}
                  placeholder="Select week"
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
                <h3 className="mt-6 text-2xl font-bold text-text-primary">Pick a session to inspect</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
                  Choose a course, section, and week to unlock exports, manual attendance entry, and the full student attendance list.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <BookOpen size={14} />
                      Selected course
                    </div>
                    <div className="mt-3 text-lg font-bold text-accent">{filterCourse}</div>
                    <p className="mt-1 text-sm text-text-secondary">Current teaching group: Section {filterSection}</p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Clock3 size={14} />
                      Attendance window
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">Week {filterWeek}</div>
                    <p className="mt-1 text-sm text-text-secondary">{students.length} students recorded in this session.</p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Activity size={14} />
                      Active sessions
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{activeSessionsCount}</div>
                    <p className="mt-1 text-sm text-text-secondary">Export one session or every stored session for this course.</p>
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
                    Export this week
                  </button>
                  <button
                    type="button"
                    className="tw-btn-secondary"
                    onClick={handleExportAll}
                  >
                    <Activity size={16} />
                    Export all sessions
                  </button>
                </div>

                <div className="tw-card overflow-hidden">
                  <div className="flex flex-col gap-2 border-b border-border bg-surface-muted/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">Attendance roster</h3>
                      <p className="text-sm text-text-secondary">Review every student captured for the selected session.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
                      <UsersRound size={14} />
                      {students.length} present
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                        <UsersRound size={28} />
                      </div>
                      <h4 className="mt-4 text-lg font-bold text-text-primary">No attendance records yet</h4>
                      <p className="mt-2 max-w-md text-sm text-text-secondary">
                        This session is ready, but no students have been recorded yet. Add a student manually or wait for live scans.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_72px] gap-4 border-b border-border bg-surface-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>#</span>
                          <span>Student</span>
                          <span>University ID</span>
                          <span>Scan time</span>
                          <span className="text-center">Action</span>
                        </div>

                        {students.map((student, index) => {
                          const [firstColor, secondColor] = avatarColor(index);

                          return (
                            <div
                              key={student.id}
                              className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_72px] items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-200 hover:bg-surface-muted/30"
                            >
                              <span className="text-sm font-semibold text-text-muted">{index + 1}</span>

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
                                    Present student
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
                                  title="Remove student"
                                  onClick={() => handleDelete(student.id)}
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
                  <h2 className="text-lg font-bold text-text-primary">Manual attendance entry</h2>
                  <p className="text-sm text-text-secondary">Add a student directly into the selected session.</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <CustomInput
                  id="attendance-student-id"
                  name="attendance-student-id"
                  label="STUDENT ID"
                  placeholder="e.g. 20201234"
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
                  label="STUDENT NAME"
                  placeholder="e.g. Ahmed Safan"
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
                  Add student
                </button>

                {!isSessionSelected ? (
                  <p className="text-xs leading-5 text-text-muted">
                    Select a course, section, and week first. Manual entry is enabled only when a session is active.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="tw-card p-5 md:p-6">
              <h3 className="text-lg font-bold text-text-primary">Session snapshot</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Course</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{filterCourse || 'Not selected'}</p>
                  </div>
                  <BookOpen size={18} className="text-accent" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Section</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{filterSection ? `Section ${filterSection}` : 'Not selected'}</p>
                  </div>
                  <UsersRound size={18} className="text-accent" />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-surface-muted/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Week</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{filterWeek ? `Week ${filterWeek}` : 'Not selected'}</p>
                  </div>
                  <CalendarDays size={18} className="text-accent" />
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default AttendancePageTailwind;
