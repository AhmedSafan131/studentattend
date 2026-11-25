import { DashboardContext } from '../context';
import { useAuth, useSocket } from '../hooks';
import { useDashboardController } from '../hooks/useDashboardController';
import { useLocation } from 'react-router-dom';

const DashboardProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { pathname } = useLocation();
  const value = useDashboardController({ user, socket, pathname });

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardProvider;
