import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import AppHelmet from '../../../components/AppHelmet';
import { ConfirmationDialog, CustomBottom, CustomDropdown, CustomInput, Pagination } from '../../../components';
import { useAuth, useSocket, useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import { adHocAttendanceAPI } from '../../../utils/api';
import AttendanceWorkspace from '../../../components/AttendanceWorkspace';
import { selectAttendanceSession } from '../../../utils/attendanceSessionSelection';
import BulkAttendanceMethods from '../../../components/AttendanceWorkspace/BulkAttendanceMethods';
import { createBackgroundPoller } from '../../../utils/backgroundPoller';
import { FACULTY_CATALOG } from '../../../utils/constants';
import { useFlexibleSessionLifecycle } from '../../../hooks/useFlexibleSessionLifecycle';
import { fetchCatalogSubjects } from '../../../services/catalogApi';
import { getCatalogAttendanceCourses, getScopedCourses } from '../../../utils/courseAccess';
import { formatAcademicWeekDisplay, getAcademicTermWeekCount, getCurrentAcademicWeekLabel } from '../../../utils/academicWeek';
import { buildNumberedGroupOptions, formatNumberedGroupLabel } from '../../../utils/groupDisplay';
import {
  getFacultySubjectOptionsFromStudents,
  getGroupOptionsForSubject,
} from '../StudentsPage/utils/studentUtils';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  Eye,
  EyeOff,
  Play,
  QrCode,
  Search,
  Square,
  Upload,
  Users,
  UsersRound,
  X,
} from '../../../assets/icons';

const CLASS_TYPES = ['Lecture', 'Section', 'Practical'];
const QR_WINDOW_OPTIONS = [3, 5, 10, 15];
const GROUP_PLACEHOLDER = 'GROUP A';
const FLEXIBLE_SESSIONS_PAGE_SIZE = 5;
const FLEXIBLE_MIGRATION_SESSIONS_PAGE_SIZE = 5;
const FLEXIBLE_ROSTER_PAGE_SIZE = 10;
const FLEXIBLE_SEARCH_DEBOUNCE_MS = 400;
const EMPTY_ADMIN_SESSION_FILTERS = Object.freeze({ faculty: '', subject: '', lectureType: '', group: '', week: '', status: '' });
const EMPTY_ADMIN_FILTER_OPTIONS = Object.freeze({ faculties: [], subjects: [], lectureTypes: [], groups: [], weeks: [], statuses: [] });
const FLEXIBLE_SUBJECTS_CACHE_PREFIX = 'student-attendance:flexible-subjects:';
const FLEXIBLE_SUBJECTS_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const STUDENT_ELIGIBILITY_ERROR_PREFIX = 'لا يمكن إضافة الطالب؛';

const useDebouncedValue = (value, delayMs) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
};

const getCachedFlexibleSubjects = (facultyId) => {
  if (!facultyId) return [];

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(`${FLEXIBLE_SUBJECTS_CACHE_PREFIX}${facultyId}`) || 'null');
    const age = Date.now() - Number(cached?.savedAt || 0);
    return Array.isArray(cached?.subjects) && age >= 0 && age <= FLEXIBLE_SUBJECTS_CACHE_MAX_AGE_MS
      ? cached.subjects
      : [];
  } catch {
    return [];
  }
};

const cacheFlexibleSubjects = (facultyId, subjects) => {
  if (!facultyId || !Array.isArray(subjects)) return;

  try {
    window.sessionStorage.setItem(`${FLEXIBLE_SUBJECTS_CACHE_PREFIX}${facultyId}`, JSON.stringify({
      savedAt: Date.now(),
      subjects,
    }));
  } catch {
    // Caching is only a performance enhancement; the catalog request still works normally.
  }
};

const FACULTY_LABELS = {
  engineering: {
    en: 'Faculty of Engineering',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u0647\u0646\u062f\u0633\u0629',
  },
  'computers-ai': {
    en: 'Faculty of Computers and Artificial Intelligence',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u062d\u0627\u0633\u0628\u0627\u062a \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
  },
  nursing: {
    en: 'Faculty of Nursing',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u062a\u0645\u0631\u064a\u0636',
  },
  medicine: {
    en: 'Faculty of Human Medicine',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u0637\u0628 \u0627\u0644\u0628\u0634\u0631\u064a',
  },
  pharmacy: {
    en: 'Faculty of Pharmacy',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u0629',
  },
  humanities: {
    en: 'Humanities',
    ar: '\u0627\u0644\u0639\u0644\u0648\u0645 \u0627\u0644\u0625\u0646\u0633\u0627\u0646\u064a\u0629',
  },
  'health-sciences-technology': {
    en: 'Health Sciences Technology',
    ar: '\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627 \u0627\u0644\u0639\u0644\u0648\u0645 \u0627\u0644\u0635\u062d\u064a\u0629',
  },
  dentistry: {
    en: 'Faculty of Dentistry',
    ar: '\u0643\u0644\u064a\u0629 \u0637\u0628 \u0627\u0644\u0623\u0633\u0646\u0627\u0646',
  },
  'veterinary-medicine': {
    en: 'Faculty of Veterinary Medicine',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u0637\u0628 \u0627\u0644\u0628\u064a\u0637\u0631\u064a',
  },
  'physical-therapy': {
    en: 'Faculty of Physical Therapy',
    ar: '\u0643\u0644\u064a\u0629 \u0627\u0644\u0639\u0644\u0627\u062c \u0627\u0644\u0637\u0628\u064a\u0639\u064a',
  },
};

const buildFacultyOptions = (lang) => FACULTY_CATALOG.map((faculty) => ({
  value: faculty.name,
  label: FACULTY_LABELS[faculty.id]?.[lang] || FACULTY_LABELS[faculty.id]?.en || faculty.name,
}));

const FLEXIBLE_COPY = {
  en: {
    classTypes: {
      Lecture: 'Lecture',
      Section: 'Section',
      Practical: 'Practical',
    },
    statusReady: 'Ready',
    statusOpen: 'Open session',
    statusClosed: 'Closed session',
    qrTitle: 'Attendance QR code',
    qrRefreshesIn: 'Refreshes in',
    qrRefreshLabel: 'QR refresh',
    qrSelectTime: 'Select QR time',
    qrFullScreen: 'Full screen QR',
    qrExitFullScreen: 'Exit full screen',
    qrNoSession: 'Select or create an open attendance session to generate QR.',
    temporaryRoster: 'Attendance history',
    temporaryRosterDesc: 'Students recorded in this attendance session.',
    presentCount: 'present',
    noStudentsYet: 'No students yet',
    noStudentsDesc: 'Students recorded by QR, manual entry, or roster selection will appear here.',
    studentColumn: 'Student',
    universityIdColumn: 'University ID',
    collegeColumn: 'College',
    timeColumn: 'Time',
    actionColumn: 'Action',
    removeStudent: 'Remove student',
    sessionControl: 'Session control',
    sessionControlTitle: 'Take attendance for any subject',
    sessionControlDesc: 'Create and manage the attendance session from one place.',
    existingClosed: 'This session already exists. Reopen it instead of creating a duplicate.',
    existingOpen: 'This session is already open. Use the existing session instead of creating a duplicate.',
    faculty: 'Faculty',
    subject: 'Subject',
    subjectType: 'Subject type',
    group: 'Group',
    week: 'Week',
    selectFaculty: 'Select faculty',
    chooseSubject: 'Choose subject',
    noSubjectsForFaculty: 'No subjects for this faculty',
    noSubjectsFoundForFaculty: 'No subjects found for this faculty.',
    selectType: 'Select type',
    selectSubjectTypeFirst: 'Select subject type first',
    selectWeek: 'Select week',
    createFlexibleSession: 'Create session',
    reopenExistingSession: 'Reopen existing session',
    closeCurrentSession: 'Close current session',
    creating: 'Creating...',
    reopening: 'Reopening...',
    closing: 'Closing...',
    recordStudent: 'Record student',
    selectedTemporarySubject: 'Selected subject',
    studentsCountSuffix: 'students',
    studentIdLabel: 'Student code or national ID',
    studentIdPlaceholder: 'Enter the student code, university ID, or national ID',
    addStudent: 'Add student',
    adding: 'Adding...',
    bulkStudentsTitle: 'Add students from Excel',
    bulkStudentsDescription: 'Upload an Excel sheet with one Student ID or National ID column. Student details are filled automatically.',
    downloadNationalIdTemplate: 'Download ID template',
    uploadNationalIdSheet: 'Upload student sheet',
    importingStudents: 'Adding students...',
    bulkTemplateMissingIdColumn: 'The sheet must contain a “Student ID” or “National ID” column.',
    bulkTemplateNoIds: 'No Student IDs or National IDs were found in the uploaded sheet.',
    bulkImportSuccess: 'Added {added} student(s). {existing} already present, {missing} not found.',
    bulkImportError: 'Could not import students from this sheet.',
    export: 'Export',
    exportAllSubjectSessions: 'Export all subject sessions',
    myFlexibleSessions: 'My sessions',
    search: 'Search',
    searchSessionsPlaceholder: 'Search by subject, code, group, week, or status',
    searchStudentsPlaceholder: 'Search by student name or ID',
    noMatchingStudents: 'No students match your search.',
    noMatchingSessions: 'No attendance sessions match your search.',
    loadingSessions: 'Loading sessions...',
    noFlexibleSessionsYet: 'No attendance sessions yet.',
    deleteFlexibleSession: 'Delete session',
    migrationScreen: 'Flexible migration screen',
    migrationTitle: 'Move temporary attendance to real session',
    migrationDesc: 'Select a flexible session, then migrate its students into the official course/week/group.',
    noFlexibleSessions: 'No flexible sessions',
    noFlexibleSessionsDesc: 'When doctors create temporary sessions, they will appear here for migration.',
    doctorPrefix: 'Doctor',
    officialDestination: 'Official destination',
    temporarySource: 'Temporary source',
    sourceByDoctor: 'students by',
    course: 'Course',
    noCoursesInFaculty: 'No courses in this faculty',
    noCoursesFoundForFaculty: 'No courses found for this faculty.',
    realGroup: 'Real group',
    noGroupsForCourse: 'No groups for this course',
    alreadyMigrated: 'Already migrated',
    migrateToRealSession: 'Migrate to real session',
    migrating: 'Migrating...',
    exportSource: 'Export source',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    selectFlexibleSessionToMigrate: 'Select a flexible session to migrate.',
    createSessionError: 'Could not create the session.',
    addStudentSuccess: 'Student recorded in this session.',
    addStudentError: 'Could not add this student.',
    removeStudentSuccess: 'Student removed from this session.',
    removeStudentError: 'Could not remove this student.',
    deleteSessionError: 'Could not delete this session.',
    closeSessionSuccess: 'Session closed.',
    closeSessionError: 'Could not close this session.',
    reopenSessionSuccess: 'Session reopened. Students can scan the QR again.',
    reopenSessionError: 'Could not reopen this session.',
    migrateSuccessPrefix: 'Migrated',
    migrateSuccessSuffix: 'students to real attendance.',
    migrateSessionError: 'Could not migrate this session.',
    loadSessionsError: 'Could not load attendance sessions.',
    deleteSessionTitle: 'Delete session?',
    deleteSessionMessagePrefix: 'This will delete',
    deleteSessionMessageSuffix: 'and its linked attendance records.',
    delete: 'Delete',
    cancel: 'Cancel',
    deleting: 'Deleting...',
    flexibleAttendanceTitle: 'Student Attendance',
    flexibleAttendanceDescription: 'Create and manage attendance sessions from one place.',
    flexibleValue: 'Attendance',
    refreshUnit: 'refresh',
    secondsShort: 's',
    secondsLabel: 'seconds',
    exportSheetName: 'Student Attendance',
    exportFilePrefix: 'Student_Attendance',
  },
  ar: {
    classTypes: {
      Lecture: 'محاضرة',
      Section: 'سكشن',
      Practical: 'عملي',
    },
    statusReady: 'جاهز',
    statusOpen: 'الجلسة مفتوحة',
    statusClosed: 'الجلسة مغلقة',
    qrTitle: 'رمز الحضور',
    qrRefreshesIn: 'يتم التحديث خلال',
    qrRefreshLabel: 'تحديث الرمز',
    qrSelectTime: 'اختر وقت تحديث الرمز',
    qrFullScreen: 'عرض الرمز بملء الشاشة',
    qrExitFullScreen: 'إغلاق ملء الشاشة',
    qrNoSession: 'اختر جلسة حضور مفتوحة أو أنشئ جلسة لعرض الرمز.',
    temporaryRoster: 'سجل الحضور',
    temporaryRosterDesc: 'الطلاب المسجلون داخل جلسة الحضور.',
    presentCount: 'حاضر',
    noStudentsYet: 'لا يوجد طلاب بعد',
    noStudentsDesc: 'سيظهر هنا الطلاب المسجلون بالرمز أو الإضافة اليدوية أو قائمة الطلاب.',
    studentColumn: 'الطالب',
    universityIdColumn: 'الرقم الجامعي',
    collegeColumn: 'الكلية',
    timeColumn: 'الوقت',
    actionColumn: 'الإجراء',
    removeStudent: 'حذف الطالب',
    sessionControl: 'التحكم في الجلسة',
    sessionControlTitle: 'سجل حضور أي مادة',
    sessionControlDesc: 'أنشئ جلسة الحضور وأدرها من مكان واحد.',
    existingClosed: 'هذه الجلسة موجودة بالفعل. أعد فتحها بدلاً من إنشاء نسخة مكررة.',
    existingOpen: 'هذه الجلسة مفتوحة بالفعل. استخدم الجلسة الحالية بدلاً من إنشاء نسخة مكررة.',
    faculty: 'الكلية',
    subject: 'المادة',
    subjectType: 'نوع المادة',
    group: 'المجموعة',
    week: 'الأسبوع',
    selectFaculty: 'اختر الكلية',
    chooseSubject: 'اختر المادة',
    noSubjectsForFaculty: 'لا توجد مواد لهذه الكلية',
    noSubjectsFoundForFaculty: 'لم يتم العثور على مواد لهذه الكلية.',
    selectType: 'اختر النوع',
    selectSubjectTypeFirst: 'اختر نوع المادة أولاً',
    selectWeek: 'اختر الأسبوع',
    createFlexibleSession: 'إنشاء جلسة',
    reopenExistingSession: 'إعادة فتح الجلسة',
    closeCurrentSession: 'إغلاق الجلسة الحالية',
    creating: 'جارٍ الإنشاء...',
    reopening: 'جارٍ إعادة الفتح...',
    closing: 'جارٍ الإغلاق...',
    recordStudent: 'تسجيل طالب',
    selectedTemporarySubject: 'المادة المحددة',
    studentsCountSuffix: 'طلاب',
    studentIdLabel: 'كود الطالب أو الرقم القومي',
    studentIdPlaceholder: 'أدخل كود الطالب أو الرقم الجامعي أو القومي',
    addStudent: 'إضافة طالب',
    adding: 'جارٍ الإضافة...',
    export: 'تصدير',
    myFlexibleSessions: 'جلساتي',
    search: 'بحث',
    searchSessionsPlaceholder: 'ابحث بالمادة أو الكود أو المجموعة أو الأسبوع أو الحالة',
    loadingSessions: 'جارٍ تحميل الجلسات...',
    noFlexibleSessionsYet: 'لا توجد جلسات حضور بعد.',
    deleteFlexibleSession: 'حذف الجلسة',
    migrationScreen: 'شاشة نقل الجلسات المرنة',
    migrationTitle: 'نقل الحضور المؤقت إلى جلسة فعلية',
    migrationDesc: 'اختر جلسة مرنة ثم انقل طلابها إلى المادة والأسبوع والمجموعة الرسمية.',
    noFlexibleSessions: 'لا توجد جلسات مرنة',
    noFlexibleSessionsDesc: 'عندما ينشئ الأطباء جلسات مؤقتة ستظهر هنا للنقل.',
    doctorPrefix: 'الدكتور',
    officialDestination: 'الوجهة الرسمية',
    temporarySource: 'المصدر المؤقت',
    sourceByDoctor: 'طالب بواسطة',
    course: 'المقرر',
    noCoursesInFaculty: 'لا توجد مقررات لهذه الكلية',
    noCoursesFoundForFaculty: 'لم يتم العثور على مقررات لهذه الكلية.',
    realGroup: 'المجموعة الفعلية',
    noGroupsForCourse: 'لا توجد مجموعات لهذا المقرر',
    alreadyMigrated: 'تم النقل بالفعل',
    migrateToRealSession: 'نقل إلى الجلسة الفعلية',
    migrating: 'جارٍ النقل...',
    exportSource: 'تصدير المصدر',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث...',
    selectFlexibleSessionToMigrate: 'اختر جلسة مرنة لنقلها.',
    createSessionError: 'تعذر إنشاء الجلسة.',
    addStudentSuccess: 'تم تسجيل الطالب في هذه الجلسة.',
    addStudentError: 'تعذر إضافة هذا الطالب.',
    removeStudentSuccess: 'تم حذف الطالب من هذه الجلسة.',
    removeStudentError: 'تعذر حذف هذا الطالب.',
    deleteSessionError: 'تعذر حذف هذه الجلسة.',
    closeSessionSuccess: 'تم إغلاق الجلسة.',
    closeSessionError: 'تعذر إغلاق هذه الجلسة.',
    reopenSessionSuccess: 'تمت إعادة فتح الجلسة ويمكن للطلاب مسح الرمز مرة أخرى.',
    reopenSessionError: 'تعذر إعادة فتح هذه الجلسة.',
    migrateSuccessPrefix: 'تم نقل',
    migrateSuccessSuffix: 'طالباً إلى الحضور الفعلي.',
    migrateSessionError: 'تعذر نقل هذه الجلسة.',
    loadSessionsError: 'تعذر تحميل جلسات الحضور.',
    deleteSessionTitle: 'حذف الجلسة؟',
    deleteSessionMessagePrefix: 'سيتم حذف',
    deleteSessionMessageSuffix: 'وسجلات الحضور المرتبطة بها.',
    delete: 'حذف',
    cancel: 'إلغاء',
    deleting: 'جارٍ الحذف...',
    flexibleAttendanceTitle: 'حضور الطالب',
    flexibleAttendanceDescription: 'أنشئ جلسات الحضور وأدرها من مكان واحد.',
    flexibleValue: 'حضور',
    refreshUnit: 'تحديث',
    secondsShort: 'ث',
    secondsLabel: 'ثوان',
    exportSheetName: 'حضور الطالب',
    exportFilePrefix: 'Student_Attendance',
    searchStudentsPlaceholder: '\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628 \u0623\u0648 \u0631\u0642\u0645\u0647',
    noMatchingStudents: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u064a\u0637\u0627\u0628\u0642\u0648\u0646 \u0627\u0644\u0628\u062d\u062b.',
    noMatchingSessions: 'لا توجد جلسات حضور تطابق البحث.',
  },
};

const getFlexibleCopy = (lang) => FLEXIBLE_COPY[lang === 'ar' ? 'ar' : 'en'];
const buildClassTypeOptions = (lang) => {
  const copy = getFlexibleCopy(lang);
  return CLASS_TYPES.map((type) => ({ value: type, label: copy.classTypes[type] || type }));
};
const buildWeekOptions = (lang, term) => {
  const copy = getFlexibleCopy(lang);
  const weekCount = getAcademicTermWeekCount(term);
  return Array.from({ length: weekCount }, (_, index) => ({
    value: `Week ${index + 1}`,
    label: `${copy.week} ${index + 1}`,
  }));
};
const buildQrWindowOptions = (lang) => {
  const copy = getFlexibleCopy(lang);
  return QR_WINDOW_OPTIONS.map((seconds) => ({
    value: String(seconds),
    label: `${seconds} ${copy.secondsLabel}`,
  }));
};

const normalizeMigrationGroup = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/^GROUP\s+/, '')
  .replace(/^GRP\s+/, '');

const normalizeMigrationWeek = (value) => {
  const normalized = String(value || '').trim();
  const match = normalized.match(/\d+/);
  return match ? String(Number(match[0])) : normalized;
};

const normalizeFlexibleText = (value) => String(value || '').trim().toUpperCase();
const normalizeSpreadsheetHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s_-]+/g, '');

const buildDefaultFlexibleForm = (term) => ({
  subjectName: '',
  subjectCode: '',
  faculty: '',
  lectureType: '',
  group: '',
  allowAllGroups: false,
  week: getCurrentAcademicWeekLabel(new Date(), term),
  qrWindowSeconds: '10',
});

const resolveFacultyRecord = (value) => FACULTY_CATALOG.find((faculty) => (
  faculty.id === value || faculty.name === value
)) || null;

const getFacultyLookupTokens = (faculty) => {
  if (!faculty) {
    return new Set();
  }

  return new Set(
    [
      faculty.id,
      faculty.name,
      FACULTY_LABELS[faculty.id]?.en,
      FACULTY_LABELS[faculty.id]?.ar,
      ...(faculty.colleges || []).flatMap((college) => [college.id, college.name]),
    ]
      .map((value) => normalizeFlexibleText(value))
      .filter(Boolean),
  );
};

const facultyMatchesSelection = (selectedFaculty, candidateValue) => {
  if (!selectedFaculty || !candidateValue) {
    return false;
  }

  const selectedTokens = getFacultyLookupTokens(selectedFaculty);
  const normalizedCandidate = normalizeFlexibleText(candidateValue);

  if (selectedTokens.has(normalizedCandidate)) {
    return true;
  }

  const resolvedCandidateFaculty = resolveFacultyRecord(candidateValue)
    || FACULTY_CATALOG.find((faculty) => getFacultyLookupTokens(faculty).has(normalizedCandidate));

  if (!resolvedCandidateFaculty) {
    return false;
  }

  return resolvedCandidateFaculty.id === selectedFaculty.id;
};

const buildFacultySubjectOptions = ({
  facultyValue,
  userRole,
  assignedCourses = [],
  students = [],
  catalogSubjects = [],
  restrictToAssignments = false,
  termCode = '',
}) => {
  const selectedFaculty = resolveFacultyRecord(facultyValue);

  if (!selectedFaculty) {
    return [];
  }

  if (restrictToAssignments && (userRole === 'staff' || userRole === 'doctor')) {
    return getCatalogAttendanceCourses({
      userRole,
      assignedCourses,
      catalogSubjects,
      termCode,
    })
      .filter((course) => (
        course.faculties || []
      ).some((facultyName) => facultyMatchesSelection(selectedFaculty, facultyName)))
      .map((course) => {
        const catalogSubject = catalogSubjects.find((subject) => (
          normalizeFlexibleText(subject.subjectCode) === normalizeFlexibleText(course.id)
          && subject.facultyId === selectedFaculty.id
        ));
        const subjectName = catalogSubject?.subjectName || course.name || course.id;

        return {
          value: course.id,
          label: subjectName,
          groups: [...new Set(Object.values(course.groupsByType || {}).flat())],
          types: course.types || [],
          groupsByType: course.groupsByType || {},
          dataset: { subjectName },
        };
      })
      .filter((option) => !isHiddenPlaceholderSubject(option.dataset?.subjectName || option.label));
  }

  const derivedOptions = getFacultySubjectOptionsFromStudents(selectedFaculty.id, students);
  const catalogOptions = (catalogSubjects || [])
    .filter((subject) => subject.facultyId === selectedFaculty.id)
    .map((subject) => ({
      value: subject.subjectCode,
      label: subject.subjectName || subject.subjectCode,
      groups: subject.groups || [],
      types: subject.types || [],
      groupsByType: subject.groupsByType || {},
      groupCounts: subject.groupCounts || {},
      dataset: {
        subjectName: subject.subjectName || subject.subjectCode,
      },
    }));

  const scopedCourses = getScopedCourses({
    userRole,
    assignedCourses,
    students,
  }).filter((course) => (
    (course.faculties || []).some((facultyName) => (
      facultyMatchesSelection(selectedFaculty, facultyName)
    ))
  ));

  const mergedOptions = new Map(
    catalogOptions.map((option) => [normalizeFlexibleText(option.value), option]),
  );

  scopedCourses.forEach((course) => {
    const normalizedCourseCode = normalizeFlexibleText(course.id);
    if (mergedOptions.has(normalizedCourseCode)) return;
    mergedOptions.set(normalizedCourseCode, {
      value: course.id,
      label: course.name || course.id,
      dataset: {
        subjectName: course.name || course.id,
      },
    });
  });

  derivedOptions.forEach((course) => {
    mergedOptions.set(normalizeFlexibleText(course.courseCode), {
      value: course.courseCode,
      label: course.courseName,
      groups: course.groups || [],
      types: course.types || [],
      groupsByType: course.groupsByType || {},
      dataset: {
        subjectName: course.courseName,
      },
    });
  });

  return [...mergedOptions.values()]
    .filter((option) => !isHiddenPlaceholderSubject(option.dataset?.subjectName || option.label));
};


const normalizeError = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
);

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '-';
  }
};

const StatusBadge = ({ status, lang = 'en' }) => {
  const copy = getFlexibleCopy(lang);
  const isClosed = status === 'closed' || status === 'migrated';
  const color = isClosed ? '#fbbf24' : '#34d399';
  const background = isClosed ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.12)';

  return (
    <span
      style={{
        color,
        background,
        border: `1px solid ${color}40`,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {isClosed
          ? (lang === 'ar' ? 'مغلقة' : 'closed')
          : status === 'ready'
            ? copy.statusReady
            : (lang === 'ar' ? 'مفتوحة' : (status || 'open'))}
    </span>
  );
};

const Message = ({ type, children }) => {
  if (!children) return null;

  const danger = type === 'error';

  return (
    <div
      style={{
        marginBottom: 14,
        color: danger ? '#f87171' : '#86efac',
        background: danger ? 'rgba(248,113,113,0.12)' : 'rgba(34,197,94,0.12)',
        border: danger ? '1px solid rgba(248,113,113,0.28)' : '1px solid rgba(34,197,94,0.28)',
        padding: '12px 14px',
        borderRadius: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
};

const EmptyState = ({ title, subtitle }) => (
  <div
    style={{
      minHeight: 240,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      color: 'var(--text-muted)',
      gap: 10,
      padding: 24,
    }}
  >
    <Users size={42} strokeWidth={1.6} />
    <strong style={{ color: 'var(--text-primary)', fontSize: 18 }}>{title}</strong>
    <span style={{ maxWidth: 430, lineHeight: 1.5 }}>{subtitle}</span>
  </div>
);

const FULLSCREEN_QR_RENDER_SIZE = 1024;
const FULLSCREEN_EXIT_BUTTON_POSITIONS = [
  { top: 20, left: 20 },
  { top: 20, right: 20 },
  { bottom: 20, left: 20 },
  { bottom: 20, right: 20 },
];

const isHiddenPlaceholderSubject = (value) => {
  const normalized = String(value || '').trim();
  return /^[().\s]+$/.test(normalized) || /(?:^|\s-\s)[().\s]+$/.test(normalized);
};

const getServerCountdown = (expiresAt, serverOffsetMs, fallbackSeconds) => {
  const expiresAtMs = Date.parse(expiresAt || '');
  if (!Number.isFinite(expiresAtMs)) return fallbackSeconds;

  return Math.max(0, Math.ceil((expiresAtMs - (Date.now() + serverOffsetMs)) / 1000));
};

const FlexibleQrPanel = ({
  session,
  pendingQrWindowSeconds,
  onPendingQrWindowChange,
  lang,
}) => {
  const copy = getFlexibleCopy(lang);
  const qrFullscreenRef = useRef(null);
  const syncedSessionIdRef = useRef(null);
  const serverClockOffsetRef = useRef(0);
  const qrExpiresAtRef = useRef('');
  const qrRefreshInFlightRef = useRef(false);
  const qrNextRetryAtRef = useRef(0);
  const [qrPayload, setQrPayload] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isSessionCodeVisible, setIsSessionCodeVisible] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [qrWindowSeconds, setQrWindowSeconds] = useState(
    () => Number(session?.qrWindowSeconds || pendingQrWindowSeconds) || 10,
  );
  const [countdown, setCountdown] = useState(qrWindowSeconds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canScan = session?.id && session.status === 'open';
  const qrSessionId = session?.id || '';
  const qrSize = isFullscreen
    ? { container: 'min(92vw, 92vh)', box: 'min(60vw, 60vh)', code: Math.min(window.innerWidth || 700, window.innerHeight || 700) * 0.56 }
    : { container: 320, box: 304, code: 272 };

  useEffect(() => {
    if (syncedSessionIdRef.current === session?.id) {
      return;
    }

    syncedSessionIdRef.current = session?.id || null;
    setQrWindowSeconds(Number(session?.qrWindowSeconds || pendingQrWindowSeconds) || 10);
    setIsSessionCodeVisible(false);
  }, [pendingQrWindowSeconds, session?.id, session?.qrWindowSeconds]);

  useEffect(() => {
    if (!canScan) {
      setQrPayload('');
      setSessionCode('');
      qrExpiresAtRef.current = '';
      setCountdown(qrWindowSeconds);
      setQrLoading(false);
      setQrLoadFailed(false);
      return undefined;
    }

    const refreshPayload = async () => {
      if (qrRefreshInFlightRef.current) return;

      qrRefreshInFlightRef.current = true;
      qrNextRetryAtRef.current = Date.now() + 2000;
      setQrLoading(true);
      try {
        const response = await adHocAttendanceAPI.qrToken(qrSessionId, qrWindowSeconds);
        const data = response?.data || {};
        const serverTimeMs = Date.parse(data.serverTime || '');

        if (Number.isFinite(serverTimeMs)) {
          serverClockOffsetRef.current = serverTimeMs - Date.now();
        }

        if (!data.qrPayload) throw new Error('Empty QR payload');
        qrExpiresAtRef.current = data.qrExpiresAt || '';
        setQrLoadFailed(false);
        setQrPayload(data.qrPayload);
        setSessionCode(String(data.sessionCode || ''));
        setCountdown(getServerCountdown(
          qrExpiresAtRef.current,
          serverClockOffsetRef.current,
          Number(data.qrWindowSeconds || qrWindowSeconds),
        ));
      } finally {
        qrRefreshInFlightRef.current = false;
        setQrLoading(false);
      }
    };

    refreshPayload().catch(() => {
      setQrLoadFailed(true);
    });
    const tick = () => {
      const remaining = getServerCountdown(
        qrExpiresAtRef.current,
        serverClockOffsetRef.current,
        qrWindowSeconds,
      );

      setCountdown(remaining);
      if ((!qrExpiresAtRef.current || remaining <= 1) && Date.now() >= qrNextRetryAtRef.current) {
        refreshPayload().catch(() => setQrLoadFailed(true));
      }
    };

    tick();
    const interval = window.setInterval(tick, 500);

    return () => window.clearInterval(interval);
  }, [
    canScan,
    qrSessionId,
    qrWindowSeconds,
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === qrFullscreenRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleOpenFullscreen = async () => {
    const target = qrFullscreenRef.current;

    if (!target || typeof target.requestFullscreen !== 'function') return;

    try {
      await target.requestFullscreen();
    } catch (error) {
      // Keep the QR usable even if the browser blocks fullscreen.
    }
  };

  const handleExitFullscreen = async () => {
    if (typeof document === 'undefined' || typeof document.exitFullscreen !== 'function') return;

    try {
      await document.exitFullscreen();
    } catch (error) {
      // Ignore fullscreen exit failures.
    }
  };

  return (
    <div className="card doctor-dashboard-card doctor-qr-card">
        <div className="card-title doctor-dashboard-card-title">
          <span className="doctor-dashboard-card-title-icon"><QrCode size={18} /></span>
        {copy.qrTitle}
        </div>

      <div className="qr-wrapper">
        {canScan ? (
          <>
            <div
              ref={qrFullscreenRef}
              className="qr-container"
              style={{
                width: qrSize.container,
                height: qrSize.container,
                maxWidth: '100%',
                maxHeight: '100%',
                background: 'radial-gradient(circle at top, rgba(52,211,153,0.12), rgba(15,25,35,0.94) 58%, rgba(8,19,28,1) 100%)',
                borderRadius: isFullscreen ? 28 : 24,
                border: '1px solid rgba(52,211,153,0.14)',
                padding: isFullscreen ? 32 : 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 18px 34px rgba(0,0,0,0.18)',
              }}
            >
              {isFullscreen ? FULLSCREEN_EXIT_BUTTON_POSITIONS.map((position, index) => (
                <div
                  key={`exit-fullscreen-${index}`}
                  style={{
                    position: 'absolute',
                    ...position,
                    width: 'min(190px, calc(50% - 30px))',
                    zIndex: 3,
                  }}
                >
                  <CustomBottom
                    type="button"
                    text={copy.qrExitFullScreen}
                    onClick={handleExitFullscreen}
                    rigthIcon={<X size={16} />}
                    minHeight={46}
                    background="linear-gradient(135deg, #ef4444, #b91c1c)"
                    border="1px solid rgba(127,29,29,0.4)"
                    boxShadow="0 14px 28px rgba(185,28,28,0.28)"
                  />
                </div>
              )) : null}

              <div
                className="qr-box"
                style={{
                  width: qrSize.box,
                  height: qrSize.box,
                  position: 'relative',
                  zIndex: 1,
                  padding: isFullscreen ? 6 : 10,
                }}
              >
                {qrPayload ? <QRCodeSVG
                  value={qrPayload}
                  size={isFullscreen ? FULLSCREEN_QR_RENDER_SIZE : qrSize.code}
                  bgColor="#ffffff"
                  fgColor="#0f1923"
                  level="M"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                /> : <div className="qr-inactive-placeholder doctor-qr-placeholder" style={{ height: '100%', margin: 0 }}><span className="qr-placeholder-icon"><QrCode size={34} /></span><p>{qrLoadFailed ? (lang === 'ar' ? 'تعذر إنشاء رمز الحضور. تتم إعادة المحاولة تلقائيًا.' : 'Could not generate the attendance QR. Retrying automatically.') : (lang === 'ar' ? 'جارٍ إنشاء رمز الحضور الآمن...' : 'Generating the secure attendance QR...')}</p></div>}
              </div>
              {isFullscreen ? <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 4, borderRadius: 999, padding: '10px 22px', background: 'rgba(15,25,35,.92)', border: '1px solid rgba(52,211,153,.35)', color: '#d1fae5', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>{lang === 'ar' ? 'عدد الحضور' : 'Attendance count'}: {Number(session?.recordCount || session?.records?.length || 0)}</div> : null}
              {isFullscreen && sessionCode ? (
                <div dir="ltr" style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 4, width: 'min(420px, calc(100% - 24px))', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px, 4vw, 28px)', borderRadius: 16, padding: '12px 16px', background: 'rgba(15,25,35,.94)', border: '1px solid rgba(52,211,153,.35)', color: '#d1fae5' }}>
                  <div style={{ flex: '1 1 176px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <span style={{ minWidth: 112, textAlign: 'center', letterSpacing: isSessionCodeVisible ? 6 : 3, fontSize: 25, fontWeight: 950 }}>{isSessionCodeVisible ? sessionCode : '•'.repeat(sessionCode.length)}</span>
                    <button type="button" onClick={() => setIsSessionCodeVisible((visible) => !visible)} aria-label={isSessionCodeVisible ? 'Hide session code' : 'Show session code'} style={{ width: 42, height: 42, flex: '0 0 42px', borderRadius: 12, border: '1px solid rgba(52,211,153,.3)', background: 'rgba(52,211,153,.12)', color: '#6ee7b7', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{isSessionCodeVisible ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <span aria-hidden="true" style={{ width: 1, height: 38, background: 'rgba(255,255,255,.22)' }} />
                  <span style={{ flex: '0 0 70px', display: 'inline-flex', flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap', color: countdown <= 2 ? '#fbbf24' : '#6ee7b7', fontSize: 20, fontWeight: 950 }}><span>{copy.secondsShort}</span><span>{countdown}</span></span>
                </div>
              ) : null}
            </div>

            <div className="doctor-qr-token-box" dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
              <div style={{ minWidth: 120, textAlign: 'center' }}>
                <p className="doctor-qr-token-label">{copy.qrRefreshesIn}</p>
                <p className="doctor-qr-token-value" style={{ display: 'inline-flex', flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap', color: countdown <= 2 ? '#f59e0b' : '#34d399', fontSize: 18, fontWeight: 800 }}><span>{copy.secondsShort}</span><span>{countdown}</span></p>
              </div>
              <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', minHeight: 54, background: 'var(--border)' }} />
              <div style={{ minWidth: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ minWidth: 92, display: 'grid', justifyItems: 'center', gap: 3 }}>
                  <small style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }}>{lang === 'ar' ? `كود الجلسة · ${sessionCode.length || 6} أرقام` : `Session code · ${sessionCode.length || 6} digits`}</small>
                  <span dir="ltr" style={{ color: 'var(--text-primary)', letterSpacing: isSessionCodeVisible ? 5 : 2, fontSize: 20, fontWeight: 950 }}>{sessionCode ? (isSessionCodeVisible ? sessionCode : '•'.repeat(sessionCode.length)) : '------'}</span>
                </div>
                <button type="button" onClick={() => setIsSessionCodeVisible((visible) => !visible)} disabled={!sessionCode} aria-label={isSessionCodeVisible ? 'Hide session code' : 'Show session code'} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#34d399', display: 'grid', placeItems: 'center', cursor: sessionCode ? 'pointer' : 'default', opacity: sessionCode ? 1 : .5 }}>{isSessionCodeVisible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </div>

            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
              {(copy.classTypes[session?.lectureType] || session?.lectureType || copy.flexibleValue)} / {session?.group || '-'} / {session?.week || copy.flexibleValue} / {copy.refreshUnit} {qrWindowSeconds}{copy.secondsShort}
            </p>
            <CustomBottom
              type="button"
              text={copy.qrFullScreen}
              onClick={handleOpenFullscreen}
              rigthIcon={<QrCode size={16} />}
              minHeight={48}
              disabled={!qrPayload || qrLoading}
            />
          </>
        ) : (
          <div className="qr-inactive-placeholder doctor-qr-placeholder">
            <span className="qr-placeholder-icon"><QrCode size={34} /></span>
            <p>{copy.qrNoSession}</p>
          </div>
        )}

        <CustomDropdown
          id="flex-qr-window-panel"
          name="qrWindowSeconds"
          label={copy.qrRefreshLabel}
          value={String(qrWindowSeconds)}
          onChange={(event) => {
            const nextWindowSeconds = Number(event.target.value) || 10;
            setQrWindowSeconds(nextWindowSeconds);
            onPendingQrWindowChange(String(nextWindowSeconds));
          }}
          options={buildQrWindowOptions(lang)}
          placeholder={copy.qrSelectTime}
          icon={() => <Activity size={16} />}
        />
      </div>
    </div>
  );
};

const FlexibleRoster = ({
  session,
  isAdmin,
  saving,
  onDeleteRecord,
  searchTerm = '',
  setSearchTerm,
  page = 1,
  pageSize = FLEXIBLE_ROSTER_PAGE_SIZE,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  records = [],
  onExport,
  lang,
}) => {
  const copy = getFlexibleCopy(lang);
  const canSearch = typeof setSearchTerm === 'function';
  const canPaginate = typeof onPageChange === 'function' && totalPages > 1;
  const hasSessionRecords = Boolean(session?.records?.length);
  return (
  <div className="card doctor-dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div className="card-title doctor-dashboard-card-title" style={{ marginBottom: 4 }}>
          <span className="doctor-dashboard-card-title-icon"><Users size={18} /></span>
          {copy.temporaryRoster}
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          {copy.temporaryRosterDesc}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <strong style={{ color: '#34d399' }}>{session?.records?.length || 0} {copy.presentCount}</strong>
        {session && typeof onExport === 'function' ? (
          <button type="button" onClick={onExport} disabled={!session.records?.length} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '7px 11px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: session.records?.length ? 'pointer' : 'not-allowed', opacity: session.records?.length ? 1 : 0.5 }}>
            <Download size={15} />{lang === 'ar' ? 'تصدير' : 'Export'}
          </button>
        ) : null}
      </div>
    </div>

    {!hasSessionRecords ? (
      <EmptyState
        title={!session ? (lang === 'ar' ? 'اختر جلسة لعرض الحضور' : 'Choose a session to view attendance') : copy.noStudentsYet}
        subtitle={!session ? (lang === 'ar' ? 'اختر جلسة من قائمة الجلسات.' : 'Choose a session from the sessions list.') : copy.noStudentsDesc}
      />
    ) : (
      <>
        {canSearch ? (
          <div style={{ padding: '16px 20px 0' }}>
            <CustomInput
              id="flex-roster-search"
              name="flex-roster-search"
              label={copy.search}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={copy.searchStudentsPlaceholder}
              icon={() => <Search size={16} />}
            />
          </div>
        ) : null}
        {records.length === 0 ? (
          <EmptyState title={copy.noMatchingStudents} />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: canSearch ? 16 : 0 }}>
            <div style={{ minWidth: 780 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1.3fr 1fr 1fr 150px 70px', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 900, letterSpacing: 1.2 }}>
            <span>#</span>
            <span>{copy.studentColumn}</span>
            <span>{copy.universityIdColumn}</span>
            <span>{copy.collegeColumn}</span>
            <span>{copy.timeColumn}</span>
            <span>{copy.actionColumn}</span>
          </div>
          {records.map((record, index) => (
            <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '60px 1.3fr 1fr 1fr 150px 70px', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>{((page - 1) * pageSize) + index + 1}</span>
              <strong style={{ color: 'var(--text-primary)' }}>{record.studentName || '-'}</strong>
              <span style={{ color: '#9bdcff', fontFamily: 'monospace' }}>{record.studentUniversityId || record.studentId || '-'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{record.studentCollege || '-'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{formatDateTime(record.scannedAt)}</span>
              {!isAdmin && session.status !== 'migrated' ? (
                <button
                  type="button"
                  onClick={() => onDeleteRecord(record)}
                  disabled={saving}
                  title={copy.removeStudent}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    border: '1px solid rgba(248,113,113,0.32)',
                    background: 'rgba(248,113,113,0.1)',
                    color: '#f87171',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>-</span>
              )}
            </div>
          ))}
            </div>
          </div>
        )}
        {canPaginate ? (
          <div style={{ padding: '16px 20px 20px' }}>
            <Pagination
              id="flex-roster-pagination"
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        ) : null}
      </>
    )}
  </div>
  );
};

const StaffFlexibleScreen = ({
  createdSessionId,
  onRosterSaved,
  sessions,
  selectedSession,
  setSelectedId,
  loading,
  saving,
  form,
  setForm,
  studentIdentifier,
  setStudentIdentifier,
  sessionsSearchTerm,
  setSessionsSearchTerm,
  onCreateSession,
  onCreateBulkSession,
  onOpenBulkSession,
  onAddStudent,
  onBulkStudentFile,
  onDownloadStudentTemplate,
  bulkImporting,
  onCloseSession,
  onReopenSession,
  onDeleteRecord,
  onDeleteSession,
  onExport,
  onExportSubjectSessions,
  facultyOptions,
  subjectOptions,
  subjectsLoading,
  students,
  matchingSession,
  sessionsPage,
  sessionsPageSize,
  sessionsTotalPages,
  paginatedSessions,
  onSessionsPageChange,
  onSessionsPageSizeChange,
  rosterSearchTerm,
  setRosterSearchTerm,
  rosterPage,
  rosterPageSize,
  rosterTotalPages,
  paginatedRosterRecords,
  onRosterPageChange,
  onRosterPageSizeChange,
  lang,
  attendanceTerm,
}) => {
  const copy = getFlexibleCopy(lang);
  const [expandedSubjectKeys, setExpandedSubjectKeys] = useState(() => new Set());
  const subjectCardRefs = useRef(new Map());
  const bulkUploadInputRef = useRef(null);
  const bulkCopy = lang === 'ar' ? {
    title: '\u0625\u0636\u0627\u0641\u0629 \u0637\u0644\u0627\u0628 \u0645\u0646 Excel',
    description: '\u0627\u0631\u0641\u0639 \u0645\u0644\u0641 Excel \u064a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0639\u0645\u0648\u062f \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a \u0623\u0648 \u0627\u0644\u062c\u0627\u0645\u0639\u064a\u060c \u0648\u0633\u064a\u062a\u0645 \u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0644\u0627\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627.',
    download: '\u062a\u062d\u0645\u064a\u0644 \u0642\u0627\u0644\u0628 \u0627\u0644\u0623\u0631\u0642\u0627\u0645',
    upload: '\u0631\u0641\u0639 \u0645\u0644\u0641 \u0627\u0644\u0637\u0644\u0627\u0628',
    loading: '\u062c\u0627\u0631\u064d \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0637\u0644\u0627\u0628...',
  } : {
    title: copy.bulkStudentsTitle,
    description: copy.bulkStudentsDescription,
    download: copy.downloadNationalIdTemplate,
    upload: copy.uploadNationalIdSheet,
    loading: copy.importingStudents,
  };
  const selectedSubjectOption = subjectOptions.find((option) => option.value === form.subjectCode);
  const availableTypes = selectedSubjectOption?.types || [];
  const classTypeOptions = buildClassTypeOptions(lang)
    .filter((option) => !availableTypes.length || availableTypes.includes(option.value));
  const weekOptions = buildWeekOptions(lang, attendanceTerm);
  const sourceGroups = selectedSubjectOption?.groupsByType?.[form.lectureType]
    || selectedSubjectOption?.groups
    || [];
  const groupOptions = buildNumberedGroupOptions(sourceGroups);
  const managedSession = matchingSession && selectedSession?.id === matchingSession.id
    ? selectedSession
    : matchingSession || null;
  const hasExistingMatchingSession = Boolean(matchingSession);
  const isMatchingSessionClosed = matchingSession?.status === 'closed';
  const shouldShowExistingSessionNotice = Boolean(
    matchingSession
      && matchingSession.id
      && matchingSession.id !== selectedSession?.id,
  );
  const hasCompleteSessionDetails = Boolean(
    form.faculty
      && form.subjectCode.trim()
      && form.subjectName.trim()
      && form.group.trim()
      && form.lectureType.trim()
      && form.week.trim(),
  );
  const primaryActionIcon = !hasExistingMatchingSession || isMatchingSessionClosed
    ? <Play size={16} />
    : <Square size={15} />;
  const primaryActionDisabled = saving
    || (!hasExistingMatchingSession && !hasCompleteSessionDetails)
    || (hasExistingMatchingSession && !matchingSession);
  const toggleSubject = (subjectKey) => {
    const isOpening = !expandedSubjectKeys.has(subjectKey);
    setExpandedSubjectKeys((current) => {
      const next = new Set(current);
      if (next.has(subjectKey)) next.delete(subjectKey);
      else next.add(subjectKey);
      return next;
    });

    if (isOpening) {
      window.setTimeout(() => {
        subjectCardRefs.current.get(subjectKey)?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }, 230);
    }
  };

  const sessionControls = <>
      <div className="card doctor-dashboard-card doctor-lecture-card">
        <div className="card-title doctor-dashboard-card-title">
          <span className="doctor-dashboard-card-title-icon"><BookOpen size={18} /></span>
          {copy.sessionControl}
        </div>

        <div className="doctor-lecture-hero">
          <div>
            <h3 className="doctor-lecture-hero-title">{copy.sessionControlTitle}</h3>
            <p className="doctor-lecture-hero-copy">
              {copy.sessionControlDesc}
            </p>
          </div>
          <div className={`lecture-status-badge ${managedSession?.status === 'open' ? 'active' : 'inactive'}`} style={{ marginBottom: 0 }}>
            <span className={`status-dot ${managedSession?.status === 'open' ? 'pulse' : ''}`} />
            {managedSession?.status === 'open' ? copy.statusOpen : managedSession?.status === 'closed' ? copy.statusClosed : copy.statusReady}
          </div>
        </div>

        {shouldShowExistingSessionNotice ? (
          <div
            style={{
              marginBottom: 14,
              color: isMatchingSessionClosed ? '#fbbf24' : '#86efac',
              background: isMatchingSessionClosed ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)',
              border: isMatchingSessionClosed ? '1px solid rgba(251,191,36,0.28)' : '1px solid rgba(34,197,94,0.28)',
              padding: '12px 14px',
              borderRadius: 12,
              fontWeight: 700,
            }}
          >
            {isMatchingSessionClosed
              ? copy.existingClosed
              : copy.existingOpen}
          </div>
        ) : null}

        {/* Searchable dropdowns use Enter to select an option. Do not let that
            keyboard event submit the form and create an unintended session. */}
        <form onSubmit={(event) => event.preventDefault()} style={{ display: 'grid', gap: 14 }}>
          <div className="doctor-lecture-form-grid">
            <CustomDropdown
              id="flex-faculty"
              name="faculty"
              className="flexible-primary-dropdown"
              label={copy.faculty}
              value={form.faculty}
              onChange={(event) => setForm((current) => ({
                ...current,
                faculty: event.target.value,
                subjectCode: '',
                subjectName: '',
                lectureType: '',
                group: '',
                week: getCurrentAcademicWeekLabel(new Date(), attendanceTerm),
              }))}
              options={facultyOptions}
              placeholder={copy.selectFaculty}
              icon={() => <UsersRound size={16} />}
              fontSize={12}
              optionFontSize={12}
              searchable
              required
            />

            <CustomDropdown
              id="flex-subject"
              name="subjectCode"
              className="flexible-primary-dropdown"
              label={copy.subject}
              value={form.subjectCode}
              onChange={(event) => setForm((current) => {
                return {
                  ...current,
                  subjectCode: event.target.value,
                  subjectName: event.target.dataset.subjectName || '',
                  lectureType: '',
                  group: '',
                  week: getCurrentAcademicWeekLabel(new Date(), attendanceTerm),
                };
              })}
              options={subjectOptions}
              placeholder={subjectOptions.length ? copy.chooseSubject : copy.noSubjectsForFaculty}
              icon={() => <BookOpen size={16} />}
              fontSize={12}
              optionFontSize={12}
              disabled={!form.faculty || (!subjectsLoading && subjectOptions.length === 0)}
              loading={subjectsLoading}
              loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0648\u0627\u062f...' : 'Loading subjects...'}
              searchable
              emptyMessage={copy.noSubjectsFoundForFaculty}
              required
            />

            <CustomDropdown
              id="flex-type"
              name="lectureType"
              label={copy.subjectType}
              value={form.lectureType}
              onChange={(event) => setForm((current) => ({
                ...current,
                lectureType: event.target.value,
                group: '',
                week: getCurrentAcademicWeekLabel(new Date(), attendanceTerm),
              }))}
              options={classTypeOptions}
              placeholder={copy.selectType}
              icon={() => <BookOpen size={16} />}
              disabled={!form.subjectCode}
              required
            />

            <CustomDropdown
              id="flex-group"
              name="group"
              label={copy.group}
              value={form.group}
              onChange={(event) => setForm((current) => ({
                ...current,
                group: event.target.value,
                week: getCurrentAcademicWeekLabel(new Date(), attendanceTerm),
              }))}
              options={groupOptions}
              placeholder={groupOptions.length ? copy.selectGroup || copy.group : copy.selectSubjectTypeFirst}
              icon={() => <UsersRound size={16} />}
              textDirection="ltr"
              disabled={!form.lectureType || !groupOptions.length}
              required
            />

            <CustomDropdown
              id="flex-week"
              name="week"
              label={copy.week}
              value={form.week}
              onChange={(event) => setForm((current) => ({ ...current, week: event.target.value }))}
              options={weekOptions}
              placeholder={copy.selectWeek}
              icon={() => <CalendarDays size={16} />}
              disabled={!form.group}
              required
            />

            <button
              type="button"
              className={`all-groups-switch${form.allowAllGroups ? ' is-enabled' : ''}`}
              onClick={() => setForm((current) => ({ ...current, allowAllGroups: !current.allowAllGroups }))}
              disabled={!form.lectureType || managedSession?.status === 'open'}
              role="switch"
              aria-checked={Boolean(form.allowAllGroups)}
            >
              <span className="all-groups-switch-copy">
                <strong>{lang === 'ar' ? 'استقبال طلاب كل الجروبات' : 'Accept students from all groups'}</strong>
                <small>{lang === 'ar'
                  ? 'يسمح بالحضور لكل جروبات المادة من نفس النوع المختار'
                  : 'Allow every group registered in the selected subject and class type'}</small>
              </span>
              <span className="all-groups-switch-track" aria-hidden="true"><span className="all-groups-switch-thumb" /></span>
            </button>

          </div>

          <div className="doctor-lecture-actions">
            <CustomBottom
              type="button"
              text={!hasExistingMatchingSession
                ? copy.createFlexibleSession
                : isMatchingSessionClosed
                  ? copy.reopenExistingSession
                  : copy.closeCurrentSession}
              onClick={() => {
                if (!hasExistingMatchingSession) {
                  onCreateSession();
                  return;
                }

                if (!matchingSession) return;
                setSelectedId(matchingSession.id);

                if (isMatchingSessionClosed) {
                  onReopenSession(matchingSession.id);
                } else {
                  onCloseSession(matchingSession.id);
                }
              }}
              disabled={primaryActionDisabled}
              loading={saving}
              loadingText={!hasExistingMatchingSession ? copy.creating : isMatchingSessionClosed ? copy.reopening : copy.closing}
              rigthIcon={primaryActionIcon}
              minHeight={50}
              background={!hasExistingMatchingSession || isMatchingSessionClosed
                ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                : 'linear-gradient(135deg, #ef4444, #b91c1c)'}
              border={!hasExistingMatchingSession || isMatchingSessionClosed
                ? '1px solid rgba(52,211,153,0.28)'
                : '1px solid rgba(153,27,27,0.28)'}
              boxShadow={!hasExistingMatchingSession || isMatchingSessionClosed
                ? '0 14px 30px rgba(26,107,69,0.25)'
                : '0 16px 34px rgba(185,28,28,0.28)'}
            />
          </div>
        </form>
      </div>


</>;
  const manualEntry = (
    <div className="card doctor-dashboard-card">
          <div className="card-title doctor-dashboard-card-title">
            <span className="doctor-dashboard-card-title-icon"><Users size={18} /></span>
            {copy.recordStudent}
          </div>

          <form onSubmit={onAddStudent} style={{ display: 'grid', gap: 12 }}>
            <CustomInput
              id="flex-student-id"
              name="studentId"
              label={copy.studentIdLabel}
              value={studentIdentifier}
              onChange={(event) => setStudentIdentifier(event.target.value)}
              placeholder={copy.studentIdPlaceholder}
              icon={() => <UsersRound size={16} />}
              disabled={!selectedSession || selectedSession.status === 'migrated'}
            />
            <CustomBottom
              type="submit"
              text={copy.addStudent}
              loading={saving}
              loadingText={copy.adding}
              disabled={!selectedSession || !studentIdentifier.trim() || selectedSession.status === 'migrated'}
              rigthIcon={<Check size={16} />}
              minHeight={50}
            />
            <div style={{ display: 'grid', gap: 10 }}>
              <CustomBottom
                type="button"
                text={copy.export}
                onClick={onExport}
                disabled={!selectedSession?.records?.length}
                rigthIcon={<Download size={16} />}
                minHeight={46}
                background="linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))"
                border="1px solid var(--border)"
                boxShadow="none"
              />
              <CustomBottom
                type="button"
                text={lang === 'ar' ? 'تصدير كل جلسات المادة' : copy.exportAllSubjectSessions}
                onClick={onExportSubjectSessions}
                disabled={!selectedSession}
                rigthIcon={<Download size={16} />}
                minHeight={46}
                background="linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))"
                border="1px solid var(--border)"
                boxShadow="none"
              />
            </div>
          </form>
        </div>);
  const sessionPicker = (
    <div className="card doctor-dashboard-card">
          <div className="card-title doctor-dashboard-card-title">
            <span className="doctor-dashboard-card-title-icon"><BookOpen size={18} /></span>
            {copy.myFlexibleSessions}
          </div>
          <div style={{ marginBottom: 12 }}>
            <CustomInput
              id="flex-sessions-search"
              name="flex-sessions-search"
              label={copy.search}
              value={sessionsSearchTerm}
              onChange={(event) => setSessionsSearchTerm(event.target.value)}
              placeholder={copy.searchSessionsPlaceholder}
              icon={() => <BookOpen size={16} />}
            />
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>{copy.loadingSessions}</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>{copy.noFlexibleSessionsYet}</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {paginatedSessions.map((subject) => {
                const isExpanded = expandedSubjectKeys.has(subject.key);
                const sessionsByType = subject.sessions.reduce((types, session) => {
                  const type = session.lectureType || 'Other';
                  if (!types.has(type)) types.set(type, []);
                  types.get(type).push(session);
                  return types;
                }, new Map());
                const totalStudents = subject.sessions.reduce((total, session) => total + Number(session.recordCount || session.records?.length || 0), 0);

                return (
                  <div
                    key={subject.key}
                    className={`flexible-subject-card${isExpanded ? ' is-expanded' : ''}`}
                    ref={(element) => {
                      if (element) subjectCardRefs.current.set(subject.key, element);
                      else subjectCardRefs.current.delete(subject.key);
                    }}
                    style={{ borderRadius: 12, overflow: 'hidden' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubject(subject.key)}
                      aria-expanded={isExpanded}
                      style={{
                        width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)',
                        textAlign: 'left', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 12,
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {subject.subjectCode ? `${subject.subjectCode} - ` : ''}{subject.subjectName}
                        </strong>
                        <span style={{ display: 'block', marginTop: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                          {subject.sessions.length} session(s) · {totalStudents} {copy.studentsCountSuffix}
                        </span>
                      </span>
                      <span style={{ color: '#86efac', fontSize: 18, fontWeight: 900, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}>⌄</span>
                    </button>

                    <div style={{ display: 'grid', gridTemplateRows: isExpanded ? '1fr' : '0fr', transition: 'grid-template-rows 220ms ease' }}>
                      <div style={{ overflow: 'hidden', minHeight: 0 }}>
                      <div className="flexible-subject-details" style={{ padding: 10, display: 'grid', gap: 10, opacity: isExpanded ? 1 : 0, transform: isExpanded ? 'translateY(0)' : 'translateY(-5px)', transition: 'opacity 170ms ease, transform 220ms ease' }}>
                        {[...sessionsByType.entries()].map(([type, typeSessions]) => (
                          <div key={type} className="flexible-session-type" style={{ borderRadius: 10, padding: 10 }}>
                            <strong className="flexible-session-type-title" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                              {copy.classTypes[type] || type}
                            </strong>
                            <div style={{ display: 'grid', gap: 7 }}>
                              {typeSessions.map((session) => (
                                <div key={session.id} className={`flexible-session-item${selectedSession?.id === session.id ? ' is-selected' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 9, padding: '9px 10px' }}>
                                  <button type="button" onClick={() => setSelectedId(session.id)} style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                                    <span style={{ display: 'block', fontSize: 12, fontWeight: 800 }}>Group {session.group || '-'} - {formatAcademicWeekDisplay(session.week, lang)}</span>
                                    <span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>{session.recordCount || session.records?.length || 0} {copy.studentsCountSuffix}</span>
                                  </button>
                                  {selectedSession?.id === session.id ? (
                                    <span className="flexible-session-selected-mark" title={lang === 'ar' ? '\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629' : 'Selected session'}>
                                      <Check size={15} />
                                    </span>
                                  ) : null}
                                  <StatusBadge status={session.status} lang={lang} />
                                  <button type="button" onClick={() => onDeleteSession(session)} disabled={saving} title={copy.deleteFlexibleSession} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(248,113,113,0.32)', background: 'rgba(248,113,113,0.1)', color: '#f87171', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0 }}><X size={14} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Pagination
                id="flex-sessions-pagination"
                currentPage={sessionsPage}
                totalPages={sessionsTotalPages}
                onPageChange={onSessionsPageChange}
                pageSize={sessionsPageSize}
                onPageSizeChange={onSessionsPageSizeChange}
                className="pt-2"
              />
            </div>
          )}
        </div>);
  const attendanceRecords = (
    <FlexibleRoster
        session={selectedSession}
        isAdmin={false}
        saving={saving}
        onDeleteRecord={onDeleteRecord}
        searchTerm={rosterSearchTerm}
        setSearchTerm={setRosterSearchTerm}
        page={rosterPage}
        pageSize={rosterPageSize}
        totalPages={rosterTotalPages}
        onPageChange={onRosterPageChange}
        onPageSizeChange={onRosterPageSizeChange}
        records={paginatedRosterRecords}
        lang={lang}
      />);
  const bulkEntry = <BulkAttendanceMethods session={selectedSession} mode="flexible" onSaved={onRosterSaved} disabled={saving || bulkImporting || selectedSession?.status === 'migrated'}>
            <div style={{ border: '1px dashed rgba(52,211,153,0.38)', borderRadius: 14, padding: 12, background: 'rgba(52,211,153,0.05)', display: 'grid', gap: 10 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary)' }}>{bulkCopy.title}</strong>
                <span style={{ display: 'block', marginTop: 4, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>{bulkCopy.description}</span>
              </div>
              <input
                ref={bulkUploadInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={(event) => {
                  const [file] = event.target.files || [];
                  if (file) onBulkStudentFile(file);
                  event.target.value = '';
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
                <CustomBottom
                  type="button"
                  text={bulkCopy.download}
                  onClick={onDownloadStudentTemplate}
                  disabled={bulkImporting}
                  rigthIcon={<Download size={15} />}
                  minHeight={42}
                  background="rgba(30,41,59,0.84)"
                  border="1px solid var(--border)"
                  boxShadow="none"
                />
                <CustomBottom
                  type="button"
                  text={bulkCopy.upload}
                  onClick={() => bulkUploadInputRef.current?.click()}
                  loading={bulkImporting}
                  loadingText={bulkCopy.loading}
                  disabled={!selectedSession || selectedSession.status === 'migrated' || saving}
                  rigthIcon={<Upload size={15} />}
                  minHeight={42}
                  boxShadow="none"
                />
              </div>
            </div>
  </BulkAttendanceMethods>;
  return <div className="flexible-attendance-sections"><AttendanceWorkspace
    variant="flexible"
    facultyOptions={facultyOptions}
    subjectOptions={subjectOptions}
    weekOptions={weekOptions}
    onBulkFacultyChange={(faculty) => setForm((current) => ({
      ...current,
      faculty,
      subjectCode: '',
      subjectName: '',
      lectureType: '',
      group: '',
    }))}
    onCreateBulkSession={onCreateBulkSession}
    onOpenBulkSession={onOpenBulkSession}
    createdSessionId={createdSessionId}
    manageSessionId={matchingSession?.id || ''}
    availableSessions={sessions}
    onSelectSession={setSelectedId}
    qr={      <FlexibleQrPanel
        session={managedSession}
        pendingQrWindowSeconds={form.qrWindowSeconds}
        onPendingQrWindowChange={(value) => setForm((current) => ({ ...current, qrWindowSeconds: value }))}
        lang={lang}
      />}
    session={selectedSession}
    count={selectedSession?.recordCount || selectedSession?.records?.length || 0}
    controls={sessionControls}
    manual={manualEntry}
    attendance={attendanceRecords}
    sessions={sessionPicker}
    sessionsTitle={copy.myFlexibleSessions}
    bulk={bulkEntry}
  /></div>;
};

export const AdminAttendanceSessionsScreen = ({
  sessions,
  selectedSession,
  setSelectedId,
  loading,
  saving,
  migrationForm,
  setMigrationForm,
  onMigrate,
  onMigrateAll,
  canMigrateAll,
  migrationPreviewLoading,
  onCloseAll,
  canCloseAll,
  onRefresh,
  onExport,
  facultyOptions,
  students,
  migrationSessionsSearchTerm,
  setMigrationSessionsSearchTerm,
  migrationSessionsPage,
  migrationSessionsPageSize,
  migrationSessionsTotalPages,
  paginatedMigrationSessions,
  onMigrationSessionsPageChange,
  onMigrationSessionsPageSizeChange,
  rosterPage,
  rosterPageSize,
  rosterTotalPages,
  paginatedRosterRecords,
  onRosterPageChange,
  onRosterPageSizeChange,
  rosterSearchTerm,
  setRosterSearchTerm,
  adminFilters = EMPTY_ADMIN_SESSION_FILTERS,
  setAdminFilters,
  adminFilterOptions = EMPTY_ADMIN_FILTER_OPTIONS,
  lang,
  attendanceTerm,
  viewOnly = true,
}) => {
  const copy = getFlexibleCopy(lang);
  if (viewOnly) {
    const allLabel = lang === 'ar' ? 'الكل' : 'All';
    const makeOptions = (values, formatter = (value) => value) => [
      { value: '', label: allLabel },
      ...values.map((value) => ({ value: String(value), label: formatter(value) })),
    ];
    const updateFilter = (key, value) => setAdminFilters?.((current) => ({ ...current, [key]: value }));
    const facultyFilterOptions = makeOptions(adminFilterOptions.faculties || []);
    const subjectFilterOptions = [{ value: '', label: allLabel }, ...(adminFilterOptions.subjects || [])];
    const typeFilterOptions = makeOptions(adminFilterOptions.lectureTypes || [], (value) => copy.classTypes[value] || value);
    const groupFilterOptions = makeOptions(adminFilterOptions.groups || [], (value) => `${copy.group} ${value}`);
    const weekFilterOptions = makeOptions(adminFilterOptions.weeks || [], (value) => formatAcademicWeekDisplay(value, lang));
    const statusFilterOptions = makeOptions(adminFilterOptions.statuses || [], (value) => (
      value === 'open' ? (lang === 'ar' ? 'مفتوحة' : 'Open') : (lang === 'ar' ? 'مغلقة' : 'Closed')
    ));
    return (
      <div className="flexible-attendance-sections">
        <div className="top-row doctor-dashboard-top-row">
          <section className="card doctor-dashboard-card doctor-lecture-card" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px' }}>
                <div className="card-title doctor-dashboard-card-title">
                  <span className="doctor-dashboard-card-title-icon"><Activity size={18} /></span>
                  {lang === 'ar' ? 'جلسات الحضور' : 'Attendance sessions'}
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  {lang === 'ar'
                    ? 'متابعة جلسات الدكاترة وسجلات حضور الطلاب من مكان واحد.'
                    : 'Review doctors’ sessions and student attendance records in one place.'}
                </p>
              </div>
              <div style={{ flex: '0 1 250px', width: '100%' }}>
                <CustomBottom
                  type="button"
                  text={lang === 'ar' ? 'قفل كل الجلسات المفتوحة' : 'Close all open sessions'}
                  onClick={onCloseAll}
                  disabled={!canCloseAll || saving || loading}
                  loading={saving}
                  loadingText={lang === 'ar' ? 'جاري الإغلاق...' : 'Closing sessions...'}
                  rigthIcon={<Square size={16} />}
                  minHeight={48}
                  background="linear-gradient(135deg, #ef4444, #b91c1c)"
                  border="1px solid rgba(127,29,29,0.4)"
                  boxShadow="0 12px 24px rgba(185,28,28,0.22)"
                />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(148,163,184,.045)' }}>
              <div style={{ marginBottom: 10 }}>
                <CustomInput
                  id="admin-attendance-sessions-search"
                  name="admin-attendance-sessions-search"
                  label={copy.search}
                  value={migrationSessionsSearchTerm}
                  onChange={(event) => setMigrationSessionsSearchTerm(event.target.value)}
                  placeholder={lang === 'ar' ? 'ابحث بالمادة أو الدكتور أو المجموعة أو الأسبوع أو الحالة' : 'Search by subject, doctor, group, week, or status'}
                  icon={() => <Search size={16} />}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, alignItems: 'end' }}>
                <CustomDropdown id="admin-session-faculty-filter" name="faculty" label={copy.faculty} value={adminFilters.faculty} onChange={(event) => updateFilter('faculty', event.target.value)} options={facultyFilterOptions} searchable menuPlacement="bottom" />
                <CustomDropdown id="admin-session-subject-filter" name="subject" label={copy.subject} value={adminFilters.subject} onChange={(event) => updateFilter('subject', event.target.value)} options={subjectFilterOptions} searchable menuPlacement="bottom" />
                <CustomDropdown id="admin-session-type-filter" name="lectureType" label={copy.subjectType} value={adminFilters.lectureType} onChange={(event) => updateFilter('lectureType', event.target.value)} options={typeFilterOptions} menuPlacement="bottom" />
                <CustomDropdown id="admin-session-group-filter" name="group" label={copy.group} value={adminFilters.group} onChange={(event) => updateFilter('group', event.target.value)} options={groupFilterOptions} menuPlacement="bottom" />
                <CustomDropdown id="admin-session-week-filter" name="week" label={copy.week} value={adminFilters.week} onChange={(event) => updateFilter('week', event.target.value)} options={weekFilterOptions} menuPlacement="bottom" />
                <CustomDropdown id="admin-session-status-filter" name="status" label={lang === 'ar' ? 'الحالة' : 'Status'} value={adminFilters.status} onChange={(event) => updateFilter('status', event.target.value)} options={statusFilterOptions} menuPlacement="bottom" />
              </div>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>{copy.loadingSessions}</p>
            ) : sessions.length === 0 ? (
              <EmptyState
                title={migrationSessionsSearchTerm.trim() ? copy.noMatchingSessions : (lang === 'ar' ? 'لا توجد جلسات حضور' : 'No attendance sessions')}
                subtitle={migrationSessionsSearchTerm.trim() ? undefined : (lang === 'ar' ? 'ستظهر هنا الجلسات التي ينشئها الدكاترة.' : 'Sessions created by doctors will appear here.')}
              />
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {paginatedMigrationSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedId(session.id)}
                    style={{
                      border: selectedSession?.id === session.id ? '1px solid rgba(52,211,153,0.72)' : '1px solid var(--border)',
                      background: selectedSession?.id === session.id ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)',
                      color: 'var(--text-primary)',
                      borderRadius: 12,
                      padding: 14,
                      textAlign: lang === 'ar' ? 'right' : 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'grid', gap: 3 }}>
                        <strong style={{ fontSize: 14 }}>{session.subjectCode ? `${session.subjectCode} - ` : ''}{session.subjectName}</strong>
                        <small style={{ color: 'var(--text-muted)' }}>{lang === 'ar' ? 'الدكتور' : 'Doctor'}: {session.doctor?.name || '-'}</small>
                      </span>
                      <StatusBadge status={session.status} lang={lang} />
                    </div>
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
                      {[
                        [copy.faculty, session.faculty || '-'],
                        [copy.subjectType, copy.classTypes[session.lectureType] || session.lectureType || '-'],
                        [copy.group, session.group || '-'],
                        [copy.week, formatAcademicWeekDisplay(session.week, lang)],
                        [lang === 'ar' ? 'عدد الطلاب' : 'Students', session.recordCount || 0],
                        [lang === 'ar' ? 'بدأت' : 'Started', formatDateTime(session.startedAt)],
                      ].map(([label, value]) => (
                        <span key={label} style={{ display: 'grid', gap: 2, padding: '7px 9px', borderRadius: 8, background: 'rgba(148,163,184,.07)' }}>
                          <small style={{ color: 'var(--text-muted)', fontSize: 10 }}>{label}</small>
                          <b style={{ color: 'var(--text-primary)', fontSize: 11 }}>{value}</b>
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
                <Pagination
                  id="admin-attendance-sessions-pagination"
                  currentPage={migrationSessionsPage}
                  totalPages={migrationSessionsTotalPages}
                  onPageChange={onMigrationSessionsPageChange}
                  pageSize={migrationSessionsPageSize}
                  onPageSizeChange={onMigrationSessionsPageSizeChange}
                  className="pt-2"
                />
              </div>
            )}
          </section>

          <FlexibleRoster
            session={selectedSession}
            isAdmin
            saving={saving}
            onDeleteRecord={() => {}}
            searchTerm={rosterSearchTerm}
            setSearchTerm={setRosterSearchTerm}
            page={rosterPage}
            pageSize={rosterPageSize}
            totalPages={rosterTotalPages}
            onPageChange={onRosterPageChange}
            onPageSizeChange={onRosterPageSizeChange}
            records={paginatedRosterRecords}
            onExport={onExport}
            lang={lang}
          />
        </div>
      </div>
    );
  }
  const classTypeOptions = buildClassTypeOptions(lang);
  const weekOptions = buildWeekOptions(lang, attendanceTerm);
  const selectedFaculty = resolveFacultyRecord(migrationForm.faculty);
  const derivedCourseOptions = selectedFaculty
    ? getFacultySubjectOptionsFromStudents(selectedFaculty.id, students).map((course) => ({
        value: course.courseCode,
        label: course.courseName,
        dataset: {
          facultyId: selectedFaculty.id,
          facultyName: selectedFaculty.name,
          collegeId: course.college,
          collegeName: course.collegeName,
        },
      }))
    : [];
  const courseOptions = derivedCourseOptions.length
    ? derivedCourseOptions
    : (selectedFaculty?.colleges || [])
      .flatMap((college) => (college.courses || []).map((course) => ({
        value: course.id,
        label: course.name,
        dataset: {
          facultyId: selectedFaculty.id,
          facultyName: selectedFaculty.name,
          collegeId: college.id,
          collegeName: college.name,
        },
      })));
  const groupOptions = buildNumberedGroupOptions(
    getGroupOptionsForSubject(migrationForm.courseCode, students).map((option) => option.value),
  );
  if (migrationForm.group && !groupOptions.some((option) => option.value === migrationForm.group)) {
    groupOptions.push({
      value: migrationForm.group,
      label: formatNumberedGroupLabel(migrationForm.group, groupOptions.length),
    });
  }
  const hasAttendanceRecords = Boolean(selectedSession?.recordCount || selectedSession?.records?.length);
  const canMigrate = Boolean(
    selectedSession
    && selectedSession.status !== 'migrated'
    && hasAttendanceRecords
    && migrationForm.faculty
    && migrationForm.courseCode.trim()
    && migrationForm.group.trim()
    && migrationForm.lectureType
    && migrationForm.week
  );

  return (
  <div className="flexible-attendance-sections">
    <div className="top-row doctor-dashboard-top-row">
      <div className="card doctor-dashboard-card doctor-lecture-card">
        <div className="card-title doctor-dashboard-card-title">
          <span className="doctor-dashboard-card-title-icon"><Activity size={18} /></span>
          {copy.migrationScreen}
        </div>

        <div className="doctor-lecture-hero">
          <div>
            <h3 className="doctor-lecture-hero-title">{copy.migrationTitle}</h3>
          </div>
          <StatusBadge status={selectedSession?.status || 'ready'} lang={lang} />
        </div>

        <CustomBottom
          type="button"
          text={lang === 'ar' ? 'نقل كل الجلسات المطابقة' : 'Migrate all matching sessions'}
          onClick={onMigrateAll}
          disabled={!canMigrateAll || saving || migrationPreviewLoading}
          loading={saving || migrationPreviewLoading}
          loadingText={migrationPreviewLoading ? (lang === 'ar' ? '\u062c\u0627\u0631\u064a \u062d\u0633\u0627\u0628 \u0627\u0644\u062c\u0644\u0633\u0627\u062a...' : 'Checking sessions...') : copy.migrating}
          rigthIcon={<Check size={16} />}
          minHeight={48}
        />

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <CustomInput
                id="flex-migration-sessions-search"
                name="flex-migration-sessions-search"
                label={copy.search}
                value={migrationSessionsSearchTerm}
                onChange={(event) => setMigrationSessionsSearchTerm(event.target.value)}
                placeholder={copy.searchSessionsPlaceholder}
                icon={() => <Search size={16} />}
              />
            </div>
            <div style={{ flex: '1 1 210px' }}>
              <CustomBottom
                type="button"
                text={lang === 'ar' ? '\u0625\u063a\u0644\u0627\u0642 \u0643\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629' : 'Close all open sessions'}
                onClick={onCloseAll}
                disabled={!canCloseAll || saving || loading}
                loading={saving}
                loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u063a\u0644\u0627\u0642...' : 'Closing sessions...'}
                rigthIcon={<Square size={16} />}
                minHeight={48}
                background="linear-gradient(135deg, #ef4444, #b91c1c)"
                border="1px solid rgba(127,29,29,0.4)"
                boxShadow="0 14px 28px rgba(185,28,28,0.28)"
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>{copy.loadingSessions}</p>
          ) : sessions.length === 0 ? (
            migrationSessionsSearchTerm.trim() ? (
              <EmptyState title={copy.noMatchingSessions} />
            ) : (
              <EmptyState
                title={copy.noFlexibleSessions}
                subtitle={copy.noFlexibleSessionsDesc}
              />
            )
          ) : (
            <>
              {paginatedMigrationSessions.length === 0 ? (
                <EmptyState title={copy.noMatchingSessions} />
              ) : paginatedMigrationSessions.map((session) => (
                <button
              key={session.id}
              type="button"
              onClick={() => setSelectedId(session.id)}
              style={{
                border: selectedSession?.id === session.id ? '1px solid rgba(52,211,153,0.72)' : '1px solid var(--border)',
                background: selectedSession?.id === session.id ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                borderRadius: 12,
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
              }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{session.subjectCode ? `${session.subjectCode} - ` : ''}{session.subjectName}</strong>
                    <StatusBadge status={session.status} lang={lang} />
                  </div>
                  <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{copy.doctorPrefix}: {session.doctor?.name || '-'}</span>
                    <span>{session.faculty}</span>
                    <span>{copy.classTypes[session.lectureType] || session.lectureType || '-'}</span>
                    <span>{session.group || '-'}</span>
                    <span>{session.week || '-'}</span>
                    <span>{session.recordCount || 0} {copy.studentsCountSuffix}</span>
                  </div>
                </button>
              ))}
              <Pagination
                id="flex-migration-pagination"
                currentPage={migrationSessionsPage}
                totalPages={migrationSessionsTotalPages}
                onPageChange={onMigrationSessionsPageChange}
                pageSize={migrationSessionsPageSize}
                onPageSizeChange={onMigrationSessionsPageSizeChange}
                className="pt-2"
              />
            </>
          )}
        </div>
      </div>

      <div className="card doctor-dashboard-card doctor-qr-card">
        <div className="card-title doctor-dashboard-card-title">
          <span className="doctor-dashboard-card-title-icon"><CalendarDays size={18} /></span>
          {copy.officialDestination}
        </div>

        {selectedSession ? (
          <form onSubmit={onMigrate} className="qr-wrapper" style={{ justifyContent: 'space-between' }}>
            <div className="doctor-lecture-live-panel" style={{ width: '100%' }}>
              <div className="doctor-lecture-live-icon"><BookOpen size={18} /></div>
              <div>
                <p className="doctor-lecture-live-label">{copy.temporarySource}</p>
                <strong className="doctor-lecture-live-title">
                  {selectedSession.subjectCode ? `${selectedSession.subjectCode} - ` : ''}{selectedSession.subjectName}
                </strong>
                <p className="doctor-lecture-live-copy">
                  {selectedSession.recordCount || 0} {copy.sourceByDoctor} {selectedSession.doctor?.name || '-'}
                </p>
              </div>
            </div>

            <CustomDropdown
              id="migrate-faculty"
              name="faculty"
              label={copy.faculty}
              value={migrationForm.faculty}
              onChange={(event) => setMigrationForm((current) => ({
                ...current,
                faculty: event.target.value,
                courseCode: '',
              }))}
              options={facultyOptions}
              icon={() => <UsersRound size={16} />}
              searchable
              menuPlacement="bottom"
            />

            <CustomDropdown
              id="migrate-course-code"
              name="courseCode"
              label={copy.course}
              value={migrationForm.courseCode}
              onChange={(event) => setMigrationForm((current) => {
                return {
                  ...current,
                  courseCode: event.target.value,
                  group: getGroupOptionsForSubject(event.target.value, students)[0]?.value || current.group,
                };
              })}
              options={courseOptions}
              placeholder={courseOptions.length ? `${copy.course}` : copy.noCoursesInFaculty}
              icon={() => <BookOpen size={16} />}
              searchable
              emptyMessage={copy.noCoursesFoundForFaculty}
              menuPlacement="bottom"
              disabled={!courseOptions.length}
            />

            <CustomDropdown
              id="migrate-group"
              name="group"
              label={copy.realGroup}
              value={migrationForm.group}
              onChange={(event) => setMigrationForm((current) => ({ ...current, group: event.target.value }))}
              options={groupOptions}
              placeholder={groupOptions.length ? copy.group : copy.noGroupsForCourse}
              icon={() => <UsersRound size={16} />}
              menuPlacement="bottom"
              disabled={!migrationForm.courseCode || !groupOptions.length}
            />

            <CustomDropdown
              id="migrate-type"
              name="lectureType"
              label={copy.subjectType}
              value={migrationForm.lectureType}
              onChange={(event) => setMigrationForm((current) => ({ ...current, lectureType: event.target.value }))}
              options={classTypeOptions}
              icon={() => <BookOpen size={16} />}
              menuPlacement="bottom"
            />

            <CustomDropdown
              id="migrate-week"
              name="week"
              label={copy.week}
              value={migrationForm.week}
              onChange={(event) => setMigrationForm((current) => ({ ...current, week: event.target.value }))}
              options={weekOptions}
              icon={() => <CalendarDays size={16} />}
              menuPlacement="bottom"
            />

            <CustomBottom
              type="submit"
              text={selectedSession?.status === 'migrated' ? copy.alreadyMigrated : copy.migrateToRealSession}
              loading={saving}
              loadingText={copy.migrating}
              disabled={!canMigrate}
              rigthIcon={<Check size={16} />}
              minHeight={50}
            />
            <CustomBottom
              type="button"
              text={copy.exportSource}
              onClick={onExport}
              disabled={!selectedSession.records?.length}
              rigthIcon={<Download size={16} />}
              minHeight={48}
              background="linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))"
              border="1px solid var(--border)"
              boxShadow="none"
            />
            <CustomBottom
              type="button"
              text={copy.refresh}
              onClick={onRefresh}
              loading={loading}
              loadingText={copy.refreshing}
              rigthIcon={<Activity size={16} />}
              minHeight={48}
              background="linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))"
              border="1px solid var(--border)"
              boxShadow="none"
            />
          </form>
        ) : (
          <div className="qr-inactive-placeholder doctor-qr-placeholder">
            <span className="qr-placeholder-icon"><Activity size={34} /></span>
            <p>{copy.selectFlexibleSessionToMigrate}</p>
          </div>
        )}
      </div>
    </div>

    <FlexibleRoster
      session={selectedSession}
      isAdmin
      saving={saving}
      onDeleteRecord={() => {}}
      page={rosterPage}
      pageSize={rosterPageSize}
      totalPages={rosterTotalPages}
      onPageChange={onRosterPageChange}
      onPageSizeChange={onRosterPageSizeChange}
      records={paginatedRosterRecords}
      lang={lang}
    />
  </div>
  );
};

const FlexibleAttendancePage = () => {
  const { user, doctorCourses = [] } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const copy = getFlexibleCopy(lang);
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const bulkImportTitle = lang === 'ar' ? '\u0625\u0636\u0627\u0641\u0629 \u0637\u0644\u0627\u0628 \u0645\u0646 Excel' : copy.bulkStudentsTitle;
  const bulkImportError = lang === 'ar' ? '\u062a\u0639\u0630\u0631 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0637\u0644\u0627\u0628 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641.' : copy.bulkImportError;
  const isAdmin = user?.userRole === 'admin';
  const restrictToAssignments = !isAdmin
    && Boolean(user?.restrictFlexibleAttendanceToAssignments);
  const facultyOptions = useMemo(() => {
    const options = buildFacultyOptions(lang);
    if (!restrictToAssignments) return options;

    return options.filter((option) => {
      const faculty = resolveFacultyRecord(option.value);
      return doctorCourses.some((course) => (
        facultyMatchesSelection(faculty, course.faculty)
        || facultyMatchesSelection(faculty, course.college)
      ));
    });
  }, [doctorCourses, lang, restrictToAssignments]);
  const [form, setForm] = useState(() => buildDefaultFlexibleForm(attendanceTerm));
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const [catalogSubjectsLoading, setCatalogSubjectsLoading] = useState(false);
  // Subject/group selectors only need registration-shaped catalog metadata. Building
  // this tiny local source avoids downloading every student on this page.
  const students = useMemo(() => catalogSubjects.map((subject) => {
    const faculty = FACULTY_CATALOG.find((item) => item.id === subject.facultyId);
    const registrations = (subject.types || ['Lecture']).flatMap((type) => {
      const groups = subject.groupsByType?.[type] || subject.groups || [];
      return groups.map((group) => ({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        type,
        group,
      }));
    });
    return { college: faculty?.colleges?.[0]?.name || subject.facultyName, registrations };
  }), [catalogSubjects]);
  const subjectOptions = useMemo(
    () => buildFacultySubjectOptions({
      facultyValue: form.faculty,
      userRole: user?.userRole,
      assignedCourses: doctorCourses,
      students,
      catalogSubjects,
      restrictToAssignments,
      termCode: selectedTermCode || attendanceTerm?.code || '',
    }),
    [attendanceTerm?.code, catalogSubjects, doctorCourses, form.faculty, restrictToAssignments, selectedTermCode, students, user?.userRole],
  );

  useEffect(() => {
    if (!restrictToAssignments || !form.faculty) return;
    if (facultyOptions.some((option) => option.value === form.faculty)) return;

    setForm((current) => ({
      ...current,
      faculty: '',
      subjectCode: '',
      subjectName: '',
      lectureType: '',
      group: '',
    }));
  }, [facultyOptions, form.faculty, restrictToAssignments]);

  // Keep cached options usable while a fresh catalog request is running.
  const subjectsLoading = Boolean(form.faculty) && catalogSubjectsLoading && subjectOptions.length === 0;
  const [sessions, setSessions] = useState([]);
  const [createdSessionId, setCreatedSessionId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPageSize, setSessionsPageSize] = useState(FLEXIBLE_SESSIONS_PAGE_SIZE);
  const [sessionsSearchTerm, setSessionsSearchTerm] = useState('');
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPageSize, setRosterPageSize] = useState(FLEXIBLE_ROSTER_PAGE_SIZE);
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');
  const [migrationSessionsPage, setMigrationSessionsPage] = useState(1);
  const [migrationSessionsPageSize, setMigrationSessionsPageSize] = useState(FLEXIBLE_MIGRATION_SESSIONS_PAGE_SIZE);
  const [migrationSessionsSearchTerm, setMigrationSessionsSearchTerm] = useState('');
  const [adminSessionsTotalPages, setAdminSessionsTotalPages] = useState(1);
  const [adminSessionFilters, setAdminSessionFilters] = useState(() => ({ ...EMPTY_ADMIN_SESSION_FILTERS }));
  const [adminFilterOptions, setAdminFilterOptions] = useState(EMPTY_ADMIN_FILTER_OPTIONS);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingDeleteSession, setPendingDeleteSession] = useState(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState(null);
  const [pendingBulkMigration, setPendingBulkMigration] = useState(null);
  const [migrationPreviewLoading, setMigrationPreviewLoading] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [pendingCloseAllSessions, setPendingCloseAllSessions] = useState(null);
  const [migrationForm, setMigrationForm] = useState({
    courseCode: '',
    lectureType: 'Lecture',
    faculty: FACULTY_CATALOG[0]?.name || '',
    group: GROUP_PLACEHOLDER,
    week: getCurrentAcademicWeekLabel(new Date(), attendanceTerm),
  });
  const latestSelectedSessionRef = useRef(null);
  const loadSessionsRequestIdRef = useRef(0);
  const debouncedMigrationSearchTerm = useDebouncedValue(
    migrationSessionsSearchTerm,
    FLEXIBLE_SEARCH_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!attendanceTerm?.startDate) return;

    const defaultWeek = getCurrentAcademicWeekLabel(new Date(), attendanceTerm);
    setForm((current) => ({ ...current, week: defaultWeek }));
    setMigrationForm((current) => ({ ...current, week: defaultWeek }));
  }, [attendanceTerm]);

  const selectedSessionSummary = useMemo(
    () => selectAttendanceSession(sessions, selectedId, isAdmin),
    [isAdmin, selectedId, sessions],
  );
  const selectedSession = useMemo(() => (
    selectedSessionDetail?.id === selectedSessionSummary?.id
      ? selectedSessionDetail
      : selectedSessionSummary
  ), [selectedSessionDetail, selectedSessionSummary]);
  const matchingSession = useMemo(() => {
    if (isAdmin) return null;
    if (!form.faculty || !form.subjectCode || !form.lectureType || !form.group || !form.week) {
      return null;
    }

    return sessions.find((session) => (
      session.status !== 'migrated'
      && facultyMatchesSelection(resolveFacultyRecord(form.faculty), session.faculty)
      && normalizeFlexibleText(session.subjectCode) === normalizeFlexibleText(form.subjectCode)
      && normalizeFlexibleText(session.lectureType) === normalizeFlexibleText(form.lectureType)
      && normalizeFlexibleText(session.group) === normalizeFlexibleText(form.group)
      && normalizeMigrationWeek(session.week) === normalizeMigrationWeek(form.week)
    )) || null;
  }, [form.faculty, form.group, form.lectureType, form.subjectCode, form.week, isAdmin, sessions]);
  useEffect(() => {
    if (!matchingSession?.id) return;

    setForm((current) => (
      current.allowAllGroups === Boolean(matchingSession.allowAllGroups)
        ? current
        : { ...current, allowAllGroups: Boolean(matchingSession.allowAllGroups) }
    ));
  }, [matchingSession?.allowAllGroups, matchingSession?.id]);
  const filteredSessions = useMemo(() => {
    const normalizedQuery = sessionsSearchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return sessions;
    }

    return sessions.filter((session) => (
      [
        session.subjectName,
        session.subjectCode,
        session.faculty,
        session.lectureType,
        session.group,
        session.week,
        session.status,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [sessions, sessionsSearchTerm]);
  const groupedSubjectSessions = useMemo(() => {
    const groups = new Map();

    filteredSessions.forEach((session) => {
      const subjectCode = normalizeFlexibleText(session.subjectCode);
      const subjectName = normalizeFlexibleText(session.subjectName);
      const faculty = normalizeFlexibleText(session.faculty);
      const key = `${faculty}__${subjectCode || subjectName}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          faculty: session.faculty || '',
          subjectCode: session.subjectCode || '',
          subjectName: session.subjectName || session.subjectCode || '-',
          sessions: [],
        });
      }

      groups.get(key).sessions.push(session);
    });

    return [...groups.values()]
      .map((subject) => ({
        ...subject,
        sessions: [...subject.sessions].sort((left, right) => {
          const typeOrder = CLASS_TYPES.indexOf(left.lectureType) - CLASS_TYPES.indexOf(right.lectureType);
          if (typeOrder !== 0) return typeOrder;
          const groupOrder = String(left.group || '').localeCompare(String(right.group || ''));
          if (groupOrder !== 0) return groupOrder;
          return Number(normalizeMigrationWeek(left.week)) - Number(normalizeMigrationWeek(right.week));
        }),
      }))
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName));
  }, [filteredSessions]);
  const sessionsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(groupedSubjectSessions.length / sessionsPageSize)),
    [groupedSubjectSessions.length, sessionsPageSize],
  );
  const paginatedSessions = useMemo(() => {
    const startIndex = (sessionsPage - 1) * sessionsPageSize;
    return groupedSubjectSessions.slice(startIndex, startIndex + sessionsPageSize);
  }, [groupedSubjectSessions, sessionsPage, sessionsPageSize]);
  const filteredRosterRecords = useMemo(() => {
    const records = selectedSession?.records || [];
    const normalizedQuery = rosterSearchTerm.trim().toLowerCase();

    if (!normalizedQuery) return records;

    return records.filter((record) => (
      [
        record.studentName,
        record.studentUniversityId,
        record.studentId,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [rosterSearchTerm, selectedSession?.records]);
  const rosterTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRosterRecords.length / rosterPageSize)),
    [filteredRosterRecords.length, rosterPageSize],
  );
  const paginatedRosterRecords = useMemo(() => {
    const startIndex = (rosterPage - 1) * rosterPageSize;
    return filteredRosterRecords.slice(startIndex, startIndex + rosterPageSize);
  }, [filteredRosterRecords, rosterPage, rosterPageSize]);
  const filteredMigrationSessions = useMemo(() => {
    if (isAdmin) return sessions;

    const normalizedQuery = migrationSessionsSearchTerm.trim().toLowerCase();

    if (!normalizedQuery) return sessions;

    return sessions.filter((session) => (
      [
        session.subjectName,
        session.subjectCode,
        session.doctor?.name,
        session.faculty,
        session.lectureType,
        session.group,
        session.week,
        session.status,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
    ));
  }, [isAdmin, migrationSessionsSearchTerm, sessions]);
  const migrationSessionsTotalPages = useMemo(
    () => (isAdmin
      ? adminSessionsTotalPages
      : Math.max(1, Math.ceil(filteredMigrationSessions.length / migrationSessionsPageSize))),
    [adminSessionsTotalPages, filteredMigrationSessions.length, isAdmin, migrationSessionsPageSize],
  );
  const paginatedMigrationSessions = useMemo(() => {
    if (isAdmin) return sessions;

    const startIndex = (migrationSessionsPage - 1) * migrationSessionsPageSize;
    return filteredMigrationSessions.slice(startIndex, startIndex + migrationSessionsPageSize);
  }, [filteredMigrationSessions, isAdmin, migrationSessionsPage, migrationSessionsPageSize, sessions]);

  const replaceSession = (updatedSession, { select = false } = {}) => {
    if (!updatedSession) return;

    setSessions((current) => (
      current.some((session) => session.id === updatedSession.id)
        ? current.map((session) => (session.id === updatedSession.id ? updatedSession : session))
        : [updatedSession, ...current]
    ));
    // An upload may finish after the user has switched tabs or sessions.
    // Update its saved records without moving the user's current selection.
    setSelectedSessionDetail((current) => select || latestSelectedSessionRef.current?.id === updatedSession.id ? updatedSession : current);
    if (select) setSelectedId(updatedSession.id);
  };

  const loadSessions = useCallback(async () => {
    const requestId = loadSessionsRequestIdRef.current + 1;
    loadSessionsRequestIdRef.current = requestId;
    setLoading(true);
    setError('');

    try {
      const response = await adHocAttendanceAPI.getAll(isAdmin ? {
        page: migrationSessionsPage,
        perPage: migrationSessionsPageSize,
        search: debouncedMigrationSearchTerm.trim() || undefined,
        ...Object.fromEntries(Object.entries(adminSessionFilters).filter(([, value]) => value)),
      } : undefined);
      if (requestId !== loadSessionsRequestIdRef.current) return;

      const nextSessions = response?.data?.sessions || [];
      setSessions(nextSessions);
      if (isAdmin) {
        setAdminSessionsTotalPages(Math.max(1, Number(response?.data?.pagination?.totalPages) || 1));
        setAdminFilterOptions(response?.data?.filters || EMPTY_ADMIN_FILTER_OPTIONS);
      }
      setSelectedId((current) => selectAttendanceSession(nextSessions, current, isAdmin)?.id || '');
    } catch (requestError) {
      if (requestId !== loadSessionsRequestIdRef.current) return;
      setError(normalizeError(requestError, copy.loadSessionsError));
    } finally {
      if (requestId === loadSessionsRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [adminSessionFilters, copy.loadSessionsError, debouncedMigrationSearchTerm, isAdmin, migrationSessionsPage, migrationSessionsPageSize]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setSessionsPage(1);
  }, [form.faculty, form.group, form.lectureType, form.subjectCode, form.week, sessionsSearchTerm]);

  useEffect(() => {
    if (sessionsPage > sessionsTotalPages) {
      setSessionsPage(sessionsTotalPages);
    }
  }, [sessionsPage, sessionsTotalPages]);

  useEffect(() => {
    setRosterPage(1);
  }, [rosterSearchTerm, selectedId]);

  useEffect(() => {
    if (rosterPage > rosterTotalPages) {
      setRosterPage(rosterTotalPages);
    }
  }, [rosterPage, rosterTotalPages]);

  useEffect(() => {
    if (migrationSessionsPage > migrationSessionsTotalPages) {
      setMigrationSessionsPage(migrationSessionsTotalPages);
    }
  }, [migrationSessionsPage, migrationSessionsTotalPages]);

  useEffect(() => {
    setMigrationSessionsPage(1);
  }, [adminSessionFilters, migrationSessionsSearchTerm]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedSessionDetail(null);
      return undefined;
    }

    let cancelled = false;
    setSelectedSessionDetail(null);

    adHocAttendanceAPI.get(selectedId)
      .then((response) => {
        if (!cancelled) {
          const refreshedSession = response?.data?.session || null;
          setSelectedSessionDetail(refreshedSession);
          if (refreshedSession) {
            setSessions((current) => current.map((session) => (
              session.id === refreshedSession.id ? refreshedSession : session
            )));
          }
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(normalizeError(requestError, copy.loadSessionsError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.loadSessionsError, selectedId]);

  useEffect(() => {
    if (!selectedId || selectedSession?.status !== 'open') return undefined;

    let stopped = false;
    const poller = createBackgroundPoller(async () => {
        const response = await adHocAttendanceAPI.get(selectedId);
        const refreshedSession = response?.data?.session || null;
        if (!stopped && refreshedSession) {
          setSessions((current) => current.map((session) => (
            session.id === refreshedSession.id ? refreshedSession : session
          )));
          setSelectedSessionDetail(refreshedSession);
        }
    }, { immediate: false });
    const handleStudentAttended = (data) => {
      if (String(data?.lectureId || '') === String(selectedId)) poller.trigger();
    };
    socket?.on('student_attended', handleStudentAttended);
    socket?.on('connect', poller.trigger);
    return () => {
      stopped = true;
      poller.stop();
      socket?.off('student_attended', handleStudentAttended);
      socket?.off('connect', poller.trigger);
    };
  }, [selectedId, selectedSession?.status, socket]);

  useEffect(() => {
    const selectedFaculty = resolveFacultyRecord(form.faculty);

    if (!selectedFaculty) {
      setCatalogSubjects([]);
      setCatalogSubjectsLoading(false);
      return;
    }

    let isCurrentFaculty = true;
    const cachedSubjects = getCachedFlexibleSubjects(selectedFaculty.id);

    // Show the previous successful result immediately, then silently refresh it.
    setCatalogSubjects(cachedSubjects);
    setCatalogSubjectsLoading(cachedSubjects.length === 0);

    const refreshSubjects = async (attempt = 0) => {
      if (!isCurrentFaculty) return;

      try {
        const subjects = await fetchCatalogSubjects({ facultyId: selectedFaculty.id });
        if (!isCurrentFaculty) return;

        cacheFlexibleSubjects(selectedFaculty.id, subjects);
        setCatalogSubjects(subjects);
        setCatalogSubjectsLoading(false);
      } catch {
        // A cached list remains available offline. Retry once for short network interruptions.
        if (isCurrentFaculty && attempt === 0) {
          window.setTimeout(() => refreshSubjects(1), 900);
        }
      } finally {
        if (isCurrentFaculty && attempt > 0) {
          setCatalogSubjectsLoading(false);
        }
      }
    };

    refreshSubjects();

    // A cached result is already visible; do not cover it with the loading state.
    if (cachedSubjects.length > 0) {
      setCatalogSubjectsLoading(false);
    }

    return () => {
      isCurrentFaculty = false;
    };
  }, [form.faculty]);

  useEffect(() => {
    latestSelectedSessionRef.current = selectedSession || null;
  }, [selectedSession]);

  useFlexibleSessionLifecycle({ sessions, managedSessionId: createdSessionId, isAdmin, lang });

  useEffect(() => {
    if (isAdmin || selectedSession?.status !== 'open') return undefined;

    let stopped = false;
    const poller = createBackgroundPoller(async () => {
      const response = await adHocAttendanceAPI.getAll();
      if (!stopped) setSessions(response?.data?.sessions || []);
    }, { intervalMs: 30000, immediate: false });
    return () => { stopped = true; poller.stop(); };
  }, [isAdmin, selectedSession?.status]);

  useEffect(() => {
    if (!selectedSession) return;

    setMigrationForm((current) => ({
      ...current,
      courseCode: selectedSession.subjectCode || current.courseCode,
      lectureType: selectedSession.lectureType || current.lectureType,
      group: selectedSession.group || current.group,
      week: selectedSession.week ? `Week ${normalizeMigrationWeek(selectedSession.week)}` : current.week,
      faculty: selectedSession.faculty || current.faculty,
    }));
  }, [selectedSession]);

  useEffect(() => {
    const availableSections = getGroupOptionsForSubject(migrationForm.courseCode, students).map((option) => option.value);

    if (!availableSections.length) return;
    if (!migrationForm.group) {
      setMigrationForm((current) => ({
        ...current,
        group: availableSections[0],
      }));
      return;
    }
    if (availableSections.includes(migrationForm.group)) return;
  }, [migrationForm.courseCode, migrationForm.group, students]);

  useEffect(() => {
    if (!form.subjectCode.trim()) {
      if (!form.subjectName) return;

      setForm((current) => ({ ...current, subjectName: '' }));
      return;
    }

    const selectedOption = subjectOptions.find((option) => option.value === form.subjectCode);

    if (!selectedOption) {
      setForm((current) => {
        if (!current.subjectCode && !current.subjectName && !current.group) return current;

        return {
          ...current,
          subjectCode: '',
          subjectName: '',
          group: '',
        };
      });
      return;
    }

    const nextSubjectName = selectedOption.dataset?.subjectName || '';

    if (form.subjectName === nextSubjectName) return;

    setForm((current) => ({
      ...current,
      subjectName: nextSubjectName,
    }));
  }, [form.subjectCode, form.subjectName, subjectOptions]);

  useEffect(() => {
    const selectedOption = subjectOptions.find((option) => option.value === form.subjectCode);
    const availableSections = selectedOption?.groupsByType?.[form.lectureType]
      || selectedOption?.groups
      || [];

    if (!availableSections.length) {
      if (!form.group) return;

      setForm((current) => {
        if (current.group === '') return current;
        return { ...current, group: '' };
      });
      return;
    }

    if (!form.lectureType) {
      if (!form.group) return;

      setForm((current) => ({ ...current, group: '' }));
      return;
    }

    if (availableSections.includes(form.group)) return;

    setForm((current) => ({
      ...current,
      group: availableSections[0],
    }));
  }, [form.group, form.lectureType, form.subjectCode, form.subjectName, subjectOptions]);

  const handleCreateSession = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.create(form);
      replaceSession(response?.data?.session, { select: true });
      setCreatedSessionId(response?.data?.session?.id || '');
      setMessage('');
    } catch (requestError) {
      setError(normalizeError(requestError, copy.createSessionError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBulkSession = async (target) => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.create({
        ...target,
        qrWindowSeconds: form.qrWindowSeconds,
        allowAllGroups: Boolean(form.allowAllGroups),
      });
      const created = response?.data?.session || null;
      replaceSession(created, { select: true });
      setCreatedSessionId(created?.id || '');
      return created;
    } catch (requestError) {
      setError(normalizeError(requestError, copy.createSessionError));
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async (event) => {
    event.preventDefault();
    if (!selectedSession || selectedSession.status === 'migrated' || !studentIdentifier.trim()) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.addStudent(selectedSession.id, {
        studentId: studentIdentifier.trim(),
      });
      replaceSession(response?.data?.session);
      setStudentIdentifier('');
      setMessage(copy.addStudentSuccess);
      showToast({ tone: 'success', title: copy.recordStudent, message: copy.addStudentSuccess });
    } catch (requestError) {
      const errorMessage = normalizeError(requestError, copy.addStudentError);
      showToast({ tone: 'error', title: copy.recordStudent, message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecordRequest = (record) => {
    if (!record?.id) return;
    setPendingDeleteRecord(record);
  };

  const handleDeleteRecord = async () => {
    if (!selectedSession) return;

    const recordId = pendingDeleteRecord?.id;
    if (!recordId) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.deleteRecord(selectedSession.id, recordId);
      replaceSession(response?.data?.session);
      setPendingDeleteRecord(null);
      setMessage(copy.removeStudentSuccess);
    } catch (requestError) {
      setError(normalizeError(requestError, copy.removeStudentError));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSessionRequest = (session) => {
    if (!session?.id) return;
    setPendingDeleteSession(session);
  };

  /*
  const getCurrentPageBulkMigrationPreview = () => {
    const registeredSubjectCodes = new Set(
      students.flatMap((student) => (student.registrations || []).map((registration) => (
        normalizeFlexibleText(registration.subjectCode)
      ))).filter(Boolean),
    );
    const candidates = [];
    const skipped = [];

    sessions.forEach((session) => {
      if (session.status === 'migrated' || !(session.recordCount || session.records?.length)) return;

      const courseCode = normalizeFlexibleText(session.subjectCode);
      if (!courseCode || !session.lectureType || !session.group || !session.week) {
        skipped.push(`${session.subjectCode || session.subjectName || 'Unnamed subject'}: incomplete session details`);
        return;
      }

      if (!registeredSubjectCodes.has(courseCode)) {
        skipped.push(`${session.subjectCode}: not found in the student sheet`);
        return;
      }

      candidates.push(session);
    });

    return { candidates, skipped };
  };

  const handleCurrentPageBulkMigrationRequest = () => {
    const preview = getCurrentPageBulkMigrationPreview();

    if (!preview.candidates.length && !preview.skipped.length) {
      setMessage(lang === 'ar' ? 'لا توجد جلسات قابلة للنقل.' : 'There are no sessions available to migrate.');
      return;
    }

    setPendingBulkMigration(preview);
  };

  const handleCurrentPageBulkMigration = async () => {
    const preview = pendingBulkMigration;
    if (!preview?.candidates?.length) {
      setPendingBulkMigration(null);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const migratedSessions = [];

      for (const session of preview.candidates) {
        const response = await adHocAttendanceAPI.migrate(session.id, {
          courseCode: session.subjectCode,
          lectureType: session.lectureType,
          group: session.group,
          week: session.week,
          faculty: session.faculty || null,
        });
        if (response?.data?.session) migratedSessions.push(response.data.session);
      }

      setSessions((current) => current.map((session) => (
        migratedSessions.find((updated) => updated.id === session.id) || session
      )));
      setPendingBulkMigration(null);
      const skippedMessage = preview.skipped.length
        ? ` ${lang === 'ar' ? 'تم تخطي:' : 'Skipped:'} ${preview.skipped.join(' | ')}`
        : '';
      setMessage(`${lang === 'ar' ? 'تم نقل' : 'Migrated'} ${migratedSessions.length} ${lang === 'ar' ? 'جلسة.' : 'session(s).' }${skippedMessage}`);
    } catch (requestError) {
      setError(normalizeError(requestError, copy.migrateSessionError));
    } finally {
      setSaving(false);
    }
  };

  */

  const handleBulkMigrationRequest = async () => {
    setMigrationPreviewLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.getMigrationPreview({
        search: migrationSessionsSearchTerm.trim() || undefined,
      });
      const eligibleCount = Number(response?.data?.eligibleCount || 0);
      const skippedCount = Number(response?.data?.skippedCount || 0);

      if (!eligibleCount) {
        showToast({
          tone: 'info',
          title: lang === 'ar' ? '\u0646\u0642\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a' : 'Session migration',
          message: lang === 'ar'
            ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0646\u0642\u0644.'
            : 'There are no matching sessions available to migrate.',
        });
        return;
      }

      setPendingBulkMigration({
        search: migrationSessionsSearchTerm.trim(),
        eligibleCount,
        skippedCount,
        // Kept for the existing confirmation message while the server owns the full result set.
        candidates: { length: eligibleCount },
        skipped: { length: skippedCount, join: () => String(skippedCount) },
      });
      setMigrationProgress({ total: eligibleCount, processed: 0, processingTo: 0, migrated: 0, students: 0, percent: 0, running: false });
    } catch (requestError) {
      setError(normalizeError(requestError, copy.migrateSessionError));
    } finally {
      setMigrationPreviewLoading(false);
    }
  };

  const handleBulkMigration = async () => {
    const preview = pendingBulkMigration;
    if (!preview?.eligibleCount) {
      setPendingBulkMigration(null);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      let cursor = null;
      let migratedSessions = 0;
      let migratedStudents = 0;
      let processedSessions = 0;
      let skippedCount = Number(preview.skippedCount || 0);
      const failedSessions = [];

      while (true) {
        const batchSize = processedSessions === 0 ? 1 : 10;
        const processingTo = Math.min(preview.eligibleCount, processedSessions + batchSize);
        setMigrationProgress({
          total: preview.eligibleCount,
          processed: processedSessions,
          processingTo,
          migrated: migratedSessions,
          students: migratedStudents,
          percent: Math.min(100, Number(((processedSessions / preview.eligibleCount) * 100).toFixed(1))),
          running: true,
        });

        const response = await adHocAttendanceAPI.migrateAll({
          search: preview.search || undefined,
          batchSize,
          cursor: cursor || undefined,
        });
        const batchProcessed = Number(response?.data?.processedCount || 0);
        migratedSessions += Number(response?.data?.migratedSessions || 0);
        migratedStudents += Number(response?.data?.migratedStudents || 0);
        processedSessions += batchProcessed;
        skippedCount = Math.max(skippedCount, Number(response?.data?.skippedCount || 0));
        failedSessions.push(...(response?.data?.failedSessions || []));
        cursor = response?.data?.nextCursor || cursor;
        const percent = Math.min(100, Number(((processedSessions / preview.eligibleCount) * 100).toFixed(1)));

        setMigrationProgress({
          total: preview.eligibleCount,
          processed: processedSessions,
          processingTo: processedSessions,
          migrated: migratedSessions,
          students: migratedStudents,
          percent,
          running: false,
        });

        if (response?.data?.batchComplete) break;
        if (!batchProcessed || !response?.data?.nextCursor) {
          throw new Error(lang === 'ar' ? 'توقف تقدم نقل الجلسات قبل الاكتمال.' : 'Session migration stopped before completion.');
        }
      }

      setPendingBulkMigration(null);
      setMigrationProgress(null);
      setSelectedId('');
      setSelectedSessionDetail(null);
      await loadSessions();
      const skippedMessage = skippedCount
        ? ` ${lang === 'ar' ? '\u062a\u0645 \u062a\u062e\u0637\u064a:' : 'Skipped:'} ${skippedCount}.`
        : '';
      const failuresMessage = failedSessions.length
        ? ` ${lang === 'ar' ? '\u062a\u0639\u0630\u0631 \u0646\u0642\u0644:' : 'Could not migrate:'} ${failedSessions.join(' | ')}`
        : '';
      showToast({
        tone: failedSessions.length ? 'info' : 'success',
        title: lang === 'ar' ? '\u0646\u0642\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a' : 'Session migration',
        message: `${lang === 'ar' ? '\u062a\u0645 \u0646\u0642\u0644' : 'Migrated'} ${migratedSessions} ${lang === 'ar' ? '\u062c\u0644\u0633\u0629.' : 'session(s).'}${skippedMessage}${failuresMessage}`,
        duration: 6500,
      });
    } catch (requestError) {
      setError(normalizeError(requestError, copy.migrateSessionError));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAllSessionsRequest = () => {
    if (!sessions.some((session) => session.status === 'open')) {
      setMessage(lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u0645\u0641\u062a\u0648\u062d\u0629 \u0644\u0625\u063a\u0644\u0627\u0642\u0647\u0627.' : 'There are no open sessions to close.');
      return;
    }

    setPendingCloseAllSessions({ closeAll: true });
  };

  const handleCloseAllSessions = async () => {
    if (!pendingCloseAllSessions) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.closeAll({});
      const closedCount = Number(response?.data?.closedCount || 0);

      setPendingCloseAllSessions(null);
      setSelectedId('');
      setSelectedSessionDetail(null);
      await loadSessions();
      setMessage(lang === 'ar'
        ? `\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 ${closedCount} \u062c\u0644\u0633\u0629 \u062d\u0636\u0648\u0631.`
        : `Closed ${closedCount} attendance session(s).`);
    } catch (requestError) {
      setError(normalizeError(requestError, lang === 'ar'
        ? '\u062a\u0639\u0630\u0631 \u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u062c\u0644\u0633\u0627\u062a.'
        : 'Unable to close the flexible sessions.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!pendingDeleteSession?.id) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await adHocAttendanceAPI.delete(pendingDeleteSession.id);
      setSessions((current) => current.filter((session) => session.id !== pendingDeleteSession.id));
      setSelectedId((current) => (current === pendingDeleteSession.id ? '' : current));
      setStudentIdentifier('');
      setPendingDeleteSession(null);
    } catch (requestError) {
      setError(normalizeError(requestError, copy.deleteSessionError));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSession = async (sessionId = selectedSession?.id) => {
    if (!sessionId) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.close(sessionId);
      replaceSession(response?.data?.session);
      setMessage(copy.closeSessionSuccess);
    } catch (requestError) {
      setError(normalizeError(requestError, copy.closeSessionError));
    } finally {
      setSaving(false);
    }
  };

  const handleReopenSession = async (sessionId = selectedSession?.id) => {
    if (!sessionId) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.reopen(sessionId, {
        qrWindowSeconds: Number(form.qrWindowSeconds || 10),
        allowAllGroups: Boolean(form.allowAllGroups),
      });
      replaceSession(response?.data?.session);
      setCreatedSessionId(response?.data?.session?.id || '');
      setMessage(copy.reopenSessionSuccess);
    } catch (requestError) {
      setError(normalizeError(requestError, copy.reopenSessionError));
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async (event) => {
    event.preventDefault();
    if (!selectedSession) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await adHocAttendanceAPI.migrate(selectedSession.id, {
        ...migrationForm,
        group: normalizeMigrationGroup(migrationForm.group),
        week: normalizeMigrationWeek(migrationForm.week),
      });
      replaceSession(response?.data?.session);
      showToast({
        tone: 'success',
        title: lang === 'ar' ? '\u0646\u0642\u0644 \u0627\u0644\u062c\u0644\u0633\u0629' : 'Session migrated',
        message: `${copy.migrateSuccessPrefix} ${response?.data?.migratedCount || 0} ${copy.migrateSuccessSuffix}`,
      });
    } catch (requestError) {
      setError(normalizeError(requestError, copy.migrateSessionError));
    } finally {
      setSaving(false);
    }
  };

  const makeExportName = (...parts) => parts
    .map((part) => String(part || '').trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(' - ');

  const makeSheetName = (...parts) => makeExportName(...parts).slice(0, 31) || copy.exportSheetName;
  const formatExportWeek = (week) => {
    const weekNumber = String(week || '').match(/\d+/)?.[0];
    return weekNumber ? `week-${weekNumber}` : '';
  };

  const downloadStudentImportTemplate = () => {
    if (!window.XLSX) {
      setError(bulkImportError);
      return;
    }

    const worksheet = window.XLSX.utils.json_to_sheet([{ 'Student ID or National ID': '' }]);
    worksheet['!cols'] = [{ wch: 22 }];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Student IDs');
    window.XLSX.writeFile(workbook, 'Flexible_Attendance_Student_ID_Template.xlsx');
  };

  const handleBulkStudentFile = async (file) => {
    if (!selectedSession || selectedSession.status === 'migrated' || !file) return;

    setBulkImporting(true);
    setError('');
    setMessage('');

    try {
      if (!window.XLSX) {
        throw new Error(bulkImportError);
      }

      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
      const firstSheetName = workbook.SheetNames?.[0];
      const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
      const rows = worksheet ? window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) : [];
      const headerRow = rows.find((row) => row.some((cell) => String(cell || '').trim()));
      const studentIdColumn = headerRow?.findIndex((cell) => (
        ['nationalid', 'nationalnumber', 'studentid', 'universityid', 'studentidornationalid', '\u0627\u0644\u0631\u0642\u0645\u0627\u0644\u0642\u0648\u0645\u064a', '\u0627\u0644\u0631\u0642\u0645\u0627\u0644\u062c\u0627\u0645\u0639\u064a'].includes(normalizeSpreadsheetHeader(cell))
      ));

      if (studentIdColumn === undefined || studentIdColumn < 0) {
        throw new Error(copy.bulkTemplateMissingIdColumn || '\u064a\u062c\u0628 \u0623\u0646 \u064a\u062d\u062a\u0648\u064a \u0627\u0644\u0645\u0644\u0641 \u0639\u0644\u0649 \u0639\u0645\u0648\u062f \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a \u0623\u0648 \u0627\u0644\u062c\u0627\u0645\u0639\u064a.');
      }

      const headerIndex = rows.indexOf(headerRow);
      const studentIdentifiers = [...new Set(rows
        .slice(headerIndex + 1)
        .map((row) => String(row[studentIdColumn] || '').trim())
        .filter(Boolean))];

      if (!studentIdentifiers.length) {
        throw new Error(copy.bulkTemplateNoIds || '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0623\u0631\u0642\u0627\u0645 \u0642\u0648\u0645\u064a\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0644\u0641.');
      }

      const response = await adHocAttendanceAPI.addStudentsBulk(selectedSession.id, studentIdentifiers);
      replaceSession(response?.data?.session);
      const summary = response?.data?.summary || {};
      const summaryTemplate = copy.bulkImportSuccess || '\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 {added} \u0637\u0627\u0644\u0628. {existing} \u0645\u0633\u062c\u0644 \u0628\u0627\u0644\u0641\u0639\u0644\u060c {missing} \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f.';
      let summaryMessage = summaryTemplate
        .replace('{added}', summary.added || 0)
        .replace('{existing}', summary.alreadyPresent?.length || 0)
        .replace('{missing}', summary.notFound?.length || 0);
      if (summary.notRegistered?.length) {
        summaryMessage += lang === 'ar'
          ? ` ${summary.notRegistered.length} طالب غير مسجل في المادة.`
          : ` ${summary.notRegistered.length} student(s) were not registered in the subject.`;
      }
      setMessage(summaryMessage);
      showToast({ tone: summary.notFound?.length || summary.notRegistered?.length ? 'info' : 'success', title: bulkImportTitle, message: summaryMessage, duration: 5200 });
    } catch (requestError) {
      const errorMessage = normalizeError(requestError, bulkImportError);
      setError(errorMessage);
      showToast({ tone: 'error', title: bulkImportTitle, message: errorMessage });
    } finally {
      setBulkImporting(false);
    }
  };

  const applySubjectExportFormatting = (worksheet, sessionRowColors) => {
    const range = window.XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFFFF' } },
      fill: { fgColor: { rgb: 'FF0F766E' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const headerCell = worksheet[window.XLSX.utils.encode_cell({ r: 0, c: column })];
      if (headerCell) headerCell.s = headerStyle;
    }

    sessionRowColors.forEach(({ row, color }) => {
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const cell = worksheet[window.XLSX.utils.encode_cell({ r: row, c: column })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: color } },
            alignment: { vertical: 'center' },
          };
        }
      }
    });

    worksheet['!autofilter'] = { ref: window.XLSX.utils.encode_range(range) };
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 7 }, { wch: 28 }, { wch: 18 }, { wch: 24 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 13 },
    ];
  };

  const exportSelectedSession = () => {
    if (!selectedSession || !window.XLSX) return;

    const rows = (selectedSession.records || []).map((record, index) => ({
      '#': index + 1,
      'Student Name': record.studentName || '-',
      'Student ID': record.studentUniversityId || record.studentId || '-',
      College: record.studentCollege || '-',
      'Scan Time': formatDateTime(record.scannedAt),
      'Temporary Subject': selectedSession.subjectName,
      'Temporary Code': selectedSession.subjectCode || '-',
      Faculty: selectedSession.faculty,
      Type: selectedSession.lectureType || '-',
      Group: selectedSession.group || '-',
      Week: selectedSession.week || '-',
      Status: selectedSession.status,
    }));

    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    const exportName = makeExportName(
      selectedSession.faculty,
      selectedSession.subjectName || selectedSession.subjectCode,
      selectedSession.lectureType,
      selectedSession.group,
      formatExportWeek(selectedSession.week),
    );
    window.XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(
      selectedSession.faculty,
      selectedSession.subjectName || selectedSession.subjectCode,
      selectedSession.lectureType,
      selectedSession.group,
      formatExportWeek(selectedSession.week),
    ));
    window.XLSX.writeFile(workbook, `${exportName || copy.exportFilePrefix}.xlsx`);
  };

  const exportSubjectSessions = () => {
    if (!selectedSession || !window.XLSX) return;

    const selectedCode = normalizeFlexibleText(selectedSession.subjectCode);
    const selectedName = normalizeFlexibleText(selectedSession.subjectName);
    const selectedFaculty = normalizeFlexibleText(selectedSession.faculty);
    const subjectSessions = sessions.filter((session) => {
      const sameFaculty = normalizeFlexibleText(session.faculty) === selectedFaculty;
      const sameCode = selectedCode && normalizeFlexibleText(session.subjectCode) === selectedCode;
      const sameName = selectedName && normalizeFlexibleText(session.subjectName) === selectedName;
      return sameFaculty && (sameCode || sameName);
    });
    const typeOrder = { Lecture: 1, Section: 2, Practical: 3 };
    const orderedSessions = [...subjectSessions].sort((left, right) => {
      const weekOrder = Number(normalizeMigrationWeek(left.week)) - Number(normalizeMigrationWeek(right.week));
      if (weekOrder !== 0) return weekOrder;
      const classOrder = (typeOrder[left.lectureType] || 99) - (typeOrder[right.lectureType] || 99);
      if (classOrder !== 0) return classOrder;
      return String(left.group || '').localeCompare(String(right.group || ''));
    });
    const sessionColors = ['FFF0FDFA', 'FFEFF6FF', 'FFFFF7ED', 'FFFAF5FF', 'FFFFF1F2', 'FFF0FDF4'];
    const rows = [];
    const sessionRowColors = [];

    orderedSessions.forEach((session, sessionIndex) => {
      (session.records || []).forEach((record, index) => {
        rows.push({
          'Session ID': session.id,
          '#': index + 1,
          'Student Name': record.studentName || '-',
          'Student ID': record.studentUniversityId || record.studentId || '-',
          College: record.studentCollege || '-',
          Type: session.lectureType || '-',
          Group: session.group || '-',
          Week: session.week || '-',
          'Scan Time': formatDateTime(record.scannedAt),
          Status: session.status,
        });
        sessionRowColors.push({ row: rows.length, color: sessionColors[sessionIndex % sessionColors.length] });
      });
    });

    if (!rows.length) return;

    const exportName = makeExportName(
      selectedSession.faculty,
      selectedSession.subjectName || selectedSession.subjectCode,
    );
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    applySubjectExportFormatting(worksheet, sessionRowColors);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(
      selectedSession.faculty,
      selectedSession.subjectName || selectedSession.subjectCode,
    ));
    window.XLSX.writeFile(workbook, `${exportName || copy.exportFilePrefix}.xlsx`);
  };

  return (
    <div className="flexible-attendance-page" style={{ minHeight: '100%', paddingBottom: 120 }}>
      <AppHelmet
        titleEn={isAdmin ? 'Sessions' : 'Student Attendance'}
        titleAr={isAdmin ? 'الجلسات' : 'حضور الطالب'}
        descriptionEn={isAdmin ? 'Review attendance sessions and student records.' : 'Create and manage attendance sessions from one place.'}
        descriptionAr={isAdmin ? 'عرض جلسات الحضور وسجلات الطلاب.' : 'أنشئ جلسات الحضور وأدرها من مكان واحد.'}
      />

      <div style={{ padding: '0 0 14px' }}>
        <Message type="error">
          {error && !error.startsWith(STUDENT_ELIGIBILITY_ERROR_PREFIX) ? error : ''}
        </Message>
        <Message>{message}</Message>
      </div>

      {!user?.userRole ? (
        <div className="card doctor-dashboard-card" style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{copy.loadingSessions}</span>
        </div>
      ) : isAdmin ? (
        <AdminAttendanceSessionsScreen
          sessions={sessions}
          selectedSession={selectedSession}
          setSelectedId={setSelectedId}
          loading={loading}
          saving={saving}
          migrationForm={migrationForm}
          setMigrationForm={setMigrationForm}
          onMigrate={handleMigrate}
          onMigrateAll={handleBulkMigrationRequest}
          canMigrateAll={sessions.length > 0}
          migrationPreviewLoading={migrationPreviewLoading}
          onCloseAll={handleCloseAllSessionsRequest}
          canCloseAll={adminFilterOptions.statuses?.includes('open') || sessions.some((session) => session.status === 'open')}
          onRefresh={loadSessions}
          onExport={exportSelectedSession}
          facultyOptions={facultyOptions}
          students={students}
          migrationSessionsSearchTerm={migrationSessionsSearchTerm}
          setMigrationSessionsSearchTerm={setMigrationSessionsSearchTerm}
          migrationSessionsPage={migrationSessionsPage}
          migrationSessionsPageSize={migrationSessionsPageSize}
          migrationSessionsTotalPages={migrationSessionsTotalPages}
          paginatedMigrationSessions={paginatedMigrationSessions}
          onMigrationSessionsPageChange={setMigrationSessionsPage}
          onMigrationSessionsPageSizeChange={(pageSize) => {
            setMigrationSessionsPageSize(pageSize);
            setMigrationSessionsPage(1);
          }}
          rosterPage={rosterPage}
          rosterPageSize={rosterPageSize}
          rosterTotalPages={rosterTotalPages}
          paginatedRosterRecords={paginatedRosterRecords}
          onRosterPageChange={setRosterPage}
          onRosterPageSizeChange={(pageSize) => {
            setRosterPageSize(pageSize);
            setRosterPage(1);
          }}
          rosterSearchTerm={rosterSearchTerm}
          setRosterSearchTerm={setRosterSearchTerm}
          adminFilters={adminSessionFilters}
          setAdminFilters={setAdminSessionFilters}
          adminFilterOptions={adminFilterOptions}
          lang={lang}
          attendanceTerm={attendanceTerm}
          viewOnly
        />
      ) : (
        <StaffFlexibleScreen
          createdSessionId={createdSessionId}
          sessions={sessions}
          selectedSession={selectedSession}
          setSelectedId={setSelectedId}
          loading={loading}
          saving={saving}
          form={form}
          setForm={setForm}
          studentIdentifier={studentIdentifier}
          setStudentIdentifier={setStudentIdentifier}
          sessionsSearchTerm={sessionsSearchTerm}
          setSessionsSearchTerm={setSessionsSearchTerm}
          onCreateSession={handleCreateSession}
          onCreateBulkSession={handleCreateBulkSession}
          onOpenBulkSession={handleReopenSession}
          onAddStudent={handleAddStudent}
          onRosterSaved={async () => {
            const response = await adHocAttendanceAPI.get(selectedSession.id);
            replaceSession(response.data.session);
          }}
          onBulkStudentFile={handleBulkStudentFile}
          onDownloadStudentTemplate={downloadStudentImportTemplate}
          bulkImporting={bulkImporting}
          onCloseSession={handleCloseSession}
          onReopenSession={handleReopenSession}
          onDeleteRecord={handleDeleteRecordRequest}
          onDeleteSession={handleDeleteSessionRequest}
          onExport={exportSelectedSession}
          onExportSubjectSessions={exportSubjectSessions}
          facultyOptions={facultyOptions}
          subjectOptions={subjectOptions}
          subjectsLoading={subjectsLoading}
          students={students}
          matchingSession={matchingSession}
          sessionsPage={sessionsPage}
          sessionsPageSize={sessionsPageSize}
          sessionsTotalPages={sessionsTotalPages}
          paginatedSessions={paginatedSessions}
          onSessionsPageChange={setSessionsPage}
          onSessionsPageSizeChange={(pageSize) => {
            setSessionsPageSize(pageSize);
            setSessionsPage(1);
          }}
          rosterSearchTerm={rosterSearchTerm}
          setRosterSearchTerm={setRosterSearchTerm}
          rosterPage={rosterPage}
          rosterPageSize={rosterPageSize}
          rosterTotalPages={rosterTotalPages}
          paginatedRosterRecords={paginatedRosterRecords}
          onRosterPageChange={setRosterPage}
          onRosterPageSizeChange={(pageSize) => {
            setRosterPageSize(pageSize);
            setRosterPage(1);
          }}
          lang={lang}
          attendanceTerm={attendanceTerm}
        />
      )}

      <ConfirmationDialog
        isOpen={Boolean(pendingBulkMigration)}
        onClose={() => { if (!saving) { setPendingBulkMigration(null); setMigrationProgress(null); } }}
        onConfirm={handleBulkMigration}
        title={lang === 'ar' ? 'نقل كل الجلسات المطابقة؟' : 'Migrate all matching sessions?'}
        message={pendingBulkMigration
          ? `${pendingBulkMigration.candidates.length} ${lang === 'ar' ? 'جلسة سيتم نقلها.' : 'session(s) will be migrated.'}${pendingBulkMigration.skipped.length ? ` ${lang === 'ar' ? 'الجلسات غير المطابقة:' : 'Unmatched sessions:'} ${pendingBulkMigration.skipped.join(' | ')}` : ''}`
          : ''}
        confirmText={lang === 'ar' ? 'نقل الكل' : 'Migrate all'}
        cancelText={copy.cancel}
        loading={saving}
        loadingText={copy.migrating}
        content={saving && migrationProgress ? (
          <div style={{ display: 'grid', gap: 10, textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-primary)', fontSize: 13, fontWeight: 800 }}>
              <span>{migrationProgress.running
                ? (lang === 'ar' ? `جاري معالجة حتى الجلسة ${migrationProgress.processingTo} من ${migrationProgress.total}` : `Processing up to session ${migrationProgress.processingTo} of ${migrationProgress.total}`)
                : (lang === 'ar' ? `تمت معالجة ${migrationProgress.processed} من ${migrationProgress.total} جلسة` : `Processed ${migrationProgress.processed} of ${migrationProgress.total} sessions`)}</span>
              <span style={{ color: 'var(--accent)' }}>{migrationProgress.percent}%</span>
            </div>
            <div style={{ height: 10, overflow: 'hidden', borderRadius: 999, background: 'rgba(148,163,184,.16)', border: '1px solid var(--border)' }}>
              <div className={migrationProgress.running ? 'migration-progress-active' : ''} style={{ width: `${migrationProgress.percent}%`, minWidth: migrationProgress.running ? 8 : 0, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg, #059669, #34d399, #10b981)', transition: 'width .35s ease' }} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {lang === 'ar' ? `تم نقل ${migrationProgress.migrated} جلسة و${migrationProgress.students} سجل طالب.` : `${migrationProgress.migrated} sessions and ${migrationProgress.students} student records migrated.`}
            </div>
          </div>
        ) : null}
      />

      <ConfirmationDialog
        isOpen={Boolean(pendingCloseAllSessions)}
        onClose={() => setPendingCloseAllSessions(null)}
        onConfirm={handleCloseAllSessions}
        title={lang === 'ar' ? '\u0625\u063a\u0644\u0627\u0642 \u0643\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629\u061f' : 'Close all open sessions?'}
        message={lang === 'ar'
          ? '\u0633\u064a\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 \u0643\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629 \u0641\u064a \u0627\u0644\u062a\u064a\u0631\u0645 \u0627\u0644\u062d\u0627\u0644\u064a. \u0644\u0646 \u064a\u062a\u0645\u0643\u0646 \u0627\u0644\u0637\u0644\u0627\u0628 \u0645\u0646 \u0645\u0633\u062d \u0631\u0645\u0648\u0632 QR \u0628\u0639\u062f \u0627\u0644\u0625\u063a\u0644\u0627\u0642.'
          : 'This closes every open session in the current term. Students will no longer be able to scan its QR code.'}
        confirmText={lang === 'ar' ? '\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0643\u0644' : 'Close all'}
        cancelText={copy.cancel}
        loading={saving}
        loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u063a\u0644\u0627\u0642...' : 'Closing sessions...'}
        tone="danger"
      />

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteRecord)}
        onClose={() => setPendingDeleteRecord(null)}
        onConfirm={handleDeleteRecord}
        title={copy.removeStudent}
        message={pendingDeleteRecord
          ? `${pendingDeleteRecord.studentName || pendingDeleteRecord.studentUniversityId || pendingDeleteRecord.studentId || copy.studentColumn}?`
          : ''}
        confirmText={copy.delete}
        cancelText={copy.cancel}
        loading={saving}
        loadingText={copy.deleting}
      />

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteSession)}
        onClose={() => setPendingDeleteSession(null)}
        onConfirm={handleDeleteSession}
        title={copy.deleteSessionTitle}
        message={pendingDeleteSession
          ? `${copy.deleteSessionMessagePrefix} ${pendingDeleteSession.subjectCode || pendingDeleteSession.subjectName} ${copy.deleteSessionMessageSuffix}`
          : ''}
        confirmText={copy.delete}
        cancelText={copy.cancel}
        loading={saving}
        loadingText={copy.deleting}
      />
    </div>
  );
};

export default FlexibleAttendancePage;
