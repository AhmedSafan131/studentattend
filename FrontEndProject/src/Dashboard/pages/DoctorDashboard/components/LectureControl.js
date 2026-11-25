import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, CalendarDays, LockKeyhole, Play, Square, UsersRound } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import {
  getScopedCourseLabel,
  getCatalogAttendanceCourses,
} from '../../../../utils/courseAccess';
import { buildAcademicWeekOptions } from '../../../../utils/academicWeek';
import { buildNumberedGroupOptions } from '../../../../utils/groupDisplay';
import { fetchCatalogSubjects } from '../../../../services/catalogApi';

const isHiddenPlaceholderSubject = (value) => {
  const normalized = String(value || '').trim();
  return /^[().\s]+$/.test(normalized) || /(?:^|\s-\s)[().\s]+$/.test(normalized);
};

const LectureControl = ({
  lectureActive,
  selectedCourse,
  selectedLectureType,
  selectedSection,
  selectedWeek,
  allowAllGroups = false,
  onCourseChange,
  onLectureTypeChange,
  onSectionChange,
  onWeekChange,
  onAllowAllGroupsChange,
  onStartLecture,
  onEndLecture,
  doctorCourses = [],
  students = [],
  userRole = 'doctor',
  lectureError = '',
  isStartingLecture = false,
  isEndingLecture = false,
  isReopeningSession = false,
}) => {
  const { t, lang } = useLanguage();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const isStaffRole = userRole === 'staff' || userRole === 'doctor';
  const [catalogState, setCatalogState] = useState({ term: null, subjects: [], error: '' });
  const termCode = selectedTermCode || activeTerm?.code || '';
  const catalogReady = catalogState.term === termCode && !catalogState.error;

  useEffect(() => {
    let cancelled = false;
    fetchCatalogSubjects({ termCode }).then((subjects) => {
      if (!cancelled) setCatalogState({ term: termCode, subjects, error: '' });
    }).catch(() => {
      if (!cancelled) setCatalogState({ term: termCode, subjects: [], error: 'catalog' });
    });
    return () => { cancelled = true; };
  }, [termCode]);

  const displayCourses = useMemo(() => {
    return getCatalogAttendanceCourses({ userRole, assignedCourses: doctorCourses, catalogSubjects: catalogReady ? catalogState.subjects : [], termCode })
      .filter((course) => !isHiddenPlaceholderSubject(course?.name));
  }, [catalogReady, catalogState.subjects, doctorCourses, termCode, userRole]);

  const course = displayCourses.find((item) => item.id === selectedCourse);
  const lectureTypeOptions = useMemo(() => (
    (course?.types || [])
      .map((type) => ({ value: type, label: t(`studentsTypeOption${type}`) }))
  ), [course, t]);
  const groups = course?.groupsByType[selectedLectureType] || [];
  const sectionOptions = buildNumberedGroupOptions(groups);
  const validSelection = course?.types.includes(selectedLectureType) && groups.includes(selectedSection);

  useEffect(() => {
    if (lectureActive || !catalogReady) return;
    if (selectedLectureType && !course?.types.includes(selectedLectureType)) onLectureTypeChange('');
    else if (selectedSection && !(course?.groupsByType[selectedLectureType] || []).includes(selectedSection)) onSectionChange('');
  }, [catalogReady, course, lectureActive, onLectureTypeChange, onSectionChange, selectedLectureType, selectedSection]);
  const weekOptions = useMemo(
    () => buildAcademicWeekOptions(t('week'), attendanceTerm),
    [attendanceTerm, t],
  );
  const courseOptions = displayCourses.map((item) => ({ value: item.id, label: getScopedCourseLabel(item) }));

  return (
    <div className="card doctor-dashboard-card doctor-lecture-card">
      <div className="card-title doctor-dashboard-card-title">
        <span className="doctor-dashboard-card-title-icon"><BookOpen size={18} /></span>
        {t('lectureControl')}
      </div>

      <div className="doctor-lecture-hero">
        <div>
          <h3 className="doctor-lecture-hero-title">{t('lectureControlHeroTitle')}</h3>
        </div>
        {lectureActive ? (
          <div className="lecture-status-badge active" style={{ marginBottom: 0 }}>
            <span className="status-dot pulse" />
            {t('lectureActive')}
          </div>
        ) : (
          <Link className="temporary-access-code-link" to="/dashboard/access-code">
            <LockKeyhole className="temporary-access-code-link-icon" size={14} aria-hidden="true" />
            <span>
              {lang === 'ar'
                ? 'إنشاء رمز سري مؤقت للدخول بجهاز آخر'
                : 'Create a temporary access code to sign in on another device'}
            </span>
          </Link>
        )}
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
          id="lecture-type-select"
          name="lecture-type"
          label={t('lectureTypeLabel')}
          value={selectedLectureType}
          onChange={(event) => onLectureTypeChange(event.target.value)}
          options={lectureTypeOptions}
          placeholder={t('selectLectureType')}
          disabled={!selectedCourse || lectureActive}
          icon={() => <BookOpen size={16} />}
        />

        <CustomDropdown
          id="section-select"
          name="section"
          label={t('groupLabel')}
          value={selectedSection}
          onChange={(event) => onSectionChange(event.target.value)}
          options={sectionOptions}
          placeholder={t('selectGroup')}
          disabled={!selectedCourse || !selectedLectureType || lectureActive}
          icon={() => <UsersRound size={16} />}
          textDirection="ltr"
        />

        <CustomDropdown
          id="week-select"
          name="week"
          label={t('weekLabel')}
          value={selectedWeek}
          onChange={(event) => onWeekChange(event.target.value)}
          options={weekOptions}
          placeholder={t('selectWeek')}
          disabled={!selectedCourse || !selectedLectureType || !selectedSection || lectureActive}
          icon={() => <CalendarDays size={16} />}
          menuPlacement="bottom"
        />

        <button
          type="button"
          className={`all-groups-switch${allowAllGroups ? ' is-enabled' : ''}`}
          onClick={() => onAllowAllGroupsChange?.(!allowAllGroups)}
          disabled={lectureActive}
          role="switch"
          aria-checked={allowAllGroups}
        >
          <span className="all-groups-switch-copy">
            <strong>{lang === 'ar' ? 'استقبال كل الجروبات' : 'Accept all groups'}</strong>
            <small>
              {lang === 'ar'
                ? 'يسمح بحضور أي طالب مسجل في المادة'
                : 'Allow any student registered in this subject'}
            </small>
          </span>
          <span className="all-groups-switch-track" aria-hidden="true">
            <span className="all-groups-switch-thumb" />
          </span>
        </button>
      </div>

      {lectureActive && selectedCourse ? (
        <div className="doctor-lecture-live-panel">
          <div className="doctor-lecture-live-icon"><Activity size={18} /></div>
          <div>
            <p className="doctor-lecture-live-label">{t('currentLiveSession')}</p>
            <strong className="doctor-lecture-live-title">{course?.name}</strong>
            <p className="doctor-lecture-live-copy">
              {isStaffRole ? `${t(`studentsTypeOption${selectedLectureType}`)} · ` : ''}
              {t('groupLabel')} {selectedSection} · {t('week')} {selectedWeek}
            </p>
          </div>
        </div>
      ) : null}

      <div className="doctor-lecture-actions">
        <CustomBottom
          type="button"
          onClick={onStartLecture}
          text={isReopeningSession ? (lang === 'ar' ? 'إعادة فتح تسجيل الحضور' : 'Reopen attendance recording') : t('takeAttendance')}
          loading={isStartingLecture}
          loadingText={t('startingAttendance')}
          rigthIcon={<Play size={16} />}
          disabled={lectureActive || isEndingLecture || !catalogReady || !validSelection || !selectedWeek}
          minHeight={50}
        />
        <CustomBottom
          type="button"
          onClick={onEndLecture}
          text={t('endAttendance')}
          loading={isEndingLecture}
          loadingText={t('endingAttendance')}
          rigthIcon={<Square size={15} />}
          disabled={!lectureActive || isStartingLecture}
          background="linear-gradient(135deg, #ef4444, #b91c1c)"
          textColor="#ffffff"
          border="1px solid rgba(153,27,27,0.28)"
          boxShadow="0 16px 34px rgba(185,28,28,0.28)"
          disabledBackground="linear-gradient(135deg, #fee2e2, #fecdd3)"
          disabledTextColor="#fda4af"
          disabledBorder="1px solid rgba(244,63,94,0.18)"
          disabledBoxShadow="none"
          disabledOpacity={0.92}
          minHeight={50}
        />
      </div>

      {(!selectedCourse || !selectedLectureType || !selectedSection || !selectedWeek) && !lectureActive ? (
        <p className="doctor-lecture-footnote">{t('selectLectureDetails')}</p>
      ) : null}
      {lectureError ? (
        <p className="doctor-lecture-footnote" style={{ color: '#ef4444' }}>{lectureError}</p>
      ) : null}
      {catalogState.term === termCode && catalogState.error ? (
        <p className="doctor-lecture-footnote" style={{ color: '#ef4444' }}>{lang === 'ar' ? 'تعذر تحميل كتالوج المواد. حدّث الصفحة للمحاولة مرة أخرى.' : 'Unable to load the subject catalog. Refresh the page to try again.'}</p>
      ) : null}
    </div>
  );
};

export default LectureControl;
