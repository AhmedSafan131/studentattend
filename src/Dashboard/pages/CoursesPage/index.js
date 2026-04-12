import React, { useState, useMemo } from 'react';
import { FACULTY_CATALOG } from '../../../utils/constants';
import AppHelmet from '../../../components/AppHelmet';

const CLASS_TYPES = ['Lecture', 'Section', 'Practical'];

const TYPE_STYLE = {
  Lecture:   { bg: 'rgba(99,102,241,0.12)',  color: '#a78bfa' },
  Section:   { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  Practical: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
};

const INITIAL_MY_COURSES = [
  { uid: 'CS101-LEC',   id: 'CS101',   name: 'Intro to Programming',    faculty: 'engineering', college: 'cs',   type: 'Lecture'   },
  { uid: 'CS101-SEC',   id: 'CS101',   name: 'Intro to Programming',    faculty: 'engineering', college: 'cs',   type: 'Section'   },
  { uid: 'CS201-LEC',   id: 'CS201',   name: 'Data Structures',         faculty: 'engineering', college: 'cs',   type: 'Lecture'   },
  { uid: 'CS301-LEC',   id: 'CS301',   name: 'Algorithms & Complexity', faculty: 'engineering', college: 'cs',   type: 'Lecture'   },
  { uid: 'CS401-LEC',   id: 'CS401',   name: 'Software Engineering',    faculty: 'engineering', college: 'cs',   type: 'Lecture'   },
  { uid: 'CS501-LEC',   id: 'CS501',   name: 'Machine Learning',        faculty: 'engineering', college: 'cs',   type: 'Lecture'   },
  { uid: 'MATH211-LEC', id: 'MATH211', name: 'Discrete Mathematics',    faculty: 'science',     college: 'math', type: 'Lecture'   },
];

const CoursesPage = () => {
  const [myCourses,   setMyCourses]   = useState(INITIAL_MY_COURSES);
  const [showPanel,   setShowPanel]   = useState(false);
  const [selFaculty,  setSelFaculty]  = useState('');
  const [selCollege,  setSelCollege]  = useState('');
  const [selCourseId, setSelCourseId] = useState('');
  const [selType,     setSelType]     = useState('Lecture');
  const [addError,    setAddError]    = useState('');
  const [search,      setSearch]      = useState('');

  const faculty  = FACULTY_CATALOG.find(f => f.id === selFaculty);
  const colleges = faculty ? faculty.colleges : [];
  const college  = colleges.find(c => c.id === selCollege);
  const courses  = college ? college.courses : [];

  const displayed = useMemo(() => {
    if (!search.trim()) return myCourses;
    const q = search.toLowerCase();
    return myCourses.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [myCourses, search]);

  const grouped = useMemo(() => {
    const map = {};
    displayed.forEach(c => {
      const fac  = FACULTY_CATALOG.find(f => f.id === c.faculty);
      const key  = fac ? fac.name : 'Other';
      const icon = fac ? fac.icon : '📚';
      if (!map[key]) map[key] = { icon, items: [] };
      map[key].items.push(c);
    });
    return map;
  }, [displayed]);

  const handleFacultyChange = (val) => { setSelFaculty(val); setSelCollege(''); setSelCourseId(''); setAddError(''); };
  const handleCollegeChange = (val) => { setSelCollege(val); setSelCourseId(''); setAddError(''); };

  const handleAdd = () => {
    if (!selFaculty)  { setAddError('Please select a faculty.'); return; }
    if (!selCollege)  { setAddError('Please select a college.'); return; }
    if (!selCourseId) { setAddError('Please select a course.');  return; }
    const uid       = `${selCourseId}-${selType.toUpperCase().slice(0,3)}-${Date.now()}`;
    const courseObj = courses.find(c => c.id === selCourseId);
    const duplicate = myCourses.find(c => c.id === selCourseId && c.type === selType);
    if (duplicate) { setAddError(`You already teach "${courseObj?.name}" as a ${selType}.`); return; }
    setMyCourses(prev => [...prev, { uid, id: selCourseId, name: courseObj?.name || selCourseId, faculty: selFaculty, college: selCollege, type: selType }]);
    setSelCourseId(''); setSelType('Lecture'); setAddError(''); setShowPanel(false);
  };

  const handleDelete = (uid) => setMyCourses(prev => prev.filter(c => c.uid !== uid));

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <AppHelmet
        titleEn="My Courses"
        titleAr="مقرراتي"
        descriptionEn="Manage assigned teaching courses and class types."
        descriptionAr="إدارة المقررات الدراسية المكلّف بها وأنواع الحصص."
      />
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>📚 My Courses</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage the courses you teach. Add courses from any faculty and specify whether you teach the Lecture, Section or Practical.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">SEARCH</label>
          <input className="form-select" type="text" placeholder="Course name or code…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 42, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{myCourses.length}</span> courses assigned
        </div>
        <button className="btn btn-primary" style={{ height: 42 }} onClick={() => { setShowPanel(p => !p); setAddError(''); }}>
          {showPanel ? '✕ Cancel' : '+ Add Course'}
        </button>
      </div>

      {showPanel && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 22px', marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>ADD A COURSE YOU TEACH</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
              <label className="form-label">FACULTY</label>
              <select className="form-select" value={selFaculty} onChange={e => handleFacultyChange(e.target.value)}>
                <option value="">— Select Faculty —</option>
                {FACULTY_CATALOG.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">COLLEGE / DEPARTMENT</label>
              <select className="form-select" value={selCollege} onChange={e => handleCollegeChange(e.target.value)} disabled={!selFaculty}>
                <option value="">— Select Department —</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
              <label className="form-label">COURSE</label>
              <select className="form-select" value={selCourseId} onChange={e => { setSelCourseId(e.target.value); setAddError(''); }} disabled={!selCollege}>
                <option value="">— Select Course —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 1 150px', marginBottom: 0 }}>
              <label className="form-label">CLASS TYPE</label>
              <select className="form-select" value={selType} onChange={e => setSelType(e.target.value)}>
                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAdd} style={{ height: 42, whiteSpace: 'nowrap' }}>✓ Save Course</button>
            </div>
          </div>
          {addError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>⚠️ {addError}</p>}
        </div>
      )}

      {myCourses.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)', gap: 12 }}>
          <span style={{ fontSize: 48 }}>📭</span>
          <p style={{ fontSize: 14 }}>You have no courses yet. Click "+ Add Course" to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(grouped).map(([facName, { icon, items }]) => (
            <div key={facName}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', margin: 0, letterSpacing: 0.5 }}>{facName}</h2>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} course{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {items.map(course => {
                  const ts  = TYPE_STYLE[course.type] || TYPE_STYLE.Lecture;
                  const fac = FACULTY_CATALOG.find(f => f.id === course.faculty);
                  const col = fac?.colleges.find(c => c.id === course.college);
                  return (
                    <div key={course.uid} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', background: 'rgba(99,102,241,0.10)', padding: '3px 8px', borderRadius: 6 }}>{course.id}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ts.bg, color: ts.color }}>{course.type}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{course.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{col?.name || '—'}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleDelete(course.uid)} title="Remove course" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 13, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.10)'}
                        >🗑️ Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
