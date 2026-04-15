import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { StudentLayout } from '../layouts';

const StudentApp = lazy(() => import('../StudentApp'));

const StudentRoutes = () => (
  <Routes>
    <Route element={<StudentLayout />}>
      <Route index element={<StudentApp />} />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Route>
  </Routes>
);

export default StudentRoutes;
