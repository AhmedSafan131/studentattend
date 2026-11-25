import React, { useId, useState } from 'react';
import { BookOpen, CalendarDays, UsersRound } from '../../assets/icons';
import { useLanguage } from '../../i18n';
import { formatAcademicWeekDisplay } from '../../utils/academicWeek';
import { buildNumberedGroupOptions } from '../../utils/groupDisplay';
import CustomDropdown from '../CustomDropdown';

const fields = ['faculty', 'subject', 'type', 'group', 'week'];
const emptySelection = { faculty: '', subject: '', type: '', group: '', week: '' };
const sessionValues = (session) => ({
  faculty: String(session.faculty || '__unspecified__'),
  subject: String(session.subjectCode || session.courseCode || session.subjectName || ''),
  type: String(session.lectureType || ''),
  group: String(session.group || ''),
  week: String(session.week || '').match(/\d+/)?.[0] || String(session.week || ''),
});

export default function BulkSessionSelector({ sessions, selectedId, onSelectSession, facultyOptions = [], subjectOptions = [], weekOptions = [], onFacultyChange, onCreateSession, onOpenSession }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const id = useId();
  const [selection, setSelection] = useState(emptySelection);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const eligible = sessions.filter((item) => item.status !== 'migrated');
  const hasFaculty = facultyOptions.length > 0 || eligible.some((item) => item.faculty);
  const activeFields = fields.filter((field) => field !== 'faculty' || hasFaculty);
  const matches = (item, values, keys) => keys.every((key) => sessionValues(item)[key] === values[key]);
  const complete = activeFields.every((key) => selection[key]);
  const targets = complete ? eligible.filter((item) => matches(item, selection, activeFields)) : [];
  const change = (field, value) => {
    const next = { ...selection, [field]: value };
    fields.slice(fields.indexOf(field) + 1).forEach((key) => { next[key] = ''; });
    setSelection(next);
    setCreateError('');
    if (field === 'faculty') onFacultyChange?.(value);
    const found = activeFields.every((key) => next[key])
      ? eligible.filter((item) => matches(item, next, activeFields)) : [];
    onSelectSession?.(found.length === 1 ? found[0].id : '');
  };
  const selectedTarget = targets.find((item) => item.id === selectedId) || (targets.length === 1 ? targets[0] : null);
  const canOpen = complete && (targets.length === 0 || Boolean(selectedTarget));
  const needsOpen = canOpen && selectedTarget?.status !== 'open';
  const openSession = async () => {
    if (!needsOpen || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      if (selectedTarget) {
        await onOpenSession?.(selectedTarget.id);
      } else {
        const subject = subjectOptions.find((option) => String(option.value) === selection.subject);
        const created = await onCreateSession?.({
          faculty: selection.faculty,
          subjectCode: selection.subject,
          subjectName: subject?.dataset?.subjectName || subject?.label || selection.subject,
          lectureType: selection.type,
          group: selection.group,
          week: `Week ${selection.week}`,
        });
        if (created?.id) onSelectSession?.(created.id);
      }
    } catch (error) {
      setCreateError(error?.response?.data?.message || error?.message || (ar ? 'تعذر فتح الجلسة المختارة.' : 'Could not open the selected session.'));
    } finally {
      setCreating(false);
    }
  };
  const labels = {
    faculty: ar ? 'الكلية' : 'Faculty', subject: ar ? 'المادة' : 'Subject',
    type: ar ? 'نوع المادة' : 'Class type', group: ar ? 'المجموعة' : 'Group', week: ar ? 'الأسبوع' : 'Week',
  };
  const placeholders = {
    faculty: ar ? 'اختر الكلية' : 'Select faculty', subject: ar ? 'اختر المادة' : 'Select subject',
    type: ar ? 'اختر النوع' : 'Select class type', group: ar ? 'اختر المجموعة' : 'Select group',
    week: ar ? 'اختر الأسبوع' : 'Select week',
  };
  const types = ar ? { Lecture: 'محاضرة', Section: 'سكشن', Practical: 'عملي' } : {};
  return <div className="card doctor-dashboard-card attendance-target-card">
    <div className="card-title doctor-dashboard-card-title"><BookOpen size={18} />{ar ? 'المحاضرة المطلوب إضافة الطلاب لها' : 'Session to add students to'}</div>
    <p className="dashboard-card-hint">{ar ? 'حدد التفاصيل ثم افتح الجلسة قبل إضافة الطلاب أو رفع الملف.' : 'Choose the details, then open the session before adding students or uploading a file.'}</p>
    <div className={`attendance-target-grid${hasFaculty ? '' : ' attendance-target-grid-without-faculty'}`}>
      {activeFields.map((field, index) => {
        const previous = activeFields.slice(0, index);
        const ready = previous.every((key) => selection[key]);
        const candidates = ready ? eligible.filter((item) => matches(item, selection, previous)) : [];
        const values = [...new Set(candidates.map((item) => sessionValues(item)[field]).filter(Boolean))];
        let options = values.map((value) => ({ value, label: value }));
        const catalogSubject = subjectOptions.find((option) => String(option.value) === selection.subject);
        if (field === 'faculty') options = facultyOptions.length ? facultyOptions : values.map((value) => ({ value, label: value === '__unspecified__' ? (ar ? 'غير محددة' : 'Unspecified') : value }));
        if (field === 'subject') options = subjectOptions.length ? subjectOptions : values.map((value) => ({ value, label: candidates.find((item) => sessionValues(item).subject === value)?.subjectName || value }));
        if (field === 'type') {
          const typeValues = catalogSubject?.types?.length ? catalogSubject.types : values;
          options = typeValues.map((value) => ({ value, label: types[value] || value }));
        }
        if (field === 'group') {
          const catalogGroups = catalogSubject?.groupsByType?.[selection.type] || catalogSubject?.groups || [];
          const groupValues = catalogGroups.length ? catalogGroups : values;
          options = buildNumberedGroupOptions([...new Set(groupValues)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        }
        if (field === 'week') {
          options = weekOptions.length
            ? weekOptions.map((option) => ({
              value: String(option.value || '').match(/\d+/)?.[0] || String(option.value || ''),
              label: option.label,
            }))
            : values.sort((a, b) => Number(a) - Number(b)).map((value) => ({ value, label: formatAcademicWeekDisplay(value, lang) }));
        }
        const FieldIcon = field === 'week' ? CalendarDays : field === 'faculty' || field === 'group' ? UsersRound : BookOpen;
        return <CustomDropdown
          key={field}
          id={`${id}-${field}`}
          name={`bulk-${field}`}
          label={labels[field]}
          placeholder={placeholders[field]}
          value={selection[field]}
          options={options}
          disabled={!ready || !options.length || creating}
          searchable={field === 'faculty' || field === 'subject'}
          searchPlaceholder={ar ? 'اكتب للبحث…' : 'Type to search…'}
          onChange={(event) => change(field, event.target.value)}
          className={`attendance-target-field attendance-target-field-${field}`}
          icon={<FieldIcon size={16} />}
          fontSize={13}
          optionFontSize={13}
          textDirection={field === 'group' ? 'ltr' : undefined}
        />;
      })}
      {targets.length > 1 && <CustomDropdown id={`${id}-match`} label={ar ? 'اختر الجلسة المطابقة' : 'Choose matching session'} value={selectedId || ''} options={targets.map((item) => ({ value: item.id, label: `${item.createdAt || item.startedAt || ''} · ${item.status} · ${item.id}` }))} onChange={(event) => onSelectSession?.(event.target.value)} className="attendance-target-field attendance-target-field-match" fontSize={13} optionFontSize={13} />}
    </div>
    {needsOpen && <button type="button" className="attendance-open-target-button" disabled={creating || (!selectedTarget && !onCreateSession) || (Boolean(selectedTarget) && !onOpenSession)} onClick={openSession}>{creating ? (ar ? 'جارٍ فتح الجلسة…' : 'Opening session…') : (ar ? 'فتح السيشن' : 'Open session')}</button>}
    {creating && <p className="attendance-target-notice" role="status">{ar ? 'جارٍ فتح الجلسة المختارة…' : 'Opening the selected session…'}</p>}
    {createError && <p className="attendance-target-notice" role="alert">{createError}</p>}
    {!eligible.length && !onCreateSession && <p className="dashboard-card-hint">{ar ? 'لا توجد جلسات متاحة. أنشئ جلسة من إدارة الجلسة أولاً.' : 'No sessions available. Create one in Manage session first.'}</p>}
  </div>;
}
