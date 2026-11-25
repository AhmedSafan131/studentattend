import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loading } from '../components';
import { useAuth } from '../hooks';
import { useLanguage } from '../i18n';

const PublicRoutes = lazy(() => import('./PublicRoutes'));
const ProtectedRoutes = lazy(() => import('./ProtectedRoutes'));
const AdminRoutes = lazy(() => import('./AdminRoutes'));
const DoctorRoutes = lazy(() => import('./DoctorRoutes'));
const StudentRoutes = lazy(() => import('./StudentRoutes'));

const FullPageLoading = () => {
  const location = useLocation();
  const { theme } = useLanguage();
  const isStudentRoute = location.pathname.startsWith('/student');

  if (isStudentRoute) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          background: theme === 'light'
            ? 'linear-gradient(160deg, #f8fafc, #eff6ff 52%, #ecfdf5)'
            : 'linear-gradient(160deg, #08131c, #0f1923 52%, #123f36)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
      }}
    >
      <Loading size={150} />
    </div>
  );
};

const AppRoutes = () => {
  const { landingPath, authBootstrapStatus } = useAuth();

  if (authBootstrapStatus === 'restoring') {
    return <FullPageLoading />;
  }

  return (
    <Suspense fallback={<FullPageLoading />}>
      <Routes>
        <Route path="/" element={<PublicRoutes />} />

        <Route
          path="/dashboard/*"
          element={<ProtectedRoutes allowedRoles={['admin', 'staff', 'doctor']} routeMap={{ admin: AdminRoutes, staff: DoctorRoutes, doctor: DoctorRoutes }} />}
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
