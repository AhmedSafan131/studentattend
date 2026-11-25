import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Check, Download, Upload, UsersRound } from '../../../../assets/icons';
import { CustomBottom, CustomInput } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { useToast } from '../../../../hooks';
import BulkAttendanceMethods from '../../../../components/AttendanceWorkspace/BulkAttendanceMethods';

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '');
const acceptedHeaders = ['nationalid', 'nationalnumber', 'studentid', 'universityid', 'studentidornationalid', 'الرقمالقومي', 'الرقمالجامعي'];

const RecordStudent = ({ selectedSession, sessions = [], onRecordStudent, onRosterSaved, variant = 'manual' }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [studentId, setStudentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const copy = lang === 'ar'
    ? { title: 'تسجيل طالب', label: 'رقم الطالب', placeholder: 'الرقم الجامعي أو القومي أو البريد الإلكتروني', button: 'إضافة الطالب', adding: 'جاري الإضافة...', success: 'تم تسجيل الطالب في الجلسة المحددة.', failed: 'تعذر تسجيل الطالب', notFound: 'لم يتم العثور على الطالب.', notRegistered: 'الطالب غير مسجل في المادة والنوع والمجموعة المحددة.', hint: "\u062d\u062f\u062f \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062c\u0644\u0633\u0629 \u0623\u0648 \u0623\u0646\u0634\u0626 \u062c\u0644\u0633\u0629 \u0623\u0648\u0644\u0627\u064b \u0644\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0644\u0628.", selected: 'الجلسة المحددة', bulkTitle: 'إضافة طلاب من Excel', bulkDesc: 'استخدم قالب أرقام الطلاب الخاص بجلسة الحضور.', template: 'تحميل قالب الأرقام', upload: 'رفع شيت الطلاب', importing: 'جاري إضافة الطلاب...', missingColumn: 'يجب أن يحتوي الملف على عمود Student ID أو National ID.', emptySheet: 'لم يتم العثور على أرقام طلاب داخل الملف.', bulkDone: 'تمت إضافة {added} طالب، وتعذر إضافة {failed} طالب.' }
    : { title: 'Record Student', label: 'Student ID', placeholder: 'University ID, national ID, or email', button: 'Add student', adding: 'Adding...', success: 'Student recorded in the selected session.', failed: 'Could not record student', notFound: 'The student was not found.', notRegistered: 'The student is not registered in the selected subject, type, and group.', hint: 'Choose the session details or create a session first to add a student.', selected: 'Selected session', bulkTitle: 'Add students from Excel', bulkDesc: 'Use the same student-ID template as Flexible Attendance.', template: 'Download ID template', upload: 'Upload student sheet', importing: 'Adding students...', missingColumn: 'The sheet must contain a Student ID or National ID column.', emptySheet: 'No student IDs were found in the sheet.', bulkDone: 'Added {added} student(s); {failed} could not be added.' };
  const exportCopy = lang === 'ar'
    ? { studentData: 'بيانات الطالب', locked: 'غير قابل للتعديل', export: 'تصدير', exportAll: 'تصدير كل جلسات المادة', noData: 'لا توجد بيانات طلاب لتصديرها.' }
    : { studentData: 'Student details', locked: 'Locked', export: 'Export', exportAll: 'Export all subject sessions', noData: 'There are no student records to export.' };

  const translatedError = (error) => {
    const raw = error?.response?.data?.message || error?.message || '';
    if (/not found/i.test(raw)) return copy.notFound;
    if (/not registered/i.test(raw)) return copy.notRegistered;
    return lang === 'ar' ? copy.failed : (raw || copy.failed);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!studentId.trim() || !selectedSession || saving) return;
    setSaving(true);
    try {
      await onRecordStudent(studentId.trim());
      setStudentId('');
      showToast({ tone: 'success', title: copy.title, message: copy.success });
    } catch (error) {
      showToast({ tone: 'error', title: copy.failed, message: translatedError(error) });
    } finally { setSaving(false); }
  };
  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([{ 'Student ID or National ID': '' }]);
    worksheet['!cols'] = [{ wch: 24 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student IDs');
    XLSX.writeFile(workbook, 'Attendance_Student_ID_Template.xlsx');
  };
  const importStudents = async (file) => {
    if (!selectedSession || !file) return;
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = worksheet ? XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) : [];
      const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell || '').trim()));
      const headerRow = headerIndex >= 0 ? rows[headerIndex] : [];
      const idColumn = headerRow.findIndex((cell) => acceptedHeaders.includes(normalizeHeader(cell)));
      if (idColumn < 0) throw new Error(copy.missingColumn);
      const ids = [...new Set(rows.slice(headerIndex + 1).map((row) => String(row[idColumn] || '').trim()).filter(Boolean))];
      if (!ids.length) throw new Error(copy.emptySheet);
      const results = await Promise.allSettled(ids.map((id) => onRecordStudent(id)));
      const added = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - added;
      const message = copy.bulkDone.replace('{added}', added).replace('{failed}', failed);
      showToast({ tone: failed ? 'info' : 'success', title: copy.bulkTitle, message, duration: 5200 });
    } catch (error) {
      showToast({ tone: 'error', title: copy.bulkTitle, message: error.message || copy.failed });
    } finally { setImporting(false); }
  };
  const safeName = (value) => String(value || '').trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ');
  const exportSessions = (targetSessions, allSubjectSessions = false) => {
    const rows = targetSessions.flatMap((session) => (session.records || []).map((record, index) => ({
      '#': index + 1,
      'Student Name': record.studentName || '-',
      'Student ID': record.studentUniversityId || record.studentId || '-',
      Subject: session.subjectName || session.courseCode || '-',
      Type: session.lectureType || '-',
      Group: session.group || '-',
      Week: session.week || '-',
      'Scan Time': record.scannedAt ? new Date(record.scannedAt).toLocaleString() : '-',
      Status: session.status || '-',
    })));
    if (!rows.length) {
      showToast({ tone: 'info', title: exportCopy.export, message: exportCopy.noData });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    const subjectName = safeName(selectedSession?.subjectName || selectedSession?.courseCode || 'Attendance');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName(allSubjectSessions ? subjectName : `${subjectName}-${selectedSession?.week || ''}`).slice(0, 31));
    XLSX.writeFile(workbook, `${subjectName}${allSubjectSessions ? '-All-Sessions' : `-${safeName(selectedSession?.lectureType)}-${safeName(selectedSession?.group)}-${safeName(selectedSession?.week)}`}.xlsx`);
  };
  const exportSelectedSession = () => selectedSession && exportSessions([selectedSession]);
  const exportAllSubjectSessions = () => {
    if (!selectedSession) return;
    exportSessions(sessions.filter((session) => String(session.courseCode || '').toUpperCase() === String(selectedSession.courseCode || '').toUpperCase()), true);
  };

  return <div className={variant === 'bulk' ? 'attendance-bulk-content' : 'card doctor-dashboard-card dashboard-action-card'}>
    {variant === 'manual' && <>
    <div className="card-title doctor-dashboard-card-title"><span className="doctor-dashboard-card-title-icon"><UsersRound size={18} /></span>{copy.title}</div>
    {!selectedSession && <p className="dashboard-card-hint">{copy.hint}</p>}
    <form onSubmit={submit} className="dashboard-record-form">
      <CustomInput id="dashboard-student-id" name="studentId" label={copy.label} value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder={copy.placeholder} icon={() => <UsersRound size={16} />} disabled={!selectedSession || saving || importing} />
      <CustomBottom type="submit" text={copy.button} loading={saving} loadingText={copy.adding} disabled={!selectedSession || !studentId.trim() || saving || importing} rigthIcon={<Check size={16} />} minHeight={48} />
    </form>
    </>}
    {variant === 'bulk' && <BulkAttendanceMethods session={selectedSession} mode="dashboard" onSaved={onRosterSaved} disabled={saving || importing}>
    <div className="dashboard-bulk-box"><div><strong>{copy.bulkTitle}</strong><span>{copy.bulkDesc}</span></div><input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => { const [file] = event.target.files || []; if (file) importStudents(file); event.target.value = ''; }} /><div className="dashboard-bulk-actions"><CustomBottom type="button" text={copy.template} textStyle="dashboard-excel-button-text" onClick={downloadTemplate} disabled={importing} rigthIcon={<Download size={16} />} minHeight={46} buttonStyles="dashboard-excel-button dashboard-template-button" background="linear-gradient(135deg, #1e293b, #334155)" textColor="#ffffff" border="1px solid rgba(148,163,184,.28)" boxShadow="0 8px 20px rgba(2,6,23,.26)" disabledBackground="linear-gradient(135deg, #1e293b, #273449)" disabledTextColor="#ffffff" disabledOpacity={0.72} /><CustomBottom type="button" text={copy.upload} textStyle="dashboard-excel-button-text" onClick={() => fileInputRef.current?.click()} loading={importing} loadingText={copy.importing} disabled={!selectedSession || importing || saving} rigthIcon={<Upload size={16} />} minHeight={46} buttonStyles="dashboard-excel-button dashboard-upload-button" background="linear-gradient(135deg, #047857, #16a34a)" textColor="#ffffff" border="1px solid rgba(74,222,128,.38)" boxShadow="0 9px 22px rgba(5,150,105,.26)" disabledBackground="linear-gradient(135deg, #14532d, #166534)" disabledTextColor="#ffffff" disabledOpacity={0.72} /></div></div>
    </BulkAttendanceMethods>}
    {variant === 'manual' && <div className="dashboard-export-actions"><CustomBottom type="button" text={exportCopy.export} onClick={exportSelectedSession} disabled={!selectedSession?.records?.length} rigthIcon={<Download size={16} />} minHeight={46} buttonStyles="dashboard-export-button" background="linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.94))" textColor="#ffffff" disabledTextColor="#ffffff" disabledBackground="linear-gradient(135deg, #111827, #1e293b)" disabledOpacity={0.78} border="1px solid var(--border)" boxShadow="none" /><CustomBottom type="button" text={exportCopy.exportAll} onClick={exportAllSubjectSessions} disabled={!selectedSession} rigthIcon={<Download size={16} />} minHeight={46} buttonStyles="dashboard-export-button" background="linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.94))" textColor="#ffffff" disabledTextColor="#ffffff" disabledBackground="linear-gradient(135deg, #111827, #1e293b)" disabledOpacity={0.78} border="1px solid var(--border)" boxShadow="none" /></div>}
  </div>;
};

export default RecordStudent;
