import React, { useEffect, useState } from 'react';
import QRSection from './components/QRSection';
import AttendanceList from './components/AttendanceList';
import RecordStudent from './components/RecordStudent';
import MySessions from './components/MySessions';
import LectureControl from './components/LectureControl';
import { useAuth, useDashboard } from '../../../hooks';
import AttendanceWorkspace from '../../../components/AttendanceWorkspace';

const DoctorDashboard = () => {
  const [createdSessionId, setCreatedSessionId] = useState('');
  const { user, doctorCourses, students, ensureStudents } = useAuth();
  useEffect(() => { ensureStudents().catch(() => {}); }, [ensureStudents]);
  const {
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
    lectureSessions,
    selectedDashboardSessionId,
    selectedDashboardSession,
    matchingLectureSession,
    displayedAttendanceStudents,
    setSelectedLectureType,
    setSelectedSection,
    setSelectedWeek,
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
  } = useDashboard();
  useEffect(() => { setSelectedDashboardSessionId(''); }, [setSelectedDashboardSessionId]);
  return (
    <div className="doctor-dashboard-page">
      <AttendanceWorkspace session={selectedDashboardSession} createdSessionId={createdSessionId} manageSessionId={matchingLectureSession?.id || ''} availableSessions={lectureSessions} onSelectSession={setSelectedDashboardSessionId} count={displayedAttendanceStudents.length} controls={<>
        <LectureControl
          lectureActive={lectureActive}
          selectedCourse={selectedCourse}
          selectedLectureType={selectedLectureType}
          selectedSection={selectedSection}
          selectedWeek={selectedWeek}
          allowAllGroups={allowAllGroups}
          onCourseChange={handleCourseChange}
          onLectureTypeChange={setSelectedLectureType}
          onSectionChange={setSelectedSection}
          onWeekChange={setSelectedWeek}
          onAllowAllGroupsChange={setAllowAllGroups}
          onStartLecture={async () => {
            const sessionId = await startLecture();
            if (sessionId) setCreatedSessionId(sessionId);
          }}
          onEndLecture={endLecture}
          doctorCourses={doctorCourses}
          userRole={user?.userRole}
          lectureError={lectureError}
          isStartingLecture={isStartingLecture}
          isEndingLecture={isEndingLecture}
          isReopeningSession={Boolean(matchingLectureSession)}
        />
      </>}
        qr={<QRSection lectureId={lectureId} lectureActive={lectureActive && lectureId === createdSessionId} lectureQrPayload={lectureQrPayload} qrDuration={qrWindowSeconds} onQrDurationChange={setQrWindowSeconds} totalAttendance={attendedStudents.length} />}
        manual={<RecordStudent selectedSession={selectedDashboardSession} sessions={lectureSessions} onRecordStudent={recordStudent} onRosterSaved={refreshDashboardSession} />}
        attendance={<AttendanceList students={displayedAttendanceStudents} lectureActive={lectureActive} selectedSession={selectedDashboardSession} onDeleteStudent={deleteAttendanceStudent} />}
        sessions={<MySessions sessions={lectureSessions} activeSessionId={lectureActive ? lectureId : ''} selectedSessionId={selectedDashboardSessionId} onSelectSession={setSelectedDashboardSessionId} onDeleteSession={deleteLectureSession} onCloseAllSessions={closeAllLectureSessions} />}
        bulk={<RecordStudent variant="bulk" selectedSession={selectedDashboardSession} sessions={lectureSessions} onRecordStudent={recordStudent} onRosterSaved={refreshDashboardSession} />}
      />
    </div>
  );
};

export default DoctorDashboard;
