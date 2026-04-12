import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import './responsive.css';

// ── Layout ────────────────────────────────────────────────────────
import DashboardLayout  from './Dashboard/layout/DashboardLayout';

// ── Screens ───────────────────────────────────────────────────────
import SignIn           from './screens/SignIn/ProfessionalSignIn';

// ── Dashboard pages (Doctor's live dashboard) ────────────────────
import DoctorDashboard  from './Dashboard/pages/DoctorDashboard';
import StudentApp       from './StudentApp';
// ── Dashboard Pages ───────────────────────────────────────────────
import AttendancePage   from './Dashboard/pages/AttendancePage';
import StudentsPage     from './Dashboard/pages/StudentsPage';
import CoursesPage      from './Dashboard/pages/CoursesPage';
import AdminPanel       from './Dashboard/pages/AdminPanel';
import ReportsPage      from './Dashboard/pages/ReportsPage';
import QRControl        from './Dashboard/pages/QRControl';
import Settings         from './Dashboard/pages/Settings';
import AppHelmet        from './components/AppHelmet';

// ── Utils ─────────────────────────────────────────────────────────
import { store, INITIAL_DOCTORS }       from './utils/auth';
import { SOCKET_URL, TOTAL_REGISTERED, generateLectureId } from './utils/constants';
import { LanguageProvider, useLanguage } from './i18n';

// ─────────────────────────────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────────────────────────────
function App() {
  useLanguage();

  // ── Auth ──────────────────────────────────────────────────────
  const [user, setUser] = useState(null);

  // ── Doctor registry (admin can mutate) ────────────────────────
  const [doctors, setDoctors] = useState([...INITIAL_DOCTORS]);

  // ── Navigation ────────────────────────────────────────────────
  const [activePage,  setActivePage]  = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    socket.on('connect',       () => { setSocketConnected(true); setSocketError(false); });
    socket.on('disconnect',    () => setSocketConnected(false));
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
  const handleAddDoctor    = (doc)           => setDoctors(prev => [...prev, doc]);
  const handleDeleteDoctor = (docId)         => setDoctors(prev => prev.filter(d => d.id !== docId));
  const handleAddCourse    = (docId, course) => setDoctors(prev => prev.map(d =>
    d.id === docId ? { ...d, courses: [...d.courses, course] } : d
  ));
  const handleDeleteCourse = (docId, uid)    => setDoctors(prev => prev.map(d =>
    d.id === docId ? { ...d, courses: d.courses.filter(c => c.uid !== uid) } : d
  ));

  // ── Sign in / out ─────────────────────────────────────────────
  const handleSignIn = (account) => {
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

  // ── Doctor's assigned courses ─────────────────────────────────
  const doctorCourses = user?.userRole === 'doctor'
    ? (doctors.find(d => d.id === user.id)?.courses || [])
    : [];

  const dashboardMeta = {
    dashboard: {
      titleEn: 'Doctor Dashboard',
      titleAr: 'لوحة تحكم الدكتور',
      descriptionEn: 'Manage live lectures, QR attendance, and scanned students.',
      descriptionAr: 'إدارة المحاضرات المباشرة ورمز الحضور وقائمة الطلاب الذين تم تسجيلهم.',
    },
    admin: {
      titleEn: 'Admin Panel',
      titleAr: 'لوحة المدير',
      descriptionEn: 'Manage doctor accounts and course assignments across the UniAttend platform.',
      descriptionAr: 'إدارة حسابات أعضاء هيئة التدريس وتعيينات المقررات داخل منصة يوني أتند.',
    },
    qr: {
      titleEn: 'QR Control',
      titleAr: 'التحكم في QR',
      descriptionEn: 'Configure QR attendance behavior and monitor active lecture sessions.',
      descriptionAr: 'اضبط سلوك رموز الحضور QR وراقب جلسات المحاضرات النشطة.',
    },
    settings: {
      titleEn: 'Settings',
      titleAr: 'الإعدادات',
      descriptionEn: 'Manage appearance, university information, notifications, and security settings.',
      descriptionAr: 'إدارة إعدادات المظهر ومعلومات الجامعة والإشعارات والحماية.',
    },
    attendance: {
      titleEn: 'Attendance Records',
      titleAr: 'سجلات الحضور',
      descriptionEn: 'Review, export, add, and remove attendance records by course, section, and week.',
      descriptionAr: 'راجع وصدّر وأضف واحذف سجلات الحضور حسب المقرر والشعبة والأسبوع.',
    },
    reports: {
      titleEn: 'Attendance Reports',
      titleAr: 'تقارير الحضور',
      descriptionEn: 'Generate attendance reports by course, group, and week.',
      descriptionAr: 'أنشئ تقارير الحضور حسب المقرر والمجموعة والأسبوع.',
    },
    students: {
      titleEn: 'Students Roster',
      titleAr: 'قائمة الطلاب',
      descriptionEn: 'View and manage enrolled students by course and section.',
      descriptionAr: 'اعرض وأدر الطلاب المسجلين حسب المقرر والشعبة.',
    },
    courses: {
      titleEn: 'My Courses',
      titleAr: 'مقرراتي',
      descriptionEn: 'Manage assigned teaching courses and class types.',
      descriptionAr: 'إدارة المقررات الدراسية المكلّف بها وأنواع الحصص.',
    },
  };

  const currentDashboardMeta = dashboardMeta[activePage] || {
    titleEn: 'Dashboard',
    titleAr: 'لوحة التحكم',
    descriptionEn: 'UniAttend dashboard.',
    descriptionAr: 'لوحة تحكم يوني أتند.',
  };

  // ─────────────────────────────────────────────────────────────
  // Not signed in → show SignIn screen
  // ─────────────────────────────────────────────────────────────
  if (!user) return <SignIn onSignIn={handleSignIn} />;

  // ─────────────────────────────────────────────────────────────
  // Signed in as Student → Student Mobile App
  // ─────────────────────────────────────────────────────────────
  if (user.userRole === 'student') {
    return (
      <StudentApp 
        user={user} 
        onSignOut={handleSignOut} 
        socketRef={socketRef} 
        allSessions={allSessions}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Signed in → Dashboard
  // ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      user={user}
      activePage={activePage}
      onPageChange={(p) => { setActivePage(p); setSidebarOpen(false); }}
      onSignOut={handleSignOut}
      sidebarOpen={sidebarOpen}
      onMenuToggle={(val) => setSidebarOpen(typeof val === 'boolean' ? val : o => !o)}
      lectureActive={lectureActive}
      socketConnected={socketConnected}
      socketError={socketError}
    >
      <AppHelmet
        titleEn={currentDashboardMeta.titleEn}
        titleAr={currentDashboardMeta.titleAr}
        descriptionEn={currentDashboardMeta.descriptionEn}
        descriptionAr={currentDashboardMeta.descriptionAr}
      />
      {/* ── Admin Panel ──────────────────────────────── */}
      {activePage === 'admin' && user.userRole === 'admin' && (
        <AdminPanel
          doctors={doctors}
          onAddDoctor={handleAddDoctor}
          onDeleteDoctor={handleDeleteDoctor}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      )}

      {/* ── QR Control ───────────────────────────────── */}
      {activePage === 'qr' && user.userRole === 'admin' && <QRControl />}

      {/* ── Settings ─────────────────────────────────── */}
      {activePage === 'settings' && user.userRole === 'admin' && <Settings />}

      {/* ── Attendance Records ────────────────────────── */}
      {activePage === 'attendance' && (
        <AttendancePage allSessions={allSessions} />
      )}

      {/* ── Reports ───────────────────────────────────── */}
      {activePage === 'reports' && (
        <ReportsPage 
          allSessions={allSessions} 
          doctorCourses={user.userRole === 'doctor' ? doctorCourses : doctors.flatMap(d => d.courses)} 
          userRole={user.userRole}
        />
      )}

      {/* ── Students Roster ───────────────────────────── */}
      {activePage === 'students' && user.userRole === 'admin' && <StudentsPage />}

      {/* ── Courses ───────────────────────────────────── */}
      {activePage === 'courses' && user.userRole === 'admin' && <CoursesPage />}

      {/* ── Doctor Dashboard ──────────────────────────── */}
      {activePage === 'dashboard' && (
        <DoctorDashboard
          lectureActive={lectureActive}
          lectureId={lectureId}
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
          attendedStudents={attendedStudents}
          totalRegistered={TOTAL_REGISTERED}
        />
      )}
    </DashboardLayout>
  );
}

export default function AppWithI18n() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
