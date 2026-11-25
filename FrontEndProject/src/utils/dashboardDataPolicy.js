const normalizeDashboardPath = (pathname = '') => {
  const normalized = String(pathname || '').replace(/\/+$/, '');
  return normalized || '/';
};

const MANAGED_USERS_ROUTES = new Set([
  '/dashboard/admin',
  '/dashboard/settings',
]);

export const needsManagedUsersForRoute = ({ pathname, userRole }) => (
  userRole === 'admin' && MANAGED_USERS_ROUTES.has(normalizeDashboardPath(pathname))
);

export const needsLectureSessionsForRoute = () => false;

