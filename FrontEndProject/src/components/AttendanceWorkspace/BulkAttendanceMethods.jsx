import React, { useCallback, useId, useState } from 'react';
import { Upload, UsersRound } from '../../assets/icons';
import { useLanguage } from '../../i18n';
import AttendanceRoster from '../AttendanceRoster';
import './workspace.css';

export default function BulkAttendanceMethods({ session, mode, onSaved, disabled, children }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const id = useId();
  const [allowed, setAllowed] = useState(false);
  const [method, setMethod] = useState('list');
  const availability = useCallback((value) => {
    setAllowed((current) => {
      if (value && !current) setMethod('list');
      if (!value) setMethod('excel');
      return value;
    });
  }, []);
  return <section className="attendance-bulk-methods">
    <div className="attendance-bulk-intro"><h2>{ar ? 'إضافة طلاب للحضور' : 'Add students to attendance'}</h2><p>{ar ? 'اختر الطريقة الأنسب لك، والإضافة هتكون في الجلسة المحددة فوق.' : 'Choose a method to record attendance in the session shown above.'}</p></div>
    <div className="attendance-method-switch" role="group" aria-label={ar ? 'طريقة الإضافة الجماعية' : 'Bulk attendance method'}>
      {allowed && <button type="button" aria-pressed={method === 'list'} aria-controls={`${id}-list`} onClick={() => setMethod('list')}><UsersRound size={18} aria-hidden="true" />{ar ? 'من قائمة الطلاب' : 'Student roster'}</button>}
      <button type="button" aria-pressed={method === 'excel'} aria-controls={`${id}-excel`} onClick={() => setMethod('excel')}><Upload size={18} aria-hidden="true" />{ar ? 'رفع Excel' : 'Upload Excel'}</button>
    </div>
    <div id={`${id}-list`} hidden={!allowed || method !== 'list'}><AttendanceRoster session={session} mode={mode} onSaved={onSaved} disabled={disabled} onAvailabilityChange={availability} /></div>
    <div id={`${id}-excel`} hidden={method !== 'excel'}>{children}</div>
  </section>;
}
