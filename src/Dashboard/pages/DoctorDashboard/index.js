import React from 'react';
import QRSection from './components/QRSection';
import StatsCards from './components/StatsCards';
import AttendanceList from './components/AttendanceList';
import LectureControl from './components/LectureControl';
import { useAuth, useDashboard } from '../../../hooks';
import { TOTAL_REGISTERED } from '../../../utils/constants';

const DoctorDashboard = () => {
  const { user, doctorCourses } = useAuth();
  const {
    lectureActive,
    lectureId,
    selectedCourse,
    selectedSection,
    selectedWeek,
    attendedStudents,
    setSelectedSection,
    setSelectedWeek,
    handleCourseChange,
    startLecture,
    endLecture,
  } = useDashboard();

  return (
    <>
      <div className="top-row doctor-dashboard-top-row">
        <LectureControl
          lectureActive={lectureActive}
          selectedCourse={selectedCourse}
          selectedSection={selectedSection}
          selectedWeek={selectedWeek}
          onCourseChange={handleCourseChange}
          onSectionChange={setSelectedSection}
          onWeekChange={setSelectedWeek}
          onStartLecture={startLecture}
          onEndLecture={endLecture}
          doctorCourses={doctorCourses}
          userRole={user?.userRole}
        />
        <QRSection lectureId={lectureId} lectureActive={lectureActive} />
      </div>

      <div className="bottom-row doctor-dashboard-bottom-row">
        <AttendanceList students={attendedStudents} lectureActive={lectureActive} />
        <StatsCards
          attendedCount={attendedStudents.length}
          totalRegistered={TOTAL_REGISTERED}
          lectureActive={lectureActive}
        />
      </div>
    </>
  );
};

export default DoctorDashboard;
