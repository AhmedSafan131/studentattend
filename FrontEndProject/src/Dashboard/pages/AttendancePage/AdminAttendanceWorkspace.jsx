import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { BookOpen, Search, UserCircle2, UsersRound } from '../../../assets/icons';
import AppHelmet from '../../../components/AppHelmet';
import CustomDropdown from '../../../components/CustomDropdown';
import CustomInput from '../../../components/CustomInput';
import CustomBottom from '../../../components/Bottom';
import { useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import { fetchCatalogSubjects } from '../../../services/catalogApi';
import { mapApiUser } from '../../../services/authApi';
import { attendanceAPI } from '../../../utils/api';
import { extractApiError } from '../../../utils/apiHelpers';
import { buildAcademicWeekOptions } from '../../../utils/academicWeek';
import { FACULTY_CATALOG } from '../../../utils/constants';
import { buildNumberedGroupOptions } from '../../../utils/groupDisplay';
import { HistoryTab, ProfileTab } from '../../../StudentApp';

const COPY = {
  ar: {
    title: 'إدارة الحضور',
    subtitle: 'إضافة حضور لطالب داخل سيشن محددة، أو معاينة سجل وبروفايل الطالب بدون تسجيل الدخول بحسابه.',
    addTitle: 'إضافة طالب للحضور',
    addHelp: 'اختر الكلية والمادة والنوع والجروب والأسبوع، ثم أدخل الرقم الأكاديمي أو القومي.',
    previewTitle: 'معاينة حساب الطالب',
    previewHelp: 'ابحث بالرقم القومي لعرض نفس بيانات السجل والبروفايل بدون تغيير جلسة دخول الأدمن.',
    faculty: 'الكلية', subject: 'المادة', type: 'النوع', group: 'الجروب', week: 'الأسبوع',
    studentId: 'الرقم الأكاديمي أو القومي', nationalId: 'الرقم القومي',
    choose: 'اختر...',
    add: 'تأكيد إضافة الحضور', adding: 'جارٍ تسجيل الحضور...', search: 'عرض بيانات الطالب', searching: 'جارٍ البحث...',
    saved: 'تم تسجيل حضور الطالب فعليًا', history: 'السجل', profile: 'البروفايل',
    sessionWeek: 'الأسبوع', records: 'مسجل', readOnly: 'معاينة فقط — لم يتم تسجيل دخول بحساب الطالب',
    overrideTitle: 'السماح بالحضور خارج مواد الطالب',
    overrideHelp: 'يسمح بتسجيل الطالب في أي مادة وأي جروب داخل نفس كليته فقط.',
    studentNotFound: 'لم يتم العثور على طالب بهذا الرقم القومي.',
  },
  en: {
    title: 'Attendance Management',
    subtitle: 'Add a student to a specific session or preview their history and profile without signing in as them.',
    addTitle: 'Add student attendance',
    addHelp: 'Choose faculty, subject, type, group and week, then enter the academic or national ID.',
    previewTitle: 'Student account preview',
    previewHelp: 'Search by national ID to view the student history and profile without changing the admin session.',
    faculty: 'Faculty', subject: 'Subject', type: 'Type', group: 'Group', week: 'Week',
    studentId: 'Academic or national ID', nationalId: 'National ID',
    choose: 'Choose...',
    add: 'Confirm attendance', adding: 'Saving attendance...', search: 'View student', searching: 'Searching...',
    saved: 'Student attendance was saved', history: 'History', profile: 'Profile',
    sessionWeek: 'Week', records: 'records', readOnly: 'Read-only preview — no student sign-in was performed',
    overrideTitle: 'Allow attendance outside registration',
    overrideHelp: 'Allow any subject and group, but only inside the student faculty.',
    studentNotFound: 'No student was found with this national ID.',
  },
};

const same = (left, right) => String(left || '').trim().toUpperCase() === String(right || '').trim().toUpperCase();

const SectionCard = ({ icon, title, description, children }) => (
  <section style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: 22,
    boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent)',
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.22)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: '2px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7 }}>{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const AdminAttendanceWorkspace = () => {
  const { lang, theme } = useLanguage();
  const copy = COPY[lang === 'ar' ? 'ar' : 'en'];
  const { showToast } = useToast();
  const { terms, selectedTermCode, activeTerm } = useSelector((state) => state.terms);
  const attendanceTerm = terms.find((term) => term.code === selectedTermCode) || activeTerm;
  const termCode = selectedTermCode || activeTerm?.code || '';
  const [subjects, setSubjects] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [form, setForm] = useState({ faculty: '', courseCode: '', lectureType: '', group: '', week: '', studentId: '' });
  const [saving, setSaving] = useState(false);
  const [savedAttendance, setSavedAttendance] = useState(null);
  const [allowUnregistered, setAllowUnregistered] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [studentView, setStudentView] = useState(null);
  const [studentTab, setStudentTab] = useState('history');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoadingOptions(true);
    fetchCatalogSubjects({ termCode })
      .then((catalog) => {
        if (!mounted) return;
        setSubjects(catalog);
      })
      .catch((error) => showToast({ tone: 'error', title: copy.title, message: extractApiError(error, 'Could not load attendance options.') }))
      .finally(() => mounted && setLoadingOptions(false));
    return () => { mounted = false; };
  }, [copy.title, showToast, termCode]);

  const facultyOptions = useMemo(() => FACULTY_CATALOG.map((faculty) => ({ value: faculty.id, label: faculty.name })), []);
  const courseOptions = useMemo(() => subjects
    .filter((subject) => subject.facultyId === form.faculty)
    .map((subject) => ({ value: subject.subjectCode, label: `${subject.subjectName} (${subject.subjectCode})` })), [form.faculty, subjects]);
  const selectedSubject = subjects.find((subject) => subject.facultyId === form.faculty && same(subject.subjectCode, form.courseCode));
  const typeOptions = (selectedSubject?.types || []).map((type) => ({ value: type, label: type }));
  const rawGroups = selectedSubject?.groupsByType?.[form.lectureType] || selectedSubject?.groups || [];
  const groupOptions = buildNumberedGroupOptions(rawGroups, copy.group);
  const weekOptions = useMemo(() => buildAcademicWeekOptions(copy.week, attendanceTerm), [attendanceTerm, copy.week]);

  const setField = (name, value, resets = []) => {
    setForm((current) => ({ ...current, [name]: value, ...Object.fromEntries(resets.map((key) => [key, ''])) }));
    setSavedAttendance(null);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.courseCode || !form.lectureType || !form.group || !form.week || !form.studentId.trim()) return;
    setSaving(true);
    try {
      const response = await attendanceAPI.createManual({
        studentId: form.studentId.trim(),
        courseCode: form.courseCode,
        lectureType: form.lectureType,
        group: form.group,
        week: form.week,
        facultyId: form.faculty,
        allowUnregistered,
      });
      const attendance = response?.data?.attendance;
      setSavedAttendance(attendance || { studentName: form.studentId.trim() });
      setForm((current) => ({ ...current, studentId: '' }));
      showToast({ tone: 'success', title: copy.saved, message: response?.data?.message || copy.saved });
    } catch (error) {
      showToast({ tone: 'error', title: copy.addTitle, message: extractApiError(error, 'Attendance was not saved.') });
    } finally {
      setSaving(false);
    }
  };

  const handleStudentSearch = async (event) => {
    event.preventDefault();
    if (!nationalId.trim()) return;
    setSearching(true);
    setSearchError('');
    setStudentView(null);
    try {
      const response = await attendanceAPI.adminStudentView(nationalId.trim(), termCode);
      setStudentView({
        user: mapApiUser(response?.data?.student || {}),
        records: Array.isArray(response?.data?.attendance) ? response.data.attendance : [],
      });
      setStudentTab('history');
    } catch (error) {
      const message = error?.response?.status === 404
        ? copy.studentNotFound
        : extractApiError(error, copy.studentNotFound);
      setSearchError(message);
      showToast({ tone: 'error', title: copy.previewTitle, message });
    } finally {
      setSearching(false);
    }
  };

  const Dropdown = ({ label, name, options, disabled = false, searchable = false }) => (
    <CustomDropdown
      id={`admin-attendance-${name}`}
      name={name}
      label={label}
      value={form[name]}
      options={options}
      placeholder={copy.choose}
      disabled={disabled}
      searchable={searchable}
      loading={loadingOptions}
      onChange={(event) => {
        const resetMap = { faculty: ['courseCode', 'lectureType', 'group', 'week'], courseCode: ['lectureType', 'group', 'week'], lectureType: ['group', 'week'], group: ['week'] };
        setField(name, event.target.value, resetMap[name] || []);
      }}
    />
  );

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ height: '100%', overflowY: 'auto', padding: '24px clamp(16px, 3vw, 30px) 48px' }}>
      <AppHelmet titleEn="Attendance Management" titleAr="إدارة الحضور" descriptionEn={COPY.en.subtitle} descriptionAr={COPY.ar.subtitle} />
      <div style={{ width: '100%', maxWidth: 1380, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header style={{ marginBottom: 2 }}>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 900 }}>{copy.title}</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{copy.subtitle}</p>
        </header>

        <SectionCard icon={<UsersRound size={22} />} title={copy.addTitle} description={copy.addHelp}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', alignItems: 'end' }}>
              <Dropdown label={copy.faculty} name="faculty" options={facultyOptions} searchable />
              <Dropdown label={copy.subject} name="courseCode" options={courseOptions} disabled={!form.faculty} searchable />
              <Dropdown label={copy.type} name="lectureType" options={typeOptions} disabled={!form.courseCode} />
              <Dropdown label={copy.group} name="group" options={groupOptions} disabled={!form.lectureType} />
              <Dropdown label={copy.week} name="week" options={weekOptions} disabled={!form.group} />
            </div>
            <button
              type="button"
              className={`all-groups-switch${allowUnregistered ? ' is-enabled' : ''}`}
              onClick={() => setAllowUnregistered((current) => !current)}
              role="switch"
              aria-checked={allowUnregistered}
            >
              <span className="all-groups-switch-copy">
                <strong>{copy.overrideTitle}</strong>
                <small>{copy.overrideHelp}</small>
              </span>
              <span className="all-groups-switch-track" aria-hidden="true"><span className="all-groups-switch-thumb" /></span>
            </button>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'end' }}>
              <CustomInput
                label={copy.studentId}
                name="attendance-student-id"
                value={form.studentId}
                onChange={(event) => setField('studentId', event.target.value)}
                autoComplete="off"
                placeholder={copy.studentId}
              />
              <CustomBottom
                type="submit"
                text={copy.add}
                loading={saving}
                loadingText={copy.adding}
                disabled={!form.courseCode || !form.lectureType || !form.group || !form.week || !form.studentId.trim()}
              />
            </div>
          </form>
          {savedAttendance ? <div style={{ marginTop: 16, padding: '13px 15px', borderRadius: 14, border: '1px solid rgba(52,211,153,0.28)', background: 'rgba(52,211,153,0.1)', color: 'var(--accent)', fontSize: 13, fontWeight: 800 }}>✓ {copy.saved}{savedAttendance.studentName ? ` — ${savedAttendance.studentName}` : ''}</div> : null}
        </SectionCard>

        <SectionCard icon={<UserCircle2 size={22} />} title={copy.previewTitle} description={copy.previewHelp}>
          <form onSubmit={handleStudentSearch} style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'end' }}>
            <CustomInput
              label={copy.nationalId}
              name="student-national-id-preview"
              value={nationalId}
              onChange={(event) => { setNationalId(event.target.value); setSearchError(''); }}
              autoComplete="off"
              placeholder={copy.nationalId}
              icon={<Search size={16} />}
              error={searchError}
            />
            <CustomBottom
              type="submit"
              text={copy.search}
              rigthIcon={<Search size={18} />}
              loading={searching}
              loadingText={copy.searching}
              disabled={!nationalId.trim()}
            />
          </form>
          {studentView ? (
            <div style={{ marginTop: 20, overflow: 'hidden', borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg-dark)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 13, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['history', copy.history, BookOpen], ['profile', copy.profile, UserCircle2]].map(([key, label, Icon]) => (
                    <button key={key} type="button" onClick={() => setStudentTab(key)} style={{
                      border: studentTab === key ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)',
                      borderRadius: 12,
                      background: studentTab === key ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.02)',
                      color: studentTab === key ? 'var(--accent)' : 'var(--text-secondary)',
                      padding: '10px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}><Icon size={17} />{label}</button>
                  ))}
                </div>
                <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800 }}>{copy.readOnly}</span>
              </div>
              {studentTab === 'history' ? (
                <HistoryTab user={studentView.user} lang={lang} attendanceTerm={attendanceTerm} attendanceRecords={studentView.records} />
              ) : (
                <ProfileTab user={studentView.user} lang={lang} theme={theme} attendanceRecords={studentView.records} terms={[]} selectedTermCode={termCode} activeTerm={attendanceTerm} onTermChange={() => {}} readOnly />
              )}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
};

export default AdminAttendanceWorkspace;
