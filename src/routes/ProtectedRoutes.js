import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks';

const getDefaultPathForRole = (user) => {
  if (!user) return '/';
  if (user.userRole === 'admin') return '/dashboard/admin';
  if (user.userRole === 'doctor') return '/dashboard';
  if (user.userRole === 'student') return '/student';
  return '/';
};

const ProtectedRoutes = ({ allowedRoles, routeMap }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
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
