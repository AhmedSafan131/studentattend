import React from 'react';
import LectureControl from '../DoctorDashboard/components/LectureControl';
import QRSection from '../DoctorDashboard/components/QRSection';
import { useAuth, useDashboard } from '../../../hooks';

const QRPage = () => {
  const { user, doctorCourses } = useAuth();
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
    setSelectedLectureType,
    setSelectedSection,
    setSelectedWeek,
    setAllowAllGroups,
    handleCourseChange,
    startLecture,
    endLecture,
  } = useDashboard();

  return (
    <div className="qr-page">
      <div className="top-row doctor-dashboard-top-row">
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
        onStartLecture={startLecture}
        onEndLecture={endLecture}
        doctorCourses={doctorCourses}
        userRole={user?.userRole}
        lectureError={lectureError}
        isStartingLecture={isStartingLecture}
        isEndingLecture={isEndingLecture}
        />
        <QRSection lectureId={lectureId} lectureActive={lectureActive} lectureQrPayload={lectureQrPayload} />
      </div>
    </div>
  );
};

export default QRPage;
