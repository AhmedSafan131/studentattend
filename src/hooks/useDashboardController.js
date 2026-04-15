import { useCallback, useEffect, useRef, useState } from 'react';
import { generateLectureId } from '../utils/constants';

const buildScanTime = (value) => value || new Date().toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const useDashboardController = ({ user, socket }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lectureActive, setLectureActive] = useState(false);
  const [lectureId, setLectureId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [attendedStudents, setAttendedStudents] = useState([]);
  const [allSessions, setAllSessions] = useState({});

  const scannedIdsRef = useRef(new Set());
  const lectureActiveRef = useRef(lectureActive);

  useEffect(() => {
    lectureActiveRef.current = lectureActive;
  }, [lectureActive]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleStudentAttended = (data) => {
      if (!lectureActiveRef.current) return;
      if (scannedIdsRef.current.has(data.universityId)) return;

      scannedIdsRef.current.add(data.universityId);
      setAttendedStudents((previous) => [
        ...previous,
        {
          id: data.universityId,
          name: data.name || 'Unknown Student',
          universityId: data.universityId || '--',
          scanTime: buildScanTime(data.time || data.scanTime),
        },
      ]);
    };

    socket.on('student_attended', handleStudentAttended);

    return () => {
      socket.off('student_attended', handleStudentAttended);
    };
  }, [socket]);

  useEffect(() => {
    if (user) return;

    setSidebarOpen(false);
    setLectureActive(false);
    setLectureId('');
    setSelectedCourse('');
    setSelectedSection('');
    setSelectedWeek('');
    setAttendedStudents([]);
    scannedIdsRef.current = new Set();
  }, [user]);

  const handleCourseChange = useCallback((courseId) => {
    setSelectedCourse(courseId);
    setSelectedSection('');
  }, []);

  const startLecture = useCallback(() => {
    const nextLectureId = generateLectureId();

    setLectureId(nextLectureId);
    setLectureActive(true);
    setAttendedStudents([]);
    scannedIdsRef.current = new Set();

    socket?.emit('lecture_started', {
      lectureId: nextLectureId,
      course: selectedCourse,
      section: selectedSection,
      week: selectedWeek,
      startedAt: Date.now(),
    });
  }, [selectedCourse, selectedSection, selectedWeek, socket]);

  const endLecture = useCallback(() => {
    setLectureActive(false);

    if (selectedCourse && selectedSection && selectedWeek) {
      const sessionKey = `${selectedCourse}__${selectedSection}__${selectedWeek}`;
      setAllSessions((previous) => ({ ...previous, [sessionKey]: attendedStudents }));
    }

    socket?.emit('lecture_ended', { lectureId, endedAt: Date.now() });
  }, [attendedStudents, lectureId, selectedCourse, selectedSection, selectedWeek, socket]);

  return {
    sidebarOpen,
    lectureActive,
    lectureId,
    selectedCourse,
    selectedSection,
    selectedWeek,
    attendedStudents,
    allSessions,
    setSidebarOpen,
    setSelectedSection,
    setSelectedWeek,
    handleCourseChange,
    startLecture,
    endLecture,
  };
};
