import React from 'react';
import QRSection from './components/QRSection';
import StatsCards from './components/StatsCards';
import AttendanceList from './components/AttendanceList';
import LectureControl from './components/LectureControl';
import { Activity, QrCode, Users } from '../../../assets/icons';
import { useLanguage } from '../../../i18n';
import { useAuth, useDashboard } from '../../../hooks';
import { TOTAL_REGISTERED } from '../../../utils/constants';

const metricStyle = {
  flex: 1,
  minWidth: 0,
  padding: '16px 18px',
  borderRadius: 20,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
};

const DoctorDashboard = () => {
  const { t } = useLanguage();
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

      <section className="doctor-dashboard-hero card">
        <div>
          <p className="doctor-dashboard-overline">{t('doctorDashboardEyebrow')}</p>
          <h1 className="doctor-dashboard-hero-title">{t('doctorDashboardHeroTitle')}</h1>
          <p className="doctor-dashboard-hero-copy">
            {t('doctorDashboardHeroDescription')}
          </p>
        </div>
        <div className="doctor-dashboard-hero-metrics">
          <div style={metricStyle}>
            <div className="doctor-dashboard-metric-label"><Activity size={14} /> {t('sessionState')}</div>
            <div className="doctor-dashboard-metric-value">{lectureActive ? t('liveState') : t('idleState')}</div>
          </div>
          <div style={metricStyle}>
            <div className="doctor-dashboard-metric-label"><Users size={14} /> {t('presentCount')}</div>
            <div className="doctor-dashboard-metric-value">{attendedStudents.length}</div>
          </div>
          <div style={metricStyle}>
            <div className="doctor-dashboard-metric-label"><QrCode size={14} /> {t('qrIdLabel')}</div>
            <div className="doctor-dashboard-metric-value">{lectureId ? lectureId.slice(-6) : '--'}</div>
          </div>
        </div>
      </section>

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
