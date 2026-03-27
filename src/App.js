import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import './responsive.css';

import SignIn          from './components/SignIn';
import Sidebar         from './components/Sidebar';
import Navbar          from './components/Navbar';
import LectureControl  from './components/LectureControl';
import QRSection       from './components/QRSection';
import AttendanceList  from './components/AttendanceList';
import StatsCards      from './components/StatsCards';
import AttendancePage  from './components/AttendancePage';
import StudentsPage    from './components/StudentsPage';
import CoursesPage     from './components/CoursesPage';
import AdminPage       from './components/AdminPage';

import { store, INITIAL_DOCTORS } from './auth';
import { LanguageProvider } from './i18n';

// ── Socket bridge URL ─────────────────────────────────────────────
const SOCKET_URL    = 'http://localhost:3001';
const TOTAL_REGISTERED = 48;

function generateLectureId() {
  return `LEC-${Date.now().toString(36).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────────────────────────────
function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const [user, setUser] = useState(null);    // { ...account, userRole: 'admin'|'doctor' }

  // ── Doctor registry (admin can mutate) ────────────────────────
  const [doctors, setDoctors] = useState([...INITIAL_DOCTORS]);

  // ── Navigation ────────────────────────────────────────────────
  const [activePage,   setActivePage]   = useState('dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);  // mobile

  // ── Lecture ───────────────────────────────────────────────────
  const [lectureActive,   setLectureActive]   = useState(false);
  const [lectureId,       setLectureId]       = useState('');
  const [selectedCourse,  setSelectedCourse]  = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek,    setSelectedWeek]    = useState('');

  // ── Attendance ────────────────────────────────────────────────
  const [attendedStudents, setAttendedStudents] = useState([]);
  const [allSessions,      setAllSessions]      = useState({});

  // ── Socket ────────────────────────────────────────────────────
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError,     setSocketError]     = useState(false);
  const socketRef     = useRef(null);
  const scannedIdsRef = useRef(new Set());

  const lectureActiveRef = useRef(lectureActive);
  useEffect(() => { lectureActiveRef.current = lectureActive; }, [lectureActive]);

  // Keep store.doctors in sync when admin mutates the list
  useEffect(() => { store.doctors = doctors; }, [doctors]);

  // ── Connect socket on login ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
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
      setSocketConnected(true); setSocketError(false);
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => { setSocketError(true); setSocketConnected(false); });

    socket.on('student_attended', (data) => {
      if (!lectureActiveRef.current) return;
      if (scannedIdsRef.current.has(data.universityId)) return;
      scannedIdsRef.current.add(data.universityId);
      setAttendedStudents(prev => [...prev, {
        id:           data.universityId,
        name:         data.name         || 'Unknown Student',
        universityId: data.universityId || '—',
        scanTime:     data.time || data.scanTime || new Date().toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      }]);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Lecture handlers ──────────────────────────────────────────
  const handleStartLecture = useCallback(() => {
    const id = generateLectureId();
    setLectureId(id);
    setLectureActive(true);
    setAttendedStudents([]);
    scannedIdsRef.current = new Set();
    socketRef.current?.emit('lecture_started', {
      lectureId: id, course: selectedCourse,
      section: selectedSection, week: selectedWeek, startedAt: Date.now(),
    });
  }, [selectedCourse, selectedSection, selectedWeek]);

  const handleEndLecture = useCallback(() => {
    setLectureActive(false);
    if (selectedCourse && selectedSection && selectedWeek) {
      const key = `${selectedCourse}__${selectedSection}__${selectedWeek}`;
      setAllSessions(prev => ({ ...prev, [key]: attendedStudents }));
    }
    socketRef.current?.emit('lecture_ended', { lectureId, endedAt: Date.now() });
  }, [lectureId, selectedCourse, selectedSection, selectedWeek, attendedStudents]);

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedSection('');
  };

  // ── Admin handlers ────────────────────────────────────────────
  const handleAddDoctor = (doc) => setDoctors(prev => [...prev, doc]);

  const handleDeleteDoctor = (docId) => setDoctors(prev => prev.filter(d => d.id !== docId));

  const handleAddCourse = (docId, course) => {
    setDoctors(prev => prev.map(d =>
      d.id === docId ? { ...d, courses: [...d.courses, course] } : d
    ));
  };

  const handleDeleteCourse = (docId, courseUid) => {
    setDoctors(prev => prev.map(d =>
      d.id === docId ? { ...d, courses: d.courses.filter(c => c.uid !== courseUid) } : d
    ));
  };

  // ── Sign in / out ─────────────────────────────────────────────
  const handleSignIn  = (account) => {
    setUser(account);
    setActivePage(account.userRole === 'admin' ? 'admin' : 'dashboard');
  };

  const handleSignOut = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setUser(null);
    setLectureActive(false);
    setLectureId('');
    setSelectedCourse(''); setSelectedSection(''); setSelectedWeek('');
    setAttendedStudents([]);
    setSocketConnected(false); setSocketError(false);
    setActivePage('dashboard');
  };

  // ── Get courses for current doctor (for LectureControl) ───────
  const doctorCourses = user?.userRole === 'doctor'
    ? (doctors.find(d => d.id === user.id)?.courses || [])
    : [];

  // ─────────────────────────────────────────────────────────────
  // Not signed in
  // ─────────────────────────────────────────────────────────────
  if (!user) return <SignIn onSignIn={handleSignIn} />;

  // ─────────────────────────────────────────────────────────────
  // App Shell
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        activePage={activePage}
        onPageChange={(p) => { setActivePage(p); setSidebarOpen(false); }}
        doctorName={user.name}
        userRole={user.userRole}
        onSignOut={handleSignOut}
        className={sidebarOpen ? 'open' : ''}
      />

      <div className="main-layout">
        <Navbar
          doctorName={user.name}
          lectureActive={lectureActive}
          socketConnected={socketConnected}
          socketError={socketError}
          userRole={user.userRole}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          sidebarOpen={sidebarOpen}
        />

        <main className="content-area">

          {/* ── Admin Panel ──────────────────────────────── */}
          {activePage === 'admin' && user.userRole === 'admin' && (
            <AdminPage
              doctors={doctors}
              onAddDoctor={handleAddDoctor}
              onDeleteDoctor={handleDeleteDoctor}
              onAddCourse={handleAddCourse}
              onDeleteCourse={handleDeleteCourse}
            />
          )}

          {/* ── Attendance Records ───────────────────────── */}
          {activePage === 'attendance' && (
            <AttendancePage allSessions={allSessions} />
          )}

          {/* ── Students Roster (admin only) ─────────────── */}
          {activePage === 'students' && user.userRole === 'admin' && (
            <StudentsPage />
          )}

          {/* ── Courses (admin only) ─────────────────────── */}
          {activePage === 'courses' && user.userRole === 'admin' && (
            <CoursesPage />
          )}

          {/* ── Dashboard ────────────────────────────────── */}
          {activePage === 'dashboard' && (
            <>
              <div className="top-row">
                <LectureControl
                  lectureActive={lectureActive}
                  selectedCourse={selectedCourse}
                  selectedSection={selectedSection}
                  selectedWeek={selectedWeek}
                  onCourseChange={handleCourseChange}
                  onSectionChange={setSelectedSection}
                  onWeekChange={setSelectedWeek}
                  onStartLecture={handleStartLecture}
                  onEndLecture={handleEndLecture}
                  doctorCourses={doctorCourses}
                  userRole={user.userRole}
                />
                <QRSection lectureId={lectureId} lectureActive={lectureActive} />
              </div>
              <div className="bottom-row">
                <AttendanceList students={attendedStudents} lectureActive={lectureActive} />
                <StatsCards
                  attendedCount={attendedStudents.length}
                  totalRegistered={TOTAL_REGISTERED}
                  lectureActive={lectureActive}
                />
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}

export default function AppWithI18n() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
