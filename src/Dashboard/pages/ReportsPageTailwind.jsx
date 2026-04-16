import React, { useEffect, useMemo, useState } from 'react';
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

const SEED_SESSIONS = {
  CS301__A__6: [
    { id: '20201001', name: 'Ahmed Safan', universityId: '20201001', scanTime: '10:05:12 AM', status: 'present' },
    { id: '20201002', name: 'Liam Carter', universityId: '20201002', scanTime: '10:06:44 AM', status: 'present' },
    { id: '20201003', name: 'Sara Mohamed', universityId: '20201003', scanTime: '10:08:01 AM', status: 'present' },
    { id: '20201004', name: 'Omar Hassan', universityId: '20201004', scanTime: '10:09:30 AM', status: 'present' },
    { id: '20201005', name: 'Nour Khalil', universityId: '20201005', scanTime: '10:11:55 AM', status: 'present' },
    { id: '20201006', name: 'Youssef Adel', universityId: '20201006', scanTime: '10:14:02 AM', status: 'present' },
    { id: '20201007', name: 'Farah El-Sayed', universityId: '20201007', scanTime: '10:15:18 AM', status: 'present' },
  ],
  CS301__B__6: [
    { id: '20201010', name: 'Ali Mahmoud', universityId: '20201010', scanTime: '11:02:05 AM', status: 'present' },
    { id: '20201011', name: 'Dina Ramzy', universityId: '20201011', scanTime: '11:04:47 AM', status: 'present' },
    { id: '20201012', name: 'Tarek Ibrahim', universityId: '20201012', scanTime: '11:05:33 AM', status: 'present' },
    { id: '20201013', name: 'Mona Fathy', universityId: '20201013', scanTime: '11:08:21 AM', status: 'present' },
  ],
  CS301__A__5: [
    { id: '20201001', name: 'Ahmed Safan', universityId: '20201001', scanTime: '10:03:45 AM', status: 'present' },
    { id: '20201002', name: 'Liam Carter', universityId: '20201002', scanTime: '10:05:12 AM', status: 'present' },
    { id: '20201004', name: 'Omar Hassan', universityId: '20201004', scanTime: '10:07:29 AM', status: 'present' },
    { id: '20201005', name: 'Nour Khalil', universityId: '20201005', scanTime: '10:09:55 AM', status: 'present' },
    { id: '20201006', name: 'Youssef Adel', universityId: '20201006', scanTime: '10:12:08 AM', status: 'present' },
  ],
  CS201__A__6: [
    { id: '20201020', name: 'Karim Sherif', universityId: '20201020', scanTime: '08:15:00 AM', status: 'present' },
    { id: '20201021', name: 'Layla Nasser', universityId: '20201021', scanTime: '08:17:32 AM', status: 'present' },
    { id: '20201022', name: 'Mariam Tawfik', universityId: '20201022', scanTime: '08:20:14 AM', status: 'present' },
    { id: '20201023', name: 'Hassan El-Din', universityId: '20201023', scanTime: '08:22:41 AM', status: 'present' },
    { id: '20201024', name: 'Rania Fouad', universityId: '20201024', scanTime: '08:25:09 AM', status: 'present' },
    { id: '20201025', name: 'Samy Gamal', universityId: '20201025', scanTime: '08:28:33 AM', status: 'present' },
    { id: '20201026', name: 'Hala Zaki', universityId: '20201026', scanTime: '08:30:01 AM', status: 'present' },
    { id: '20201027', name: 'Adel Mansour', universityId: '20201027', scanTime: '08:31:47 AM', status: 'present' },
    { id: '20201028', name: 'Noha Salem', universityId: '20201028', scanTime: '08:34:22 AM', status: 'present' },
  ],
};

const TOTAL_PER_COURSE = { CS301: 12, CS201: 14, CS501: 10, MATH211: 11 };

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

const avatarColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

const ReportsPageTailwind = () => {
  const { t } = useLanguage();
  const { reportCourses } = useAuth();
  const { allSessions = {} } = useDashboard();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const courseOptions = useMemo(() => {
    const seen = new Set();
    return reportCourses
      .filter((course) => {
        if (seen.has(course.id)) return false;
        seen.add(course.id);
        return true;
      })
      .map((course) => ({ value: course.id, label: course.name }));
  }, [reportCourses]);

  const selectedCourseMeta = useMemo(
    () => reportCourses.find((course) => course.id === selectedCourse),
    [reportCourses, selectedCourse],
  );

  const sectionOptions = useMemo(
    () => (
      selectedCourseMeta?.sections?.length
        ? selectedCourseMeta.sections.map((section) => ({ value: section, label: `Section ${section}` }))
        : [{ value: 'A', label: 'Section A' }, { value: 'B', label: 'Section B' }]
    ),
    [selectedCourseMeta],
  );

  const sessionKey = selectedCourse && selectedSection && selectedWeek
    ? `${selectedCourse}__${selectedSection}__${selectedWeek}`
    : null;

  const sessionData = sessionKey ? (allSessions[sessionKey] ?? SEED_SESSIONS[sessionKey] ?? null) : null;
  const totalRegistered = TOTAL_PER_COURSE[selectedCourse] || 30;
  const presentCount = sessionData ? sessionData.length : 0;
  const absentCount = sessionData ? Math.max(0, totalRegistered - presentCount) : 0;
  const attendanceRate = sessionData ? Math.round((presentCount / totalRegistered) * 100) : 0;
  const allFiltersSet = Boolean(sessionKey);

  const filteredStudents = useMemo(() => {
    if (!sessionData) return [];

    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) return sessionData;

    return sessionData.filter((student) => (
      student.name.toLowerCase().includes(normalizedQuery)
      || student.universityId.toLowerCase().includes(normalizedQuery)
    ));
  }, [searchTerm, sessionData]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + STUDENTS_PER_PAGE);
  }, [currentPage, filteredStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourse, selectedSection, selectedWeek, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCourseChange = (event) => {
    setSelectedCourse(event.target.value);
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
      Status: 'Present',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 15 },
      { wch: 16 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Section ${selectedSection} - Week ${selectedWeek}`);
    XLSX.writeFile(workbook, `Report_${selectedCourse}_Section${selectedSection}_Week${selectedWeek}.xlsx`);
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
                  options={courseOptions}
                  placeholder={t('reportsSelectCourse')}
                  Icon={() => <BookOpen size={16} />}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <CustomDropdown
                  id="reports-section"
                  name="reports-section"
                  label={t('sectionLabel')}
                  value={selectedSection}
                  onChange={(event) => setSelectedSection(event.target.value)}
                  options={sectionOptions}
                  placeholder={t('reportsSelectSection')}
                  disabled={!selectedCourse}
                  Icon={() => <UsersRound size={16} />}
                />
                <CustomDropdown
                  id="reports-week"
                  name="reports-week"
                  label={t('weekLabel')}
                  value={selectedWeek}
                  onChange={(event) => setSelectedWeek(event.target.value)}
                  options={weekOptions}
                  placeholder={t('reportsSelectWeek')}
                  disabled={!selectedCourse}
                  Icon={() => <CalendarDays size={16} />}
                />
              </div>
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
            ) : !sessionData ? (
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
                    <p className="mt-1 text-sm text-text-secondary">{t('reportsAbsentMetricDescription')}</p>
                  </div>
                  <div className="tw-card p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <Activity size={14} />
                      {t('reportsRateMetric')}
                    </div>
                    <div className="mt-3 text-lg font-bold text-text-primary">{attendanceRate}%</div>
                    <p className="mt-1 text-sm text-text-secondary">{t('reportsRateMetricPrefix')} {totalRegistered} {t('reportsRateMetricSuffix')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="tw-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_140px] gap-4 border-b border-border bg-surface-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>#</span>
                          <span>{t('reportsStudentColumn')}</span>
                          <span>{t('reportsUniversityIdColumn')}</span>
                          <span>{t('reportsScanTimeColumn')}</span>
                          <span>{t('reportsStatusColumn')}</span>
                        </div>

                        {paginatedStudents.map((student, index) => {
                          const absoluteIndex = (currentPage - 1) * STUDENTS_PER_PAGE + index;
                          const [firstColor, secondColor] = avatarColor(absoluteIndex);

                          return (
                            <div
                              key={student.id}
                              className="grid grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_160px_140px] items-center gap-4 border-b border-border px-5 py-4 transition-colors duration-200 hover:bg-surface-muted/30"
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
                                    {t('reportsRecordedStudent')}
                                  </p>
                                </div>
                              </div>

                              <div className="font-mono text-sm text-text-secondary">{student.universityId}</div>

                              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                                <Clock3 size={13} />
                                {student.scanTime}
                              </div>

                              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
                                <Check size={13} />
                                {t('reportsPresentStatus')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                    <p className="mt-1 text-sm font-semibold text-text-primary">{selectedSection ? `${t('reportsSectionPrefix')} ${selectedSection}` : t('reportsNotSelected')}</p>
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
