import { blockStudentBrowser, isStudentBrowserBlocked, studentBrowserError, STUDENT_BROWSER_BLOCKED } from './studentBrowserPolicy';
import axios from "axios";
import { APP_BASE_PATH, isWithinAppPath, withAppBasePath } from "./appBasePath";
import { getApiBasePath, normalizeApiBaseUrl } from "./apiBaseUrl";

const defaultBaseUrl = () => {
  return APP_BASE_PATH;
};

const BASE_URL = normalizeApiBaseUrl(
  process.env.REACT_APP_API_BASE_URL || defaultBaseUrl(),
);
const API_BASE_PATH = getApiBasePath(
  BASE_URL,
  typeof window === "undefined" ? undefined : window.location.origin,
);
const AUTH_STORAGE_KEY = "studentattend.auth.user";
const LANGUAGE_STORAGE_KEY = "uniattend_lang";

const SELECTED_TERM_STORAGE_KEY = "uniattend_selected_term";
const GET_RATE_LIMIT_RETRY_DELAY_MS = 1100;

export const APIS = {
  login: "/api/auth/login",
  refreshSession: "/api/auth/refresh",
  logout: "/api/auth/logout",
  upgradeStudentSession: "/api/auth/upgrade-student-session",
  currentUser: "/api/auth/me",
  staffAccessCode: "/api/auth/staff/access-code",
  studentLoginOptions: "/api/student-login-options",
  adminStudentLoginOptions: "/api/admin/settings/student-login-options",
  academicTerms: "/api/terms",
  academicTermActive: "/api/terms/active",
  adminAcademicTerms: "/api/admin/terms",
  adminAcademicTermById: (id) => `/api/admin/terms/${id}`,
  adminAcademicTermActivate: (id) => `/api/admin/terms/${id}/activate`,
  catalogSubjects: "/api/catalog/subjects",
  adminCatalogSubjects: "/api/admin/catalog/subjects",
  adminUsers: "/api/admin/users",
  adminUsersImport: "/api/admin/users/import",
  adminUserById: (id) => `/api/admin/users/${id}`,
  adminCatalogSubjectsImport: "/api/admin/catalog/subjects/import",
  adminCatalogSubjectById: (id) => `/api/admin/catalog/subjects/${id}`,
  staffCourses: (staffId) => `/api/admin/staff/${staffId}/courses`,
  staffCourseById: (staffId, courseUid) => `/api/admin/staff/${staffId}/courses/${courseUid}`,
  students: "/api/students",
  studentsImport: "/api/students/import",
  studentById: (id) => `/api/students/${id}`,
  lockedStudents: "/api/students/locked",
  activateLockedStudent: (id) => `/api/students/locked/${id}/activate`,
  activateAllLockedStudents: "/api/students/locked/activate-all",
  lectureSessions: "/api/lecture-sessions",
  lectureSessionsHistory: "/api/lecture-sessions",
  lectureSessionsCloseAll: "/api/lecture-sessions/close-all",
  lectureSessionById: (id) => `/api/lecture-sessions/${id}`,
  lectureSessionEnd: (id) => `/api/lecture-sessions/${id}/end`,
  lectureSessionQrToken: (id) => `/api/lecture-sessions/${id}/qr-token`,
  attendanceRecords: "/api/attendance",
  attendanceStudent: "/api/attendance/student",
  attendanceManual: "/api/attendance/manual",
  adminStudentAttendanceView: "/api/attendance/admin-student-view",
  administrativeSubjectAbsences: "/api/admin/subject-absences",
  administrativeSubjectAbsenceById: (id) => `/api/admin/subject-absences/${id}`,
  attendanceRecordById: (id) => `/api/attendance/${id}`,
  attendanceReport: "/api/attendance/report",
  attendanceReportOptions: "/api/attendance/report-options",
  attendanceScan: "/api/attendance/scan",
  attendanceScanStatus: "/api/attendance/scan-status",
  attendanceServerTime: "/api/attendance/server-time",
  myAttendance: "/api/attendance/my",
  adHocAttendance: "/api/ad-hoc-attendance",
  adHocAttendanceById: (id) => `/api/ad-hoc-attendance/${id}`,
  adHocAttendanceMigrationPreview: "/api/ad-hoc-attendance/migration-preview",
  adHocAttendanceMigrateAll: "/api/ad-hoc-attendance/migrate-all",
  adHocAttendanceQrToken: (id) => `/api/ad-hoc-attendance/${id}/qr-token`,
  adHocAttendanceStudents: (id) => `/api/ad-hoc-attendance/${id}/students`,
  adHocAttendanceStudentsBulk: (id) => `/api/ad-hoc-attendance/${id}/students/bulk`,
  adHocAttendanceRecordById: (sessionId, recordId) => `/api/ad-hoc-attendance/${sessionId}/records/${recordId}`,
  adHocAttendanceCloseAll: "/api/ad-hoc-attendance/close-all",
  adHocAttendanceClose: (id) => `/api/ad-hoc-attendance/${id}/close`,
  adHocAttendanceReopen: (id) => `/api/ad-hoc-attendance/${id}/reopen`,
  adHocAttendanceMigrate: (id) => `/api/ad-hoc-attendance/${id}/migrate`,
};

let runtimeAccessToken = "";
let refreshPromise = null;
const inFlightGetRequests = new Map();

const runWithStudentRefreshLock = async (callback) => {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return callback();
  }

  // The refresh cookie is shared by normal tabs and the installed PWA. A
  // cross-document lock prevents both clients from rotating the same cookie
  // at once and triggering the server's refresh-token reuse protection.
  return navigator.locks.request("mnu-attend-student-session-refresh", callback);
};

export const setRuntimeAccessToken = (token) => {
  runtimeAccessToken = String(token || "");
};

export const clearRuntimeAccessToken = () => {
  runtimeAccessToken = "";
};

export const refreshStudentAccessToken = async ({ broadcast = true } = {}) => {
  if (!refreshPromise) {
    refreshPromise = runWithStudentRefreshLock(async () => {
      const response = await axiosInstance.post(APIS.refreshSession, {}, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const data = response?.data?.data || response?.data || {};
      if (!data.token) throw new Error("Refresh response did not include an access token.");

      setRuntimeAccessToken(data.token);
      if (broadcast) {
        window.dispatchEvent(new CustomEvent("mnu:auth-refreshed", { detail: data }));
      }
      return data;
    }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

const getStoredUser = () => {
  if (typeof window === "undefined") return "";

  try {
    return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

const getStoredAuthToken = () => runtimeAccessToken || getStoredUser()?.token || "";

const getCurrentLanguage = () => {
  if (typeof window === "undefined") return "ar";
  return (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ar").split("-")[0];
};

const getSelectedTermCode = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELECTED_TERM_STORAGE_KEY) || "";
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(API_BASE_PATH ? { "X-App-Base-Path": API_BASE_PATH } : {}),
  },
});

// This local stop is a UX guard, not authorization. The server still resolves
// the account and checks browser headers independently on every protected call.
const browserFlowPaths = new Set(['/api/auth/login', '/api/auth/logout', '/api/auth/session-context', '/api/auth/credential-context', '/api/student-browser-policy', '/api/student-login-options']);
axiosInstance.interceptors.request.use((config) => {
  if (isStudentBrowserBlocked() && !browserFlowPaths.has(String(config.url || '').split('?')[0])) {
    return Promise.reject(studentBrowserError());
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.data?.errorCode === STUDENT_BROWSER_BLOCKED) {
      blockStudentBrowser();
      return Promise.reject(error);
    }
    const requestPath = error?.config?.url || "";
    const isLoginRequest = requestPath.includes(APIS.login) || requestPath.includes('/api/auth/credential-context') || requestPath.includes('/api/auth/session-context');
    const isRefreshRequest = requestPath.includes(APIS.refreshSession);
    const isLogoutRequest = requestPath.includes(APIS.logout);
    const isUpgradeRequest = requestPath.includes(APIS.upgradeStudentSession);
    const requestConfig = error?.config || {};
    const isRetryableRateLimit = error?.response?.status === 429
      && String(requestConfig.method || '').toUpperCase() === 'GET'
      && !requestConfig.__mnuRateLimitRetried
      && !requestConfig.signal?.aborted;

    if (isRetryableRateLimit) {
      requestConfig.__mnuRateLimitRetried = true;
      const retryAfterSeconds = Number(error?.response?.headers?.['retry-after'] || 0);
      const retryDelay = retryAfterSeconds > 0
        ? Math.min(retryAfterSeconds * 1000, 5000)
        : GET_RATE_LIMIT_RETRY_DELAY_MS;
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
      if (requestConfig.signal?.aborted) return Promise.reject(error);
      return axiosInstance(requestConfig);
    }

    const storedUser = getStoredUser();
    const isStudentSession = storedUser?.userRole === "student"
      || storedUser?.role === "student"
      || isWithinAppPath(window.location.pathname, "/student");

    if (error?.response?.status === 401
      && isStudentSession
      && !requestConfig.__mnuRetried
      && !isLoginRequest
      && !isRefreshRequest
      && !isLogoutRequest
      && !isUpgradeRequest) {
      try {
        const refreshedSession = await refreshStudentAccessToken();
        const accessToken = refreshedSession.token;
        requestConfig.__mnuRetried = true;
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(requestConfig);
      } catch (refreshError) {
        const refreshStatus = Number(refreshError?.response?.status || 0);
        const sessionIsInvalid = refreshStatus === 401 || refreshStatus === 419;
        if (sessionIsInvalid) {
          clearRuntimeAccessToken();
          localStorage.removeItem(AUTH_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent("mnu:auth-expired"));
          if (window.location.pathname !== withAppBasePath("/")) {
            window.location.assign(withAppBasePath("/"));
          }
        }
        return Promise.reject(refreshError);
      }
    }

    if (error?.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !isLogoutRequest) {
      clearRuntimeAccessToken();
      localStorage.removeItem(AUTH_STORAGE_KEY);

      if (window.location.pathname !== withAppBasePath("/")) {
        window.location.assign(withAppBasePath("/"));
      }
    }

    return Promise.reject(error);
  }
);

const Axios = async ({
  method,
  path,
  data,
  params,
  header,
  pathParams = "",
  isFormData = false,
  timeout,
  signal,
}) => {
  const accessToken = getStoredAuthToken();
  const normalizedLanguage = getCurrentLanguage();
  const selectedTermCode = getSelectedTermCode();
  const authHeader = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};
  const termHeader = selectedTermCode
    ? { "X-Academic-Term": selectedTermCode }
    : {};

  const requestConfig = {
    method,
    url: path + pathParams,
    data,
    params,
    headers: isFormData
      ? {
          "Content-Type": "multipart/form-data",
          "Accept-Language": normalizedLanguage,
          ...authHeader,
          ...termHeader,
          ...header,
        }
      : {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Language": normalizedLanguage,
          "X-Requested-With": "XMLHttpRequest",
          ...(API_BASE_PATH ? { "X-App-Base-Path": API_BASE_PATH } : {}),
          ...authHeader,
          ...termHeader,
          ...header,
        },
    withCredentials: true,
    timeout,
    signal,
  };

  // React providers and route components can legitimately ask for the same
  // read during one render transition. Coalescing only concurrent GETs avoids
  // duplicate PHP work without serving stale data or changing mutations.
  if (String(method || '').toUpperCase() !== 'GET' || signal) {
    return axiosInstance(requestConfig);
  }

  const requestKey = JSON.stringify([
    requestConfig.url,
    params || {},
    selectedTermCode,
    normalizedLanguage,
    accessToken,
  ]);
  const existingRequest = inFlightGetRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = axiosInstance(requestConfig).finally(() => {
    if (inFlightGetRequests.get(requestKey) === request) {
      inFlightGetRequests.delete(requestKey);
    }
  });
  inFlightGetRequests.set(requestKey, request);
  return request;
};

export default Axios;

