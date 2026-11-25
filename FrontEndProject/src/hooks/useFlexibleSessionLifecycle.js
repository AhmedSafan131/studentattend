import { useEffect } from 'react';
import {
  clearActiveFlexibleSession,
  setActiveFlexibleSession,
} from '../utils/flexibleAttendanceSession';

// The server owns the ten-minute lifetime. Refreshing or leaving this page must
// not shorten the session; this hook only keeps local active-session metadata.
export function useFlexibleSessionLifecycle({ sessions, managedSessionId, isAdmin }) {
  const session = isAdmin ? null : sessions.find((item) => item.id === managedSessionId) || null;
  useEffect(() => {
    setActiveFlexibleSession(session);
    return clearActiveFlexibleSession;
  }, [session]);
}
