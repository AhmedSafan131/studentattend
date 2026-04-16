import { useCallback, useEffect, useMemo, useState } from 'react';
import { store, INITIAL_DOCTORS } from '../utils/auth';

const AUTH_STORAGE_KEY = 'studentattend.auth.user';
const DOCTORS_STORAGE_KEY = 'studentattend.auth.doctors';

const HOME_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  doctor: '/dashboard',
  student: '/student',
};

const readStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

export const useAuthController = () => {
  const [user, setUser] = useState(() => readStorage(AUTH_STORAGE_KEY, null));
  const [doctors, setDoctors] = useState(() => readStorage(DOCTORS_STORAGE_KEY, [...INITIAL_DOCTORS]));

  useEffect(() => {
    store.doctors = doctors;
  }, [doctors]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (user) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      // Ignore storage failures and keep the in-memory session working.
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors));
    } catch (error) {
      // Ignore storage failures and keep the in-memory state working.
    }
  }, [doctors]);

  const signIn = useCallback((account) => {
    setUser(account);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((currentUser) => (
      currentUser ? { ...currentUser, ...updates } : currentUser
    ));
  }, []);

  const addDoctor = useCallback((doctor) => {
    setDoctors((previous) => [...previous, doctor]);
  }, []);

  const deleteDoctor = useCallback((doctorId) => {
    setDoctors((previous) => previous.filter((doctor) => doctor.id !== doctorId));
  }, []);

  const addCourse = useCallback((doctorId, course) => {
    setDoctors((previous) => previous.map((doctor) => (
      doctor.id === doctorId
        ? { ...doctor, courses: [...doctor.courses, course] }
        : doctor
    )));
  }, []);

  const deleteCourse = useCallback((doctorId, courseUid) => {
    setDoctors((previous) => previous.map((doctor) => (
      doctor.id === doctorId
        ? { ...doctor, courses: doctor.courses.filter((course) => course.uid !== courseUid) }
        : doctor
    )));
  }, []);

  const doctorCourses = useMemo(() => (
    user?.userRole === 'doctor'
      ? doctors.find((doctor) => doctor.id === user.id)?.courses || []
      : []
  ), [doctors, user]);

  const reportCourses = useMemo(() => (
    user?.userRole === 'doctor'
      ? doctorCourses
      : doctors.flatMap((doctor) => doctor.courses)
  ), [doctorCourses, doctors, user]);

  const landingPath = user ? HOME_PATH_BY_ROLE[user.userRole] || '/' : '/';

  return {
    user,
    doctors,
    doctorCourses,
    reportCourses,
    landingPath,
    signIn,
    signOut,
    updateUser,
    addDoctor,
    deleteDoctor,
    addCourse,
    deleteCourse,
  };
};
