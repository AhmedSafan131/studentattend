import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import './responsive.css';
import StudentApp from './StudentApp';
import AppHelmet from './components/AppHelmet';
import { LanguageProvider } from './i18n';
import { TOTAL_REGISTERED } from './utils/constants';
import { DashboardLayout, DASHBOARD_HOME_PATH, DASHBOARD_META_BY_ROUTE, AdminPanel, AttendancePage, CoursesPage, DoctorDashboard, QRControl, ReportsPage, Settings, StudentsPage } from './Dashboard';
import { signin as SignIn } from './screens';
import { DEFAULT_DASHBOARD_META, DASHBOARD_META } from './app/dashboardMeta';
import { useAppController } from './app/useAppController';

const getDashboardMeta = (pathname) => {
  const metaKey = DASHBOARD_META_BY_ROUTE[pathname] || (pathname.startsWith('/dashboard/') ? DASHBOARD_META_BY_ROUTE[pathname.replace(/\/$/, '')] : 'dashboard');
  return DASHBOARD_META[metaKey] || DEFAULT_DASHBOARD_META;
};

const DashboardShell = (props) => {
  const {
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
    doctorCourses,
    socketConnected,
    socketError,
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
    handleSignOut,
  } = props;
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const currentMeta = getDashboardMeta(location.pathname);
  const defaultDashboardPath = DASHBOARD_HOME_PATH[user.userRole === 'admin' ? 'admin' : 'doctor'];

  return (
    <DashboardLayout
      user={user}
      onSignOut={handleSignOut}
      sidebarOpen={sidebarOpen}
      onMenuToggle={(value) => setSidebarOpen(typeof value === 'boolean' ? value : (open) => !open)}
      socketConnected={socketConnected}
      socketError={socketError}
    >
      <AppHelmet
        titleEn={currentMeta.titleEn}
        titleAr={currentMeta.titleAr}
        descriptionEn={currentMeta.descriptionEn}
        descriptionAr={currentMeta.descriptionAr}
      />

      <Routes>
        <Route
          index
          element={
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
          }
        />
        <Route path="attendance" element={<AttendancePage allSessions={allSessions} />} />
        <Route
          path="reports"
          element={
            <ReportsPage
              allSessions={allSessions}
              doctorCourses={user.userRole === 'doctor' ? doctorCourses : doctors.flatMap((doctor) => doctor.courses)}
              userRole={user.userRole}
            />
          }
        />
        {user.userRole === 'admin' ? (
          <>
            <Route
              path="admin"
              element={
                <AdminPanel
                  doctors={doctors}
                  onAddDoctor={handleAddDoctor}
                  onDeleteDoctor={handleDeleteDoctor}
                  onAddCourse={handleAddCourse}
                  onDeleteCourse={handleDeleteCourse}
                />
              }
            />
            <Route path="students" element={<StudentsPage />} />
            <Route path="qr" element={<QRControl />} />
            <Route path="settings" element={<Settings />} />
            <Route path="courses" element={<CoursesPage />} />
          </>
        ) : null}
        <Route path="*" element={<Navigate to={defaultDashboardPath} replace />} />
      </Routes>
    </DashboardLayout>
  );
};

const AppRoutes = () => {
  const controller = useAppController();
  const { user, allSessions, handleSignIn, handleSignOut, socketRef } = controller;
  const landingPath = !user
    ? '/'
    : user.userRole === 'student'
      ? '/student'
      : DASHBOARD_HOME_PATH[user.userRole === 'admin' ? 'admin' : 'doctor'];

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={landingPath} replace /> : <SignIn onSignIn={handleSignIn} />} />
      <Route
        path="/student"
        element={
          user?.userRole === 'student'
            ? <StudentApp user={user} onSignOut={handleSignOut} socketRef={socketRef} allSessions={allSessions} />
            : <Navigate to={landingPath} replace />
        }
      />
      <Route
        path="/dashboard/*"
        element={
          user && user.userRole !== 'student'
            ? <DashboardShell {...controller} />
            : <Navigate to={landingPath} replace />
        }
      />
      <Route path="*" element={<Navigate to={landingPath} replace />} />
    </Routes>
  );
};

export default function AppWithI18n() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LanguageProvider>
  );
}
