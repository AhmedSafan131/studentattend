import { SocketContext } from '../context';
import { useAuth } from '../hooks';
import { useSocketController } from '../hooks/useSocketController';

const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const value = useSocketController(user);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
