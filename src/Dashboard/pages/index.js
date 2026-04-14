export { default as AdminPanel } from './AdminPanel';
export { default as AttendancePage } from './AttendancePage';
export { default as CoursesPage } from './CoursesPage';
export { default as DoctorDashboard } from './DoctorDashboard';
export { default as QRControl } from './QRControl';
export { default as ReportsPage } from './ReportsPage';
export { default as Settings } from './Settings';
export { default as StudentsPage } from './StudentsPage';

export const DASHBOARD_PAGE_ROUTES = {
  doctor: [
    { key: 'dashboard', path: '/dashboard', labelKey: 'navDashboard', sectionKey: 'sectionMain', icon: '🏠' },
    { key: 'attendance', path: '/dashboard/attendance', labelKey: 'navAttendance', sectionKey: 'sectionMain', icon: '📋' },
    { key: 'reports', path: '/dashboard/reports', labelKey: 'navReports', sectionKey: 'sectionMain', icon: '📊' },
  ],
  admin: [
    { key: 'admin', path: '/dashboard/admin', labelKey: 'navAdmin', sectionKey: 'sectionAdministration', icon: '🛡️' },
    { key: 'attendance', path: '/dashboard/attendance', labelKey: 'navAttendance', sectionKey: 'sectionAcademic', icon: '📋' },
    { key: 'students', path: '/dashboard/students', labelKey: 'navStudents', sectionKey: 'sectionAcademic', icon: '👥' },
    { key: 'reports', path: '/dashboard/reports', labelKey: 'navReports', sectionKey: 'sectionAcademic', icon: '📊' },
    { key: 'qr', path: '/dashboard/qr', labelKey: 'navQR', sectionKey: 'sectionSystem', icon: '📱' },
    { key: 'settings', path: '/dashboard/settings', labelKey: 'navSettings', sectionKey: 'sectionSystem', icon: '⚙️' },
  ],
};

export const DASHBOARD_HOME_PATH = {
  admin: '/dashboard/admin',
  doctor: '/dashboard',
};

export const DASHBOARD_META_BY_ROUTE = {
  '/dashboard': 'dashboard',
  '/dashboard/attendance': 'attendance',
  '/dashboard/reports': 'reports',
  '/dashboard/admin': 'admin',
  '/dashboard/students': 'students',
  '/dashboard/qr': 'qr',
  '/dashboard/settings': 'settings',
  '/dashboard/courses': 'courses',
};
