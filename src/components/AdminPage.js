import React, { useState } from 'react';
import { FACULTY_CATALOG } from './CoursesPage';

const CLASS_TYPES = ['Lecture', 'Section', 'Practical'];

const TYPE_STYLE = {
  Lecture:   { bg: 'rgba(99,102,241,0.12)',  color: '#a78bfa' },
  Section:   { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  Practical: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
};

const AVATAR_COLORS = [
  ['#1a6b45','#34d399'],['#2563eb','#60a5fa'],
  ['#7c3aed','#a78bfa'],['#db2777','#f472b6'],
  ['#d97706','#fbbf24'],['#059669','#6ee7b7'],
];
const avatarGrad = (i) => {
  const [c1,c2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
  return `linear-gradient(135deg,${c1},${c2})`;
};

// ─────────────────────────────────────────────────────────────────
// AdminPage — full doctor & course management
// Props:
//   doctors      — array of doctor objects (from App state)
//   onAddDoctor  — fn(doctor)
//   onDeleteDoctor — fn(doctorId)
//   onAddCourse  — fn(doctorId, course)
//   onDeleteCourse — fn(doctorId, courseUid)
// ─────────────────────────────────────────────────────────────────
const AdminPage = ({ doctors, onAddDoctor, onDeleteDoctor, onAddCourse, onDeleteCourse }) => {
  // ── Tab: 'doctors' | 'courses' ───────────────────────────────
  const [tab, setTab] = useState('doctors');

  // ── Add-doctor form ──────────────────────────────────────────
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [dName,     setDName]     = useState('');
  const [dEmail,    setDEmail]    = useState('');
  const [dPassword, setDPassword] = useState('');
  const [dSpec,     setDSpec]     = useState('');
  const [dError,    setDError]    = useState('');

  // ── Add-course form ──────────────────────────────────────────
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [selFaculty,  setSelFaculty]  = useState('');
  const [selCollege,  setSelCollege]  = useState('');
  const [selCourseId, setSelCourseId] = useState('');
  const [selType,     setSelType]     = useState('Lecture');
  const [cError,      setCError]      = useState('');

  // ── Doctor form handlers ─────────────────────────────────────
  const resetDoctorForm = () => { setDName(''); setDEmail(''); setDPassword(''); setDSpec(''); setDError(''); };

  const handleAddDoctor = () => {
    if (!dName.trim())  { setDError('Name is required.'); return; }
    if (!dEmail.trim()) { setDError('Email is required.'); return; }
    if (!dPassword)     { setDError('Password is required.'); return; }
    if (doctors.some(d => d.email.toLowerCase() === dEmail.toLowerCase())) {
      setDError('A doctor with this email already exists.'); return;
    }
    onAddDoctor({
      id:        `doc-${Date.now()}`,
      email:     dEmail.trim(),
      password:  dPassword,
      name:      dName.trim(),
      specialty: dSpec.trim() || '—',
      avatar:    dName.trim().split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(),
      userRole:  'doctor',
      courses:   [],
    });
    resetDoctorForm();
    setShowDoctorForm(false);
  };

  // ── Course form handlers ─────────────────────────────────────
  const faculty  = FACULTY_CATALOG.find(f => f.id === selFaculty);
  const colleges = faculty ? faculty.colleges : [];
  const college  = colleges.find(c => c.id === selCollege);
  const catCourses = college ? college.courses : [];

  const resetCourseForm = () => { setSelFaculty(''); setSelCollege(''); setSelCourseId(''); setSelType('Lecture'); setCError(''); };

  const handleAddCourse = () => {
    if (!selectedDoctor) { setCError('Select a doctor first.'); return; }
    if (!selFaculty)     { setCError('Select a faculty.'); return; }
    if (!selCollege)     { setCError('Select a department.'); return; }
    if (!selCourseId)    { setCError('Select a course.'); return; }

    const doc = doctors.find(d => d.id === selectedDoctor);
    if (doc?.courses.some(c => c.id === selCourseId && c.type === selType)) {
      setCError('This doctor already teaches this course as a ' + selType); return;
    }

    const courseObj = catCourses.find(c => c.id === selCourseId);
    onAddCourse(selectedDoctor, {
      uid:     `${selCourseId}-${selType.slice(0,3).toUpperCase()}-${Date.now()}`,
      id:      selCourseId,
      name:    courseObj?.name || selCourseId,
      faculty: selFaculty,
      college: selCollege,
      type:    selType,
    });
    resetCourseForm();
    setShowCourseForm(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>

      {/* ── Page header ─────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          🛡️ Admin Panel
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Full control over doctors, faculties and course assignments.
        </p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[{ id:'doctors', label:'👨‍⚕️ Doctors', count: doctors.length },
          { id:'courses', label:'📚 Course Assignments', count: doctors.reduce((s,d)=>s+d.courses.length,0) }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text-secondary)',
          }}>
            {t.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          DOCTORS TAB
          ════════════════════════════════════════════════════════ */}
      {tab === 'doctors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Add button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => { setShowDoctorForm(f => !f); resetDoctorForm(); }}>
              {showDoctorForm ? '✕ Cancel' : '+ Add Doctor'}
            </button>
          </div>

          {/* Add-doctor form */}
          {showDoctorForm && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:16, letterSpacing:1 }}>NEW DOCTOR ACCOUNT</p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:'2 1 180px' }}>
                  <label className="form-label" style={{ display:'block', marginBottom:6 }}>FULL NAME *</label>
                  <input className="form-select" placeholder="Dr. Ahmed Ali" value={dName}
                    onChange={e=>{ setDName(e.target.value); setDError(''); }} style={{ width:'100%' }} />
                </div>
                <div style={{ flex:'2 1 200px' }}>
                  <label className="form-label" style={{ display:'block', marginBottom:6 }}>EMAIL *</label>
                  <input className="form-select" type="email" placeholder="doctor@university.edu" value={dEmail}
                    onChange={e=>{ setDEmail(e.target.value); setDError(''); }} style={{ width:'100%' }} />
                </div>
                <div style={{ flex:'1 1 140px' }}>
                  <label className="form-label" style={{ display:'block', marginBottom:6 }}>PASSWORD *</label>
                  <input className="form-select" type="password" placeholder="Set password" value={dPassword}
                    onChange={e=>{ setDPassword(e.target.value); setDError(''); }} style={{ width:'100%' }} />
                </div>
                <div style={{ flex:'2 1 180px' }}>
                  <label className="form-label" style={{ display:'block', marginBottom:6 }}>SPECIALTY</label>
                  <input className="form-select" placeholder="e.g. Machine Learning" value={dSpec}
                    onChange={e=>setDSpec(e.target.value)} style={{ width:'100%' }} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleAddDoctor} style={{ height:42, whiteSpace:'nowrap' }}>
                    ✓ Save Doctor
                  </button>
                </div>
              </div>
              {dError && <p style={{ fontSize:12, color:'#f87171', marginTop:8 }}>⚠️ {dError}</p>}
            </div>
          )}

          {/* Doctors table */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {/* Header */}
            <div style={{
              display:'grid', gridTemplateColumns:'44px 1fr 200px 100px 80px 48px',
              gap:12, padding:'10px 18px',
              background:'rgba(255,255,255,0.03)', borderBottom:'1px solid var(--border)',
              fontSize:11, color:'var(--text-muted)', fontWeight:700, letterSpacing:0.8,
            }}>
              <span></span><span>NAME</span><span>EMAIL</span><span>SPECIALTY</span><span>COURSES</span><span></span>
            </div>

            {doctors.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 20px', color:'var(--text-muted)', gap:10 }}>
                <span style={{ fontSize:36 }}>👨‍⚕️</span>
                <p style={{ fontSize:13 }}>No doctors yet. Click "+ Add Doctor" to create one.</p>
              </div>
            ) : doctors.map((doc, idx) => (
              <div key={doc.id} style={{
                display:'grid', gridTemplateColumns:'44px 1fr 200px 100px 80px 48px',
                gap:12, padding:'12px 18px', borderBottom:'1px solid var(--border)',
                alignItems:'center', transition:'background 0.15s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {/* Avatar */}
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background: avatarGrad(idx),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, color:'#fff',
                }}>
                  {doc.avatar}
                </div>
                {/* Name */}
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{doc.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>ID: {doc.id}</div>
                </div>
                {/* Email */}
                <span style={{ fontSize:12, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.email}</span>
                {/* Specialty */}
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{doc.specialty}</span>
                {/* Course count badge */}
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <span style={{
                    background:'rgba(99,102,241,0.12)', color:'#a78bfa',
                    borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700,
                  }}>{doc.courses.length}</span>
                </div>
                {/* Delete */}
                <button onClick={()=>onDeleteDoctor(doc.id)} title="Remove doctor" style={{
                  background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)',
                  borderRadius:8, color:'#f87171', cursor:'pointer', fontSize:15,
                  width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'background 0.15s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.22)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.10)'}
                >🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          COURSE ASSIGNMENTS TAB
          ════════════════════════════════════════════════════════ */}
      {tab === 'courses' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Toolbar */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div className="form-group" style={{ flex:'1 1 200px', marginBottom:0 }}>
              <label className="form-label">FILTER BY DOCTOR</label>
              <select className="form-select" value={selectedDoctor} onChange={e=>setSelectedDoctor(e.target.value)}>
                <option value="">— All doctors —</option>
                {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ height:42 }}
              onClick={()=>{ setShowCourseForm(f=>!f); resetCourseForm(); setCError(''); }}>
              {showCourseForm ? '✕ Cancel' : '+ Assign Course'}
            </button>
          </div>

          {/* Assign-course form */}
          {showCourseForm && (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:16, letterSpacing:1 }}>ASSIGN COURSE TO DOCTOR</p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {/* Doctor picker */}
                <div className="form-group" style={{ flex:'1 1 180px', marginBottom:0 }}>
                  <label className="form-label">DOCTOR *</label>
                  <select className="form-select" value={selectedDoctor} onChange={e=>{setSelectedDoctor(e.target.value); setCError('');}}>
                    <option value="">— Select Doctor —</option>
                    {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                {/* Faculty */}
                <div className="form-group" style={{ flex:'1 1 180px', marginBottom:0 }}>
                  <label className="form-label">FACULTY *</label>
                  <select className="form-select" value={selFaculty} onChange={e=>{setSelFaculty(e.target.value); setSelCollege(''); setSelCourseId(''); setCError('');}}>
                    <option value="">— Faculty —</option>
                    {FACULTY_CATALOG.map(f=><option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
                  </select>
                </div>
                {/* College */}
                <div className="form-group" style={{ flex:'1 1 200px', marginBottom:0 }}>
                  <label className="form-label">DEPARTMENT *</label>
                  <select className="form-select" value={selCollege} disabled={!selFaculty}
                    onChange={e=>{setSelCollege(e.target.value); setSelCourseId(''); setCError('');}}>
                    <option value="">— Department —</option>
                    {colleges.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {/* Course */}
                <div className="form-group" style={{ flex:'2 1 180px', marginBottom:0 }}>
                  <label className="form-label">COURSE *</label>
                  <select className="form-select" value={selCourseId} disabled={!selCollege}
                    onChange={e=>{setSelCourseId(e.target.value); setCError('');}}>
                    <option value="">— Course —</option>
                    {catCourses.map(c=><option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
                  </select>
                </div>
                {/* Type */}
                <div className="form-group" style={{ flex:'0 1 140px', marginBottom:0 }}>
                  <label className="form-label">TYPE</label>
                  <select className="form-select" value={selType} onChange={e=>setSelType(e.target.value)}>
                    {CLASS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleAddCourse} style={{ height:42, whiteSpace:'nowrap' }}>
                    ✓ Assign
                  </button>
                </div>
              </div>
              {cError && <p style={{ fontSize:12, color:'#f87171', marginTop:8 }}>⚠️ {cError}</p>}
            </div>
          )}

          {/* Doctor course cards */}
          {doctors
            .filter(d => !selectedDoctor || d.id === selectedDoctor)
            .map((doc, dIdx) => (
              <div key={doc.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                {/* Doctor header */}
                <div style={{
                  display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
                  background:'rgba(255,255,255,0.025)', borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:avatarGrad(dIdx), display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                    {doc.avatar}
                  </div>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:0 }}>{doc.name}</p>
                    <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{doc.email} • {doc.courses.length} course{doc.courses.length!==1?'s':''}</p>
                  </div>
                </div>

                {/* Course rows */}
                {doc.courses.length === 0 ? (
                  <div style={{ padding:'20px 18px', color:'var(--text-muted)', fontSize:13 }}>
                    No courses assigned yet.
                  </div>
                ) : doc.courses.map(course => {
                  const ts = TYPE_STYLE[course.type] || TYPE_STYLE.Lecture;
                  return (
                    <div key={course.uid} style={{
                      display:'flex', alignItems:'center', gap:14,
                      padding:'10px 18px', borderBottom:'1px solid var(--border)',
                      transition:'background 0.15s',
                    }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:'var(--accent)', background:'rgba(99,102,241,0.10)', padding:'3px 8px', borderRadius:6, flexShrink:0 }}>
                        {course.id}
                      </span>
                      <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{course.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:ts.bg, color:ts.color, flexShrink:0 }}>
                        {course.type}
                      </span>
                      <button onClick={()=>onDeleteCourse(doc.id, course.uid)} title="Remove assignment" style={{
                        background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)',
                        borderRadius:8, color:'#f87171', cursor:'pointer', fontSize:14,
                        width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, transition:'background 0.15s',
                      }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.22)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.10)'}
                      >🗑️</button>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
