import React, { useState } from 'react';
import { ScanLine, Users, X } from '../../../../assets/icons';
import { ConfirmationDialog } from '../../../../components';
import { useToast } from '../../../../hooks';
import { useLanguage } from '../../../../i18n';

const AttendanceList = ({ students, lectureActive, selectedSession, onDeleteStudent }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [pendingStudent, setPendingStudent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const copy = lang === 'ar' ? {
    title: 'سجل الحضور', description: 'الطلاب المسجلون داخل جلسة الحضور الحالية.', present: 'حاضر',
    student: 'الطالب', universityId: 'الرقم الجامعي', time: 'الوقت', action: 'إجراء', remove: 'حذف الطالب', confirmTitle: 'حذف سجل الحضور؟', confirmMessage: 'سيتم حذف الطالب من حضور هذه الجلسة.', deleted: 'تم حذف الطالب من الجلسة.', deleteFailed: 'تعذر حذف الطالب من الجلسة.', cancel: 'إلغاء', deleting: 'جاري الحذف...',
    empty: lectureActive ? 'في انتظار تسجيل الطلاب أو مسح رمز QR.' : 'ابدأ جلسة حضور لعرض الطلاب هنا.',
  } : {
    title: 'Attendance history', description: 'Students recorded inside the current attendance session.', present: 'present',
    student: 'Student', universityId: 'University ID', time: 'Time', action: 'Action', remove: 'Remove student', confirmTitle: 'Delete attendance record?', confirmMessage: 'This student will be removed from this session attendance.', deleted: 'Student removed from the session.', deleteFailed: 'Could not remove the student from the session.', cancel: 'Cancel', deleting: 'Deleting...',
    empty: lectureActive ? 'Waiting for students to scan the QR or be recorded.' : 'Start an attendance session to show students here.',
  };
  const confirmDelete = async () => {
    if (!pendingStudent) return;
    setDeleting(true);
    try {
      await onDeleteStudent(pendingStudent);
      showToast({ tone: 'success', title: copy.remove, message: copy.deleted });
      setPendingStudent(null);
    } catch (error) {
      showToast({ tone: 'error', title: copy.remove, message: lang === 'ar' ? copy.deleteFailed : (error?.response?.data?.message || error.message || copy.deleteFailed) });
    } finally { setDeleting(false); }
  };

  return (
    <>
    <div className="card doctor-dashboard-card dashboard-roster-card">
      <div className="dashboard-roster-heading">
        <div><div className="card-title doctor-dashboard-card-title"><span className="doctor-dashboard-card-title-icon"><Users size={18} /></span>{copy.title}</div><p>{selectedSession ? `${selectedSession.subjectName || selectedSession.courseCode} · ${selectedSession.lectureType} · ${selectedSession.group} · ${selectedSession.week}` : copy.description}</p></div>
        <strong>{students.length} {copy.present}</strong>
      </div>
      {!students.length ? <div className="empty-list doctor-empty-list"><span className="empty-list-icon"><ScanLine size={34} /></span><p>{!selectedSession ? (lang === 'ar' ? 'اختر جلسة من «جلساتي» أو ابدأ جلسة جديدة لعرض الحضور.' : 'Choose a session from My sessions or start a new one to view attendance.') : copy.empty}</p></div> : (
        <div className="dashboard-roster-scroll"><div className="dashboard-roster-table">
          <div className="dashboard-roster-row dashboard-roster-header"><span>#</span><span>{copy.student}</span><span>{copy.universityId}</span><span>{copy.time}</span><span>{copy.action}</span></div>
          {[...students].reverse().map((student, index) => <div key={`${student.attendanceRecordId || student.id}-${index}`} className="dashboard-roster-row"><span>{students.length - index}</span><strong>{student.name || 'Unknown Student'}</strong><span className="dashboard-roster-id">{student.universityId || '-'}</span><span>{student.scanTime || '-'}</span><button type="button" className="dashboard-roster-delete" onClick={() => setPendingStudent(student)} disabled={!student.attendanceRecordId || deleting} title={copy.remove}><X size={15} /></button></div>)}
        </div></div>
      )}
    </div>
    <ConfirmationDialog isOpen={Boolean(pendingStudent)} onClose={() => setPendingStudent(null)} onConfirm={confirmDelete} title={copy.confirmTitle} message={copy.confirmMessage} confirmText={copy.remove} cancelText={copy.cancel} loading={deleting} loadingText={copy.deleting} tone="danger" />
    </>
  );
};
export default AttendanceList;
