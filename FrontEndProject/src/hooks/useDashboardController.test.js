import { renderHook } from '@testing-library/react';
import { useDashboardController } from './useDashboardController';
import { lectureSessionsAPI } from '../utils/api';

jest.mock('react-redux', () => ({ useSelector: (selector) => selector({ terms: { terms: [], selectedTermCode: 'CURRENT', activeTerm: null } }) }));
jest.mock('../utils/api', () => ({ attendanceAPI: {}, lectureSessionsAPI: { getAll: jest.fn(), get: jest.fn(), delete: jest.fn(), start: jest.fn() } }));
jest.mock('../utils/Axios', () => ({ APIS: {} }));
jest.mock('../utils/backgroundPoller', () => ({ createBackgroundPoller: () => ({ stop: jest.fn(), trigger: jest.fn() }) }));

const user = { id: 'doctor', userRole: 'staff', token: 'test' };

beforeEach(() => jest.clearAllMocks());

test.each([
  '/dashboard',
  '/dashboard/flexible-attendance',
  '/dashboard/attendance',
  '/dashboard/reports',
])('does not load the removed parallel lecture-session history on %s', (pathname) => {
  const { result } = renderHook(() => useDashboardController({ user, socket: null, pathname }));

  expect(result.current.lectureSessions).toEqual([]);
  expect(result.current.selectedDashboardSessionId).toBe('');
  expect(result.current.selectedDashboardSession).toBeNull();
  expect(result.current.displayedAttendanceStudents).toEqual([]);
  expect(lectureSessionsAPI.getAll).not.toHaveBeenCalled();
  expect(lectureSessionsAPI.get).not.toHaveBeenCalled();
});
