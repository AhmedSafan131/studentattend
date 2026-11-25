import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks';
import { BookOpen, Check, ChevronLeft, ChevronRight, Search, Shield, Trash2, UsersRound, X } from '../../assets/icons';
import Pagination from '../Pagination';
import { rosterAPI } from './api';
import './roster.css';

const SAVE_CHUNK_SIZE = 100;
const errorText = (error, ar) => error?.response?.status === 403
  ? (ar ? 'الأدمن أوقف الميزة أو لم تعد متاحة لحسابك.' : 'This feature is disabled for your account.')
  : error?.response?.data?.message || (ar ? 'تعذر إتمام العملية. يمكنك إعادة المحاولة.' : 'Could not complete the request. Please retry.');

export default function AttendanceRoster({ session, mode, onSaved, disabled = false, onAvailabilityChange }) {
  const { selectedTermCode } = useSelector((state) => state.terms);
  const { user } = useAuth();
  return <Roster key={`${user?.id}-${selectedTermCode}-${mode}-${session?.id}`} session={session} mode={mode} onSaved={onSaved} disabled={disabled} onAvailabilityChange={onAvailabilityChange} />;
}

function Roster({ session, mode, onSaved, disabled, onAvailabilityChange }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], total: 0, lastPage: 1 });
  const [selected, setSelected] = useState({});
  const [onlySelected, setOnlySelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stage, setStage] = useState('list');
  const [revision, setRevision] = useState(0);
  const [resultSelectionIds, setResultSelectionIds] = useState([]);
  const count = Object.keys(selected).length;
  const rows = onlySelected ? Object.values(selected) : data.data;
  const visibleSelected = data.data.filter((student) => selected[student.id]).length;
  const selectablePage = data.data.filter((student) => !student.present);
  const selectedOnPage = selectablePage.filter((student) => selected[student.id]).length;
  const isPageSelected = selectablePage.length > 0 && selectedOnPage === selectablePage.length;
  const areResultsSelected = resultSelectionIds.length > 0 && resultSelectionIds.every((id) => selected[id]);
  const title = ar ? 'اختيار من قائمة الطلاب' : 'Select from student roster';
  const label = `${session?.subjectName || session?.courseCode || session?.subjectCode || ''} · ${session?.lectureType || ''} · ${session?.group || ''} · ${ar ? 'الأسبوع' : 'Week'} ${session?.week || ''}`;

  useEffect(() => { onAvailabilityChange?.(allowed); }, [allowed, onAvailabilityChange]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => rosterAPI.options().then((response) => {
      if (!cancelled) setAllowed(response.data.data[mode] === true);
    }).catch(() => { if (!cancelled) setAllowed(false); });
    refresh();
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; window.removeEventListener('focus', refresh); };
  }, [mode]);

  useEffect(() => {
    if (!open) return undefined;
    if (!dialog.current.open) dialog.current.showModal();
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      rosterAPI.list(mode, session.id, { search, page }).then((response) => {
        if (!cancelled) {
          setData(response.data);
          setSelected((previous) => {
            const next = { ...previous };
            response.data.data.forEach((student) => { if (student.present) delete next[student.id]; });
            return next;
          });
        }
      }).catch((requestError) => { if (!cancelled) setError(errorText(requestError, ar)); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, mode, session?.id, search, page, revision, ar]);

  useEffect(() => { setResultSelectionIds([]); }, [mode, session?.id, search, revision]);

  useEffect(() => {
    if (!open || !count) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, count]);

  const close = () => {
    if (busyRef.current) return;
    if (count && stage !== 'discard') { setStage('discard'); return; }
    dialog.current.close(); setOpen(false); setSelected({}); setStage('list'); setOnlySelected(false);
  };
  const toggle = (student) => setSelected((previous) => {
    const next = { ...previous };
    if (next[student.id]) delete next[student.id];
    else next[student.id] = student;
    return next;
  });
  const togglePage = () => setSelected((previous) => {
    const next = { ...previous };
    if (isPageSelected) selectablePage.forEach((student) => { delete next[student.id]; });
    else selectablePage.forEach((student) => { next[student.id] = student; });
    return next;
  });
  const toggleResults = async () => {
    if (busyRef.current) return;
    if (areResultsSelected) {
      setSelected((previous) => {
        const next = { ...previous };
        resultSelectionIds.forEach((id) => { delete next[id]; });
        return next;
      });
      return;
    }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const target = {};
      const firstResponse = await rosterAPI.list(mode, session.id, { search, page: 1, perPage: 500 });
      const resultPages = [firstResponse];
      for (let currentPage = 2; currentPage <= firstResponse.data.lastPage; currentPage += 1) {
        const response = await rosterAPI.list(mode, session.id, { search, page: currentPage, perPage: 500 });
        resultPages.push(response);
      }
      resultPages.forEach((response) => {
        response.data.data.forEach((student) => {
          if (!student.present) target[student.id] = student;
        });
      });
      const targetIds = Object.keys(target);
      const shouldDeselect = targetIds.length > 0 && targetIds.every((id) => selected[id]);
      setResultSelectionIds(targetIds);
      setSelected((previous) => {
        const next = { ...previous };
        if (shouldDeselect) targetIds.forEach((id) => { delete next[id]; });
        else targetIds.forEach((id) => { next[id] = target[id]; });
        return next;
      });
    } catch (requestError) { setError(errorText(requestError, ar)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    const results = [];
    try {
      const ids = Object.keys(selected);
      for (let offset = 0; offset < ids.length; offset += SAVE_CHUNK_SIZE) {
        const response = await rosterAPI.save(mode, session.id, ids.slice(offset, offset + SAVE_CHUNK_SIZE));
        results.push(...response.data.results);
        const completed = new Set(response.data.results.filter((result) => result.status !== 'failed').map((result) => result.id));
        setSelected((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => !completed.has(id))));
        setMessage(ar ? `تمت معالجة ${results.length} من ${ids.length} طالب…` : `Processed ${results.length} of ${ids.length} students…`);
      }
      const failed = results.filter((result) => result.status === 'failed');
      setMessage(ar
        ? `تم تسجيل ${results.filter((result) => result.status === 'added').length}، حاضر بالفعل ${results.filter((result) => result.status === 'existing').length}، تعذر تسجيل ${failed.length}.`
        : `Added ${results.filter((result) => result.status === 'added').length}; already present ${results.filter((result) => result.status === 'existing').length}; failed ${failed.length}.`);
      if (failed.length) setError(ar ? 'بعض الطلاب لم يعودوا مسجلين ضمن نطاق الجلسة. راجع المحددين.' : 'Some students are no longer registered in this session scope. Review selected students.');
    } catch (requestError) { setError(errorText(requestError, ar)); }
    finally {
      setStage('list'); setRevision((value) => value + 1);
      if (results.length) {
        try { await onSaved?.(); }
        catch { setError(ar ? 'تم الحفظ، لكن تعذر تحديث قائمة الحضور. أعد تحميل الصفحة.' : 'Saved, but attendance could not refresh. Reload the page.'); }
      }
      busyRef.current = false; setBusy(false);
    }
  };

  if (!allowed) return null;
  return <>
    <button type="button" className="roster-button" disabled={disabled || !session || session.status === 'migrated'} onClick={() => { setError(''); setMessage(''); setOpen(true); }}>
      <span className="roster-launch-icon" aria-hidden="true"><UsersRound size={21} /></span>
      <span className="roster-launch-copy"><strong>{title}</strong><small aria-hidden="true">{ar ? 'ابحث، حدّد، وسجّل الحضور بخطوة واحدة' : 'Find students, select and record attendance'}</small></span>
      <span className="roster-launch-arrow" aria-hidden="true">{ar ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}</span>
    </button>
    {open && <dialog ref={dialog} className="attendance-roster" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="roster-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      <header className="roster-header">
        <span className="roster-heading-icon" aria-hidden="true"><UsersRound size={25} /></span>
        <div className="roster-heading-copy"><span className="roster-eyebrow">{ar ? 'تسجيل الحضور' : 'ATTENDANCE WORKSPACE'}</span><h2 id="roster-title">{title}</h2><p>{ar ? 'كل طلاب الجلسة في مكان واحد. حدّد الحاضرين وراجع اختياراتك.' : 'Your session roster, ready to select and review.'}</p></div>
        <button type="button" className="roster-icon-button" aria-label={ar ? 'إغلاق' : 'Close'} disabled={busy} onClick={close}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="roster-session-bar"><BookOpen size={17} aria-hidden="true" /><span>{label}</span><span className="roster-session-tag">{ar ? (mode === 'flexible' ? 'حضور مرن' : 'جلسة المادة') : (mode === 'flexible' ? 'Flexible session' : 'Course session')}</span></div>
      <div className={`roster-content${stage === 'list' ? ' is-list' : ''}`}>
      {error && <p role="alert" className="roster-notice roster-error"><Shield size={18} aria-hidden="true" />{error}</p>}
      {message && <p role="status" className="roster-notice roster-success"><Check size={18} aria-hidden="true" />{message}</p>}
      {stage === 'discard' ? <section className="roster-review"><span className="roster-review-icon roster-review-warning" aria-hidden="true"><Trash2 size={30} /></span><h3>{ar ? 'عندك اختيارات لم تُحفظ' : 'You have unsaved selections'}</h3><p>{ar ? 'فيه اختيارات لم تُحفظ. هل تريد إغلاق القائمة وفقدها؟' : 'Discard unsaved selections and close?'}</p><div className="roster-review-actions"><button type="button" className="roster-danger-button" onClick={close}>{ar ? 'إغلاق وفقد الاختيارات' : 'Discard and close'}</button><button type="button" onClick={() => setStage('list')}>{ar ? 'الرجوع' : 'Back'}</button></div></section>
        : stage === 'confirm' ? <section className="roster-review"><span className="roster-review-icon" aria-hidden="true"><Check size={34} /></span><span className="roster-eyebrow">{ar ? 'الخطوة الأخيرة' : 'READY TO RECORD'}</span><h3>{ar ? `تأكيد تسجيل حضور ${count} طالب؟` : `Record attendance for ${count} students?`}</h3><p className="roster-review-session">{label}</p><p>{ar ? 'سيتم التحقق من التسجيل والحضور مرة أخرى قبل الحفظ.' : 'Registration and existing attendance will be checked again before saving.'}</p><div className="roster-review-actions"><button type="button" className="roster-primary-button" disabled={busy} onClick={save}><Check size={18} aria-hidden="true" />{busy ? (ar ? 'جاري الحفظ…' : 'Saving…') : (ar ? 'تأكيد تسجيل الحضور' : 'Confirm attendance')}</button><button type="button" disabled={busy} onClick={() => setStage('list')}>{ar ? 'رجوع للمراجعة' : 'Back to review'}</button></div></section>
          : <>
            <div className="roster-controls-row">
              <div className="roster-filters"><label>{ar ? 'بحث بالاسم أو الرقم القومي أو الأكاديمي' : 'Search by name, national ID, or academic ID'}<span className="roster-field"><Search size={19} aria-hidden="true" /><input placeholder={ar ? 'اكتب اسم الطالب أو رقمه القومي أو الأكاديمي…' : 'Search by name, national ID, or academic ID…'} value={search} disabled={busy} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></span></label></div>
              <div className="roster-selection-panel"><div><span className="roster-selection-number">{count}</span><strong>{ar ? 'طالب محدد للحضور' : 'students selected'}</strong></div><button type="button" className={onlySelected ? 'roster-active-button' : ''} disabled={busy} onClick={() => setOnlySelected(!onlySelected)}><UsersRound size={16} aria-hidden="true" />{onlySelected ? (ar ? 'عرض نتائج البحث' : 'Show search results') : (ar ? 'عرض المحددين' : 'Show selected')}</button></div>
            </div>
            <div className="roster-tools"><button type="button" className={isPageSelected ? 'roster-active-button' : ''} disabled={busy || loading || onlySelected || !selectablePage.length} onClick={togglePage}><Check size={16} aria-hidden="true" />{ar ? `${isPageSelected ? 'إلغاء تحديد الصفحة' : 'تحديد الصفحة'} — ${selectedOnPage}/${selectablePage.length}` : `${isPageSelected ? 'Deselect page' : 'Select page'} — ${selectedOnPage}/${selectablePage.length}`}</button><button type="button" className={areResultsSelected ? 'roster-active-button' : ''} disabled={busy || loading || onlySelected || !data.total} onClick={toggleResults}>{ar ? (areResultsSelected ? `إلغاء تحديد النتائج — ${resultSelectionIds.length}` : `تحديد كل النتائج — ${data.total}`) : (areResultsSelected ? `Deselect results — ${resultSelectionIds.length}` : `Select all results — ${data.total}`)}</button></div>
            <p className="roster-selection-meta">{ar ? `المحددون: ${count} — في الصفحة الحالية: ${selectedOnPage} — خارجها: ${count - visibleSelected} — إجمالي نتائج البحث: ${data.total}` : `Selected: ${count} — on this page: ${selectedOnPage} — outside: ${count - visibleSelected} — total search results: ${data.total}`}</p>
            <div className="roster-list-heading"><strong>{ar ? (onlySelected ? 'الطلاب المحددون' : 'قائمة الطلاب') : (onlySelected ? 'Selected students' : 'Student roster')}</strong><span>{ar ? 'الرقم القومي' : 'National ID'}</span><span>{ar ? 'المجموعة' : 'Group'}</span><span>{ar ? 'الحالة' : 'Status'}</span></div>
            <div className="roster-rows" aria-busy={loading || busy}>
              {loading && !onlySelected ? <div className="roster-empty"><span className="roster-spinner" aria-hidden="true" /><p role="status">{ar ? 'جاري تحميل الطلاب…' : 'Loading students…'}</p></div> : rows.length ? rows.map((student) => <label className={`roster-row${selected[student.id] ? ' is-selected' : ''}${student.present ? ' is-present' : ''}`} key={student.id}><input type="checkbox" checked={!!selected[student.id]} disabled={busy || student.present} onChange={() => toggle(student)} /><span className="roster-avatar" aria-hidden="true">{student.name.trim().slice(0, 1)}</span><span className="roster-student-copy"><strong>{student.name}</strong><small className="roster-student-id"><bdi>{student.nationalId || (ar ? 'غير مسجل' : 'Not recorded')}</bdi></small><small className="roster-student-group"><span className="roster-mobile-group-label">{ar ? '\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a' : 'Groups'}: </span>{student.groups.length ? student.groups.join(', ') : (student.isRegistered ? (ar ? 'بدون مجموعة' : 'No group') : (ar ? 'غير مسجل بالمادة' : 'Not registered in course'))}</small></span>{student.present ? <span className="roster-present-badge"><Check size={13} aria-hidden="true" />{ar ? 'حاضر بالفعل' : 'Already present'}</span> : selected[student.id] ? <span className="roster-picked-dot" aria-hidden="true"><Check size={15} />{ar ? '\u0645\u062d\u062f\u062f' : 'Selected'}</span> : <span className="roster-unselected" aria-hidden="true">{ar ? '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f' : 'Not selected'}</span>}</label>) : <div className="roster-empty"><span className="roster-empty-icon" aria-hidden="true"><Search size={28} /></span><p>{ar ? 'لا يوجد طلاب لعرضهم.' : 'No students to display.'}</p><small>{ar ? 'جرّب تغيير البحث، أو راجع قائمة المحددين.' : 'Try another search or review your selections.'}</small></div>}
            </div>
            <p className="roster-hint"><Shield size={15} aria-hidden="true" />{ar ? 'الحاضرون بالفعل لا يدخلون في التحديد، ويتم حفظ المحددين على دفعات آمنة تلقائيًا.' : 'Students already present are excluded; selected students are saved in safe batches automatically.'}</p>
          </>}
      </div>
      {stage === 'list' && <footer className="roster-footer">{!onlySelected ? <div className="roster-pagination-wrap"><span className="roster-pagination-total">{ar ? `${data.total} طالب` : `${data.total} students`}</span><Pagination id="attendance-roster-pagination" currentPage={page} totalPages={data.lastPage} onPageChange={(nextPage) => { if (!busy && !loading) setPage(nextPage); }} /></div> : <span className="roster-footer-label">{ar ? 'راجع اختياراتك قبل التسجيل' : 'Review your selection before recording'}</span>}<button type="button" className="roster-primary-button" disabled={busy || loading || !count} onClick={() => setStage('confirm')}><Check size={18} aria-hidden="true" />{ar ? `تسجيل حضور ${count} طالب` : `Record ${count} students`}</button></footer>}
    </dialog>}
  </>;
}
