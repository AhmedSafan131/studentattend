import { Navigate, Routes, Route } from 'react-router-dom';
import { lazy } from 'react';
import { AuthLayout } from '../layouts';
import { useAuth } from '../hooks';

const SignIn = lazy(() => import('../screens/SignIn'));

const PublicRoutes = () => {
  const { user, landingPath } = useAuth();

  if (user) {
    return <Navigate to={landingPath} replace />;
  }

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route index element={<SignIn />} />
      </Route>
    </Routes>
  );
};

export default PublicRoutes;
