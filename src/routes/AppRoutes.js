import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from '../components';
import { useAuth } from '../hooks';

const PublicRoutes = lazy(() => import('./PublicRoutes'));
const ProtectedRoutes = lazy(() => import('./ProtectedRoutes'));
const AdminRoutes = lazy(() => import('./AdminRoutes'));
const DoctorRoutes = lazy(() => import('./DoctorRoutes'));
const StudentRoutes = lazy(() => import('./StudentRoutes'));

const AppRoutes = () => {
  const { landingPath } = useAuth();

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<PublicRoutes />} />

        <Route
          path="/dashboard/*"
          element={<ProtectedRoutes allowedRoles={['admin', 'doctor']} routeMap={{ admin: AdminRoutes, doctor: DoctorRoutes }} />}
        />

        <Route
          path="/student/*"
          element={<ProtectedRoutes allowedRoles={['student']} routeMap={{ student: StudentRoutes }} />}
        />

        <Route path="*" element={<Navigate to={landingPath} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
