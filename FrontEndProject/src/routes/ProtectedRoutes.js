import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks';
import { DASHBOARD_PAGE_ROUTES } from '../Dashboard/pages';
import { getDashboardHomePath } from '../utils/permissions';

const getDefaultPathForRole = (user) => {
  if (!user) return '/';
  if (user.userRole === 'admin' || user.userRole === 'doctor' || user.userRole === 'staff') {
    return getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES);
  }
  if (user.userRole === 'student') return '/student';
  return '/';
};

const ProtectedRoutes = ({ allowedRoles, routeMap }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={allowedRoles.includes('student') ? '/?role=student' : '/'} replace />;
  }

  if (!allowedRoles.includes(user.userRole)) {
    return <Navigate to={getDefaultPathForRole(user)} replace />;
  }

  if (routeMap?.[user.userRole]) {
    const RoleRoutes = routeMap[user.userRole];
    return <RoleRoutes />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
