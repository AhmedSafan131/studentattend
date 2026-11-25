import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Square, Users, X } from '../../../../assets/icons';
import { ConfirmationDialog, CustomBottom, CustomInput } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { useToast } from '../../../../hooks';
import { formatAcademicWeekDisplay } from '../../../../utils/academicWeek';

const normalize = (value) => String(value || '').trim().toUpperCase();

const MySessions = ({ sessions, activeSessionId, selectedSessionId, onSelectSession, onDeleteSession, onCloseAllSessions }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [expandedSubjects, setExpandedSubjects] = useState(() => new Set());
  const [pendingSession, setPendingSession] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [closeAllPending, setCloseAllPending] = useState(false);
  const [closingAll, setClosingAll] = useState(false);
  const [search, setSearch] = useState('');
  const subjectCardsRef = useRef(new Map());
  const scrollTimerRef = useRef(null);
  const copy = lang === 'ar'
    ? { title: 'جلساتي', empty: 'لا توجد جلسات بعد.', active: 'مفتوحة', ended: 'مغلقة', students: 'طالب', session: 'جلسة', group: 'المجموعة', week: 'الأسبوع', delete: 'حذف الجلسة', deleteTitle: 'حذف جلسة الحضور؟', deleteMessage: 'سيتم حذف الجلسة وكل سجلات الحضور الموجودة بداخلها.', deleted: 'تم حذف الجلسة.', failed: 'تعذر حذف الجلسة.', activeDelete: 'أنهِ جلسة الحضور المفتوحة قبل حذفها.', cancel: 'إلغاء', deleting: 'جاري الحذف...', closeAll: 'إغلاق الكل', closeAllTitle: 'إغلاق جميع الجلسات المفتوحة؟', closeAllMessage: 'سيتم إيقاف كل جلسات الحضور الأساسي المفتوحة في الترم الحالي ولن تعمل رموز QR الخاصة بها.', closeAllDone: 'تم إغلاق جميع الجلسات المفتوحة.', closeAllFailed: 'تعذر إغلاق الجلسات المفتوحة.', closingAll: 'جاري الإغلاق...' }
    : { title: 'My Sessions', empty: 'No sessions yet.', active: 'Open', ended: 'Closed', students: 'students', session: 'session', group: 'Group', week: 'Week', delete: 'Delete session', deleteTitle: 'Delete attendance session?', deleteMessage: 'The session and all of its attendance records will be deleted.', deleted: 'Session deleted.', failed: 'Could not delete session.', activeDelete: 'End the active attendance session before deleting it.', cancel: 'Cancel', deleting: 'Deleting...', closeAll: 'Close all', closeAllTitle: 'Close all open sessions?', closeAllMessage: 'Every open main attendance session in the current term will be stopped and its QR code will no longer work.', closeAllDone: 'All open sessions were closed.', closeAllFailed: 'Could not close the open sessions.', closingAll: 'Closing...' };

  const subjects = useMemo(() => {
    const grouped = new Map();
    sessions.filter((session) => normalize(`${session.subjectName || ''} ${session.courseCode || ''} ${session.lectureType || ''} ${session.group || ''} ${session.week || ''}`).includes(normalize(search))).forEach((session) => {
      const key = normalize(session.courseCode || session.subjectName);
      if (!grouped.has(key)) grouped.set(key, { key, subjectName: session.subjectName || session.courseCode, sessions: [] });
      grouped.get(key).sessions.push(session);
    });
    return [...grouped.values()];
  }, [sessions, search]);
  useEffect(() => () => window.clearTimeout(scrollTimerRef.current), []);

  const toggleSubject = (key) => {
    const isOpening = !expandedSubjects.has(key);
    setExpandedSubjects((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

    if (isOpening) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        subjectCardsRef.current.get(key)?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        });
      }, 280);
    }
  };
  const confirmDelete = async () => {
    if (!pendingSession) return;
    setDeleting(true);
    try {
      await onDeleteSession(pendingSession.id);
      showToast({ tone: 'success', title: copy.delete, message: copy.deleted });
      setPendingSession(null);
    } catch (error) {
      const raw = error?.response?.data?.message || error?.message || '';
      showToast({ tone: 'error', title: copy.delete, message: /active attendance session/i.test(raw) ? copy.activeDelete : (lang === 'ar' ? copy.failed : (raw || copy.failed)) });
    } finally { setDeleting(false); }
  };
  const confirmCloseAll = async () => {
    setClosingAll(true);
    try {
      await onCloseAllSessions();
      showToast({ tone: 'success', title: copy.closeAll, message: copy.closeAllDone });
      setCloseAllPending(false);
    } catch (error) {
      showToast({ tone: 'error', title: copy.closeAll, message: lang === 'ar' ? copy.closeAllFailed : (error?.response?.data?.message || error?.message || copy.closeAllFailed) });
    } finally { setClosingAll(false); }
  };
  const hasOpenSessions = sessions.some((session) => session.status === 'active');

  return <>
    <div className="card doctor-dashboard-card dashboard-action-card dashboard-sessions-card">
      <div className="dashboard-sessions-heading"><div className="card-title doctor-dashboard-card-title"><span className="doctor-dashboard-card-title-icon"><BookOpen size={18} /></span>{copy.title}</div><div className="dashboard-close-all-sessions"><CustomBottom type="button" text={copy.closeAll} onClick={() => setCloseAllPending(true)} disabled={!hasOpenSessions || closingAll} loading={closingAll} loadingText={copy.closingAll} rigthIcon={<Square size={15} />} minHeight={42} background="linear-gradient(135deg, #d97706, #b45309)" border="1px solid rgba(251,191,36,.45)" boxShadow="0 8px 20px rgba(180,83,9,.22)" /></div></div>
      <CustomInput id="dashboard-sessions-search" name="sessionSearch" label={lang === 'ar' ? 'ابحث في جلساتك' : 'Search your sessions'} placeholder={lang === 'ar' ? 'المادة أو المجموعة أو الأسبوع' : 'Subject, group or week'} value={search} onChange={(event) => setSearch(event.target.value)} />
      {!subjects.length ? <p className="dashboard-card-hint">{search ? (lang === 'ar' ? 'لا توجد جلسات مطابقة للبحث.' : 'No matching sessions.') : copy.empty}</p> : <div className="dashboard-sessions-list">{subjects.map((subject) => {
        const expanded = expandedSubjects.has(subject.key);
        const totalStudents = subject.sessions.reduce((sum, session) => sum + Number(session.recordCount || 0), 0);
        const sessionsByType = subject.sessions.reduce((map, session) => { const type = session.lectureType || '-'; if (!map.has(type)) map.set(type, []); map.get(type).push(session); return map; }, new Map());
        return <div key={subject.key} ref={(node) => { if (node) subjectCardsRef.current.set(subject.key, node); else subjectCardsRef.current.delete(subject.key); }} className={`flexible-subject-card${expanded ? ' is-expanded' : ''}`}>
          <button type="button" className="dashboard-subject-toggle" onClick={() => toggleSubject(subject.key)} aria-expanded={expanded}><span><strong>{subject.subjectName}</strong><small>{subject.sessions.length} {copy.session} · {totalStudents} {copy.students}</small></span><span className={`dashboard-subject-chevron${expanded ? ' is-expanded' : ''}`}><ChevronDown size={18} /></span></button>
          {expanded ? <div className="flexible-subject-details dashboard-subject-sessions dashboard-subject-sessions-enter">{[...sessionsByType.entries()].map(([type, typeSessions]) => <div key={type} className="flexible-session-type"><strong className="flexible-session-type-title">{type}</strong>{typeSessions.map((session) => {
            const selected = session.id === selectedSessionId;
            const active = session.id === activeSessionId || session.status === 'active';
            return <div key={session.id} className={`flexible-session-item dashboard-session-row${selected ? ' is-selected' : ''}`}><button type="button" className="dashboard-session-select" onClick={() => onSelectSession(session.id)}><span><strong>Group {session.group || '-'} - {formatAcademicWeekDisplay(session.week, lang)}</strong><small><Users size={13} /> {session.recordCount || 0} {copy.students}</small></span></button><span className="dashboard-session-state">{selected ? <i className="flexible-session-selected-mark"><Check size={14} /></i> : null}<b className={active ? 'is-open' : 'is-closed'}>{active ? copy.active : copy.ended}</b><button type="button" className="dashboard-session-delete" onClick={() => setPendingSession(session)} disabled={active || deleting} title={active ? copy.activeDelete : copy.delete}><X size={14} /></button></span></div>;
          })}</div>)}</div> : null}
        </div>;
      })}</div>}
    </div>
    <ConfirmationDialog isOpen={Boolean(pendingSession)} onClose={() => setPendingSession(null)} onConfirm={confirmDelete} title={copy.deleteTitle} message={copy.deleteMessage} confirmText={copy.delete} cancelText={copy.cancel} loading={deleting} loadingText={copy.deleting} tone="danger" />
    <ConfirmationDialog isOpen={closeAllPending} onClose={() => setCloseAllPending(false)} onConfirm={confirmCloseAll} title={copy.closeAllTitle} message={copy.closeAllMessage} confirmText={copy.closeAll} cancelText={copy.cancel} loading={closingAll} loadingText={copy.closingAll} tone="danger" compactTypography />
  </>;
};

export default MySessions;
