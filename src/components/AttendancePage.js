import React, { useState, useMemo, useCallback } from 'react';
import { COURSES } from './LectureControl';

// ── Real .xlsx export via SheetJS (loaded from CDN in index.html) ──
function downloadXLSX(rows, headers, filename) {
  const XLSX = window.XLSX;
  if (!XLSX) { alert('Excel library not loaded yet. Please refresh the page.'); return; }

  // Build array-of-arrays: header row first, then data
  const aoaData = [
    headers,
    ...rows.map(r => headers.map(h => r[h] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Auto-fit column widths
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)) + 2,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, filename);
}

// ── Avatar colour palette (shared with AttendanceList) ──────────────
const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'], ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'], ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'], ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'], ['#0891b2', '#22d3ee'],
];
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

// ── Seed data: attendance records per lecture session ────────────────
// Key format:  `${courseId}__${section}__${week}`
const SEED_RECORDS = {
  'CS101__A__1': [
    { id: '20201001', name: 'Ahmed Safan',    universityId: '20201001', scanTime: '08:15:02 AM' },
    { id: '20201002', name: 'Liam Carter',    universityId: '20201002', scanTime: '08:16:45 AM' },
    { id: '20201003', name: 'Sara Hassan',    universityId: '20201003', scanTime: '08:17:10 AM' },
  ],
  'CS101__B__2': [
    { id: '20201010', name: 'Omar Khalid',    universityId: '20201010', scanTime: '09:02:33 AM' },
  ],
  'CS201__A__3': [
    { id: '20201020', name: 'Nora Ali',       universityId: '20201020', scanTime: '10:05:11 AM' },
    { id: '20201021', name: 'Karim Samir',    universityId: '20201021', scanTime: '10:06:58 AM' },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// AttendancePage Component
// Receives `allSessions` (live sessions from App.js) and merges them
// with the SEED_RECORDS so both real scans and demo data appear.
// ─────────────────────────────────────────────────────────────────────
const AttendancePage = ({ allSessions = {} }) => {
  // ── Filter state ──────────────────────────────────────────────
  const [filterCourse,  setFilterCourse]  = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterWeek,    setFilterWeek]    = useState('');

  // ── Manual-add state ──────────────────────────────────────────
  const [addId,   setAddId]   = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState('');

  // ── Local override records (additions / deletions) ────────────
  const [localOverrides, setLocalOverrides] = useState({});

  // ── Derived: all records for the selected session ─────────────
  const sessionKey = filterCourse && filterSection && filterWeek
    ? `${filterCourse}__${filterSection}__${filterWeek}`
    : null;

  const students = useMemo(() => {
    if (!sessionKey) return [];

    // Merge seed + live + local overrides
    const seed  = SEED_RECORDS[sessionKey]  || [];
    const live  = allSessions[sessionKey]   || [];
    const local = localOverrides[sessionKey] || [];

    // Build a map id → student, with local additions taking priority
    const map = new Map();
    [...seed, ...live].forEach(s => map.set(s.id, s));
    local.forEach(s => {
      if (s._deleted) {
        map.delete(s.id);
      } else {
        map.set(s.id, s);
      }
    });
    return [...map.values()];
  }, [sessionKey, allSessions, localOverrides]);

  // ── Helpers ────────────────────────────────────────────────────
  const course   = COURSES.find(c => c.id === filterCourse);
  const sections = course ? course.sections : [];

  const handleCourseChange = (val) => {
    setFilterCourse(val);
    setFilterSection('');
    setFilterWeek('');
  };

  const handleDelete = (studentId) => {
    if (!sessionKey) return;
    setLocalOverrides(prev => {
      const existing = prev[sessionKey] || [];
      return {
        ...prev,
        [sessionKey]: [...existing.filter(s => s.id !== studentId), { id: studentId, _deleted: true }],
      };
    });
  };

  const handleAdd = () => {
    if (!sessionKey) return;
    const trimId   = addId.trim();
    const trimName = addName.trim();

    if (!trimId)   { setAddError('Student ID is required.'); return; }
    if (!trimName) { setAddError('Student name is required.'); return; }
    if (students.some(s => s.id === trimId)) {
      setAddError('A student with this ID already exists in this session.');
      return;
    }

    const newStudent = {
      id:           trimId,
      universityId: trimId,
      name:         trimName,
      scanTime:     new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
    };

    setLocalOverrides(prev => ({
      ...prev,
      [sessionKey]: [...(prev[sessionKey] || []).filter(s => s.id !== trimId), newStudent],
    }));

    setAddId('');
    setAddName('');
    setAddError('');
  };

  // ── Export current session ─────────────────────────────────────
  const handleExportSession = useCallback(() => {
    if (!sessionKey || students.length === 0) return;
    const headers = ['#', 'Name', 'Student ID', 'Scan Time', 'Course', 'Section', 'Week'];
    const rows = students.map((s, i) => ({
      '#': i + 1,
      'Name': s.name,
      'Student ID': s.universityId,
      'Scan Time': s.scanTime,
      'Course': filterCourse,
      'Section': filterSection,
      'Week': `Week ${filterWeek}`,
    }));
    downloadXLSX(rows, headers, `Attendance_${filterCourse}_Sec${filterSection}_Week${filterWeek}.xlsx`);
  }, [sessionKey, students, filterCourse, filterSection, filterWeek]);

  // ── Export ALL sessions for current course ─────────────────────
  const handleExportAll = useCallback(() => {
    if (!filterCourse) return;

    // Collect every session key that matches the selected course
    const allKeys = [
      ...Object.keys(SEED_RECORDS),
      ...Object.keys(allSessions),
    ].filter(k => k.startsWith(filterCourse + '__'));
    const unique = [...new Set(allKeys)];

    if (unique.length === 0) return;

    // Build one big flat list with all students from all sessions
    const rows = [];
    unique.forEach(key => {
      const [, sec, wk] = key.split('__');
      const seed  = SEED_RECORDS[key]  || [];
      const live  = allSessions[key]   || [];
      const local = localOverrides[key] || [];
      const map   = new Map();
      [...seed, ...live].forEach(s => map.set(s.id, s));
      local.forEach(s => { if (s._deleted) map.delete(s.id); else map.set(s.id, s); });

      [...map.values()].forEach((s, i) => {
        rows.push({
          '#': i + 1,
          'Name': s.name,
          'Student ID': s.universityId,
          'Scan Time': s.scanTime,
          'Course': filterCourse,
          'Section': sec,
          'Week': `Week ${wk}`,
        });
      });
    });

    if (rows.length === 0) return;
    const headers = ['#', 'Name', 'Student ID', 'Scan Time', 'Course', 'Section', 'Week'];
    downloadXLSX(rows, headers, `Attendance_${filterCourse}_AllSessions.xlsx`);
  }, [filterCourse, allSessions, localOverrides]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          📋 Attendance Records
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Select a course, section and week to view, add or remove students.
        </p>
      </div>

      {/* ── Filter row ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* Course */}
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">COURSE</label>
          <select
            className="form-select"
            value={filterCourse}
            onChange={e => handleCourseChange(e.target.value)}
          >
            <option value="">— All Courses —</option>
            {COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Section */}
        <div className="form-group" style={{ flex: '0 1 140px', marginBottom: 0 }}>
          <label className="form-label">SECTION</label>
          <select
            className="form-select"
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            disabled={!filterCourse}
          >
            <option value="">— Section —</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>

        {/* Week */}
        <div className="form-group" style={{ flex: '0 1 140px', marginBottom: 0 }}>
          <label className="form-label">WEEK</label>
          <select
            className="form-select"
            value={filterWeek}
            onChange={e => setFilterWeek(e.target.value)}
            disabled={!filterCourse}
          >
            <option value="">— Week —</option>
            {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {!sessionKey ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 300,
          color: 'var(--text-muted)', gap: 12,
        }}>
          <span style={{ fontSize: 48 }}>📂</span>
          <p style={{ fontSize: 14 }}>Select a Course, Section and Week to view records.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Export buttons row ────────────────────────── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleExportSession}
              disabled={students.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: students.length === 0 ? 0.4 : 1 }}
            >
              📥 Export This Week
            </button>
            <button
              className="btn"
              onClick={handleExportAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.3)',
                color: '#34d399', borderRadius: 8,
                padding: '0 16px', height: 42, cursor: 'pointer',
                fontWeight: 600, fontSize: 13,
              }}
            >
              📊 Export All Sessions
            </button>
          </div>

          {/* ── Stats bar ─────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 16, padding: '14px 18px',
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>COURSE</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{filterCourse}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SECTION</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Section {filterSection}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>WEEK</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Week {filterWeek}</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>PRESENT</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{students.length}</p>
            </div>
          </div>

          {/* ── Manual add form ───────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '16px 20px',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 1 }}>
              ADD STUDENT MANUALLY
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>STUDENT ID</label>
                <input
                  type="text"
                  className="form-select"
                  placeholder="e.g. 20201234"
                  value={addId}
                  onChange={e => { setAddId(e.target.value); setAddError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: '2 1 200px' }}>
                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>STUDENT NAME</label>
                <input
                  type="text"
                  className="form-select"
                  placeholder="e.g. Ahmed Safan"
                  value={addName}
                  onChange={e => { setAddName(e.target.value); setAddError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  style={{ width: '100%' }}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                style={{ flexShrink: 0, height: 42 }}
              >
                + Add Student
              </button>
            </div>
            {addError && (
              <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>⚠️ {addError}</p>
            )}
          </div>

          {/* ── Student list ──────────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr 120px 48px',
              gap: 12, padding: '10px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8,
            }}>
              <span>#</span>
              <span>NAME</span>
              <span>STUDENT ID</span>
              <span>SCAN TIME</span>
              <span></span>
            </div>

            {students.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '40px 20px', color: 'var(--text-muted)', gap: 10,
              }}>
                <span style={{ fontSize: 36 }}>🧑‍🎓</span>
                <p style={{ fontSize: 13 }}>No attendance records for this session yet.</p>
              </div>
            ) : (
              students.map((student, idx) => {
                const [c1, c2] = avatarColor(idx);
                return (
                  <div
                    key={student.id}
                    className="student-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 1fr 120px 48px',
                      gap: 12, padding: '12px 18px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Index */}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {idx + 1}
                    </span>

                    {/* Name + avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {student.name}
                      </span>
                    </div>

                    {/* ID */}
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {student.universityId}
                    </span>

                    {/* Scan time */}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {student.scanTime}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(student.id)}
                      title="Remove student"
                      style={{
                        background: 'rgba(239,68,68,0.10)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8,
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: 15,
                        width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.20)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.10)'}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
