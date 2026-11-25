import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../i18n';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../hooks';
import { attendanceAPI } from '../../../utils/api';
import {
  getScopedCourseLabel,
  getScopedCourses,
  getScopedLectureTypes,
  isDoctorRole,
  SESSION_TYPE_OPTIONS,
} from '../../../utils/courseAccess';

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'], ['#2563eb', '#60a5fa'], ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'], ['#d97706', '#fbbf24'], ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'], ['#0891b2', '#22d3ee'],
];

const normalizeLookup = (value) => String(value || '').trim().toUpperCase();
const normalizeGroup = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/^GROUP\s+/, '')
  .replace(/^GRP\s+/, '');
const normalizeWeek = (value) => {
  const match = String(value || '').match(/\d+/);
  return match ? String(Number(match[0])) : String(value || '').trim();
};

const ReportsPage = () => {
  const { isRTL } = useLanguage();
  const { user, reportCourses, students } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLectureType, setSelectedLectureType] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const displayCourses = useMemo(
    () => getScopedCourses({ userRole: user?.userRole, assignedCourses: reportCourses, students }),
    [reportCourses, students, user?.userRole],
  );
  const course = displayCourses.find((item) => item.id === selectedCourse);
  const sections = course ? (course.sections || ['A']) : [];
  const allowedLectureTypes = getScopedLectureTypes({
    userRole: user?.userRole,
    assignedCourses: reportCourses,
    courseId: selectedCourse,
  });
  const lectureTypes = isDoctorRole(user?.userRole) ? allowedLectureTypes : SESSION_TYPE_OPTIONS;

  useEffect(() => {
    if (!user?.token || user?.userRole === 'student') {
      setAttendanceRows([]);
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    attendanceAPI.getAll()
      .then((response) => {
        if (!isMounted) return;
        setAttendanceRows(Array.isArray(response?.data?.data) ? response.data.data : []);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setAttendanceRows([]);
        setError(requestError?.response?.data?.message || requestError?.message || 'Could not load attendance reports.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.token, user?.userRole]);

  const sessionData = useMemo(() => (
    attendanceRows.filter((row) => (
      normalizeLookup(row.courseCode) === normalizeLookup(selectedCourse)
      && normalizeLookup(row.lectureType) === normalizeLookup(selectedLectureType)
      && normalizeGroup(row.group) === normalizeGroup(selectedSection)
      && normalizeWeek(row.week) === normalizeWeek(selectedWeek)
    ))
  ), [attendanceRows, selectedCourse, selectedLectureType, selectedSection, selectedWeek]);

  const totalRegistered = useMemo(() => (
    students.filter((student) => (
      (student.registrations || []).some((registration) => (
        normalizeLookup(registration.subjectCode) === normalizeLookup(selectedCourse)
        && normalizeLookup(registration.type || 'Lecture') === normalizeLookup(selectedLectureType)
        && normalizeGroup(registration.group) === normalizeGroup(selectedSection)
      ))
    )).length
  ), [selectedCourse, selectedLectureType, selectedSection, students]);

  const presentCount = sessionData.length;
  const absentCount = Math.max(0, totalRegistered - presentCount);
  const pct = totalRegistered ? Math.round((presentCount / totalRegistered) * 100) : 0;
  const allFiltersSet = selectedCourse && selectedLectureType && selectedSection && selectedWeek;

  const handleExportExcel = () => {
    if (!sessionData.length) return;

    const rows = sessionData.map((student, index) => ({
      '#': index + 1,
      'Student Name': student.studentName,
      'University ID': student.studentUniversityId,
      'Time Scanned': student.time,
      Status: 'Present',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedLectureType} ${selectedSection} - Week ${selectedWeek}`);
    XLSX.writeFile(wb, `Report_${selectedCourse}_${selectedLectureType}_Group${selectedSection}_Week${selectedWeek}.xlsx`);
  };

  return (
    <div className="page-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="page-header">
        <h1 className="page-title">Attendance Reports</h1>
        <p className="page-subtitle">Filter by course, type, group, and week to generate a detailed attendance report.</p>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><span>Search</span> Report Filters</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">COURSE</label>
            <select className="form-select" value={selectedCourse}
              onChange={e => { setSelectedCourse(e.target.value); setSelectedLectureType(''); setSelectedSection(''); setSelectedWeek(''); }}>
              <option value="">Select Course</option>
              {displayCourses.map(c => (
                <option key={c.id} value={c.id}>{getScopedCourseLabel(c)}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">TYPE</label>
            <select className="form-select" value={selectedLectureType}
              onChange={e => { setSelectedLectureType(e.target.value); setSelectedSection(''); setSelectedWeek(''); }} disabled={!selectedCourse}>
              <option value="">Select Type</option>
              {lectureTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">GROUP</label>
            <select className="form-select" value={selectedSection}
              onChange={e => { setSelectedSection(e.target.value); setSelectedWeek(''); }} disabled={!selectedCourse || !selectedLectureType}>
              <option value="">Select Group</option>
              {sections.map(s => <option key={s} value={s}>Group {s}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">WEEK</label>
            <select className="form-select" value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)} disabled={!selectedCourse || !selectedLectureType || !selectedSection}>
              <option value="">Select Week</option>
              {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 24, color: '#fca5a5' }}>
          {error}
        </div>
      ) : null}

      {!allFiltersSet ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Select filters above to generate a report</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Loading report...</p>
        </div>
      ) : !sessionData.length ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No records found</p>
          <p style={{ fontSize: 13 }}>No attendance was recorded for this subject, type, group, and week yet.</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 4 }}><span>Report</span> {course?.name || selectedCourse}</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedLectureType} · Group {selectedSection} · Week {selectedWeek}</p>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 18px' }} onClick={handleExportExcel}>
              Export Excel
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Present', value: presentCount, color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
              { label: 'Absent', value: absentCount, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
              { label: 'Total', value: totalRegistered, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
              { label: 'Rate', value: `${pct}%`, color: pct >= 70 ? '#34d399' : '#f59e0b', bg: 'rgba(165,243,252,0.05)', border: 'rgba(165,243,252,0.15)' },
            ].map((summary) => (
              <div key={summary.label} style={{ background: summary.bg, border: `1px solid ${summary.border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: summary.color, marginBottom: 6, letterSpacing: 0.5 }}>{summary.label.toUpperCase()}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{summary.value}</div>
              </div>
            ))}
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>University ID</th>
                  <th>Time Scanned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionData.map((student, idx) => {
                  const [c1, c2] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <tr key={student.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg,${c1},${c2})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, color: '#fff'
                          }}>
                            {(student.studentName || '?').charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student.studentName}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{student.studentUniversityId}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{student.time}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: 'rgba(52,211,153,0.15)', color: '#34d399'
                        }}>
                          PRESENT
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
