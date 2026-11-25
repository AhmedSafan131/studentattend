import Axios from './Axios';
import { APIS } from './Axios';

const BULK_IMPORT_TIMEOUT_MS = 10 * 60 * 1000;

// Auth API
export const authAPI = {
  login: (data, header) => Axios({
    method: 'POST',
    path: APIS.login,
    data,
    header
  }),

  refreshSession: () => Axios({
    method: 'POST',
    path: APIS.refreshSession,
  }),

  upgradeStudentSession: () => Axios({
    method: 'POST',
    path: APIS.upgradeStudentSession,
  }),

  logout: () => Axios({
    method: 'POST',
    path: APIS.logout,
  }),

  getCurrentUser: (termCode) => Axios({
    method: 'GET',
    path: APIS.currentUser,
    header: termCode ? { 'X-Academic-Term': termCode } : undefined,
  }),

  createStaffAccessCode: () => Axios({
    method: 'POST',
    path: APIS.staffAccessCode,
  }),

  getStaffAccessCodeStatus: () => Axios({
    method: 'GET',
    path: APIS.staffAccessCode,
  }),

  revokeStaffAccessCode: () => Axios({
    method: 'DELETE',
    path: APIS.staffAccessCode,
  }),
};

export const studentLoginOptionsAPI = {
  get: () => Axios({
    method: 'GET',
    path: APIS.studentLoginOptions,
  }),

  update: (data) => Axios({
    method: 'PUT',
    path: APIS.adminStudentLoginOptions,
    data,
  }),
};

export const adminUsersAPI = {
  getAll: () => Axios({
    method: 'GET',
    path: APIS.adminUsers
  }),

  create: (data) => Axios({
    method: 'POST',
    path: APIS.adminUsers,
    data
  }),

  import: (data) => Axios({
    method: 'POST',
    path: APIS.adminUsersImport,
    data,
    timeout: BULK_IMPORT_TIMEOUT_MS,
  }),

  update: (id, data) => Axios({
    method: 'PUT',
    path: APIS.adminUserById(id),
    data
  }),

  delete: (id) => Axios({
    method: 'DELETE',
    path: APIS.adminUserById(id)
  }),

  addDoctorCourse: (doctorId, data) => Axios({
    method: 'POST',
    path: APIS.staffCourses(doctorId),
    data
  }),

  deleteDoctorCourse: (doctorId, courseUid) => Axios({
    method: 'DELETE',
    path: APIS.staffCourseById(doctorId, courseUid)
  })
};

export const catalogAPI = {
  getSubjects: (params) => Axios({
    method: 'GET',
    path: APIS.catalogSubjects,
    params,
  }),

  createSubject: (data) => Axios({
    method: 'POST',
    path: APIS.adminCatalogSubjects,
    data,
  }),

  importSubjects: (data) => Axios({
    method: 'POST',
    path: APIS.adminCatalogSubjectsImport,
    data,
  }),

  updateSubject: (id, data) => Axios({
    method: 'PUT',
    path: APIS.adminCatalogSubjectById(id),
    data,
  }),

  deleteSubject: (id) => Axios({
    method: 'DELETE',
    path: APIS.adminCatalogSubjectById(id),
  }),
};

export const studentsAPI = {
  getAll: (params) => Axios({
    method: 'GET',
    path: APIS.students,
    params,
  }),

  create: (data) => Axios({
    method: 'POST',
    path: APIS.students,
    data
  }),

  import: (data) => Axios({
    method: 'POST',
    path: APIS.studentsImport,
    data,
    timeout: BULK_IMPORT_TIMEOUT_MS,
  }),

  update: (id, data) => Axios({
    method: 'PUT',
    path: APIS.studentById(id),
    data
  }),

  delete: (id) => Axios({
    method: 'DELETE',
    path: APIS.studentById(id)
  }),

  getLocked: (params) => Axios({
    method: 'GET',
    path: APIS.lockedStudents,
    params,
  }),

  activateLocked: (id) => Axios({
    method: 'POST',
    path: APIS.activateLockedStudent(id)
  }),

  activateAllLocked: (data = {}) => Axios({
    method: 'POST',
    path: APIS.activateAllLockedStudents,
    data
  })
};

export const lectureSessionsAPI = {
  getAll: () => Axios({
    method: 'GET',
    path: APIS.lectureSessionsHistory,
    params: { includeRecords: false },
  }),

  get: (id) => Axios({
    method: 'GET',
    path: APIS.lectureSessionById(id)
  }),

  start: (data) => Axios({
    method: 'POST',
    path: APIS.lectureSessions,
    data
  }),

  end: (id) => Axios({
    method: 'POST',
    path: APIS.lectureSessionEnd(id)
  }),

  delete: (id) => Axios({
    method: 'DELETE',
    path: APIS.lectureSessionById(id)
  }),

  closeAll: () => Axios({
    method: 'POST',
    path: APIS.lectureSessionsCloseAll
  }),

  qrToken: (id, windowSeconds) => Axios({
    method: 'GET',
    path: APIS.lectureSessionQrToken(id),
    params: windowSeconds ? { window: windowSeconds } : undefined,
  })
};

export const attendanceAPI = {
  getReportOptions: () => Axios({
    method: 'GET',
    path: APIS.attendanceReportOptions,
  }),

  getAll: () => Axios({
    method: 'GET',
    path: APIS.attendanceRecords
  }),

  getReport: (params, { signal } = {}) => Axios({
    method: 'GET',
    path: APIS.attendanceReport,
    params,
    signal,
    timeout: 60 * 1000,
  }),

  delete: (id) => Axios({
    method: 'DELETE',
    path: APIS.attendanceRecordById(id)
  }),

  deleteStudent: (data) => Axios({
    method: 'DELETE',
    path: APIS.attendanceStudent,
    data
  }),

  createManual: (data) => Axios({
    method: 'POST',
    path: APIS.attendanceManual,
    data
  }),

  scan: (data) => Axios({
    method: 'POST',
    path: APIS.attendanceScan,
    data,
    timeout: 15000,
  }),

  scanStatus: (scanRequestId, attendanceRecordId, recordSource) => Axios({
    method: 'POST',
    path: APIS.attendanceScanStatus,
    data: {
      scanRequestId,
      ...(attendanceRecordId ? { attendanceRecordId } : {}),
      ...(recordSource ? { recordSource } : {}),
    },
    timeout: 8000,
  }),

  serverTime: () => Axios({
    method: 'GET',
    path: APIS.attendanceServerTime,
    timeout: 5000,
  }),

  adminStudentView: (nationalId, termCode) => Axios({
    method: 'GET',
    path: APIS.adminStudentAttendanceView,
    params: { nationalId, ...(termCode ? { term_code: termCode } : {}) },
    header: termCode ? { 'X-Academic-Term': termCode } : undefined,
  }),

  mine: (termCode) => Axios({
    method: 'GET',
    path: APIS.myAttendance,
    header: termCode ? { 'X-Academic-Term': termCode } : undefined,
  })
};

export const administrativeSubjectAbsenceAPI = {
  getAll: () => Axios({ method: 'GET', path: APIS.administrativeSubjectAbsences }),
  create: (data) => Axios({ method: 'POST', path: APIS.administrativeSubjectAbsences, data }),
  delete: (id) => Axios({ method: 'DELETE', path: APIS.administrativeSubjectAbsenceById(id) }),
};

export const adHocAttendanceAPI = {
  getAll: (params = {}) => Axios({
    method: 'GET',
    path: APIS.adHocAttendance,
    params: { includeRecords: false, ...params },
  }),

  get: (sessionId) => Axios({
    method: 'GET',
    path: APIS.adHocAttendanceById(sessionId),
  }),

  getMigrationPreview: (params) => Axios({
    method: 'GET',
    path: APIS.adHocAttendanceMigrationPreview,
    params,
  }),

  delete: (sessionId) => Axios({
    method: 'DELETE',
    path: APIS.adHocAttendanceById(sessionId)
  }),

  create: (data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendance,
    data
  }),

  qrToken: (sessionId, windowSeconds) => Axios({
    method: 'GET',
    path: APIS.adHocAttendanceQrToken(sessionId),
    params: windowSeconds ? { window: windowSeconds } : undefined,
  }),

  addStudent: (sessionId, data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceStudents(sessionId),
    data
  }),

  addStudentsBulk: (sessionId, studentIdentifiers) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceStudentsBulk(sessionId),
    data: { studentIdentifiers },
  }),

  deleteRecord: (sessionId, recordId) => Axios({
    method: 'DELETE',
    path: APIS.adHocAttendanceRecordById(sessionId, recordId)
  }),

  closeAll: (data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceCloseAll,
    data,
  }),

  migrateAll: (data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceMigrateAll,
    data,
    // A server-side batch may take longer than the normal interactive API timeout.
    timeout: 5 * 60 * 1000,
  }),

  close: (sessionId) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceClose(sessionId)
  }),

  reopen: (sessionId, data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceReopen(sessionId),
    data
  }),

  migrate: (sessionId, data) => Axios({
    method: 'POST',
    path: APIS.adHocAttendanceMigrate(sessionId),
    data
  })
};

export const termsApi = {
  getAll: () => Axios({
    method: 'GET',
    path: APIS.academicTerms,
  }),

  getActive: () => Axios({
    method: 'GET',
    path: APIS.academicTermActive,
  }),

  create: (data) => Axios({
    method: 'POST',
    path: APIS.adminAcademicTerms,
    data,
  }),

  update: (id, data) => Axios({
    method: 'PUT',
    path: APIS.adminAcademicTermById(id),
    data,
  }),

  activate: (id) => Axios({
    method: 'POST',
    path: APIS.adminAcademicTermActivate(id),
  }),

  delete: (id) => Axios({
    method: 'DELETE',
    path: APIS.adminAcademicTermById(id),
  }),
};

