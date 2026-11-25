import AuthProvider from './AuthProvider';
import SocketProvider from './SocketProvider';
import DashboardProvider from './DashboardProvider';
import ToastProvider from './ToastProvider';

const AppProviders = ({ children }) => (
  <AuthProvider>
    <SocketProvider>
      <DashboardProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </DashboardProvider>
    </SocketProvider>
  </AuthProvider>
);

export default AppProviders;
