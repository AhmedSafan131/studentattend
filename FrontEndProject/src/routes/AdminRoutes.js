import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { DashboardLayout } from '../layouts';
import { useAuth } from '../hooks';
import { canAccessDashboardRoute, getDashboardHomePath } from '../utils/permissions';
import { DASHBOARD_PAGE_ROUTES } from '../Dashboard/pages';

const AdminPanel = lazy(() => import('../Dashboard/pages/AdminPanel'));
const AttendancePage = lazy(() => import('../Dashboard/pages/AttendancePage'));
const ReportsPage = lazy(() => import('../Dashboard/pages/ProfessionalReportsPage'));
const StudentsPage = lazy(() => import('../Dashboard/pages/StudentsPage'));
const DeactivatedStudents = lazy(() => import('../Dashboard/pages/DeactivatedStudents'));
const Settings = lazy(() => import('../Dashboard/pages/Settings'));
const CoursesPage = lazy(() => import('../Dashboard/pages/CoursesPage'));
const FlexibleAttendancePage = lazy(() => import('../Dashboard/pages/FlexibleAttendancePage'));
const SubjectsCatalogPage = lazy(() => import('../Dashboard/pages/SubjectsCatalog'));
const TermsManagementPage = lazy(() => import('../Dashboard/pages/TermsManagementPage'));

const AdminRouteElement = ({ routeKey, children }) => {
  const { user } = useAuth();

  if (!canAccessDashboardRoute(user, routeKey)) {
    return <Navigate to={getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES)} replace />;
  }

  return children;
};

const AdminRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="admin" replace />} />
        <Route path="admin" element={<AdminRouteElement routeKey="admin"><AdminPanel /></AdminRouteElement>} />
        <Route path="academic-terms" element={<AdminRouteElement routeKey="academicTerms"><TermsManagementPage /></AdminRouteElement>} />
        <Route path="subjects-catalog" element={<AdminRouteElement routeKey="subjectsCatalog"><SubjectsCatalogPage /></AdminRouteElement>} />
        <Route path="attendance" element={<AdminRouteElement routeKey="attendance"><AttendancePage /></AdminRouteElement>} />
        <Route path="flexible-attendance" element={<AdminRouteElement routeKey="flexibleAttendance"><FlexibleAttendancePage /></AdminRouteElement>} />
        <Route path="reports" element={<AdminRouteElement routeKey="reports"><ReportsPage /></AdminRouteElement>} />
        <Route path="students" element={<AdminRouteElement routeKey="students"><StudentsPage /></AdminRouteElement>} />
        <Route path="deactivated" element={<AdminRouteElement routeKey="deactivated"><DeactivatedStudents /></AdminRouteElement>} />
        <Route path="settings" element={<AdminRouteElement routeKey="settings"><Settings /></AdminRouteElement>} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="*" element={<Navigate to={getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES)} replace />} />
      </Route>
    </Routes>
  );
};


export default AdminRoutes;
