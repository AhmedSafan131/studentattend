import React, { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { useSelector } from 'react-redux';
import { BookOpen, CalendarDays, Check, Download, Eye, Search, UsersRound } from '../../assets/icons';
import { CustomBottom, CustomDropdown, CustomInput, Pagination } from '../../components';
import { useAuth } from '../../hooks';
import { useLanguage } from '../../i18n';
import { attendanceAPI } from '../../utils/api';
import { getScopedCourses, isDoctorRole, SESSION_TYPE_OPTIONS } from '../../utils/courseAccess';
import { buildAcademicWeekOptions } from '../../utils/academicWeek';
import {
  FACULTY_OPTIONS,
  getFacultyCollegeScopeNames,
  getFacultySubjectOptionsFromStudents,
} from './StudentsPage/utils/studentUtils';

const PAGE_SIZE = 10;
const EXPORT_PAGE_SIZE = 500;
const ALL_SUBJECTS_VALUE = '__all_subjects__';
const TYPE_KEYS = ['Lecture', 'Section', 'Practical'];
const TYPE_LABELS = {
  Lecture: { en: 'Lectures', ar: '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a' },
  Section: { en: 'Sections', ar: '\u0627\u0644\u0633\u0643\u0627\u0634\u0646' },
  Practical: { en: 'Practical', ar: '\u0627\u0644\u0639\u0645\u0644\u064a' },
};

const REPORT_HEADERS = {
  en: [
    'Student ID', 'Student Name', 'College', 'Course Code', 'Course Name',
    'Lectures - Student Attendance', 'Lectures - Total Sessions', 'Lectures - Student Absence', 'Lectures - Attendance Weeks', 'Lectures - Attendance Rate',
    'Sections - Student Attendance', 'Sections - Total Sections', 'Sections - Student Absence', 'Sections - Attendance Weeks', 'Sections - Attendance Rate',
    'Practical - Student Attendance', 'Practical - Total Practical', 'Practical - Student Absence', 'Practical - Attendance Weeks', 'Practical - Attendance Rate',
    'Student Total Attendance', 'Total Sessions', 'Student Total Absence', 'Overall Attendance Rate', 'Overall Absence Rate', 'Student Status',
  ],
  ar: [
    '\u0631\u0642\u0645 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0643\u0644\u064a\u0629', '\u0643\u0648\u062f \u0627\u0644\u0645\u0627\u062f\u0629', '\u0627\u0633\u0645 \u0627\u0644\u0645\u0627\u062f\u0629',
    '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a - \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a - \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a', '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a - \u063a\u064a\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a - \u0623\u0633\u0627\u0628\u064a\u0639 \u0627\u0644\u062d\u0636\u0648\u0631', '\u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a - \u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    '\u0627\u0644\u0633\u0643\u0627\u0634\u0646 - \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0633\u0643\u0627\u0634\u0646 - \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0643\u0627\u0634\u0646', '\u0627\u0644\u0633\u0643\u0627\u0634\u0646 - \u063a\u064a\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0633\u0643\u0627\u0634\u0646 - \u0623\u0633\u0627\u0628\u064a\u0639 \u0627\u0644\u062d\u0636\u0648\u0631', '\u0627\u0644\u0633\u0643\u0627\u0634\u0646 - \u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    '\u0627\u0644\u0639\u0645\u0644\u064a - \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0639\u0645\u0644\u064a - \u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0645\u0644\u064a', '\u0627\u0644\u0639\u0645\u0644\u064a - \u063a\u064a\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0627\u0644\u0639\u0645\u0644\u064a - \u0623\u0633\u0627\u0628\u064a\u0639 \u0627\u0644\u062d\u0636\u0648\u0631', '\u0627\u0644\u0639\u0645\u0644\u064a - \u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    '\u0625\u062c\u0645\u0627\u0644\u064a \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u064a\u0634\u0646\u0627\u062a', '\u0625\u062c\u0645\u0627\u0644\u064a \u063a\u064a\u0627\u0628 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0646\u0633\u0628\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629', '\u0646\u0633\u0628\u0629 \u0627\u0644\u063a\u064a\u0627\u0628 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629', '\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0627\u0644\u0628',
  ],
};

const valueForType = (row, type, key) => row?.types?.[type]?.[key] ?? (key === 'weeks' ? [] : 0);
const percent = (value) => Number(value || 0).toFixed(2).replace(/\.00$/, '');
const statusLabel = (status, language) => ({
  regular: language === 'ar' ? '\u0645\u0646\u062a\u0638\u0645' : 'Regular',
  warning: language === 'ar' ? '\u062a\u0646\u0628\u064a\u0647' : 'Warning',
  at_risk: language === 'ar' ? '\u0645\u0639\u0631\u0636 \u0644\u0644\u0625\u0646\u0630\u0627\u0631' : 'At risk',
  no_sessions: language === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a' : 'No sessions',
}[status] || status);

const reportErrorMessage = (requestError, language) => {
  const message = String(requestError?.response?.data?.message || requestError?.message || '');

  if (/ignore registration field must be true or false/i.test(message)) {
    return language === 'ar'
      ? '\u0642\u064a\u0645\u0629 \u062e\u064a\u0627\u0631 \u062a\u062c\u0627\u0647\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0637\u0627\u0644\u0628 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629. \u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.'
      : 'The ignore-registration option is invalid. Please try again.';
  }

  return message || (language === 'ar'
    ? '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0636\u0648\u0631. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'
    : 'Could not generate the attendance report. Please try again.');
};

const getSubjectDisplayName = (name, code, language) => {
  const subjectCode = String(code || '').trim();
  const rawName = String(name || '').trim();
  if (!subjectCode) return rawName;

  const escapedCode = subjectCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const displayName = rawName
    .replace(new RegExp(`^${escapedCode}\\s*[-\u2013\u2014:]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*[-\u2013\u2014:]\\s*${escapedCode}$`, 'i'), '')
    .trim();

  return displayName && displayName.toUpperCase() !== subjectCode.toUpperCase()
    ? displayName
    : (language === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0645\u0627\u062f\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d' : 'Subject name unavailable');
};

const exportRow = (row, language) => {
  const data = [row.studentId, row.studentName, row.college, row.courseCode, row.courseName];
  TYPE_KEYS.forEach((type) => {
    data.push(
      valueForType(row, type, 'attended'),
      valueForType(row, type, 'total'),
      valueForType(row, type, 'absent'),
      valueForType(row, type, 'weeks').join(', ') || '-',
      percent(valueForType(row, type, 'rate')),
    );
  });
  data.push(
    row.overall?.attended || 0,
    row.overall?.total || 0,
    row.overall?.absent || 0,
    percent(row.overall?.attendanceRate),
    percent(row.overall?.absenceRate),
    statusLabel(row.status, language),
  );
  return data;
};

const ProfessionalReportsPage = () => {
  const { lang } = useLanguage();
  const { user, reportCourses } = useAuth();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const [facultyId, setFacultyId] = useState('');
  const [courseValue, setCourseValue] = useState('');
  const [lectureType, setLectureType] = useState('');
  const [group, setGroup] = useState('');
  const [week, setWeek] = useState('');
  const [ignoreRegistration, setIgnoreRegistration] = useState(false);
  const [headerLanguage, setHeaderLanguage] = useState(lang === 'ar' ? 'ar' : 'en');
  const [report, setReport] = useState(null);
  const [reportCriteria, setReportCriteria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [reportStudents, setReportStudents] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!reportCriteria) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    attendanceAPI.getReport({
      ...reportCriteria,
      page,
      perPage: PAGE_SIZE,
      paginateRows: 1,
      search: searchTerm || undefined,
    }, { signal: controller.signal }).then((response) => {
      if (!cancelled) setReport(response?.data || { meta: {}, rows: [] });
    }).catch((requestError) => {
      if (!cancelled) setError(reportErrorMessage(requestError, lang));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; controller.abort(); };
  }, [reportCriteria, page, searchTerm, lang]);

  useEffect(() => {
    let cancelled = false;
    attendanceAPI.getReportOptions()
      .then((response) => {
        if (!cancelled) setReportStudents(response?.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setReportStudents([]);
      });
    return () => { cancelled = true; };
  }, [selectedTermCode]);

  useEffect(() => setHeaderLanguage(lang === 'ar' ? 'ar' : 'en'), [lang]);

  const isDoctor = isDoctorRole(user?.userRole);
  const allowedCourseCodes = useMemo(() => new Set((reportCourses || []).map((course) => String(course.id || '').toUpperCase())), [reportCourses]);
  const doctorFacultyOptions = useMemo(() => {
    if (!isDoctor) return FACULTY_OPTIONS;

    const assignedFacultyValues = new Set((reportCourses || []).flatMap((course) => (
      [course.faculty, course.facultyId, course.facultyName]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    )));

    return FACULTY_OPTIONS.filter((option) => {
      const directlyAssigned = assignedFacultyValues.has(String(option.value).toLowerCase())
        || assignedFacultyValues.has(String(option.label).trim().toLowerCase());
      const containsAssignedSubject = getFacultySubjectOptionsFromStudents(option.value, reportStudents)
        .some((subject) => allowedCourseCodes.has(String(subject.courseCode || subject.value || '').toUpperCase()));

      return directlyAssigned || containsAssignedSubject;
    });
  }, [allowedCourseCodes, isDoctor, reportCourses, reportStudents]);
  const facultyOptions = useMemo(() => (
    isDoctor
      ? doctorFacultyOptions
      : [{ value: '', label: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u0643\u0644\u064a\u0627\u062a' : 'All faculties' }, ...FACULTY_OPTIONS]
  ), [doctorFacultyOptions, isDoctor, lang]);

  useEffect(() => {
    if (!isDoctor) return;

    const firstFacultyId = doctorFacultyOptions[0]?.value || '';
    const facultyStillAllowed = doctorFacultyOptions.some((option) => option.value === facultyId);
    if (!facultyStillAllowed && facultyId !== firstFacultyId) {
      setFacultyId(firstFacultyId);
      setCourseValue('');
      setLectureType('');
      setGroup('');
    }
  }, [doctorFacultyOptions, facultyId, isDoctor]);
  const scopedCourses = useMemo(() => getScopedCourses({
    userRole: user?.userRole,
    assignedCourses: reportCourses,
    students: reportStudents,
  }), [reportCourses, reportStudents, user?.userRole]);
  const subjectOptions = useMemo(() => {
    const derived = facultyId
      ? getFacultySubjectOptionsFromStudents(facultyId, reportStudents)
      : scopedCourses.map((course) => ({
          value: course.id,
          label: getSubjectDisplayName(course.name, course.id, lang),
          courseCode: course.id,
          courseName: getSubjectDisplayName(course.name, course.id, lang),
          groups: course.sections || [],
          types: course.types || SESSION_TYPE_OPTIONS,
          groupsByType: {},
        }));

    const visibleSubjects = derived
      .filter((subject) => {
        const subjectCode = String(subject.courseCode || subject.value || '').trim();
        return subjectCode && subjectCode !== '.'
          && (!isDoctor || allowedCourseCodes.has(subjectCode.toUpperCase()));
      })
      .map((subject) => ({
        ...subject,
        // Keep the selector readable; the code remains available to search.
        label: getSubjectDisplayName(subject.courseName || subject.label, subject.courseCode || subject.value, lang),
        courseName: getSubjectDisplayName(subject.courseName || subject.label, subject.courseCode || subject.value, lang),
      }));

    return [{
      value: ALL_SUBJECTS_VALUE,
      label: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u062f' : 'All subjects',
      courseCode: '',
      courseName: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u062f' : 'All subjects',
      groups: [],
      types: SESSION_TYPE_OPTIONS,
      groupsByType: {},
    }, ...visibleSubjects];
  }, [allowedCourseCodes, facultyId, isDoctor, lang, scopedCourses, reportStudents]);
  const selectedSubject = useMemo(() => subjectOptions.find((subject) => subject.value === courseValue), [courseValue, subjectOptions]);
  const isAllSubjects = courseValue === ALL_SUBJECTS_VALUE;
  const hasReportScope = Boolean(courseValue);
  const courseCode = isAllSubjects ? '' : (selectedSubject?.courseCode || selectedSubject?.value || '');
  const typeOptions = useMemo(() => {
    const types = selectedSubject?.types?.length ? selectedSubject.types : SESSION_TYPE_OPTIONS;
    return [{ value: '', label: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u0623\u0646\u0648\u0627\u0639' : 'All types' }, ...types.map((type) => ({ value: type, label: TYPE_LABELS[type]?.[lang] || type }))];
  }, [lang, selectedSubject]);
  const groupOptions = useMemo(() => {
    const subjectsInScope = isAllSubjects
      ? subjectOptions.filter((subject) => subject.value !== ALL_SUBJECTS_VALUE)
      : (selectedSubject ? [selectedSubject] : []);
    const groups = subjectsInScope.flatMap((subject) => (
      lectureType
        ? (subject.groupsByType?.[lectureType] || subject.groups || [])
        : (subject.groups || [])
    ));
    return [{ value: '', label: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u062c\u0631\u0648\u0628\u0627\u062a' : 'All groups' }, ...[...new Set(groups)].map((item) => ({ value: item, label: `${lang === 'ar' ? '\u062c\u0631\u0648\u0628' : 'Group'} ${item}` }))];
  }, [isAllSubjects, lang, lectureType, selectedSubject, subjectOptions]);
  const weekOptions = useMemo(() => [
    { value: '', label: lang === 'ar' ? '\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639' : 'All weeks' },
    ...buildAcademicWeekOptions(lang === 'ar' ? '\u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'Week', attendanceTerm),
  ], [attendanceTerm, lang]);

  useEffect(() => {
    if (week && !weekOptions.some((option) => option.value === week)) {
      setWeek('');
    }
  }, [week, weekOptions]);

  const generateReport = () => {
    if (!hasReportScope) return;

    setReport(null);
    setError('');
    const colleges = facultyId ? getFacultyCollegeScopeNames(facultyId) : [];
    setReportCriteria({
      courseCode: courseCode || undefined,
      lectureType: lectureType || undefined,
      group: group || undefined,
      week: week || undefined,
      colleges: colleges.length ? colleges : undefined,
      ignoreRegistration: ignoreRegistration ? 1 : 0,
    });
    setSearch('');
    setSearchTerm('');
    setPage(1);
  };

  const filteredRows = report?.rows || [];
  const totalPages = Math.max(1, Number(report?.meta?.pagination?.lastPage || 1));
  const paginatedRows = filteredRows;
  const averageRate = useMemo(() => {
    if (!report?.rows?.length) return 0;
    return report.rows.reduce((sum, row) => sum + Number(row.overall?.attendanceRate || 0), 0) / report.rows.length;
  }, [report]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const exportExcel = async () => {
    if (!reportCriteria || exporting) return;

    setExporting(true);
    setError('');
    try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Attend';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(headerLanguage === 'ar' ? '\u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Attendance report', {
      views: [{ state: 'frozen', ySplit: 1, rightToLeft: headerLanguage === 'ar' }],
    });
    worksheet.columns = REPORT_HEADERS[headerLanguage].map((header, index) => ({
      header,
      key: `column_${index}`,
      width: index < 5 ? 24 : Math.max(15, Math.min(30, header.length + 3)),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 34;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB7E4D7' } },
        bottom: { style: 'thin', color: { argb: 'FFB7E4D7' } },
        left: { style: 'thin', color: { argb: 'FFB7E4D7' } },
        right: { style: 'thin', color: { argb: 'FFB7E4D7' } },
      };
    });
    let exportPage = 1;
    let lastExportPage = 1;
    do {
      const response = await attendanceAPI.getReport({
        ...reportCriteria,
        page: exportPage,
        perPage: EXPORT_PAGE_SIZE,
      });
      (response?.data?.rows || []).forEach((row) => worksheet.addRow(exportRow(row, headerLanguage)));
      lastExportPage = Number(response?.data?.meta?.pagination?.lastPage || 1);
      exportPage += 1;
    } while (exportPage <= lastExportPage);

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: worksheet.rowCount, column: REPORT_HEADERS[headerLanguage].length },
    };

    const selectedScope = courseCode || (headerLanguage === 'ar' ? '\u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u062f' : 'All subjects');
    const summaryRows = [
      [headerLanguage === 'ar' ? '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0636\u0648\u0631' : 'Attendance Report', ''],
      [headerLanguage === 'ar' ? '\u0643\u0648\u062f \u0627\u0644\u0645\u0627\u062f\u0629' : 'Course code', selectedScope],
      [headerLanguage === 'ar' ? '\u0627\u0644\u0646\u0648\u0639' : 'Type', lectureType || (headerLanguage === 'ar' ? '\u0643\u0644 \u0627\u0644\u0623\u0646\u0648\u0627\u0639' : 'All types')],
      [headerLanguage === 'ar' ? '\u0627\u0644\u062c\u0631\u0648\u0628' : 'Group', group || (headerLanguage === 'ar' ? '\u0643\u0644 \u0627\u0644\u062c\u0631\u0648\u0628\u0627\u062a' : 'All groups')],
      [headerLanguage === 'ar' ? '\u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'Week', week || (headerLanguage === 'ar' ? '\u0643\u0644 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639' : 'All weeks')],
      [headerLanguage === 'ar' ? '\u0627\u0644\u062a\u064a\u0631\u0645' : 'Term', report.meta?.termCode || '-'],
      [headerLanguage === 'ar' ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0637\u0644\u0627\u0628' : 'Students', report.meta?.totalStudents || 0],
      [headerLanguage === 'ar' ? '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062c\u0644\u0633\u0627\u062a' : 'Ended sessions', report.meta?.totalSessions || 0],
    ];
    const summary = workbook.addWorksheet(headerLanguage === 'ar' ? '\u0627\u0644\u0645\u0644\u062e\u0635' : 'Summary', {
      views: [{ rightToLeft: headerLanguage === 'ar' }],
    });
    summary.columns = [{ width: 24 }, { width: 38 }];
    summaryRows.forEach((values) => summary.addRow(values));

    const buffer = await workbook.xlsx.writeBuffer();
    const url = window.URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `Attendance_Report_${courseCode || 'All_Subjects'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadLink.click();
    window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(reportErrorMessage(requestError, lang));
    } finally {
      setExporting(false);
    }
  };

  const labels = {
    title: lang === 'ar' ? '\u062a\u0642\u0627\u0631\u064a\u0631 \u062d\u0636\u0648\u0631 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629' : 'Professional attendance reports',
    subtitle: lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0643\u0644\u064a\u0629 \u0648\u0627\u0644\u0645\u0627\u062f\u0629 \u0648\u0627\u0644\u0646\u0637\u0627\u0642 \u0644\u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 \u0627\u0639\u062a\u0645\u0627\u062f\u064a \u0628\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u062a\u064a \u062a\u062d\u062f\u062f\u0647\u0627.' : 'Choose the faculty, subject, and scope to generate an audit-ready report in the header language you choose.',
    generate: lang === 'ar' ? '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Generate report',
  };

  return (
    <div className="reports-page tw-page-shell min-h-full px-2 py-4 md:px-1 md:py-5">
      <section className="dashboard-accent-hero reports-page-hero mb-5 overflow-hidden rounded-3xl border p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-accent"><BookOpen size={15} /> {lang === 'ar' ? '\u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629' : 'Final output'}</div>
            <h1 className="mt-2 text-2xl font-black text-text-primary md:text-3xl">{labels.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{labels.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
            {lang === 'ar' ? '\u0627\u0644\u062a\u064a\u0631\u0645 \u0627\u0644\u0645\u062d\u062f\u062f \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062c\u0627\u0646\u0628\u064a\u0629' : 'Uses the term selected in the sidebar'}
          </div>
        </div>
      </section>

      <section className="tw-card relative overflow-visible p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.13),transparent_62%)]" />
        <div className="relative mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent"><BookOpen size={20} /></div><div><h2 className="font-bold text-text-primary">{lang === 'ar' ? '\u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Report criteria'}</h2><p className="mt-1 text-sm text-text-secondary">{lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0645\u0627\u062f\u0629 \u0645\u062d\u062f\u062f\u0629 \u0623\u0648 \u0643\u0644 \u0627\u0644\u0645\u0648\u0627\u062f\u060c \u062b\u0645 \u062d\u062f\u062f \u0628\u0627\u0642\u064a \u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u0645\u0644\u0641.' : 'Choose one subject or all subjects, then refine the report scope with the remaining filters.'}</p></div></div>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${hasReportScope ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-surface-muted text-text-muted'}`}>{hasReportScope ? (lang === 'ar' ? '\u0627\u0644\u0646\u0637\u0627\u0642 \u062c\u0627\u0647\u0632' : 'Scope selected') : (lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0646\u0637\u0627\u0642 \u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Select report scope')}</span>
        </div>
        <div className="relative grid gap-4 xl:grid-cols-4">
          <CustomDropdown className="z-40" id="report-faculty" name="report-faculty" label={lang === 'ar' ? '\u0627\u0644\u0643\u0644\u064a\u0629' : 'Faculty'} value={facultyId} onChange={(event) => { setFacultyId(event.target.value); setCourseValue(''); setLectureType(''); setGroup(''); }} options={facultyOptions} placeholder={lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0643\u0644\u064a\u0629' : 'Select faculty'} searchable Icon={() => <UsersRound size={16} />} />
          <CustomDropdown className="z-40" id="report-subject" name="report-subject" label={lang === 'ar' ? '\u0627\u0644\u0645\u0627\u062f\u0629' : 'Subject'} value={courseValue} onChange={(event) => { setCourseValue(event.target.value); setLectureType(''); setGroup(''); }} options={subjectOptions} placeholder={lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0627\u062f\u0629' : 'Select subject'} searchable getSearchText={(subject) => [subject.courseName, subject.courseCode, subject.value].filter(Boolean).join(' ')} Icon={() => <BookOpen size={16} />} />
          <CustomDropdown className="z-40" id="report-type" name="report-type" label={lang === 'ar' ? '\u0627\u0644\u0646\u0648\u0639' : 'Class type'} value={lectureType} onChange={(event) => { setLectureType(event.target.value); setGroup(''); }} options={typeOptions} disabled={!hasReportScope} Icon={() => <BookOpen size={16} />} />
          <CustomDropdown className="z-40" id="report-group" name="report-group" label={lang === 'ar' ? '\u0627\u0644\u062c\u0631\u0648\u0628' : 'Group'} value={group} onChange={(event) => setGroup(event.target.value)} options={groupOptions} disabled={!hasReportScope} Icon={() => <UsersRound size={16} />} />
        </div>
        <div className="relative mt-5 rounded-2xl border border-border bg-surface-muted/45 p-3 md:p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,.9fr)_minmax(0,.9fr)_minmax(0,1.55fr)_minmax(230px,.95fr)] md:items-end">
            <CustomDropdown className="z-40" id="report-week" name="report-week" label={lang === 'ar' ? '\u0627\u0644\u0623\u0633\u0628\u0648\u0639' : 'Week'} value={week} onChange={(event) => setWeek(event.target.value)} options={weekOptions} disabled={!hasReportScope} Icon={() => <CalendarDays size={16} />} />
          <CustomDropdown className="z-40" id="report-header-language" name="report-header-language" label={lang === 'ar' ? '\u0644\u063a\u0629 \u0631\u0624\u0648\u0633 \u0627\u0644\u0645\u0644\u0641' : 'Export header language'} value={headerLanguage} onChange={(event) => setHeaderLanguage(event.target.value)} options={[{ value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' }, { value: 'en', label: 'English' }]} />
          <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface-muted/50 px-4 text-sm text-text-secondary"><input type="checkbox" className="h-4 w-4" checked={ignoreRegistration} onChange={(event) => setIgnoreRegistration(event.target.checked)} /><span><strong className="block text-text-primary">{lang === 'ar' ? '\u062a\u062c\u0627\u0647\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0637\u0627\u0644\u0628' : 'Ignore student registration'}</strong><small>{lang === 'ar' ? '\u064a\u0638\u0647\u0631 \u062d\u0636\u0648\u0631 \u0627\u0644\u0637\u0644\u0627\u0628 \u063a\u064a\u0631 \u0627\u0644\u0645\u0633\u062c\u0644\u064a\u0646 \u0623\u064a\u0636\u0627\u064b.' : 'Also include attendance recorded for unregistered students.'}</small></span></label>
            <CustomBottom type="button" text={labels.generate} onClick={generateReport} disabled={!hasReportScope || loading} loading={loading} loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0633\u0627\u0628...' : 'Calculating...'} rigthIcon={<Check size={18} />} minHeight={56} background="linear-gradient(135deg, #047857, #10b981)" border="1px solid rgba(110, 231, 183, 0.45)" boxShadow="0 18px 34px rgba(5, 150, 105, 0.30)" buttonStyles="text-base font-extrabold tracking-wide" />
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">{error}</p>}
      </section>

      {!report ? <section className="tw-card mt-5 flex min-h-[340px] flex-col items-center justify-center px-6 text-center"><div className="grid h-20 w-20 place-items-center rounded-full bg-accent/10 text-accent"><BookOpen size={34} /></div><h2 className="mt-5 text-xl font-bold text-text-primary">{lang === 'ar' ? '\u062c\u0647\u0651\u0632 \u0627\u0644\u0645\u0639\u0627\u064a\u064a\u0631 \u0644\u0625\u0646\u0634\u0627\u0621 \u062a\u0642\u0631\u064a\u0631' : 'Set the criteria to generate a report'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">{lang === 'ar' ? '\u0633\u064a\u062d\u0633 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u063a\u064a\u0627\u0628 \u0644\u0643\u0644 \u0637\u0627\u0644\u0628 \u0639\u0628\u0631 \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a \u0648\u0627\u0644\u0633\u0643\u0627\u0634\u0646 \u0648\u0627\u0644\u0639\u0645\u0644\u064a \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0641\u0639\u0644\u064a\u0629.' : 'The report calculates attendance and absence for each student across lectures, sections, and practical sessions from the same official session data.'}</p></section> : <>
        <section className="mt-5 grid gap-4 md:grid-cols-4"><Metric label={lang === 'ar' ? 'طلاب الصفحة' : 'Students on page'} value={report.meta?.totalStudents || 0} icon={<UsersRound size={16} />} /><Metric label={lang === 'ar' ? 'الجلسات المشمولة' : 'Included sessions'} value={report.meta?.totalSessions || 0} icon={<CalendarDays size={16} />} /><Metric label={lang === 'ar' ? 'صفوف الصفحة' : 'Page rows'} value={report.meta?.totalRows || 0} icon={<Check size={16} />} /><Metric label={lang === 'ar' ? 'متوسط حضور الصفحة' : 'Page average attendance'} value={`${percent(averageRate)}%`} icon={<Eye size={16} />} /></section>
          <section className="tw-card mt-5 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border bg-surface-muted/60 p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-bold text-text-primary">{lang === 'ar' ? '\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Report preview'}</h2>
                <p className="mt-1 text-sm text-text-secondary">{lang === 'ar' ? '\u0627\u0644\u062a\u0635\u062f\u064a\u0631 \u064a\u0634\u0645\u0644 \u0643\u0644 \u0627\u0644\u0635\u0641\u0648\u0641 \u0648\u0644\u064a\u0633 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0641\u0642\u0637.' : 'The export includes every matching row, not only this visible page.'}</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="min-w-[260px]">
                  <CustomInput id="report-search" name="report-search" label={lang === 'ar' ? '\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0646\u062a\u0627\u0626\u062c' : 'Search results'} value={search} onChange={(event) => setSearch(event.target.value)} icon={() => <Search size={16} />} />
                </div>
                <div className="min-w-[150px]">
                  <span className="mb-2 block text-xs font-medium text-text-secondary">{lang === 'ar' ? '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0644\u0641' : 'Export file'}</span>
                  <CustomBottom title={lang === 'ar' ? '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0645\u0644\u0641' : 'Export file'} type="button" text={lang === 'ar' ? '\u062a\u0635\u062f\u064a\u0631 Excel' : 'Export Excel'} loading={exporting} loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0635\u062f\u064a\u0631...' : 'Exporting...'} onClick={exportExcel} disabled={!report.rows?.length || exporting} rigthIcon={<Download size={16} />} minHeight={48} background="linear-gradient(135deg, #047857, #10b981)" border="1px solid rgba(110, 231, 183, 0.38)" boxShadow="0 12px 24px rgba(5, 150, 105, 0.22)" />
                </div>
              </div>
            </div>
          {filteredRows.length === 0 ? <div className="p-12 text-center text-text-secondary">{lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629.' : 'No matching rows.'}</div> : <><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-surface-muted text-text-muted"><tr><th className="px-4 py-3 text-start">{lang === 'ar' ? '\u0627\u0644\u0637\u0627\u0644\u0628' : 'Student'}</th><th className="px-4 py-3 text-start">{lang === 'ar' ? '\u0627\u0644\u0645\u0627\u062f\u0629' : 'Course'}</th>{TYPE_KEYS.map((type) => <th key={type} className="px-4 py-3 text-center">{TYPE_LABELS[type][lang]}</th>)}<th className="px-4 py-3 text-center">{lang === 'ar' ? '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a' : 'Overall'}</th><th className="px-4 py-3 text-center">{lang === 'ar' ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th></tr></thead><tbody className="divide-y divide-border">{paginatedRows.map((row) => <tr key={`${row.studentId}-${row.courseCode}`} className="hover:bg-surface-muted/35"><td className="px-4 py-4"><strong className="block text-text-primary">{row.studentName}</strong><span className="text-xs text-text-muted">{row.studentId} · {row.college}</span></td><td className="px-4 py-4"><strong className="text-text-primary">{row.courseCode}</strong><span className="block text-xs text-text-muted">{row.courseName}</span></td>{TYPE_KEYS.map((type) => <td key={type} className="px-4 py-4 text-center"><strong className="text-text-primary">{valueForType(row, type, 'attended')}/{valueForType(row, type, 'total')}</strong><span className="mt-1 block text-xs text-text-muted">{percent(valueForType(row, type, 'rate'))}%</span></td>)}<td className="px-4 py-4 text-center"><strong className="text-accent">{percent(row.overall?.attendanceRate)}%</strong><span className="mt-1 block text-xs text-text-muted">{row.overall?.attended || 0}/{row.overall?.total || 0}</span></td><td className="px-4 py-4 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === 'regular' ? 'bg-emerald-500/15 text-emerald-400' : row.status === 'warning' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{statusLabel(row.status, lang)}</span>{!row.isRegistered && <span className="mt-1 block text-[10px] text-text-muted">{lang === 'ar' ? '\u063a\u064a\u0631 \u0645\u0633\u062c\u0644' : 'Unregistered'}</span>}</td></tr>)}</tbody></table></div><Pagination id="professional-reports-pagination" currentPage={page} totalPages={totalPages} onPageChange={setPage} className="p-4" /></>}</section>
      </>}
    </div>
  );
};

const Metric = ({ label, value, icon }) => <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[0_12px_26px_rgba(0,0,0,.12)]"><div className="absolute -top-8 -end-8 h-20 w-20 rounded-full bg-accent/10 blur-2xl" /><div className="relative flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[.14em] text-text-muted">{label}</span><span className="grid h-8 w-8 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">{icon}</span></div><div className="relative mt-4 text-2xl font-black tracking-tight text-text-primary md:text-3xl">{value}</div></div>;

export default ProfessionalReportsPage;
