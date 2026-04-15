import { DashboardContext } from '../context';
import { useAuth, useSocket } from '../hooks';
import { useDashboardController } from '../hooks/useDashboardController';

const DashboardProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const value = useDashboardController({ user, socket });

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardProvider;
