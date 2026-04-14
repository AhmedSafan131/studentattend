import React, { useMemo } from 'react';
import { Activity, BookOpen, CalendarDays, Play, Square, UsersRound } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';

export const COURSES = [
  { id: 'CS101', name: 'CS101 - Intro to Programming', sections: ['A', 'B', 'C'] },
  { id: 'CS201', name: 'CS201 - Data Structures', sections: ['A', 'B'] },
  { id: 'CS301', name: 'CS301 - Algorithms & Complexity', sections: ['A', 'B', 'C', 'D'] },
  { id: 'CS401', name: 'CS401 - Software Engineering', sections: ['A'] },
  { id: 'CS501', name: 'CS501 - Machine Learning', sections: ['A', 'B'] },
  { id: 'MATH211', name: 'MATH211 - Discrete Mathematics', sections: ['A', 'B', 'C'] },
  { id: 'CS310', name: 'CS310 - Operating Systems', sections: ['A', 'B'] },
  { id: 'CS320', name: 'CS320 - Computer Networks', sections: ['A'] },
  { id: 'CS330', name: 'CS330 - Database Systems', sections: ['A', 'B'] },
  { id: 'CS420', name: 'CS420 - Artificial Intelligence', sections: ['A'] },
  { id: 'MATH101', name: 'MATH101 - Calculus I', sections: ['A', 'B', 'C'] },
  { id: 'MATH201', name: 'MATH201 - Linear Algebra', sections: ['A', 'B'] },
  { id: 'EE101', name: 'EE101 - Circuit Analysis', sections: ['A'] },
  { id: 'EE201', name: 'EE201 - Digital Logic Design', sections: ['A'] },
];

const summaryCardStyle = {
  flex: 1,
  minWidth: 0,
  padding: '14px 16px',
  borderRadius: 18,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
};

const LectureControl = ({
  lectureActive,
  selectedCourse,
  selectedSection,
  selectedWeek,
  onCourseChange,
  onSectionChange,
  onWeekChange,
  onStartLecture,
  onEndLecture,
  doctorCourses = [],
  userRole = 'doctor',
}) => {
  const { t } = useLanguage();

  const displayCourses = useMemo(() => {
    if (userRole === 'admin' || doctorCourses.length === 0) return COURSES;

    const ids = [...new Set(doctorCourses.map((course) => course.id))];
    return ids.map((id) => {
      const fullCourse = COURSES.find((course) => course.id === id);
      return fullCourse || { id, name: `${id}`, sections: ['A'] };
    });
  }, [doctorCourses, userRole]);

  const course = displayCourses.find((item) => item.id === selectedCourse);
  const sectionOptions = (course?.sections || []).map((section) => ({ value: section, label: `${t('groupLabel')} ${section}` }));
  const weekOptions = Array.from({ length: 14 }, (_, index) => ({ value: String(index + 1), label: `${t('week')} ${index + 1}` }));
  const courseOptions = displayCourses.map((item) => ({ value: item.id, label: item.name }));

  return (
    <div className="card doctor-dashboard-card doctor-lecture-card">
      <div className="card-title doctor-dashboard-card-title">
        <span className="doctor-dashboard-card-title-icon"><BookOpen size={18} /></span>
        {t('lectureControl')}
      </div>

      <div className="doctor-lecture-hero">
        <div>
          <h3 className="doctor-lecture-hero-title">{t('lectureControlHeroTitle')}</h3>
          <p className="doctor-lecture-hero-copy">
            {t('lectureControlHeroDescription')}
          </p>
        </div>
        <div className={`lecture-status-badge ${lectureActive ? 'active' : 'inactive'}`} style={{ marginBottom: 0 }}>
          <span className={`status-dot ${lectureActive ? 'pulse' : ''}`} />
          {lectureActive ? t('lectureActive') : t('readyToStart')}
        </div>
      </div>

      <div className="doctor-lecture-summary-grid">
        <div style={summaryCardStyle}>
          <div className="doctor-lecture-summary-label"><BookOpen size={14} /> {t('courseLabel')}</div>
          <div className="doctor-lecture-summary-value">{selectedCourse || t('notSelected')}</div>
        </div>
        <div style={summaryCardStyle}>
          <div className="doctor-lecture-summary-label"><UsersRound size={14} /> {t('groupLabel')}</div>
          <div className="doctor-lecture-summary-value">{selectedSection ? `${t('groupLabel')} ${selectedSection}` : t('notSelected')}</div>
        </div>
        <div style={summaryCardStyle}>
          <div className="doctor-lecture-summary-label"><CalendarDays size={14} /> {t('weekLabel')}</div>
          <div className="doctor-lecture-summary-value">{selectedWeek ? `${t('week')} ${selectedWeek}` : t('notSelected')}</div>
        </div>
      </div>

      <div className="doctor-lecture-course-row">
        <CustomDropdown
          id="course-select"
          name="course"
          label={t('courseLabel')}
          value={selectedCourse}
          onChange={(event) => onCourseChange(event.target.value)}
          options={courseOptions}
          placeholder={t('selectCourse')}
          disabled={lectureActive}
          icon={() => <BookOpen size={16} />}
        />
      </div>

      <div className="doctor-lecture-form-grid">
        <CustomDropdown
          id="section-select"
          name="section"
          label={t('groupLabel')}
          value={selectedSection}
          onChange={(event) => onSectionChange(event.target.value)}
          options={sectionOptions}
          placeholder={t('selectGroup')}
          disabled={!selectedCourse || lectureActive}
          icon={() => <UsersRound size={16} />}
        />

        <CustomDropdown
          id="week-select"
          name="week"
          label={t('weekLabel')}
          value={selectedWeek}
          onChange={(event) => onWeekChange(event.target.value)}
          options={weekOptions}
          placeholder={t('selectWeek')}
          disabled={!selectedCourse || lectureActive}
          icon={() => <CalendarDays size={16} />}
        />
      </div>

      {lectureActive && selectedCourse ? (
        <div className="doctor-lecture-live-panel">
          <div className="doctor-lecture-live-icon"><Activity size={18} /></div>
          <div>
            <p className="doctor-lecture-live-label">{t('currentLiveSession')}</p>
            <strong className="doctor-lecture-live-title">{course?.name}</strong>
            <p className="doctor-lecture-live-copy">{t('groupLabel')} {selectedSection} · {t('week')} {selectedWeek}</p>
          </div>
        </div>
      ) : null}

      <div className="doctor-lecture-actions">
        <CustomBottom
          type="button"
          onClick={onStartLecture}
          text={t('takeAttendance')}
          rigthIcon={<Play size={16} />}
          disabled={lectureActive || !selectedCourse || !selectedSection || !selectedWeek}
          minHeight={50}
        />
        <CustomBottom
          type="button"
          onClick={onEndLecture}
          text={t('endAttendance')}
          rigthIcon={<Square size={15} />}
          disabled={!lectureActive}
          background="linear-gradient(135deg, rgba(239,68,68,0.18), rgba(185,28,28,0.3))"
          textColor="#fecaca"
          border="1px solid rgba(248,113,113,0.25)"
          boxShadow="none"
          disabledBackground="linear-gradient(135deg, #fee2e2, #fecaca)"
          disabledTextColor="#9f1239"
          disabledBorder="1px solid rgba(244,63,94,0.18)"
          disabledBoxShadow="none"
          disabledOpacity={1}
          minHeight={50}
        />
      </div>

      {(!selectedCourse || !selectedSection || !selectedWeek) && !lectureActive ? (
        <p className="doctor-lecture-footnote">{t('selectLectureDetails')}</p>
      ) : null}
    </div>
  );
};

export default LectureControl;
