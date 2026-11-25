import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, useEffect, useState } from 'react';
import { DashboardLayout, StudentLayout } from '../layouts';
import { StudentInstallGate, useStudentPwa } from '../pwa';

const StudentApp = lazy(() => import('../StudentApp'));

const useIsDesktop = () => {
  const getValue = () => (
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 900px)').matches
      : false
  );

  const [isDesktop, setIsDesktop] = useState(getValue);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
};

const StudentRoutes = () => {
  const isDesktop = useIsDesktop();
  const { isStandalone, studentLoginOptions } = useStudentPwa();

  if (!isStandalone && !studentLoginOptions.webLoginEnabled) {
    return (
      <main
        style={{
          minHeight: '100vh',
          padding: 20,
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(160deg, var(--bg-dark), color-mix(in srgb, var(--bg-dark) 84%, #064e3b 16%))',
        }}
      >
        <div style={{ width: 'min(100%, 620px)' }}>
          <StudentInstallGate />
        </div>
      </main>
    );
  }

  return (
    <Routes>
      {isDesktop ? (
        <Route element={<DashboardLayout />}>
          <Route index element={<StudentApp forcedTab="scan" embedded />} />
          <Route path="history" element={<StudentApp forcedTab="history" embedded />} />
          <Route path="profile" element={<StudentApp forcedTab="profile" embedded />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Route>
      ) : (
        <Route element={<StudentLayout />}>
          <Route index element={<StudentApp />} />
          <Route path="history" element={<StudentApp forcedTab="history" />} />
          <Route path="profile" element={<StudentApp forcedTab="profile" />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Route>
      )}
    </Routes>
  );
};

export default StudentRoutes;
