import { renderHook } from '@testing-library/react';
import { useFlexibleSessionLifecycle } from './useFlexibleSessionLifecycle';
import { closeFlexibleSessionInBackground, setActiveFlexibleSession } from '../utils/flexibleAttendanceSession';

jest.mock('../utils/flexibleAttendanceSession', () => ({
  clearActiveFlexibleSession: jest.fn(), closeFlexibleSessionInBackground: jest.fn(), setActiveFlexibleSession: jest.fn(),
}));
const opened = { id: 'created', status: 'open' };
const history = { id: 'history', status: 'open' };
beforeEach(() => jest.clearAllMocks());

test('browsing an existing open session does not register it for automatic closing', () => {
  const { unmount } = renderHook(() => useFlexibleSessionLifecycle({ sessions: [history], managedSessionId: '', isAdmin: false, lang: 'en' }));
  window.dispatchEvent(new Event('beforeunload'));
  unmount();
  expect(setActiveFlexibleSession).toHaveBeenCalledWith(null);
  expect(closeFlexibleSessionInBackground).not.toHaveBeenCalled();
});

test('history and bulk selection changes cannot replace or close the session explicitly started by the doctor', () => {
  const { rerender, unmount } = renderHook((props) => useFlexibleSessionLifecycle(props), {
    initialProps: { sessions: [opened, history], managedSessionId: opened.id, isAdmin: false, lang: 'en' },
  });
  rerender({ sessions: [{ ...history, records: [] }, { ...opened, records: [] }], managedSessionId: opened.id, isAdmin: false, lang: 'ar' });
  expect(closeFlexibleSessionInBackground).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('beforeunload'));
  expect(closeFlexibleSessionInBackground).not.toHaveBeenCalled();
  unmount();
  expect(closeFlexibleSessionInBackground).not.toHaveBeenCalled();
});

test('closed or deleted managed sessions and admin viewing never trigger a close request', () => {
  const { rerender, unmount } = renderHook((props) => useFlexibleSessionLifecycle(props), {
    initialProps: { sessions: [{ ...opened, status: 'closed' }], managedSessionId: opened.id, isAdmin: false, lang: 'en' },
  });
  window.dispatchEvent(new Event('beforeunload'));
  rerender({ sessions: [], managedSessionId: opened.id, isAdmin: false, lang: 'en' });
  window.dispatchEvent(new Event('beforeunload'));
  unmount();
  const { unmount: unmountAdmin } = renderHook(() => useFlexibleSessionLifecycle({ sessions: [opened], managedSessionId: opened.id, isAdmin: true, lang: 'en' }));
  window.dispatchEvent(new Event('beforeunload'));
  unmountAdmin();
  expect(closeFlexibleSessionInBackground).not.toHaveBeenCalled();
});
