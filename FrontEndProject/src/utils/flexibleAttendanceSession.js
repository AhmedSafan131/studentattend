import { APIS } from './Axios';
import { AUTH_STORAGE_KEY } from '../redux/slices/authSlice';

const FLEXIBLE_ATTENDANCE_ACTIVE_SESSION_KEY = 'studentattend.flexibleAttendance.activeSession';
const LANGUAGE_STORAGE_KEY = 'uniattend_lang';

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return '';

  try {
    const user = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    return user?.token || '';
  } catch (error) {
    return '';
  }
};

const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en').split('-')[0];
};

export const getActiveFlexibleSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    return JSON.parse(window.sessionStorage.getItem(FLEXIBLE_ATTENDANCE_ACTIVE_SESSION_KEY) || 'null');
  } catch (error) {
    return null;
  }
};

export const setActiveFlexibleSession = (session) => {
  if (typeof window === 'undefined') return;

  if (!session?.id || session.status !== 'open') {
    window.sessionStorage.removeItem(FLEXIBLE_ATTENDANCE_ACTIVE_SESSION_KEY);
    return;
  }

  window.sessionStorage.setItem(
    FLEXIBLE_ATTENDANCE_ACTIVE_SESSION_KEY,
    JSON.stringify({
      id: session.id,
      updatedAt: Date.now(),
    }),
  );
};

export const clearActiveFlexibleSession = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(FLEXIBLE_ATTENDANCE_ACTIVE_SESSION_KEY);
};

export const closeFlexibleSessionInBackground = ({ session, lang }) => {
  if (typeof window === 'undefined') return;
  if (!session?.id || session.status !== 'open') return;

  const accessToken = getStoredAuthToken();

  if (!accessToken) {
    return;
  }

  try {
    window.fetch(APIS.adHocAttendanceClose(session.id), {
      method: 'POST',
      keepalive: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': lang || getStoredLanguage(),
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    // Ignore background close failures during unload.
  }
};

export const closeActiveFlexibleSession = async () => {
  if (typeof window === 'undefined') return false;

  const activeSession = getActiveFlexibleSession();
  const accessToken = getStoredAuthToken();

  clearActiveFlexibleSession();

  if (!activeSession?.id || !accessToken) {
    return false;
  }

  try {
    await window.fetch(APIS.adHocAttendanceClose(activeSession.id), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': getStoredLanguage(),
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return true;
  } catch (error) {
    return false;
  }
};
