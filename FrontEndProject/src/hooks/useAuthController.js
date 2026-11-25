import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboardHomePath } from '../utils/permissions';
import { DASHBOARD_PAGE_ROUTES } from '../Dashboard/pages';
import {
  login,
  restoreStudentSession,
  selectAuth,
  signOut as signOutAction,
  updateCurrentUser,
} from '../redux/slices/authSlice';
import {
  clearUsers,
  createDoctorCourse,
  createManagedUser,
  deleteManagedUser,
  loadUsers,
  loadStudents,
  removeDoctorCourse,
  selectUsersState,
  updateManagedUser,
} from '../redux/slices/usersSlice';
import { setSelectedTermCode } from '../redux/slices/termsSlice';
import { fetchCurrentUser, logoutWithApi, mapApiUser } from '../services/authApi';
import { needsManagedUsersForRoute } from '../utils/dashboardDataPolicy';

const HOME_PATH_BY_ROLE = {
  student: '/student',
};

export const useAuthController = ({ pathname = '' } = {}) => {
  const dispatch = useDispatch();
  const studentBootstrapStartedRef = useRef(false);
  const {
    user,
    status,
    error,
    loginMessage,
    bootstrapStatus,
  } = useSelector(selectAuth);

  useEffect(() => {
    if (bootstrapStatus !== 'idle') return;
    if (user && user.userRole !== 'student') return;
    if (studentBootstrapStartedRef.current) return;

    studentBootstrapStartedRef.current = true;
    dispatch(restoreStudentSession({ hasLegacyToken: Boolean(user?.token) }));
  }, [bootstrapStatus, dispatch, user]);

  useEffect(() => {
    const handleRefreshed = (event) => dispatch(updateCurrentUser(mapApiUser(event.detail || {})));
    const handleExpired = () => dispatch(signOutAction());
    window.addEventListener('mnu:auth-refreshed', handleRefreshed);
    window.addEventListener('mnu:auth-expired', handleExpired);
    return () => {
      window.removeEventListener('mnu:auth-refreshed', handleRefreshed);
      window.removeEventListener('mnu:auth-expired', handleExpired);
    };
  }, [dispatch]);
  const selectedTermCode = useSelector((state) => state.terms.selectedTermCode);
  const {
    admins,
    doctors,
    students,
    status: usersStatus,
    studentsStatus,
    mutationStatus,
    error: usersError,
    mutationError,
  } = useSelector(selectUsersState);

  const refreshUsers = useCallback(async () => {
    if (!user?.token || user.userRole === 'student') {
      return { admins: [], doctors: [], students: [] };
    }

    return dispatch(loadUsers()).unwrap();
  }, [dispatch, user?.token, user?.userRole]);

  const ensureStudents = useCallback(async () => {
    if (!user?.token || user.userRole === 'student') return [];
    if (studentsStatus !== 'idle') return students;
    return dispatch(loadStudents()).unwrap();
  }, [dispatch, students, studentsStatus, user?.token, user?.userRole]);

  useEffect(() => {
    const needsManagedUsers = needsManagedUsersForRoute({ pathname, userRole: user?.userRole });
    if (!user?.token || !needsManagedUsers) return;
    if (usersStatus !== 'idle') return;

    dispatch(loadUsers()).catch(() => {});
  }, [dispatch, pathname, user?.token, user?.userRole, usersStatus]);

  useEffect(() => {
    if (!user?.token || !selectedTermCode) return undefined;

    let cancelled = false;
    let refreshInProgress = false;

    const refreshCurrentUser = async () => {
      if (cancelled || refreshInProgress || document.visibilityState === 'hidden') return;
      refreshInProgress = true;

      try {
        const currentUser = await fetchCurrentUser(selectedTermCode);
        if (cancelled) return;
        dispatch(updateCurrentUser({
          ...currentUser,
          token: user.token,
          expiresAt: user.expiresAt,
          loginMethod: user.loginMethod,
        }));
      } catch {
        // Keep the current session usable during temporary network interruptions.
      } finally {
        refreshInProgress = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentUser();
      }
    };

    refreshCurrentUser();

    const refreshInterval = (user.userRole === 'staff' || user.userRole === 'doctor')
      ? window.setInterval(refreshCurrentUser, 60000)
      : null;

    window.addEventListener('focus', refreshCurrentUser);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      cancelled = true;
      if (refreshInterval) window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshCurrentUser);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [dispatch, selectedTermCode, user?.expiresAt, user?.loginMethod, user?.token, user?.userRole]);

  const signInWithCredentials = useCallback(async (credentials) => {
    // A previous account must not inherit another user's historical view.
    dispatch(setSelectedTermCode(''));
    const result = await dispatch(login(credentials)).unwrap();
    if (result.user?.token && result.user.userRole !== 'student') {
      dispatch(loadUsers()).catch(() => {});
    }
    return result;
  }, [dispatch]);

  const signOut = useCallback(async () => {
    try {
      await logoutWithApi();
    } catch {
      // Local sign-out must still complete if the network is unavailable.
    }
    dispatch(signOutAction());
    dispatch(clearUsers());
    dispatch(setSelectedTermCode(''));
  }, [dispatch]);

  const updateUser = useCallback((updates) => {
    dispatch(updateCurrentUser(updates));
  }, [dispatch]);

  const addAdmin = useCallback((admin) => (
    dispatch(createManagedUser({ ...admin, userRole: 'admin', role: 'admin' })).unwrap()
  ), [dispatch]);

  const updateAdmin = useCallback(async (adminId, updates) => {
    const current = admins.find((admin) => admin.id === adminId) || {};
    const updatedUser = await dispatch(updateManagedUser({
      userId: adminId,
      updates: { ...current, ...updates, userRole: 'admin', role: 'admin' },
    })).unwrap();

    if (updatedUser?.id === user?.id) {
      dispatch(updateCurrentUser({
        ...updatedUser,
        token: user.token,
        expiresAt: user.expiresAt,
      }));
    }

    return updatedUser;
  }, [admins, dispatch, user]);

  const deleteAdmin = useCallback((adminId) => (
    dispatch(deleteManagedUser(adminId)).unwrap()
  ), [dispatch]);

  const addDoctor = useCallback((doctor) => (
    dispatch(createManagedUser({ ...doctor, userRole: 'staff', role: 'staff' })).unwrap()
  ), [dispatch]);

  const updateDoctor = useCallback(async (doctorId, updates) => {
    const current = doctors.find((doctor) => doctor.id === doctorId) || {};
    const updatedUser = await dispatch(updateManagedUser({
      userId: doctorId,
      updates: { ...current, ...updates, userRole: 'staff', role: 'staff' },
    })).unwrap();

    if (updatedUser?.id === user?.id) {
      dispatch(updateCurrentUser({
        ...updatedUser,
        token: user.token,
        expiresAt: user.expiresAt,
      }));
    }

    return updatedUser;
  }, [dispatch, doctors, user]);

  const deleteDoctor = useCallback((doctorId) => (
    dispatch(deleteManagedUser(doctorId)).unwrap()
  ), [dispatch]);

  const addCourse = useCallback((doctorId, course) => (
    dispatch(createDoctorCourse({ doctorId, course })).unwrap()
  ), [dispatch]);

  const deleteCourse = useCallback((doctorId, courseUid) => (
    dispatch(removeDoctorCourse({ doctorId, courseUid })).unwrap()
  ), [dispatch]);

  const addStudent = useCallback((student) => (
    dispatch(createManagedUser({
      ...student,
      password: student.password || student.studentId || student.universityId || '123456',
      userRole: 'student',
      role: 'student',
    })).unwrap()
  ), [dispatch]);

  const updateStudentRecord = useCallback(async (studentId, updates) => {
    const current = students.find((student) => student.id === studentId) || {};
    const updatedUser = await dispatch(updateManagedUser({
      userId: studentId,
      updates: { ...current, ...updates, userRole: 'student', role: 'student' },
    })).unwrap();

    if (updatedUser?.id === user?.id) {
      dispatch(updateCurrentUser({
        ...updatedUser,
        token: user.token,
        expiresAt: user.expiresAt,
      }));
    }

    return updatedUser;
  }, [dispatch, students, user]);

  const deleteStudent = useCallback((studentId) => (
    dispatch(deleteManagedUser(studentId)).unwrap()
  ), [dispatch]);

  const replaceStudents = useCallback(async (nextStudents) => {
    const createdStudents = [];

    for (const nextStudent of nextStudents) {
      createdStudents.push(await dispatch(createManagedUser({
        ...nextStudent,
        password: nextStudent.password || nextStudent.studentId || nextStudent.universityId || '123456',
        userRole: 'student',
        role: 'student',
      })).unwrap());
    }

    return createdStudents;
  }, [dispatch]);

  const doctorCourses = useMemo(() => (
    user?.userRole === 'staff' || user?.userRole === 'doctor'
      ? user?.courses || doctors.find((doctor) => doctor.id === user.id)?.courses || []
      : []
  ), [doctors, user]);

  const reportCourses = useMemo(() => (
    user?.userRole === 'staff' || user?.userRole === 'doctor'
      ? doctorCourses
      : doctors.flatMap((doctor) => doctor.courses || [])
  ), [doctorCourses, doctors, user]);

  const landingPath = user
    ? getDashboardHomePath(user, DASHBOARD_PAGE_ROUTES) || HOME_PATH_BY_ROLE[user.userRole] || '/'
    : '/';

  return {
    user,
    admins,
    doctors,
    students,
    doctorCourses,
    reportCourses,
    landingPath,
    authStatus: status,
    authBootstrapStatus: bootstrapStatus,
    usersStatus,
    studentsStatus,
    mutationStatus,
    authError: error,
    usersError,
    mutationError,
    loginMessage,
    signInWithCredentials,
    signOut,
    updateUser,
    addAdmin,
    updateAdmin,
    deleteAdmin,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    addCourse,
    deleteCourse,
    addStudent,
    updateStudentRecord,
    deleteStudent,
    replaceStudents,
    refreshUsers,
    ensureStudents,
  };
};
