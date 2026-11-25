export { default as AdminPanel } from './AdminPanel';
export { default as AttendancePage } from './AttendancePage';
export { default as CoursesPage } from './CoursesPage';
export { default as DeactivatedStudents } from './DeactivatedStudents';
export { default as FlexibleAttendancePage } from './FlexibleAttendancePage';
export { default as ReportsPage } from './ReportsPage';
export { default as Settings } from './Settings';
export { default as StaffAccessCodePage } from './StaffAccessCodePage';
export { default as StudentsPage } from './StudentsPage';
export { default as SubjectsCatalogPage } from './SubjectsCatalog';
export { default as TermsManagementPage } from './TermsManagementPage';

export const DASHBOARD_PAGE_ROUTES = {
  staff: [
    { key: 'flexibleAttendance', path: '/dashboard/flexible-attendance', labelKey: 'navFlexibleAttendance', sectionKey: 'sectionMain', icon: 'flexibleAttendance' },
    { key: 'reports', path: '/dashboard/reports', labelKey: 'navReports', sectionKey: 'sectionAcademic', icon: 'reports' },
    { key: 'staffAccessCode', path: '/dashboard/access-code', labelKey: 'navStaffAccessCode', sectionKey: 'sectionSystem', icon: 'staffAccessCode' },
  ],
  doctor: [
    { key: 'flexibleAttendance', path: '/dashboard/flexible-attendance', labelKey: 'navFlexibleAttendance', sectionKey: 'sectionMain', icon: 'flexibleAttendance' },
    { key: 'students', path: '/dashboard/students', labelKey: 'navStudents', sectionKey: 'sectionAcademic', icon: 'students' },
    { key: 'reports', path: '/dashboard/reports', labelKey: 'navReports', sectionKey: 'sectionAcademic', icon: 'reports' },
  ],
  admin: [
    { key: 'academicTerms', path: '/dashboard/academic-terms', labelKey: 'navAcademicTerms', sectionKey: 'sectionAdministration', icon: 'academicTerms' },
    { key: 'subjectsCatalog', path: '/dashboard/subjects-catalog', labelKey: 'navSubjectsCatalog', sectionKey: 'sectionAdministration', icon: 'subjectsCatalog' },
    { key: 'admin', path: '/dashboard/admin', labelKey: 'navAdmin', sectionKey: 'sectionAdministration', icon: 'admin' },
    { key: 'students', path: '/dashboard/students', labelKey: 'navStudents', sectionKey: 'sectionAdministration', icon: 'students' },
    { key: 'attendance', path: '/dashboard/attendance', labelKey: 'navAttendance', sectionKey: 'sectionAcademic', icon: 'attendance' },
    { key: 'flexibleAttendance', path: '/dashboard/flexible-attendance', labelKey: 'navSessions', sectionKey: 'sectionAcademic', icon: 'flexibleAttendance' },
    { key: 'deactivated', path: '/dashboard/deactivated', labelKey: 'navDeactivated', sectionKey: 'sectionAcademic', icon: 'deactivated' },
    { key: 'reports', path: '/dashboard/reports', labelKey: 'navReports', sectionKey: 'sectionAcademic', icon: 'reports' },
    { key: 'settings', path: '/dashboard/settings', labelKey: 'navSettings', sectionKey: 'sectionSystem', icon: 'settings' },
  ],
  student: [
    { key: 'scan', path: '/student', labelKey: 'studentScanNav', sectionKey: 'sectionMain', icon: 'scan' },
    { key: 'history', path: '/student/history', labelKey: 'studentHistoryNav', sectionKey: 'sectionAcademic', icon: 'history' },
    { key: 'profile', path: '/student/profile', labelKey: 'studentProfileNav', sectionKey: 'sectionSystem', icon: 'profile' },
  ],
};

export const DASHBOARD_HOME_PATH = {
  admin: '/dashboard/admin',
  staff: '/dashboard/flexible-attendance',
  doctor: '/dashboard/flexible-attendance',
};

export const DASHBOARD_META_BY_ROUTE = {
  '/dashboard': 'dashboard',
  '/dashboard/attendance': 'attendance',
  '/dashboard/flexible-attendance': 'flexibleAttendance',
  '/dashboard/reports': 'reports',
  '/dashboard/admin': 'admin',
  '/dashboard/academic-terms': 'academicTerms',
  '/dashboard/subjects-catalog': 'subjectsCatalog',
  '/dashboard/students': 'students',
  '/dashboard/deactivated': 'deactivated',
  '/dashboard/qr': 'qr',
  '/dashboard/settings': 'settings',
  '/dashboard/access-code': 'staffAccessCode',
  '/dashboard/courses': 'courses',
  '/student': 'studentScan',
  '/student/history': 'studentHistory',
  '/student/profile': 'studentProfile',
};

