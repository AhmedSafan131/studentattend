import { FACULTY_CATALOG } from './constants';

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ATTENDANCE: 'view_attendance',
  VIEW_FLEXIBLE_ATTENDANCE: 'view_flexible_attendance',
  VIEW_REPORTS: 'view_reports',
  VIEW_STUDENTS: 'view_students',
  VIEW_DEACTIVATED: 'view_deactivated',
  EDIT_STUDENTS: 'edit_students',
  DELETE_STUDENTS: 'delete_students',
  MANAGE_DEACTIVATED: 'manage_deactivated',
  MANAGE_DOCTORS: 'manage_doctors',
  MANAGE_ADMINS: 'manage_admins',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MANAGE_ACADEMIC_TERMS: 'manage_academic_terms',
  MANAGE_SUBJECT_CATALOG: 'manage_subject_catalog',
  SELECT_ACADEMIC_TERM: 'select_academic_term',
  FULL_DASHBOARD_ACCESS: 'full_dashboard_access',
};

export const MANAGED_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
};

export const COLLEGE_OPTIONS = FACULTY_CATALOG.flatMap((faculty) => (
  faculty.colleges.map((college) => ({
    value: college.name,
    label: college.name,
    facultyId: faculty.id,
    facultyName: faculty.name,
  }))
));

const DASHBOARD_ROUTE_PERMISSION_MAP = {
  dashboard: PERMISSIONS.VIEW_DASHBOARD,
  attendance: PERMISSIONS.VIEW_ATTENDANCE,
  flexibleAttendance: PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE,
  reports: PERMISSIONS.VIEW_REPORTS,
  students: PERMISSIONS.VIEW_STUDENTS,
  deactivated: PERMISSIONS.VIEW_DEACTIVATED,
  admin: PERMISSIONS.MANAGE_DOCTORS,
  academicTerms: PERMISSIONS.MANAGE_ACADEMIC_TERMS,
  subjectsCatalog: PERMISSIONS.MANAGE_SUBJECT_CATALOG,
  settings: PERMISSIONS.MANAGE_PERMISSIONS,
};

const FULL_DASHBOARD_PAGE_PERMISSIONS = new Set([
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.VIEW_ATTENDANCE,
  PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.VIEW_STUDENTS,
  PERMISSIONS.VIEW_DEACTIVATED,
  PERMISSIONS.MANAGE_DOCTORS,
  PERMISSIONS.MANAGE_ADMINS,
  PERMISSIONS.MANAGE_PERMISSIONS,
  PERMISSIONS.MANAGE_ACADEMIC_TERMS,
  PERMISSIONS.MANAGE_SUBJECT_CATALOG,
]);

export const DEFAULT_PERMISSIONS_BY_ROLE = {
  admin: [
    PERMISSIONS.FULL_DASHBOARD_ACCESS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_DEACTIVATED,
    PERMISSIONS.EDIT_STUDENTS,
    PERMISSIONS.DELETE_STUDENTS,
    PERMISSIONS.MANAGE_DEACTIVATED,
    PERMISSIONS.MANAGE_DOCTORS,
    PERMISSIONS.MANAGE_ADMINS,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.MANAGE_ACADEMIC_TERMS,
    PERMISSIONS.MANAGE_SUBJECT_CATALOG,
    PERMISSIONS.SELECT_ACADEMIC_TERM,
  ],
  doctor: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE,
    PERMISSIONS.VIEW_REPORTS,
  ],
  staff: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE,
    PERMISSIONS.VIEW_REPORTS,
  ],
};

const uniqueValues = (values = []) => [...new Set((values || []).filter(Boolean))];

export const createAvatarInitials = (name, fallback = 'US') => (
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || fallback
);

export const normalizeManagedPermissions = (role, permissions = [], isSystem = false) => {
  if (isSystem) {
    return [...DEFAULT_PERMISSIONS_BY_ROLE.admin];
  }

  if (!Array.isArray(permissions)) {
    return uniqueValues(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
  }

  return uniqueValues(permissions);
};

export const normalizeAllowedColleges = (colleges = []) => uniqueValues(
  colleges.map((college) => String(college || '').trim()).filter(Boolean),
);

export const normalizeManagedUser = (user, roleOverride) => {
  const role = roleOverride || user?.userRole || user?.role || MANAGED_ROLES.DOCTOR;
  const isSystem = Boolean(user?.isSystem);
  const allowedColleges = normalizeAllowedColleges(user?.allowedColleges || user?.colleges || []);

  return {
    ...user,
    userRole: role,
    role,
    isSystem,
    permissions: normalizeManagedPermissions(role, user?.permissions, isSystem),
    allowedColleges,
    colleges: allowedColleges,
    accessScope: user?.accessScope || (isSystem || user?.permissions?.includes?.(PERMISSIONS.FULL_DASHBOARD_ACCESS) ? 'full' : 'limited'),
    avatar: user?.avatar || createAvatarInitials(user?.name, role === 'admin' ? 'AD' : 'DR'),
  };
};

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.isSystem) return true;

  const permissions = normalizeManagedPermissions(
    user.userRole || user.role,
    user.permissions,
    user.isSystem,
  );

  if (permissions.includes(permission)) {
    return true;
  }

  return permissions.includes(PERMISSIONS.FULL_DASHBOARD_ACCESS)
    && FULL_DASHBOARD_PAGE_PERMISSIONS.has(permission);
};

export const isCollegeAllowedForUser = (user, collegeName) => {
  if (!user || user.isSystem) return true;

  const allowedColleges = normalizeAllowedColleges(user.allowedColleges || user.colleges || []);
  if (allowedColleges.length === 0) {
    return true;
  }

  return allowedColleges.includes(String(collegeName || '').trim());
};

export const filterStudentsByUserAccess = (user, students = []) => {
  if (!user) return [];
  if (user.userRole === 'admin' && user.isSystem) return students;
  if (!hasPermission(user, PERMISSIONS.VIEW_STUDENTS)) return [];

  return students.filter((student) => isCollegeAllowedForUser(user, student.college));
};

export const canEditStudentRecord = (user, student) => (
  hasPermission(user, PERMISSIONS.EDIT_STUDENTS)
  && isCollegeAllowedForUser(user, student?.college)
);

export const canDeleteStudentRecord = (user, student) => (
  hasPermission(user, PERMISSIONS.DELETE_STUDENTS)
  && isCollegeAllowedForUser(user, student?.college)
);

export const canAccessDashboardRoute = (user, routeKey) => {
  if (!user) return false;

  if (routeKey === 'staffAccessCode' && user.loginMethod === 'temporary_access_code') {
    return false;
  }

  const requiredPermission = DASHBOARD_ROUTE_PERMISSION_MAP[routeKey];
  if (!requiredPermission) return true;

  return hasPermission(user, requiredPermission);
};

export const getVisibleDashboardRoutes = (user, routes = []) => (
  routes.filter((route) => canAccessDashboardRoute(user, route.key))
);

export const getDashboardHomePath = (user, dashboardPageRoutes = {}) => {
  if (!user) return '/';
  if (user.userRole === 'student') return '/student';

  const roleKey = user.userRole === 'admin'
    ? 'admin'
    : user.userRole === 'staff'
      ? 'staff'
      : 'doctor';
  const visibleRoutes = getVisibleDashboardRoutes(user, dashboardPageRoutes[roleKey] || []);

  if (visibleRoutes.length > 0) {
    return visibleRoutes[0].path;
  }

  return user.userRole === 'admin' ? '/dashboard/admin' : '/dashboard/flexible-attendance';
};
