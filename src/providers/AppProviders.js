import AuthProvider from './AuthProvider';
import SocketProvider from './SocketProvider';
import DashboardProvider from './DashboardProvider';

const AppProviders = ({ children }) => (
  <AuthProvider>
    <SocketProvider>
      <DashboardProvider>
        {children}
      </DashboardProvider>
    </SocketProvider>
  </AuthProvider>
);

export default AppProviders;
