import { studentsAPI } from '../utils/api';
import { extractApiData } from '../utils/apiHelpers';

const mapApiStudent = (response = {}) => ({
  id: response.id,
  email: response.email,
  name: response.name || response.fullName,
  fullName: response.fullName || response.name,
  userRole: response.userRole || response.role || 'student',
  role: response.role || response.userRole || 'student',
  avatar: response.avatar,
  studentId: response.studentId || response.universityId || '',
  universityId: response.universityId || response.studentId || '',
  nationalId: response.nationalId || '',
  college: response.college || '',
  activationCount: Number(response.activationCount) || 0,
  registrations: response.registrations || [],
});

const getResponseData = (response) => extractApiData(response) || {};

const mapLockedStudent = (response = {}) => ({
  id: response.id,
  deviceIdentifier: response.deviceIdentifier || '',
  deviceName: response.deviceName || '',
  platform: response.platform || '',
  browser: response.browser || '',
  lockedAt: response.lockedAt || '',
  updatedAt: response.updatedAt || '',
  student: mapApiStudent(response.student || {}),
});

export const fetchStudents = async () => {
  const data = getResponseData(await studentsAPI.getAll());
  return (data.students || []).map(mapApiStudent);
};

export const fetchStudentsPage = async (params = {}) => {
  const data = getResponseData(await studentsAPI.getAll(params));
  return {
    students: (data.students || []).map(mapApiStudent),
    pagination: data.pagination || {
      currentPage: 1,
      totalPages: 1,
      perPage: params.perPage || 12,
      total: (data.students || []).length,
    },
  };
};

export const createStudent = async (student) => (
  mapApiStudent(getResponseData(await studentsAPI.create(student)))
);

export const importStudents = async (students) => {
  const data = getResponseData(await studentsAPI.import({ students }));
  return data.summary || { created: 0, updated: 0 };
};

export const updateStudent = async (studentId, updates) => (
  mapApiStudent(getResponseData(await studentsAPI.update(studentId, {
    ...updates,
    id: studentId,
  })))
);

export const deleteStudent = async (studentId) => {
  await studentsAPI.delete(studentId);
  return studentId;
};

export const fetchLockedStudents = async (params = {}) => {
  const data = getResponseData(await studentsAPI.getLocked(params));
  const students = (data.students || []).map(mapLockedStudent);
  return data.pagination ? { students, pagination: data.pagination } : students;
};

export const activateLockedStudent = async (lockedStudentId) => {
  const data = getResponseData(await studentsAPI.activateLocked(lockedStudentId));
  return {
    lockedStudentId,
    studentId: data.studentId || '',
    activated: data.activated || 0,
    activationCount: Number(data.activationCount) || 0,
    revokedSessions: data.revokedSessions || 0,
  };
};

export const activateAllLockedStudents = async (filters = {}) => {
  const data = getResponseData(await studentsAPI.activateAllLocked(filters));
  return data.activated || 0;
};
