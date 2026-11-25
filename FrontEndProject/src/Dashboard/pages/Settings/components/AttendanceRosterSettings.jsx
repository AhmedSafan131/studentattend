import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks';
import { useLanguage } from '../../../../i18n';
import { rosterAPI } from '../../../../components/AttendanceRoster/api';
import { Check, LayoutDashboard, Search, Settings2, Shield, UsersRound } from '../../../../assets/icons';
import '../../../../components/AttendanceRoster/roster.css';

export default function AttendanceRosterSettings() {
  const { doctors } = useAuth();
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let cancelled = false;
    rosterAPI.options().then((response) => { if (!cancelled) setOptions(response.data.data); })
      .catch(() => { if (!cancelled) setError(ar ? 'تعذر تحميل الإعدادات.' : 'Could not load settings.'); });
    return () => { cancelled = true; };
  }, [ar]);
  const set = (key, value) => { setOptions((previous) => ({ ...previous, [key]: value })); setMessage(''); };
  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await rosterAPI.updateOptions({ ...options, dashboard: false });
      setOptions(response.data.data);
      setMessage(ar ? 'تم حفظ إعدادات قائمة الطلاب.' : 'Student roster settings saved.');
    } catch (requestError) {
      setError(requestError?.response?.status === 403
        ? (ar ? 'تحتاج صلاحية إدارة الصلاحيات لتغيير هذا الإعداد.' : 'Permission management access is required.')
        : (ar ? 'تعذر حفظ الإعدادات.' : 'Could not save settings.'));
    } finally { setBusy(false); }
  };
  const toggle = (key, label, description) => <label className={`roster-setting-toggle${options[key] ? ' is-enabled' : ''}`} key={key}>
    <span className="roster-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
    <span className="roster-switch"><input type="checkbox" aria-label={label} checked={!!options[key]} disabled={busy} onChange={(event) => set(key, event.target.checked)} /></span>
  </label>;
  return <section className="roster-settings" dir={ar ? 'rtl' : 'ltr'}>
    <header className="roster-settings-header"><span className="roster-settings-icon" aria-hidden="true"><UsersRound size={25} /></span><div><span className="roster-eyebrow">{ar ? 'أدوات تسجيل الحضور' : 'ATTENDANCE TOOLS'}</span><h2>{ar ? 'قائمة الطلاب لتسجيل الحضور' : 'Student roster attendance'}</h2><p>{ar ? 'طريقة إضافية بجانب Excel والإضافة بالرقم. إيقافها لا يغيّر الحضور المسجل أو التقارير.' : 'An additional option alongside Excel and ID entry. Disabling it does not change recorded attendance or reports.'}</p></div>{options && <span className={`roster-settings-badge${options.enabled ? ' is-enabled' : ''}`}>{ar ? (options.enabled ? 'مفعّلة' : 'متوقفة') : (options.enabled ? 'Enabled' : 'Disabled')}</span>}</header>
    <div className="roster-settings-body">
    {error && <p role="alert" className="roster-error">{error}</p>}{message && <p role="status">{message}</p>}
    {!options ? <p>{ar ? 'جاري التحميل…' : 'Loading…'}</p> : <>
      {toggle('enabled', ar ? 'تفعيل الميزة للدكاترة' : 'Enable roster selection for doctors', ar ? 'تحكّم في ظهور قائمة الطلاب وإمكانية التسجيل من خلالها.' : 'Control access to selecting students and recording attendance from the roster.')}
      <h3 className="roster-settings-section-title"><LayoutDashboard size={17} aria-hidden="true" />{ar ? 'إتاحة الميزة في حضور الطالب' : 'Availability in Student Attendance'}</h3>
      <div className="roster-settings-grid">
        {toggle('flexible', ar ? 'إتاحة الاختيار من قائمة الطلاب' : 'Enable student roster selection', ar ? 'اختيار الطلاب داخل جلسة الحضور حسب الكلية وصلاحية اشتراط التسجيل لكل دكتور.' : 'Select students in the attendance session using its faculty and each doctor’s registration requirement.')}
      </div>
      <h3 className="roster-settings-section-title"><UsersRound size={17} aria-hidden="true" />{ar ? 'الدكاترة المسموح لهم' : 'Doctor access'}</h3>
      {toggle('allDoctors', ar ? 'إتاحتها لكل الدكاترة' : 'Available to all doctors', ar ? 'اقفل الاختيار ده لو عايز تتيحها لدكاترة محددين فقط.' : 'Turn this off to choose specific doctors below.')}
      {!options.allDoctors && <>
        <div className="roster-doctor-panel">
        <label className="roster-settings-search">{ar ? 'بحث عن دكتور' : 'Find a doctor'}<span className="roster-field"><Search size={18} aria-hidden="true" /><input placeholder={ar ? 'اسم الدكتور أو البريد الإلكتروني…' : 'Doctor name or email…'} value={search} onChange={(event) => setSearch(event.target.value)} /></span></label>
        <p className="roster-doctor-count">{ar ? `المتاح لهم: ${options.doctorIds.length} دكتور` : `Enabled for ${options.doctorIds.length} doctors`}</p>
        <div className="roster-doctors">{doctors.filter((doctor) => `${doctor.name} ${doctor.email}`.toLowerCase().includes(search.toLowerCase())).map((doctor) => <label key={doctor.id}><input type="checkbox" checked={options.doctorIds.includes(doctor.id)} disabled={busy} onChange={(event) => set('doctorIds', event.target.checked ? [...options.doctorIds, doctor.id] : options.doctorIds.filter((id) => id !== doctor.id))} />{doctor.name} — {doctor.email}</label>)}</div>
        </div>
      </>}
    </>}
    </div>
    {options && <footer className="roster-settings-footer"><span><Shield size={16} aria-hidden="true" />{ar ? 'التغييرات تُطبّق بعد الحفظ' : 'Changes take effect after saving'}</span><button type="button" className="roster-primary-button" disabled={busy} onClick={save}>{busy ? <Settings2 size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}{busy ? (ar ? 'جاري الحفظ…' : 'Saving…') : (ar ? 'حفظ إعدادات القائمة' : 'Save roster settings')}</button></footer>}
  </section>;
}
