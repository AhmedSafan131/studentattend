import { AuthContext } from '../context';
import { useAuthController } from '../hooks/useAuthController';
import { useLocation } from 'react-router-dom';

const AuthProvider = ({ children }) => {
  const { pathname } = useLocation();
  const value = useAuthController({ pathname });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
