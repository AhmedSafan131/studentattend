import { AuthContext } from '../context';
import { useAuthController } from '../hooks/useAuthController';

const AuthProvider = ({ children }) => {
  const value = useAuthController();

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
