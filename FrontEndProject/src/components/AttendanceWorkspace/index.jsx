import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, LayoutDashboard, Upload } from '../../assets/icons';
import { useLanguage } from '../../i18n';
import BulkSessionSelector from './BulkSessionSelector';
import { formatAcademicWeekDisplay } from '../../utils/academicWeek';
import './workspace.css';

export default function AttendanceWorkspace({ session, count = 0, controls, qr, manual, attendance, sessions, sessionsTitle, bulk, variant = 'dashboard', availableSessions = [], onSelectSession, createdSessionId = '', manageSessionId = createdSessionId, facultyOptions = [], subjectOptions = [], weekOptions = [], onBulkFacultyChange, onCreateBulkSession, onOpenBulkSession }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const id = useId();
  const [tab, setTab] = useState('manage');
  const selectedByTab = useRef({ bulk: '', sessions: '' });
  // Management follows the form details. The other tabs keep their own target.
  useEffect(() => {
    if (tab === 'manage' && (session?.id || '') !== manageSessionId) {
      onSelectSession?.(manageSessionId);
    }
  }, [manageSessionId, onSelectSession, session?.id, tab]);
  const changeTab = (next) => {
    if (next === tab) return;
    if (tab !== 'manage') selectedByTab.current[tab] = session?.id || '';
    const requestedId = next === 'manage' ? manageSessionId : selectedByTab.current[next];
    onSelectSession?.(availableSessions.some((item) => item.id === requestedId) ? requestedId : '');
    setTab(next);
  };
  const tabs = [
    { key: 'manage', label: ar ? 'إدارة الجلسة' : 'Manage session', icon: LayoutDashboard },
    { key: 'bulk', label: ar ? 'إضافة جماعية' : 'Bulk attendance', icon: Upload },
    { key: 'sessions', label: sessionsTitle || (ar ? 'جلساتي' : 'My sessions'), icon: BookOpen },
  ];
  const sessionLabel = (item) => `${item.subjectName || item.courseCode || item.subjectCode} · ${item.lectureType || ''} · ${ar ? 'المجموعة' : 'Group'} ${item.group || '-'} · ${formatAcademicWeekDisplay(item.week, lang)}`;
  const inlineFlexibleHistory = variant === 'flexible';
  const showDetails = Boolean(session) && (tab === 'sessions' || (tab === 'manage' && session.id === manageSessionId));
  return <div className="attendance-workspace" dir={ar ? 'rtl' : 'ltr'}>
    <div className="attendance-workspace-tabs" role="tablist" aria-label={ar ? 'أدوات الحضور' : 'Attendance tools'}>
      {tabs.map(({ key, label, icon: Icon }, index) => <button key={key} type="button" role="tab" id={`${id}-${key}-tab`} aria-controls={`${id}-panel`} aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => changeTab(key)} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const forward = (event.key === 'ArrowRight') !== ar;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (forward ? 1 : -1) + tabs.length) % tabs.length;
        changeTab(tabs[next].key); document.getElementById(`${id}-${tabs[next].key}-tab`)?.focus();
      }}><Icon size={18} aria-hidden="true" /><span>{label}</span>{key === tab && showDetails && count > 0 && <b>{count}</b>}</button>)}
    </div>
    <div role="tabpanel" className="attendance-manage-panel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}-tab`}>
      <div hidden={tab !== 'sessions'}>
        {inlineFlexibleHistory ? (
          <div className="attendance-inline-sessions-layout">
            <div className="attendance-inline-sessions-list">{sessions}</div>
            <div className="attendance-inline-session-details">
              {session ? <>
                <div className="attendance-history-heading"><div><strong>{sessionLabel(session)}</strong><small>{ar ? (session.status === 'open' || session.status === 'active' ? 'الجلسة مفتوحة' : 'الجلسة مغلقة') : (session.status === 'open' || session.status === 'active' ? 'Open session' : 'Closed session')}</small></div></div>
                <div className="attendance-inline-session-tools">{manual}{attendance}</div>
              </> : <div className="attendance-inline-session-placeholder">{ar ? 'اختر جلسة لعرض طلابها وإضافة طالب.' : 'Select a session to view its students and add a student.'}</div>}
            </div>
          </div>
        ) : <>
          <div hidden={Boolean(session)}>{sessions}</div>
          {session && <div className="attendance-history-heading"><button type="button" onClick={() => onSelectSession?.('')}>{ar ? 'الرجوع إلى جلساتي' : 'Back to my sessions'}</button><div><strong>{sessionLabel(session)}</strong><small>{ar ? (session.status === 'open' || session.status === 'active' ? 'الجلسة مفتوحة' : 'الجلسة مغلقة') : (session.status === 'open' || session.status === 'active' ? 'Open session' : 'Closed session')}</small></div></div>}
        </>}
      </div>
      <div className="top-row doctor-dashboard-top-row" hidden={tab !== 'manage'}>
        <div>{controls}</div>
        <div>{qr}</div>
      </div>
      <div hidden={tab !== 'bulk'} className="attendance-bulk-panel">
        <BulkSessionSelector sessions={availableSessions} selectedId={session?.id} onSelectSession={onSelectSession} facultyOptions={facultyOptions} subjectOptions={subjectOptions} weekOptions={weekOptions} onFacultyChange={onBulkFacultyChange} onCreateSession={onCreateBulkSession} onOpenSession={onOpenBulkSession} />
        {bulk}
      </div>
      {!(inlineFlexibleHistory && tab === 'sessions') ? <div className={`${variant === 'flexible' ? 'bottom-row doctor-dashboard-bottom-row attendance-manage-records-only' : 'doctor-dashboard-support-grid'}${tab === 'sessions' ? ' attendance-history-records' : ''}`} hidden={tab !== 'manage' && !showDetails}>
        {variant !== 'flexible' && <div hidden={tab !== 'manage'} className="doctor-dashboard-control-stack">{manual}</div>}
        {attendance}
      </div> : null}
    </div>
  </div>;
}
