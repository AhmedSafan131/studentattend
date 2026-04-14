import { useSelector } from 'react-redux';

export const AuthProtected = ({ children, fallback = null }) => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  return isAuthenticated ? children : fallback;
};

export const PublicRoute = ({ children, fallback = null }) => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  return isAuthenticated ? fallback : children;
};
