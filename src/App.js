import React from 'react';
import './App.css';
import './responsive.css';
import DashboardLayout from './Dashboard/layout/DashboardLayout';
import DoctorDashboard from './Dashboard/pages/DoctorDashboard';
import StudentApp from './StudentApp';
import AttendancePage from './Dashboard/pages/AttendancePage';
import StudentsPage from './Dashboard/pages/StudentsPage';
import CoursesPage from './Dashboard/pages/CoursesPage';
import AdminPanel from './Dashboard/pages/AdminPanel';
import ReportsPage from './Dashboard/pages/ReportsPage';
import QRControl from './Dashboard/pages/QRControl';
import Settings from './Dashboard/pages/Settings';
import AppHelmet from './components/AppHelmet';
import { signin as SignIn } from './screens';
import { LanguageProvider } from './i18n';
import { TOTAL_REGISTERED } from './utils/constants';
import { DASHBOARD_META, DEFAULT_DASHBOARD_META } from './app/dashboardMeta';
import { useAppController } from './app/useAppController';

const DashboardContent = ({
  activePage,
  allSessions,
  attendedStudents,
  doctorCourses,
  doctors,
  handleAddCourse,
  handleAddDoctor,
  handleCourseChange,
  handleDeleteCourse,
  handleDeleteDoctor,
  handleEndLecture,
  handleStartLecture,
  lectureActive,
  lectureId,
  selectedCourse,
  selectedSection,
  selectedWeek,
  setSelectedSection,
  setSelectedWeek,
  user,
}) => {
  if (activePage === 'admin' && user.userRole === 'admin') {
    return (
      <AdminPanel
        doctors={doctors}
        onAddDoctor={handleAddDoctor}
        onDeleteDoctor={handleDeleteDoctor}
        onAddCourse={handleAddCourse}
        onDeleteCourse={handleDeleteCourse}
      />
    );
  }

  if (activePage === 'qr' && user.userRole === 'admin') {
    return <QRControl />;
  }

  if (activePage === 'settings' && user.userRole === 'admin') {
    return <Settings />;
  }

  if (activePage === 'attendance') {
    return <AttendancePage allSessions={allSessions} />;
  }

  if (activePage === 'reports') {
    return (
      <ReportsPage
        allSessions={allSessions}
        doctorCourses={user.userRole === 'doctor' ? doctorCourses : doctors.flatMap((doctor) => doctor.courses)}
        userRole={user.userRole}
      />
    );
  }

  if (activePage === 'students' && user.userRole === 'admin') {
    return <StudentsPage />;
  }

  if (activePage === 'courses' && user.userRole === 'admin') {
    return <CoursesPage />;
  }

  return (
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
  );
};

function App() {
  const {
    user,
    doctors,
    activePage,
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
    doctorCourses,
    setActivePage,
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
    socketRef,
  } = useAppController();

  const currentDashboardMeta = DASHBOARD_META[activePage] || DEFAULT_DASHBOARD_META;

  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }

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

  return (
    <DashboardLayout
      user={user}
      activePage={activePage}
      onPageChange={(page) => {
        setActivePage(page);
        setSidebarOpen(false);
      }}
      onSignOut={handleSignOut}
      sidebarOpen={sidebarOpen}
      onMenuToggle={(value) => setSidebarOpen(typeof value === 'boolean' ? value : (open) => !open)}
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

      <DashboardContent
        activePage={activePage}
        allSessions={allSessions}
        attendedStudents={attendedStudents}
        doctorCourses={doctorCourses}
        doctors={doctors}
        handleAddCourse={handleAddCourse}
        handleAddDoctor={handleAddDoctor}
        handleCourseChange={handleCourseChange}
        handleDeleteCourse={handleDeleteCourse}
        handleDeleteDoctor={handleDeleteDoctor}
        handleEndLecture={handleEndLecture}
        handleStartLecture={handleStartLecture}
        lectureActive={lectureActive}
        lectureId={lectureId}
        selectedCourse={selectedCourse}
        selectedSection={selectedSection}
        selectedWeek={selectedWeek}
        setSelectedSection={setSelectedSection}
        setSelectedWeek={setSelectedWeek}
        user={user}
      />
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
