import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { generateLectureId } from '../utils/constants';
import { attendanceAPI, lectureSessionsAPI } from '../utils/api';
import { APIS } from '../utils/Axios';
import { getCurrentAcademicWeek } from '../utils/academicWeek';
import { createBackgroundPoller } from '../utils/backgroundPoller';
import { needsLectureSessionsForRoute } from '../utils/dashboardDataPolicy';

const formatTimeValue = (value) => new Date(value).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const buildScanTime = (value, timestamp, scannedAt) => {
  if (Number.isFinite(timestamp)) {
    return formatTimeValue(timestamp);
  }

  if (typeof timestamp === 'string' && timestamp.trim()) {
    const parsedTimestamp = Date.parse(timestamp);
    if (!Number.isNaN(parsedTimestamp)) {
      return formatTimeValue(parsedTimestamp);
    }
  }

  if (scannedAt) {
    const parsedScannedAt = Date.parse(scannedAt);
    if (!Number.isNaN(parsedScannedAt)) {
      return formatTimeValue(parsedScannedAt);
    }
  }

  return value || formatTimeValue(Date.now());
};

const mergeLectureSessions = (sessions, nextSession) => {
  if (!nextSession?.id) return sessions;
  return [nextSession, ...sessions.filter((session) => session.id !== nextSession.id)]
    .sort((left, right) => (Date.parse(right.startedAt || '') || 0) - (Date.parse(left.startedAt || '') || 0));
};

const dashboardStudentFromRecord = (record) => ({
  id: String(record?.studentUniversityId || record?.studentId || record?.id || ''),
  attendanceRecordId: record?.attendanceRecordId || record?.id,
  name: record?.studentName || 'Unknown Student',
  universityId: String(record?.studentUniversityId || record?.studentId || '-'),
  scanTime: buildScanTime(record?.time, undefined, record?.scannedAt),
});

export const useDashboardController = ({ user, socket, pathname = '' }) => {
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lectureActive, setLectureActive] = useState(false);
  const [lectureId, setLectureId] = useState('');
  const [lectureQrPayload, setLectureQrPayload] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [allowAllGroups, setAllowAllGroups] = useState(false);
  const [qrWindowSeconds, setQrWindowSeconds] = useState(10);
  const [attendedStudents, setAttendedStudents] = useState([]);
  const [allSessions, setAllSessions] = useState({});
  const [lectureSessions, setLectureSessions] = useState([]);
  const [selectedDashboardSessionId, setSelectedDashboardSessionId] = useState('');
  const [lectureError, setLectureError] = useState('');
  const [isStartingLecture, setIsStartingLecture] = useState(false);
  const [isEndingLecture, setIsEndingLecture] = useState(false);

  const scannedIdsRef = useRef(new Set());
  const lectureActiveRef = useRef(lectureActive);
  const lectureIdRef = useRef(lectureId);
  const autoSelectedWeekRef = useRef('');
  const previousWeekContextRef = useRef('');
  const previousPathnameRef = useRef(pathname);
  const needsLectureSessionHistory = needsLectureSessionsForRoute({
    pathname,
    userRole: user?.userRole,
  });

  useEffect(() => {
    lectureActiveRef.current = lectureActive;
  }, [lectureActive]);

  useEffect(() => {
    lectureIdRef.current = lectureId;
  }, [lectureId]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleStudentAttended = (data) => {
      if (!lectureActiveRef.current) return;
      const incomingLectureId = String(data?.lectureId || '').trim();
      const activeLectureId = String(lectureIdRef.current || '').trim();
      const universityId = String(data?.universityId || '').trim();
      if (!incomingLectureId || incomingLectureId !== activeLectureId || !universityId) return;
      if (scannedIdsRef.current.has(universityId)) return;

      scannedIdsRef.current.add(universityId);
      setAttendedStudents((previous) => [
        ...previous,
        {
          id: universityId,
          attendanceRecordId: data.attendanceRecordId || null,
          name: data.name || 'Unknown Student',
          universityId,
          scanTime: buildScanTime(data.time || data.scanTime, data.timestamp, data.scannedAt),
        },
      ]);
      setLectureSessions((previous) => previous.map((session) => (
        session.id === activeLectureId
          ? {
              ...session,
              recordCount: Number(session.recordCount || 0) + 1,
              records: [...(session.records || []), {
                id: data.attendanceRecordId || `live-${universityId}`,
                attendanceRecordId: data.attendanceRecordId || null,
                studentName: data.name || 'Unknown Student',
                studentUniversityId: universityId,
                scannedAt: data.scannedAt || (data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()),
              }],
            }
          : session
      )));
    };

    socket.on('student_attended', handleStudentAttended);

    return () => {
      socket.off('student_attended', handleStudentAttended);
    };
  }, [socket]);

  const syncActiveLectureAttendance = useCallback(async (sessionId) => {
    const response = await lectureSessionsAPI.get(sessionId);
    const session = response?.data?.session;
    if (!session?.id) return;

    setLectureSessions((previous) => mergeLectureSessions(previous, session));

    if (lectureActiveRef.current && String(lectureIdRef.current) === String(session.id)) {
      const students = (session.records || []).map(dashboardStudentFromRecord);
      scannedIdsRef.current = new Set(students.map((student) => student.universityId));
      setAttendedStudents(students);
    }
  }, []);

  useEffect(() => {
    if (!lectureActive || !lectureId) return undefined;

    const poller = createBackgroundPoller(() => syncActiveLectureAttendance(lectureId));
    socket?.on('connect', poller.trigger);

    return () => {
      poller.stop();
      socket?.off('connect', poller.trigger);
    };
  }, [lectureActive, lectureId, socket, syncActiveLectureAttendance]);

  useEffect(() => {
    if (user) return;

    setSidebarOpen(false);
    lectureActiveRef.current = false;
    lectureIdRef.current = '';
    setLectureActive(false);
    setLectureId('');
    setLectureQrPayload(null);
    setSelectedCourse('');
    setSelectedLectureType('');
    setSelectedSection('');
    setSelectedWeek('');
    setAllowAllGroups(false);
    setAttendedStudents([]);
    setLectureSessions([]);
    setSelectedDashboardSessionId('');
    setLectureError('');
    setIsStartingLecture(false);
    setIsEndingLecture(false);
    scannedIdsRef.current = new Set();
    autoSelectedWeekRef.current = '';
    previousWeekContextRef.current = '';
  }, [user]);

  useEffect(() => {
    if (!user?.token || user.userRole === 'student') {
      setLectureSessions([]);
      return undefined;
    }
    if (!needsLectureSessionHistory) return undefined;

    let isMounted = true;
    lectureSessionsAPI.getAll()
      .then((response) => {
        if (isMounted) {
          const sessions = Array.isArray(response?.data?.sessions) ? response.data.sessions : [];
          setLectureSessions(sessions);
          setSelectedDashboardSessionId((current) => sessions.some((session) => session.id === current) ? current : '');
        }
      })
      .catch((error) => console.error('Could not load lecture sessions', error));

    return () => { isMounted = false; };
  }, [needsLectureSessionHistory, selectedTermCode, user?.token, user?.userRole]);

  useEffect(() => {
    if (!needsLectureSessionHistory || !selectedDashboardSessionId || !user?.token || user.userRole === 'student') return undefined;
    if (lectureActive && selectedDashboardSessionId === lectureId) return undefined;
    let cancelled = false;
    lectureSessionsAPI.get(selectedDashboardSessionId).then((response) => {
      if (!cancelled && response?.data?.session) {
        setLectureSessions((previous) => mergeLectureSessions(previous, response.data.session));
      }
    }).catch((error) => {
      if (!cancelled) setLectureError(error?.response?.data?.message || error.message);
    });
    return () => { cancelled = true; };
  }, [needsLectureSessionHistory, selectedDashboardSessionId, selectedTermCode, user?.token, user?.userRole, lectureActive, lectureId]);

  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
    setSelectedLectureType('');
    setSelectedSection('');
    setLectureError('');
  }, []);

  const handleLectureTypeChange = useCallback((lectureType) => {
    setSelectedLectureType(lectureType);
    setSelectedSection('');
    setLectureError('');
  }, []);

  const handleSectionChange = useCallback((section) => {
    setSelectedSection(section);
    setLectureError('');
  }, []);

  const handleWeekChange = useCallback((week) => {
    setSelectedWeek(week);
    autoSelectedWeekRef.current = week === autoSelectedWeekRef.current ? week : '';
    setLectureError('');
  }, []);

  const weekSelectionContext = `${selectedCourse}__${selectedLectureType}__${selectedSection}`;
  const currentAcademicWeek = getCurrentAcademicWeek(new Date(), attendanceTerm);

  useEffect(() => {
    if (lectureActive) {
      return;
    }

    if (!selectedCourse || !selectedLectureType || !selectedSection) {
      previousWeekContextRef.current = '';
      autoSelectedWeekRef.current = '';
      setSelectedWeek((currentWeek) => (currentWeek ? '' : currentWeek));
      return;
    }

    const contextChanged = previousWeekContextRef.current !== weekSelectionContext;
    previousWeekContextRef.current = weekSelectionContext;

    setSelectedWeek((currentWeek) => {
      if (contextChanged || !currentWeek || currentWeek === autoSelectedWeekRef.current) {
        const currentWeek = String(currentAcademicWeek);
        autoSelectedWeekRef.current = currentWeek;
        return currentWeek;
      }

      return currentWeek;
    });
  }, [currentAcademicWeek, lectureActive, selectedCourse, selectedLectureType, selectedSection, weekSelectionContext]);

  const startLecture = useCallback(async () => {
    if (isStartingLecture || isEndingLecture || lectureActiveRef.current) {
      return;
    }

    if (!selectedCourse || !selectedLectureType || !selectedSection || !selectedWeek) {
      setLectureError('Select course, type, group, and week before starting attendance.');
      return;
    }

    let nextLectureId = generateLectureId();
    let nextQrPayload = null;
    let nextSession = null;
    setLectureError('');
    setIsStartingLecture(true);

    try {
      const response = await lectureSessionsAPI.start({
        courseCode: selectedCourse,
        lectureType: selectedLectureType,
        group: selectedSection,
        week: selectedWeek,
        allowAllGroups,
        qrWindowSeconds,
      });

      nextLectureId = response?.data?.session?.id || nextLectureId;
      nextQrPayload = response?.data?.qrPayload || null;
      nextSession = response?.data?.session || null;
    } catch (error) {
      console.error('Could not start lecture session', error);
      setLectureError(error?.response?.data?.message || error.message || 'Could not start attendance session.');
      return;
    } finally {
      setIsStartingLecture(false);
    }

    setLectureId(nextLectureId);
    setSelectedDashboardSessionId(nextLectureId);
    lectureIdRef.current = nextLectureId;
    setLectureQrPayload(nextQrPayload);
    lectureActiveRef.current = true;
    setLectureActive(true);
    const resumedStudents = (nextSession?.records || []).map(dashboardStudentFromRecord);
    setAttendedStudents(resumedStudents);
    scannedIdsRef.current = new Set(resumedStudents.map((student) => student.universityId));
    setLectureSessions((previous) => mergeLectureSessions(previous, {
      ...(nextSession || {}),
      id: nextLectureId,
      recordCount: nextSession?.recordCount || resumedStudents.length,
      records: nextSession?.records || [],
    }));

    socket?.emit('lecture_started', {
      lectureId: nextLectureId,
      course: selectedCourse,
      lectureType: selectedLectureType,
      section: selectedSection,
      week: selectedWeek,
      allowAllGroups,
      startedAt: Date.now(),
    });
    return nextLectureId;
  }, [allowAllGroups, isEndingLecture, isStartingLecture, qrWindowSeconds, selectedCourse, selectedLectureType, selectedSection, selectedWeek, socket]);

  const endLecture = useCallback(async () => {
    if (isEndingLecture || isStartingLecture || !lectureActiveRef.current) {
      return;
    }

    const endedLectureId = lectureId;
    setIsEndingLecture(true);
    setLectureError('');

    if (endedLectureId) {
      try {
        const response = await lectureSessionsAPI.end(endedLectureId);
        if (response?.data?.session) {
          setLectureSessions((previous) => mergeLectureSessions(previous, {
            ...response.data.session,
            recordCount: attendedStudents.length,
          }));
        }
      } catch (error) {
        console.error('Could not end lecture session', error);
        setLectureError(error?.response?.data?.message || error.message || 'Could not end attendance session.');
        setIsEndingLecture(false);
        return;
      }
    }

    lectureActiveRef.current = false;
    setLectureActive(false);
    setLectureQrPayload(null);
    setAllowAllGroups(false);

    if (selectedCourse && selectedLectureType && selectedSection && selectedWeek) {
      const sessionKey = `${selectedCourse}__${selectedLectureType}__${selectedSection}__${selectedWeek}`;
      setAllSessions((previous) => ({ ...previous, [sessionKey]: attendedStudents }));
    }

    socket?.emit('lecture_ended', { lectureId, endedAt: Date.now() });
    setIsEndingLecture(false);
  }, [attendedStudents, isEndingLecture, isStartingLecture, lectureId, selectedCourse, selectedLectureType, selectedSection, selectedWeek, socket]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (previousPathname === '/dashboard' && pathname !== '/dashboard' && lectureActiveRef.current) {
      endLecture();
    }
  }, [endLecture, pathname]);

  useEffect(() => {
    const endActiveLectureBeforeUnload = () => {
      const activeLectureId = lectureIdRef.current;
      if (!lectureActiveRef.current || !activeLectureId || !user?.token) return;

      fetch(APIS.lectureSessionEnd(activeLectureId), {
        method: 'POST',
        keepalive: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      }).catch(() => {});
    };

    window.addEventListener('pagehide', endActiveLectureBeforeUnload);
    window.addEventListener('beforeunload', endActiveLectureBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', endActiveLectureBeforeUnload);
      window.removeEventListener('beforeunload', endActiveLectureBeforeUnload);
    };
  }, [user?.token]);

  const recordStudent = useCallback(async (studentId) => {
    const targetSession = lectureSessions.find((session) => session.id === selectedDashboardSessionId);
    if (!targetSession) {
      throw new Error('Select an attendance session before recording a student.');
    }

    const response = await attendanceAPI.createManual({
      studentId,
      lectureSessionId: targetSession.id,
      courseCode: targetSession.courseCode,
      lectureType: targetSession.lectureType,
      group: targetSession.group,
      week: targetSession.week,
    });
    const attendance = response?.data?.attendance || {};
    const attendanceSessionId = String(attendance.sessionId || '').trim();
    if (attendanceSessionId && attendanceSessionId !== String(targetSession.id)) {
      return response?.data;
    }
    const universityId = String(attendance.studentUniversityId || attendance.studentId || studentId).trim();
    if (targetSession.id === lectureIdRef.current && universityId && !scannedIdsRef.current.has(universityId)) {
      scannedIdsRef.current.add(universityId);
      setAttendedStudents((previous) => [...previous, {
        id: universityId,
        attendanceRecordId: attendance.attendanceRecordId || attendance.id,
        name: attendance.studentName || 'Unknown Student',
        universityId,
        scanTime: buildScanTime(attendance.time, undefined, attendance.scannedAt),
      }]);
    }
    setLectureSessions((previous) => previous.map((session) => {
      if (session.id !== targetSession.id) return session;
      const alreadyRecorded = (session.records || []).some((record) => String(record.studentUniversityId || record.studentId) === universityId);
      const records = alreadyRecorded ? (session.records || []) : [...(session.records || []), attendance];
      return { ...session, records, recordCount: records.length };
    }));
    return response?.data;
  }, [lectureSessions, selectedDashboardSessionId]);

  const refreshDashboardSession = useCallback(async () => {
    if (!selectedDashboardSessionId) return;
    const response = await lectureSessionsAPI.get(selectedDashboardSessionId);
    const session = response?.data?.session;
    if (!session) return;
    setLectureSessions((previous) => mergeLectureSessions(previous, session));
    if (session.id === lectureIdRef.current) {
      const students = (session.records || []).map(dashboardStudentFromRecord);
      scannedIdsRef.current = new Set(students.map((student) => student.universityId));
      setAttendedStudents(students);
    }
  }, [selectedDashboardSessionId]);

  const deleteAttendanceStudent = useCallback(async (student) => {
    const recordId = student?.attendanceRecordId;
    if (!recordId) throw new Error('This attendance record is still syncing. Refresh and try again.');
    await attendanceAPI.delete(recordId);
    const universityId = String(student.universityId || student.id || '');
    scannedIdsRef.current.delete(universityId);
    setAttendedStudents((previous) => previous.filter((item) => item.attendanceRecordId !== recordId));
    setLectureSessions((previous) => previous.map((session) => {
      const records = (session.records || []).filter((record) => (record.attendanceRecordId || record.id) !== recordId);
      return records.length === (session.records || []).length
        ? session
        : { ...session, records, recordCount: records.length };
    }));
  }, []);

  const deleteLectureSession = useCallback(async (sessionId) => {
    if (sessionId === lectureIdRef.current && lectureActiveRef.current) {
      throw new Error('End the active attendance session before deleting it.');
    }
    await lectureSessionsAPI.delete(sessionId);
    setLectureSessions((previous) => {
      const remaining = previous.filter((session) => session.id !== sessionId);
      setSelectedDashboardSessionId((current) => current === sessionId ? '' : current);
      return remaining;
    });
  }, []);

  const closeAllLectureSessions = useCallback(async () => {
    const response = await lectureSessionsAPI.closeAll();
    const endedAt = new Date().toISOString();
    setLectureSessions((previous) => previous.map((session) => (
      session.status === 'active' ? { ...session, status: 'ended', endedAt } : session
    )));
    if (lectureActiveRef.current) {
      lectureActiveRef.current = false;
      setLectureActive(false);
      setLectureQrPayload(null);
      socket?.emit('lecture_ended', { lectureId: lectureIdRef.current, endedAt: Date.now() });
    }
    return response?.data;
  }, [socket]);

  const selectedDashboardSession = lectureSessions.find((session) => session.id === selectedDashboardSessionId) || null;
  const matchingLectureSession = lectureSessions.find((session) => (
    String(session.courseCode || '').toUpperCase() === String(selectedCourse || '').toUpperCase()
    && String(session.lectureType || '').toUpperCase() === String(selectedLectureType || '').toUpperCase()
    && String(session.group || '').toUpperCase() === String(selectedSection || '').toUpperCase()
    && String(session.week || '').replace(/\D/g, '') === String(selectedWeek || '').replace(/\D/g, '')
  )) || null;
  const displayedAttendanceStudents = !selectedDashboardSessionId ? [] : selectedDashboardSessionId === lectureId
    ? attendedStudents
    : (selectedDashboardSession?.records || []).map(dashboardStudentFromRecord);

  return {
    sidebarOpen,
    lectureActive,
    lectureId,
    lectureQrPayload,
    lectureError,
    isStartingLecture,
    isEndingLecture,
    selectedCourse,
    selectedLectureType,
    selectedSection,
    selectedWeek,
    allowAllGroups,
    qrWindowSeconds,
    attendedStudents,
    allSessions,
    lectureSessions,
    selectedDashboardSessionId,
    selectedDashboardSession,
    matchingLectureSession,
    displayedAttendanceStudents,
    setSidebarOpen,
    setSelectedLectureType: handleLectureTypeChange,
    setSelectedSection: handleSectionChange,
    setSelectedWeek: handleWeekChange,
    setAllowAllGroups,
    setQrWindowSeconds,
    handleCourseChange,
    startLecture,
    endLecture,
    recordStudent,
    refreshDashboardSession,
    deleteAttendanceStudent,
    deleteLectureSession,
    closeAllLectureSessions,
    setSelectedDashboardSessionId,
  };
};
