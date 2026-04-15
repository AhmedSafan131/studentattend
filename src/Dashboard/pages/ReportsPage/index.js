import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';
import * as XLSX from 'xlsx';
import { useAuth, useDashboard } from '../../../hooks';

// ── Seed mock data ────────────────────────────────────────────────
const SEED_SESSIONS = {
  'CS301__A__6': [
    { id: '20201001', name: 'Ahmed Safan',       universityId: '20201001', scanTime: '10:05:12 AM', status: 'present' },
    { id: '20201002', name: 'Liam Carter',        universityId: '20201002', scanTime: '10:06:44 AM', status: 'present' },
    { id: '20201003', name: 'Sara Mohamed',       universityId: '20201003', scanTime: '10:08:01 AM', status: 'present' },
    { id: '20201004', name: 'Omar Hassan',        universityId: '20201004', scanTime: '10:09:30 AM', status: 'present' },
    { id: '20201005', name: 'Nour Khalil',        universityId: '20201005', scanTime: '10:11:55 AM', status: 'present' },
    { id: '20201006', name: 'Youssef Adel',       universityId: '20201006', scanTime: '10:14:02 AM', status: 'present' },
    { id: '20201007', name: 'Farah El-Sayed',     universityId: '20201007', scanTime: '10:15:18 AM', status: 'present' },
  ],
  'CS301__B__6': [
    { id: '20201010', name: 'Ali Mahmoud',        universityId: '20201010', scanTime: '11:02:05 AM', status: 'present' },
    { id: '20201011', name: 'Dina Ramzy',         universityId: '20201011', scanTime: '11:04:47 AM', status: 'present' },
    { id: '20201012', name: 'Tarek Ibrahim',      universityId: '20201012', scanTime: '11:05:33 AM', status: 'present' },
    { id: '20201013', name: 'Mona Fathy',         universityId: '20201013', scanTime: '11:08:21 AM', status: 'present' },
  ],
  'CS301__A__5': [
    { id: '20201001', name: 'Ahmed Safan',       universityId: '20201001', scanTime: '10:03:45 AM', status: 'present' },
    { id: '20201002', name: 'Liam Carter',        universityId: '20201002', scanTime: '10:05:12 AM', status: 'present' },
    { id: '20201004', name: 'Omar Hassan',        universityId: '20201004', scanTime: '10:07:29 AM', status: 'present' },
    { id: '20201005', name: 'Nour Khalil',        universityId: '20201005', scanTime: '10:09:55 AM', status: 'present' },
    { id: '20201006', name: 'Youssef Adel',       universityId: '20201006', scanTime: '10:12:08 AM', status: 'present' },
  ],
  'CS201__A__6': [
    { id: '20201020', name: 'Karim Sherif',       universityId: '20201020', scanTime: '08:15:00 AM', status: 'present' },
    { id: '20201021', name: 'Layla Nasser',       universityId: '20201021', scanTime: '08:17:32 AM', status: 'present' },
    { id: '20201022', name: 'Mariam Tawfik',      universityId: '20201022', scanTime: '08:20:14 AM', status: 'present' },
    { id: '20201023', name: 'Hassan El-Din',      universityId: '20201023', scanTime: '08:22:41 AM', status: 'present' },
    { id: '20201024', name: 'Rania Fouad',        universityId: '20201024', scanTime: '08:25:09 AM', status: 'present' },
    { id: '20201025', name: 'Samy Gamal',         universityId: '20201025', scanTime: '08:28:33 AM', status: 'present' },
    { id: '20201026', name: 'Hala Zaki',          universityId: '20201026', scanTime: '08:30:01 AM', status: 'present' },
    { id: '20201027', name: 'Adel Mansour',       universityId: '20201027', scanTime: '08:31:47 AM', status: 'present' },
    { id: '20201028', name: 'Noha Salem',         universityId: '20201028', scanTime: '08:34:22 AM', status: 'present' },
  ],
};

// Total registered per course for the absent count calculation
const TOTAL_PER_COURSE = { CS301: 12, CS201: 14, CS501: 10, MATH211: 11 };

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'], ['#2563eb', '#60a5fa'], ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'], ['#d97706', '#fbbf24'], ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'], ['#0891b2', '#22d3ee'],
];

// ─────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const { isRTL } = useLanguage();
  const { reportCourses } = useAuth();
  const { allSessions } = useDashboard();

  const [selectedCourse,  setSelectedCourse]  = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedWeek,    setSelectedWeek]    = useState('');

  const course   = reportCourses.find(c => c.id === selectedCourse);
  const sections = course ? (course.sections || ['A', 'B']) : [];

  const sessionKey  = `${selectedCourse}__${selectedSection}__${selectedWeek}`;
  // Prefer live data, fall back to seed data
  const sessionData = allSessions[sessionKey] ?? SEED_SESSIONS[sessionKey] ?? null;

  const totalRegistered = TOTAL_PER_COURSE[selectedCourse] || 30;
  const presentCount    = sessionData ? sessionData.length : 0;
  const absentCount     = sessionData ? Math.max(0, totalRegistered - presentCount) : 0;
  const pct             = sessionData ? Math.round((presentCount / totalRegistered) * 100) : 0;

  const allFiltersSet = selectedCourse && selectedSection && selectedWeek;

  const handleExportExcel = () => {
    if (!sessionData) return;

    const rows = sessionData.map((s, i) => ({
      '#':              i + 1,
      'Student Name':   s.name,
      'University ID':  s.universityId,
      'Time Scanned':   s.scanTime,
      'Status':         'Present',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 28 }, { wch: 15 }, { wch: 16 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Group ${selectedSection} - Week ${selectedWeek}`);
    XLSX.writeFile(wb, `Report_${selectedCourse}_Group${selectedSection}_Week${selectedWeek}.xlsx`);
  };

  return (
    <div className="page-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="page-header">
        <h1 className="page-title">📊 Attendance Reports</h1>
        <p className="page-subtitle">Filter by course, group, and week to generate a detailed attendance report.</p>
      </header>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><span>🔍</span> Report Filters</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {/* Course */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">COURSE</label>
            <select className="form-select" value={selectedCourse}
              onChange={e => { setSelectedCourse(e.target.value); setSelectedSection(''); }}>
              <option value="">— Select Course —</option>
              {reportCourses.map(c => (
                <option key={c.uid || c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">GROUP</label>
            <select className="form-select" value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)} disabled={!selectedCourse}>
              <option value="">— Select Group —</option>
              {sections.map(s => <option key={s} value={s}>Group {s}</option>)}
            </select>
          </div>

          {/* Week */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">WEEK</label>
            <select className="form-select" value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)} disabled={!selectedCourse}>
              <option value="">— Select Week —</option>
              {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────── */}
      {!allFiltersSet ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Select filters above to generate a report</p>
          <p style={{ fontSize: 13 }}>Try: <strong style={{ color: 'var(--accent)' }}>CS301 → Group A → Week 6</strong> to see a sample</p>
        </div>
      ) : !sessionData ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No records found</p>
          <p style={{ fontSize: 13 }}>No attendance was recorded for this session yet.</p>
        </div>
      ) : (
        <div className="card">
          {/* Report header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 4 }}><span>📋</span> {course?.name}</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Group {selectedSection} · Week {selectedWeek}</p>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 18px' }} onClick={handleExportExcel}>
              📥 Export Excel
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { icon: '✅', label: 'Present',    value: presentCount, color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)'  },
              { icon: '❌', label: 'Absent',     value: absentCount,  color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
              { icon: '👥', label: 'Total',      value: totalRegistered, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)'  },
              { icon: '📈', label: 'Rate',       value: `${pct}%`,    color: pct >= 70 ? '#34d399' : '#f59e0b', bg: 'rgba(165,243,252,0.05)', border: 'rgba(165,243,252,0.15)' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 6, letterSpacing: 0.5 }}>{s.icon} {s.label.toUpperCase()}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Attendance table */}
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
                            {student.name.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{student.universityId}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{student.scanTime}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: 'rgba(52,211,153,0.15)', color: '#34d399'
                        }}>
                          ✓ PRESENT
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
