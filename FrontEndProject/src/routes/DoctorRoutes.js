import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { DashboardLayout } from '../layouts';
import { useAuth } from '../hooks';
import { canAccessDashboardRoute, getDashboardHomePath } from '../utils/permissions';
import { DASHBOARD_PAGE_ROUTES } from '../Dashboard/pages';

const ReportsPage = lazy(() => import('../Dashboard/pages/ProfessionalReportsPage'));
const StudentsPage = lazy(() => import('../Dashboard/pages/StudentsPage'));
const FlexibleAttendancePage = lazy(() => import('../Dashboard/pages/FlexibleAttendancePage'));
const StaffAccessCodePage = lazy(() => import('../Dashboard/pages/StaffAccessCodePage'));

const DoctorRouteElement = ({ routeKey, children }) => {
  const { user } = useAuth();

  if (!canAccessDashboardRoute(user, routeKey)) {
    return <Navigate to={getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES)} replace />;
  }

  return children;
};

const DoctorRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="flexible-attendance" replace />} />
        <Route path="flexible-attendance" element={<DoctorRouteElement routeKey="flexibleAttendance"><FlexibleAttendancePage /></DoctorRouteElement>} />
        {user?.userRole !== 'staff' ? (
          <Route path="students" element={<DoctorRouteElement routeKey="students"><StudentsPage /></DoctorRouteElement>} />
        ) : null}
        <Route path="reports" element={<DoctorRouteElement routeKey="reports"><ReportsPage /></DoctorRouteElement>} />
        {user?.userRole === 'staff' && user?.loginMethod !== 'temporary_access_code' ? (
          <Route path="access-code" element={<StaffAccessCodePage />} />
        ) : null}
        <Route path="*" element={<Navigate to={getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES)} replace />} />
      </Route>
    </Routes>
  );
};

export default DoctorRoutes;
