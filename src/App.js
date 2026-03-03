import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

import SignIn          from './components/SignIn';
import Sidebar         from './components/Sidebar';
import Navbar          from './components/Navbar';
import LectureControl  from './components/LectureControl';
import QRSection       from './components/QRSection';
import AttendanceList  from './components/AttendanceList';
import StatsCards      from './components/StatsCards';

// ── Socket bridge URL ─────────────────────────────────────────────
// The Node.js server.js runs on port 3001.
// From browser, always connect to localhost:3001 (same machine as PC).
const SOCKET_URL = 'http://localhost:3001';

// Total enrolled students in the course (for absent count / stats)
const TOTAL_REGISTERED = 48;

function generateLectureId() {
  return `LEC-${Date.now().toString(36).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────────────────────────────
function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const [doctor,          setDoctor]          = useState(null);

  // ── Navigation ────────────────────────────────────────────────
  const [activePage,      setActivePage]      = useState('dashboard');

  // ── Lecture ───────────────────────────────────────────────────
  const [lectureActive,   setLectureActive]   = useState(false);
  const [lectureId,       setLectureId]       = useState('');
  const [selectedCourse,  setSelectedCourse]  = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // ── Attendance ────────────────────────────────────────────────
  const [attendedStudents, setAttendedStudents] = useState([]);

  // ── Socket ────────────────────────────────────────────────────
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError,     setSocketError]     = useState(false);
  const socketRef      = useRef(null);
  const scannedIdsRef  = useRef(new Set());

  // CRITICAL FIX: keep a ref to lectureActive so the socket callback
  // always reads the *current* value instead of the stale closure value.
  const lectureActiveRef = useRef(lectureActive);
  useEffect(() => {
    lectureActiveRef.current = lectureActive;
  }, [lectureActive]);

  // ── Connect socket when doctor logs in ────────────────────────
  useEffect(() => {
    if (!doctor) return;

    const socket = io(SOCKET_URL, {
      query:              { clientType: 'dashboard' },
      transports:         ['websocket', 'polling'],
      reconnection:       true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:  2000,
      timeout:            10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] ✅ Connected:', socket.id);
      setSocketConnected(true);
      setSocketError(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] ⚠️ Error:', err.message);
      setSocketError(true);
      setSocketConnected(false);
    });

    // ── student_attended: emitted by Flutter after a valid scan ──
    socket.on('student_attended', (data) => {
      console.log('[Socket] 🎓 student_attended:', data);

      // Use the REF (not state) — avoids stale closure bug
      if (!lectureActiveRef.current) {
        console.warn('[Socket] ⚠️ Ignored — no active lecture');
        return;
      }

      // Prevent duplicate entries for the same student
      if (scannedIdsRef.current.has(data.universityId)) {
        console.warn('[Socket] ⚠️ Duplicate scan ignored:', data.universityId);
        return;
      }

      scannedIdsRef.current.add(data.universityId);

      setAttendedStudents(prev => [
        ...prev,
        {
          id:           data.universityId,
          name:         data.name         || 'Unknown Student',
          universityId: data.universityId || '—',
          scanTime:     data.time || data.scanTime || new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          }),
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Only re-run when doctor changes (login / logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor]);

  // ── Start lecture ─────────────────────────────────────────────
  const handleStartLecture = useCallback(() => {
    const id = generateLectureId();
    setLectureId(id);
    setLectureActive(true);
    setAttendedStudents([]);
    scannedIdsRef.current = new Set();

    socketRef.current?.emit('lecture_started', {
      lectureId: id,
      course:    selectedCourse,
      section:   selectedSection,
      startedAt: Date.now(),
    });
  }, [selectedCourse, selectedSection]);

  // ── End lecture ───────────────────────────────────────────────
  const handleEndLecture = useCallback(() => {
    setLectureActive(false);

    socketRef.current?.emit('lecture_ended', {
      lectureId:  lectureId,
      endedAt:    Date.now(),
    });
  }, [lectureId]);

  // ── Course change resets section ──────────────────────────────
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedSection('');
  };

  // ── Sign in / out ─────────────────────────────────────────────
  const handleSignIn  = (account) => setDoctor(account);
  const handleSignOut = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setDoctor(null);
    setLectureActive(false);
    setLectureId('');
    setSelectedCourse('');
    setSelectedSection('');
    setAttendedStudents([]);
    setSocketConnected(false);
    setSocketError(false);
    setActivePage('dashboard');
  };

  // ─────────────────────────────────────────────────────────────
  // Not signed in → Sign In page
  // ─────────────────────────────────────────────────────────────
  if (!doctor) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  // ─────────────────────────────────────────────────────────────
  // Dashboard
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        doctorName={doctor.name}
        onSignOut={handleSignOut}
      />

      <div className="main-layout">
        <Navbar
          doctorName={doctor.name}
          lectureActive={lectureActive}
          socketConnected={socketConnected}
          socketError={socketError}
        />

        <main className="content-area">
          {/* Row 1: Lecture Control + QR */}
          <div className="top-row">
            <LectureControl
              lectureActive={lectureActive}
              selectedCourse={selectedCourse}
              selectedSection={selectedSection}
              onCourseChange={handleCourseChange}
              onSectionChange={setSelectedSection}
              onStartLecture={handleStartLecture}
              onEndLecture={handleEndLecture}
            />
            <QRSection
              lectureId={lectureId}
              lectureActive={lectureActive}
            />
          </div>

          {/* Row 2: Attendance + Stats */}
          <div className="bottom-row">
            <AttendanceList
              students={attendedStudents}
              lectureActive={lectureActive}
            />
            <StatsCards
              attendedCount={attendedStudents.length}
              totalRegistered={TOTAL_REGISTERED}
              lectureActive={lectureActive}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
