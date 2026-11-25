import React, { useEffect } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentBrowserBoundary from './index';
import Axios from '../../utils/Axios';
import { STUDENT_BROWSER_MESSAGE, updateStudentBrowserAccess } from '../../utils/studentBrowserPolicy';

let mockPath = '/student';
jest.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: mockPath }), useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../utils/Axios', () => ({ __esModule: true, default: jest.fn(), clearRuntimeAccessToken: jest.fn() }));
const mounted = jest.fn();
const unmounted = jest.fn();
function SensitiveApp() {
  useEffect(() => { mounted(); return unmounted; }, []);
  return <div>Student data scanner and socket</div>;
}
function show(user = null) {
  const store = configureStore({ reducer: (state = { auth: { user } }) => state });
  return render(<Provider store={store}><StudentBrowserBoundary><SensitiveApp /></StudentBrowserBoundary></Provider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear(); mockPath = '/student';
  updateStudentBrowserAccess({ enabled: false, detected: false, blocked: false, verifiedRole: null });
  Object.defineProperty(navigator, 'brave', { configurable: true, value: { isBrave: async () => true } });
  Axios.mockImplementation(async ({ path }) => ({ data: path === '/api/student-browser-policy' ? { enabled: true, braveDetected: false } : { role: 'student' } }));
});

test.each(['/student', '/student/history', '/student/profile', '/student/direct-link'])('blocks %s before any protected app/provider mounts', async (path) => {
  mockPath = path;
  show();
  expect(mounted).not.toHaveBeenCalled();
  expect(await screen.findByText(STUDENT_BROWSER_MESSAGE)).toBeVisible();
  expect(mounted).not.toHaveBeenCalled();
  expect(Axios.mock.calls.map(([config]) => config.path)).toEqual(['/api/student-browser-policy', '/api/auth/session-context']);
});

test('a forged cached admin role does not bypass the server student context', async () => {
  show({ token: 'student-credential', userRole: 'admin' });
  expect(await screen.findByText(STUDENT_BROWSER_MESSAGE)).toBeVisible();
  expect(mounted).not.toHaveBeenCalled();
});

test.each(['admin', 'staff', 'doctor'])('Brave %s continues and background focus checks do not remount the app', async (role) => {
  mockPath = '/dashboard';
  Axios.mockImplementation(async ({ path }) => ({ data: path === '/api/student-browser-policy' ? { enabled: true, braveDetected: false } : { role } }));
  show({ token: 'trusted-credential', userRole: 'student' });
  expect(await screen.findByText('Student data scanner and socket')).toBeVisible();
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(Axios).toHaveBeenCalledTimes(4));
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
});

test('shared login remains accessible to anonymous Brave users', async () => {
  mockPath = '/';
  Axios.mockImplementation(async ({ path }) => ({ data: path === '/api/student-browser-policy' ? { enabled: true, braveDetected: false } : { role: null } }));
  show();
  expect(await screen.findByText('Student data scanner and socket')).toBeVisible();
});

test('unknown detector or disabled policy does not block or probe identity', async () => {
  Object.defineProperty(navigator, 'brave', { configurable: true, value: undefined });
  show();
  expect(await screen.findByText('Student data scanner and socket')).toBeVisible();
  expect(Axios).toHaveBeenCalledTimes(1);
});

test('session check failures give a finite retry screen without mounting protected functions', async () => {
  mockPath = '/dashboard';
  Axios.mockImplementation(async ({ path }) => {
    if (path.includes('session-context')) throw new Error('offline');
    return { data: { enabled: true } };
  });
  show();
  expect(await screen.findByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  expect(mounted).not.toHaveBeenCalled();
  expect(screen.queryByText(STUDENT_BROWSER_MESSAGE)).not.toBeInTheDocument();
});

test('an offline student URL honors the cached policy without erasing saved data', async () => {
  localStorage.setItem('studentattend.studentBrowserPolicy', '{"enabled":true}');
  Axios.mockRejectedValue(new Error('offline'));
  show();
  expect(await screen.findByText(STUDENT_BROWSER_MESSAGE)).toBeVisible();
  expect(mounted).not.toHaveBeenCalled();
});

test('a failed or absent later detector cannot undo an earlier positive detection', async () => {
  show();
  await screen.findByText(STUDENT_BROWSER_MESSAGE);
  Object.defineProperty(navigator, 'brave', { configurable: true, value: undefined });
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(Axios).toHaveBeenCalledTimes(4));
  expect(screen.getByText(STUDENT_BROWSER_MESSAGE)).toBeVisible();
  expect(mounted).not.toHaveBeenCalled();
});

test('a late server block unmounts protected functions without touching pending attendance storage', async () => {
  Object.defineProperty(navigator, 'brave', { configurable: true, value: undefined });
  localStorage.setItem('student-attendance:pending-scans:student-1', '[{"scanRequestId":"saved"}]');
  show();
  await screen.findByText('Student data scanner and socket');
  act(() => updateStudentBrowserAccess({ blocked: true }));
  expect(screen.getByText(STUDENT_BROWSER_MESSAGE)).toBeVisible();
  expect(unmounted).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('student-attendance:pending-scans:student-1')).toContain('saved');
});
