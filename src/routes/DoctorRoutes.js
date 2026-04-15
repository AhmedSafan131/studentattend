import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { DashboardLayout } from '../layouts';

const DoctorDashboard = lazy(() => import('../Dashboard/pages/DoctorDashboard'));
const AttendancePage = lazy(() => import('../Dashboard/pages/AttendancePage'));
const ReportsPage = lazy(() => import('../Dashboard/pages/ReportsPage'));

const DoctorRoutes = () => (
  <Routes>
    <Route element={<DashboardLayout />}>
      <Route index element={<DoctorDashboard />} />
      <Route path="attendance" element={<AttendancePage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
);

export default DoctorRoutes;
