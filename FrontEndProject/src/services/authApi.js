import { enforceDetectedStudentContext, getStudentBrowserAccess, updateStudentBrowserAccess } from '../utils/studentBrowserPolicy';
import Axios from '../utils/Axios';
import { adminUsersAPI, authAPI, studentsAPI } from "../utils/api";
import { extractApiData, extractApiMessage } from "../utils/apiHelpers";
import {
  clearRuntimeAccessToken,
  refreshStudentAccessToken,
  setRuntimeAccessToken,
} from "../utils/Axios";
import {
  collectDeviceFingerprint,
  getOrCreatePersistentDeviceIdentifier,
} from "../StudentApp/studentStorage";

const AUTH_DEVICE_KEY = "studentattend.auth.deviceId";

const getBrowserName = () => {
  if (typeof navigator === "undefined") return "";

  const userAgent = navigator.userAgent || "";
  if (userAgent.includes("Edg")) return "Microsoft Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Browser";
};

export const mapApiUser = (response = {}) => ({
  id: response.id,
  email: response.email,
  name: response.name || response.fullName,
  fullName: response.fullName || response.name,
  userRole: response.userRole || response.role,
  role: response.role || response.userRole,
  token: response.token,
  expiresAt: response.expiresAt,
  loginMethod: response.loginMethod,
  specialty: response.specialty,
  avatar: response.avatar,
  isSystem: Boolean(response.isSystem),
  permissions: response.permissions || [],
  allowedColleges: response.allowedColleges || [],
  colleges: response.allowedColleges || [],
  restrictFlexibleAttendanceToAssignments: Boolean(response.restrictFlexibleAttendanceToAssignments),
  requireFlexibleStudentRegistration: Boolean(response.requireFlexibleStudentRegistration),
  courses: response.courses || [],
  studentId: response.studentId || response.universityId || "",
  universityId: response.universityId || response.studentId || "",
  nationalId: response.nationalId || "",
  college: response.college || "",
  registrations: response.registrations || [],
});

const getResponseData = (response) => extractApiData(response) || {};

export const loginWithApi = async ({ email, password, role, language }) => {
  const browser = getStudentBrowserAccess();
  if (browser.enabled && browser.detected) {
    // Credential-verified role only. Never authorize using the role picker or a
    // browser-supplied isBrave flag. This probe issues no session or student data.
    const context = await Axios({ method: 'POST', path: '/api/auth/credential-context', data: { email, password, role } });
    enforceDetectedStudentContext(context.data.role);
  }
  const deviceIdentifier = role === 'student'
    ? await getOrCreatePersistentDeviceIdentifier()
    : (window.localStorage.getItem(AUTH_DEVICE_KEY) || 'staff-browser');
  const deviceFingerprint = role === 'student'
    ? await collectDeviceFingerprint()
    : undefined;
  const response = await authAPI.login(
    {
      email,
      password,
      role,
      language,
      deviceIdentifier,
      deviceFingerprint,
      deviceName: typeof navigator === "undefined" ? "" : navigator.platform,
      platform: typeof navigator === "undefined" ? "" : navigator.platform,
      browser: getBrowserName(),
    },
    language ? { "Accept-Language": language } : undefined,
  );
  const data = getResponseData(response);

  if (!data.success) {
    throw new Error(data.message || "Unable to sign in. Please try again.");
  }

  enforceDetectedStudentContext(data.userRole || data.role);
  updateStudentBrowserAccess({ verifiedRole: data.userRole || data.role, blocked: false });
  setRuntimeAccessToken(data.token);

  return {
    user: mapApiUser(data),
    message: extractApiMessage(response),
  };
};

export const restoreStudentSessionWithApi = async ({ hasLegacyToken = false } = {}) => {
  const data = hasLegacyToken
    ? getResponseData(await authAPI.upgradeStudentSession())
    : await refreshStudentAccessToken({ broadcast: false });
  if (!data.token || (data.userRole || data.role) !== 'student') {
    throw new Error('No active student session was found.');
  }
  enforceDetectedStudentContext(data.userRole || data.role);
  updateStudentBrowserAccess({ verifiedRole: data.userRole || data.role, blocked: false });
  setRuntimeAccessToken(data.token);
  return mapApiUser(data);
};

export const logoutWithApi = async () => {
  try {
    await authAPI.logout();
  } finally {
    clearRuntimeAccessToken();
  }
};

export const fetchCurrentUser = async (termCode) => (
  mapApiUser(getResponseData(await authAPI.getCurrentUser(termCode)))
);

export const fetchUsers = async () => {
  let admins = [];
  let doctors = [];

  try {
    const data = getResponseData(await adminUsersAPI.getAll());
    admins = (data.admins || []).map(mapApiUser);
    doctors = (data.doctors || []).map(mapApiUser);
  } catch (error) {
    const status = error?.response?.status;

    if (status !== 401 && status !== 403) {
      throw error;
    }
  }

  return {
    admins,
    doctors,
  };
};

export const fetchManagedStudents = async () => {
  try {
    const data = getResponseData(await studentsAPI.getAll());
    return (data.students || []).map(mapApiUser);
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) return [];
    throw error;
  }
};

export const createUser = async (user) => (
  mapApiUser(getResponseData(await adminUsersAPI.create(user)))
);

export const importDoctors = async (doctors) => {
  const data = getResponseData(await adminUsersAPI.import({ doctors }));
  return data.summary || {};
};

export const updateUser = async ({ userId, updates }) => (
  mapApiUser(getResponseData(await adminUsersAPI.update(userId, {
    ...updates,
    id: userId,
  })))
);

export const deleteUser = async (userId) => {
  await adminUsersAPI.delete(userId);
  return userId;
};

export const addDoctorCourse = async ({ doctorId, course }) => (
  mapApiUser(getResponseData(await adminUsersAPI.addDoctorCourse(doctorId, course)))
);

export const deleteDoctorCourse = async ({ doctorId, courseUid }) => (
  mapApiUser(getResponseData(await adminUsersAPI.deleteDoctorCourse(doctorId, courseUid)))
);
