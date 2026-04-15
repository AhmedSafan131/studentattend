import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { DashboardLayout } from '../layouts';

const AdminPanel = lazy(() => import('../features/admin/AdminPanelPage'));
const AttendancePage = lazy(() => import('../Dashboard/pages/AttendancePage'));
const ReportsPage = lazy(() => import('../Dashboard/pages/ReportsPageTailwind'));
const StudentsPage = lazy(() => import('../Dashboard/pages/StudentsPage'));
const QRControl = lazy(() => import('../Dashboard/pages/QRControl'));
const Settings = lazy(() => import('../Dashboard/pages/Settings'));
const CoursesPage = lazy(() => import('../Dashboard/pages/CoursesPage'));

const AdminRoutes = () => (
  <Routes>
    <Route element={<DashboardLayout />}>
      <Route index element={<Navigate to="admin" replace />} />
      <Route path="admin" element={<AdminPanel />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="qr" element={<QRControl />} />
      <Route path="settings" element={<Settings />} />
      <Route path="courses" element={<CoursesPage />} />
      <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
    </Route>
  </Routes>
);

export default AdminRoutes;
