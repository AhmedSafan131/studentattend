import { loginWithApi } from './authApi';
import { authAPI } from '../utils/api';
import Axios from '../utils/Axios';
import { getStudentBrowserAccess, updateStudentBrowserAccess } from '../utils/studentBrowserPolicy';

jest.mock('../utils/api', () => ({ authAPI: { login: jest.fn() }, adminUsersAPI: {}, studentsAPI: {} }));
jest.mock('../utils/Axios', () => ({ __esModule: true, default: jest.fn(), setRuntimeAccessToken: jest.fn(), clearRuntimeAccessToken: jest.fn(), refreshStudentAccessToken: jest.fn() }));
jest.mock('../StudentApp/studentStorage', () => ({ getOrCreatePersistentDeviceIdentifier: async () => 'device', collectDeviceFingerprint: async () => ({}) }));
beforeEach(() => {
  jest.clearAllMocks();
  updateStudentBrowserAccess({ enabled: true, detected: true, blocked: false, verifiedRole: null });
});

test('Brave JS-only detection verifies credentials and rejects the student before requesting a full login', async () => {
  Axios.mockResolvedValue({ data: { role: 'student' } });
  await expect(loginWithApi({ email: 'student', password: 'password', role: 'staff' })).rejects.toMatchObject({ response: { data: { errorCode: 'STUDENT_BROWSER_BLOCKED' } } });
  expect(Axios).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/auth/credential-context' }));
  expect(authAPI.login).not.toHaveBeenCalled();
  expect(getStudentBrowserAccess().blocked).toBe(true);
});

test.each(['staff', 'doctor', 'admin'])('Brave %s can complete full login after trusted role context', async (role) => {
  Axios.mockResolvedValue({ data: { role } });
  authAPI.login.mockResolvedValue({ data: { success: true, userRole: role, token: 'access', id: 'account' } });
  const result = await loginWithApi({ email: 'account', password: 'password', role });
  expect(result.user.userRole).toBe(role);
  expect(authAPI.login).toHaveBeenCalledTimes(1);
  expect(getStudentBrowserAccess().blocked).toBe(false);
});

test('unknown browser retains the existing student login flow', async () => {
  updateStudentBrowserAccess({ detected: false });
  authAPI.login.mockResolvedValue({ data: { success: true, userRole: 'student', token: 'access' } });
  await loginWithApi({ email: 'student', password: 'password', role: 'student' });
  expect(Axios).not.toHaveBeenCalled();
  expect(authAPI.login).toHaveBeenCalledTimes(1);
});
