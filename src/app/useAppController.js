import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { store, INITIAL_DOCTORS } from '../utils/auth';
import { SOCKET_URL, generateLectureId } from '../utils/constants';

const buildScanTime = (value) => value || new Date().toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const useAppController = () => {
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([...INITIAL_DOCTORS]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [lectureActive, setLectureActive] = useState(false);
  const [lectureId, setLectureId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  const [attendedStudents, setAttendedStudents] = useState([]);
  const [allSessions, setAllSessions] = useState({});

  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState(false);

  const socketRef = useRef(null);
  const scannedIdsRef = useRef(new Set());
  const lectureActiveRef = useRef(lectureActive);

  useEffect(() => {
    lectureActiveRef.current = lectureActive;
  }, [lectureActive]);

  useEffect(() => {
    store.doctors = doctors;
  }, [doctors]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = io(SOCKET_URL, {
      query: { clientType: 'dashboard' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketError(false);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketError(true);
      setSocketConnected(false);
    });

    socket.on('student_attended', (data) => {
      if (!lectureActiveRef.current) return;
      if (scannedIdsRef.current.has(data.universityId)) return;

      scannedIdsRef.current.add(data.universityId);
      setAttendedStudents((previous) => [
        ...previous,
        {
          id: data.universityId,
          name: data.name || 'Unknown Student',
          universityId: data.universityId || '—',
          scanTime: buildScanTime(data.time || data.scanTime),
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const handleStartLecture = useCallback(() => {
    const nextLectureId = generateLectureId();

    setLectureId(nextLectureId);
    setLectureActive(true);
    setAttendedStudents([]);
    scannedIdsRef.current = new Set();

    socketRef.current?.emit('lecture_started', {
      lectureId: nextLectureId,
      course: selectedCourse,
      section: selectedSection,
      week: selectedWeek,
      startedAt: Date.now(),
    });
  }, [selectedCourse, selectedSection, selectedWeek]);

  const handleEndLecture = useCallback(() => {
    setLectureActive(false);

    if (selectedCourse && selectedSection && selectedWeek) {
      const sessionKey = `${selectedCourse}__${selectedSection}__${selectedWeek}`;
      setAllSessions((previous) => ({ ...previous, [sessionKey]: attendedStudents }));
    }

    socketRef.current?.emit('lecture_ended', { lectureId, endedAt: Date.now() });
  }, [attendedStudents, lectureId, selectedCourse, selectedSection, selectedWeek]);

  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
    setSelectedSection('');
  }, []);

  const handleAddDoctor = useCallback((doctor) => {
    setDoctors((previous) => [...previous, doctor]);
  }, []);

  const handleDeleteDoctor = useCallback((doctorId) => {
    setDoctors((previous) => previous.filter((doctor) => doctor.id !== doctorId));
  }, []);

  const handleAddCourse = useCallback((doctorId, course) => {
    setDoctors((previous) => previous.map((doctor) => (
      doctor.id === doctorId
        ? { ...doctor, courses: [...doctor.courses, course] }
        : doctor
    )));
  }, []);

  const handleDeleteCourse = useCallback((doctorId, courseUid) => {
    setDoctors((previous) => previous.map((doctor) => (
      doctor.id === doctorId
        ? { ...doctor, courses: doctor.courses.filter((course) => course.uid !== courseUid) }
        : doctor
    )));
  }, []);

  const handleSignIn = useCallback((account) => {
    setUser(account);
  }, []);

  const handleSignOut = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;

    setUser(null);
    setLectureActive(false);
    setLectureId('');
    setSelectedCourse('');
    setSelectedSection('');
    setSelectedWeek('');
    setAttendedStudents([]);
    setSocketConnected(false);
    setSocketError(false);
  }, []);

  const doctorCourses = user?.userRole === 'doctor'
    ? (doctors.find((doctor) => doctor.id === user.id)?.courses || [])
    : [];

  return {
    user,
    doctors,
    sidebarOpen,
    lectureActive,
    lectureId,
    selectedCourse,
    selectedSection,
    selectedWeek,
    attendedStudents,
    allSessions,
    socketConnected,
    socketError,
    socketRef,
    doctorCourses,
    setSidebarOpen,
    setSelectedSection,
    setSelectedWeek,
    handleCourseChange,
    handleStartLecture,
    handleEndLecture,
    handleAddDoctor,
    handleDeleteDoctor,
    handleAddCourse,
    handleDeleteCourse,
    handleSignIn,
    handleSignOut,
  };
};
