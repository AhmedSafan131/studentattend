import React from 'react';
import { Clock3, ScanLine, Users } from '../../../../assets/icons';
import { useLanguage } from '../../../../i18n';

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'],
  ['#0891b2', '#22d3ee'],
];

function getAvatarColors(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const AttendanceList = ({ students, lectureActive }) => {
  const { t } = useLanguage();

  return (
    <div className="card doctor-dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title doctor-dashboard-card-title" style={{ marginBottom: 12 }}>
        <span className="doctor-dashboard-card-title-icon"><Users size={18} /></span>
        {t('liveAttendance')}
      </div>

      <div className="attendance-header-stats doctor-attendance-header-stats">
        <div className="total-badge">{students.length} {t('presentCount')}</div>
        {lectureActive && students.length > 0 ? (
          <div className="attendance-live-badge">
            <span className="live-dot" />
            {t('liveTracking')}
          </div>
        ) : null}
      </div>

      {students.length === 0 ? (
        <div className="empty-list doctor-empty-list">
          <span className="empty-list-icon"><ScanLine size={34} /></span>
          <p>{lectureActive ? t('waitingForStudents') : t('startLectureToTrackAttendance')}</p>
        </div>
      ) : (
        <div className="student-list">
          {[...students].reverse().map((student, idx) => {
            const [c1, c2] = getAvatarColors(students.length - 1 - idx);
            const initial = student.name.charAt(0).toUpperCase();
            const isNew = idx < 3;
            return (
              <div key={student.id} className={`student-row ${isNew ? 'new-entry' : ''}`}>
                <span className="student-row-index">{students.length - idx}</span>
                <div className="student-row-avatar" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                  {initial}
                </div>
                <div className="student-row-info">
                  <div className="student-row-name">{student.name}</div>
                  <div className="student-row-id">{t('studentIdPrefix')}: {student.universityId}</div>
                </div>
                <span className="student-row-time"><Clock3 size={13} /> {student.scanTime}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
