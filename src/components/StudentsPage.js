import React, { useState, useMemo } from 'react';
import { COURSES } from './LectureControl';

// ── Avatar colours ────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'], ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'], ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'], ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'], ['#0891b2', '#22d3ee'],
];
const avatarColor = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length];

// ── Seed roster data: students enrolled per course__section ───────
// Key: `${courseId}__${section}`  (week doesn't filter the roster,
//       only the attendance record — a student enrolled in a course
//       stays enrolled for ALL weeks of that section)
const SEED_ROSTER = {
  'CS101__A': [
    { id: '20201001', name: 'Ahmed Safan',      email: 'ahmed.safan@uni.edu',     year: 4 },
    { id: '20201002', name: 'Liam Carter',      email: 'liam.carter@uni.edu',     year: 4 },
    { id: '20201003', name: 'Sara Hassan',      email: 'sara.hassan@uni.edu',     year: 3 },
    { id: '20201004', name: 'Mona Fawzy',       email: 'mona.fawzy@uni.edu',      year: 3 },
    { id: '20201005', name: 'Youssef Nader',    email: 'youssef.nader@uni.edu',   year: 4 },
  ],
  'CS101__B': [
    { id: '20201010', name: 'Omar Khalid',      email: 'omar.khalid@uni.edu',     year: 2 },
    { id: '20201011', name: 'Rania Mostafa',    email: 'rania.mostafa@uni.edu',   year: 2 },
  ],
  'CS101__C': [
    { id: '20201020', name: 'Tarek Salem',      email: 'tarek.salem@uni.edu',     year: 3 },
  ],
  'CS201__A': [
    { id: '20201030', name: 'Nora Ali',         email: 'nora.ali@uni.edu',        year: 3 },
    { id: '20201031', name: 'Karim Samir',      email: 'karim.samir@uni.edu',     year: 3 },
    { id: '20201032', name: 'Dina Raouf',       email: 'dina.raouf@uni.edu',      year: 4 },
  ],
  'CS301__A': [
    { id: '20201040', name: 'Hana Walid',       email: 'hana.walid@uni.edu',      year: 4 },
    { id: '20201041', name: 'Adel Fouad',       email: 'adel.fouad@uni.edu',      year: 4 },
  ],
  'MATH211__A': [
    { id: '20201050', name: 'Sherry Gamal',     email: 'sherry.gamal@uni.edu',    year: 2 },
    { id: '20201051', name: 'Bassem Aly',       email: 'bassem.aly@uni.edu',      year: 2 },
    { id: '20201052', name: 'Nada Hesham',      email: 'nada.hesham@uni.edu',     year: 1 },
  ],
};

// ─────────────────────────────────────────────────────────────────
// StudentsPage Component
// ─────────────────────────────────────────────────────────────────
const StudentsPage = () => {
  // ── Filter state ──────────────────────────────────────────────
  const [filterCourse,  setFilterCourse]  = useState('');
  const [filterSection, setFilterSection] = useState('');

  // ── Search ────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Manual add state ──────────────────────────────────────────
  const [addId,    setAddId]    = useState('');
  const [addName,  setAddName]  = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addYear,  setAddYear]  = useState('');
  const [addError, setAddError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ── Local overrides (additions / deletions) ───────────────────
  const [localOverrides, setLocalOverrides] = useState({});

  // ── Derived ───────────────────────────────────────────────────
  const rosterKey = filterCourse && filterSection
    ? `${filterCourse}__${filterSection}`
    : null;

  const course   = COURSES.find(c => c.id === filterCourse);
  const sections = course ? course.sections : [];

  const allStudents = useMemo(() => {
    if (!rosterKey) return [];
    const seed  = SEED_ROSTER[rosterKey] || [];
    const local = localOverrides[rosterKey] || [];

    const map = new Map();
    seed.forEach(s => map.set(s.id, s));
    local.forEach(s => {
      if (s._deleted) map.delete(s.id);
      else map.set(s.id, s);
    });
    return [...map.values()];
  }, [rosterKey, localOverrides]);

  const students = useMemo(() => {
    if (!search.trim()) return allStudents;
    const q = search.toLowerCase();
    return allStudents.filter(
      s => s.name.toLowerCase().includes(q) || s.id.includes(q)
    );
  }, [allStudents, search]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleCourseChange = (val) => {
    setFilterCourse(val);
    setFilterSection('');
    setSearch('');
  };

  const handleDelete = (studentId) => {
    if (!rosterKey) return;
    setLocalOverrides(prev => ({
      ...prev,
      [rosterKey]: [
        ...(prev[rosterKey] || []).filter(s => s.id !== studentId),
        { id: studentId, _deleted: true },
      ],
    }));
  };

  const handleAdd = () => {
    if (!rosterKey) return;
    const trimId    = addId.trim();
    const trimName  = addName.trim();
    const trimEmail = addEmail.trim();
    const trimYear  = Number(addYear);

    if (!trimId)   { setAddError('Student ID is required.');   return; }
    if (!trimName) { setAddError('Student name is required.'); return; }
    if (allStudents.some(s => s.id === trimId)) {
      setAddError('A student with this ID is already enrolled.');
      return;
    }

    const newStudent = {
      id:    trimId,
      name:  trimName,
      email: trimEmail || `${trimId}@uni.edu`,
      year:  trimYear  || 1,
    };

    setLocalOverrides(prev => ({
      ...prev,
      [rosterKey]: [
        ...(prev[rosterKey] || []).filter(s => s.id !== trimId),
        newStudent,
      ],
    }));

    setAddId(''); setAddName(''); setAddEmail(''); setAddYear('');
    setAddError('');
    setShowForm(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          👥 Students Roster
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          View enrolled students by course and section. Add or remove students from the roster.
        </p>
      </div>

      {/* ── Filter row ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        {/* Course */}
        <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
          <label className="form-label">COURSE</label>
          <select className="form-select" value={filterCourse} onChange={e => handleCourseChange(e.target.value)}>
            <option value="">— Select a course —</option>
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

        {/* Search */}
        {rosterKey && (
          <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
            <label className="form-label">SEARCH</label>
            <input
              className="form-select"
              type="text"
              placeholder="Name or student ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Add button */}
        {rosterKey && (
          <button
            className="btn btn-primary"
            style={{ height: 42, flexShrink: 0 }}
            onClick={() => setShowForm(f => !f)}
          >
            {showForm ? '✕ Cancel' : '+ Enroll Student'}
          </button>
        )}
      </div>

      {/* ── No selection placeholder ─────────────────────────── */}
      {!rosterKey && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 300,
          color: 'var(--text-muted)', gap: 12,
        }}>
          <span style={{ fontSize: 48 }}>🎓</span>
          <p style={{ fontSize: 14 }}>Select a Course and Section to view the enrolled students.</p>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      {rosterKey && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ENROLLED</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{allStudents.length}</p>
            </div>
            {search && (
              <>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SEARCH RESULTS</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{students.length}</p>
                </div>
              </>
            )}
          </div>

          {/* ── Add student form ──────────────────────────── */}
          {showForm && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 12,
              border: '1px solid var(--border)', padding: '16px 20px',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: 1 }}>
                ENROLL NEW STUDENT
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>STUDENT ID *</label>
                  <input type="text" className="form-select" placeholder="20201234"
                    value={addId} onChange={e => { setAddId(e.target.value); setAddError(''); }}
                    style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '2 1 180px' }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>FULL NAME *</label>
                  <input type="text" className="form-select" placeholder="Ahmed Safan"
                    value={addName} onChange={e => { setAddName(e.target.value); setAddError(''); }}
                    style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '2 1 180px' }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>EMAIL</label>
                  <input type="email" className="form-select" placeholder="student@uni.edu"
                    value={addEmail} onChange={e => setAddEmail(e.target.value)}
                    style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '0 1 100px' }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>YEAR</label>
                  <select className="form-select" value={addYear} onChange={e => setAddYear(e.target.value)}>
                    <option value="">—</option>
                    {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleAdd} style={{ height: 42, flexShrink: 0 }}>
                  Enroll
                </button>
              </div>
              {addError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>⚠️ {addError}</p>}
            </div>
          )}

          {/* ── Student table ─────────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 140px 200px 60px 48px',
              gap: 12, padding: '10px 18px',
              background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)',
              fontWeight: 700, letterSpacing: 0.8,
            }}>
              <span>#</span>
              <span>NAME</span>
              <span>STUDENT ID</span>
              <span>EMAIL</span>
              <span>YEAR</span>
              <span></span>
            </div>

            {students.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '40px 20px', color: 'var(--text-muted)', gap: 10,
              }}>
                <span style={{ fontSize: 36 }}>🔍</span>
                <p style={{ fontSize: 13 }}>
                  {search ? 'No students match your search.' : 'No students enrolled in this section yet.'}
                </p>
              </div>
            ) : (
              students.map((student, idx) => {
                const [c1, c2] = avatarColor(idx);
                return (
                  <div
                    key={student.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 140px 200px 60px 48px',
                      gap: 12, padding: '12px 18px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Index */}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</span>

                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff',
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {student.name}
                        </div>
                      </div>
                    </div>

                    {/* ID */}
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {student.id}
                    </span>

                    {/* Email */}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.email}
                    </span>

                    {/* Year badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 20,
                      background: 'rgba(99,102,241,0.12)',
                      color: '#a78bfa', whiteSpace: 'nowrap',
                    }}>
                      Y{student.year}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(student.id)}
                      title="Remove from course"
                      style={{
                        background: 'rgba(239,68,68,0.10)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8, color: '#f87171', cursor: 'pointer',
                        fontSize: 15, width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
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

export default StudentsPage;
