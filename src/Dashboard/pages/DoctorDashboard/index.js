import React from 'react';
import QRSection      from './components/QRSection';
import StatsCards     from './components/StatsCards';
import AttendanceList from './components/AttendanceList';
import LectureControl from './components/LectureControl';

const DoctorDashboard = ({
  lectureActive,
  lectureId,
  selectedCourse,
  selectedSection,
  selectedWeek,
  onCourseChange,
  onSectionChange,
  onWeekChange,
  onStartLecture,
  onEndLecture,
  doctorCourses,
  userRole,
  attendedStudents,
  totalRegistered,
}) => (
  <>
    <div className="top-row">
      <LectureControl
        lectureActive={lectureActive}
        selectedCourse={selectedCourse}
        selectedSection={selectedSection}
        selectedWeek={selectedWeek}
        onCourseChange={onCourseChange}
        onSectionChange={onSectionChange}
        onWeekChange={onWeekChange}
        onStartLecture={onStartLecture}
        onEndLecture={onEndLecture}
        doctorCourses={doctorCourses}
        userRole={userRole}
      />
      <QRSection lectureId={lectureId} lectureActive={lectureActive} />
    </div>
    <div className="bottom-row">
      <AttendanceList students={attendedStudents} lectureActive={lectureActive} />
      <StatsCards
        attendedCount={attendedStudents.length}
        totalRegistered={totalRegistered}
        lectureActive={lectureActive}
      />
    </div>
  </>
);

export default DoctorDashboard;
