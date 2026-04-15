import React, { useState } from 'react';
import { FACULTY_CATALOG } from '../../utils/constants';
import { useAuth } from '../../hooks';

const CLASS_TYPES = ['Lecture', 'Section', 'Practical'];

const TYPE_STYLE = {
  Lecture: { bg: 'rgba(99,102,241,0.12)', color: '#a78bfa' },
  Section: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  Practical: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
};

const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#6ee7b7'],
];

const avatarGrad = (index) => {
  const [first, second] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${first}, ${second})`;
};

const AdminPanelPage = () => {
  const { doctors, addDoctor, deleteDoctor, addCourse, deleteCourse } = useAuth();
  const [tab, setTab] = useState('doctors');
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorError, setDoctorError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedType, setSelectedType] = useState('Lecture');
  const [courseError, setCourseError] = useState('');

  const resetDoctorForm = () => {
    setDoctorName('');
    setDoctorEmail('');
    setDoctorPassword('');
    setDoctorSpecialty('');
    setDoctorError('');
  };

  const resetCourseForm = () => {
    setSelectedFaculty('');
    setSelectedCollege('');
    setSelectedCourseId('');
    setSelectedType('Lecture');
    setCourseError('');
  };

  const handleAddDoctor = () => {
    if (!doctorName.trim()) {
      setDoctorError('Name is required.');
      return;
    }

    if (!doctorEmail.trim()) {
      setDoctorError('Email is required.');
      return;
    }

    if (!doctorPassword) {
      setDoctorError('Password is required.');
      return;
    }

    if (doctors.some((doctor) => doctor.email.toLowerCase() === doctorEmail.toLowerCase())) {
      setDoctorError('A doctor with this email already exists.');
      return;
    }

    addDoctor({
      id: `doc-${Date.now()}`,
      email: doctorEmail.trim(),
      password: doctorPassword,
      name: doctorName.trim(),
      specialty: doctorSpecialty.trim() || '--',
      avatar: doctorName.trim().split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase(),
      userRole: 'doctor',
      courses: [],
    });

    resetDoctorForm();
    setShowDoctorForm(false);
  };

  const faculty = FACULTY_CATALOG.find((item) => item.id === selectedFaculty);
  const colleges = faculty ? faculty.colleges : [];
  const college = colleges.find((item) => item.id === selectedCollege);
  const catalogCourses = college ? college.courses : [];

  const handleAddCourse = () => {
    if (!selectedDoctor) {
      setCourseError('Select a doctor first.');
      return;
    }

    if (!selectedFaculty) {
      setCourseError('Select a faculty.');
      return;
    }

    if (!selectedCollege) {
      setCourseError('Select a department.');
      return;
    }

    if (!selectedCourseId) {
      setCourseError('Select a course.');
      return;
    }

    const doctor = doctors.find((item) => item.id === selectedDoctor);

    if (doctor?.courses.some((course) => course.id === selectedCourseId && course.type === selectedType)) {
      setCourseError(`This doctor already teaches this course as a ${selectedType}.`);
      return;
    }

    const courseRecord = catalogCourses.find((item) => item.id === selectedCourseId);

    addCourse(selectedDoctor, {
      uid: `${selectedCourseId}-${selectedType.slice(0, 3).toUpperCase()}-${Date.now()}`,
      id: selectedCourseId,
      name: courseRecord?.name || selectedCourseId,
      faculty: selectedFaculty,
      college: selectedCollege,
      type: selectedType,
    });

    resetCourseForm();
    setShowCourseForm(false);
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Admin Panel</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Full control over doctors, faculties, and course assignments.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[
          { id: 'doctors', label: 'Doctors', count: doctors.length },
          { id: 'courses', label: 'Course Assignments', count: doctors.reduce((sum, doctor) => sum + doctor.courses.length, 0) },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.15s',
              background: tab === item.id ? 'var(--accent)' : 'transparent',
              color: tab === item.id ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {item.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({item.count})</span>
          </button>
        ))}
      </div>

      {tab === 'doctors' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => { setShowDoctorForm((value) => !value); resetDoctorForm(); }}>
              {showDoctorForm ? 'Cancel' : '+ Add Doctor'}
            </button>
          </div>

          {showDoctorForm ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>NEW DOCTOR ACCOUNT</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 180px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>FULL NAME *</label>
                  <input className="form-select" placeholder="Dr. Ahmed Ali" value={doctorName} onChange={(event) => { setDoctorName(event.target.value); setDoctorError(''); }} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>EMAIL *</label>
                  <input className="form-select" type="email" placeholder="doctor@university.edu" value={doctorEmail} onChange={(event) => { setDoctorEmail(event.target.value); setDoctorError(''); }} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>PASSWORD *</label>
                  <input className="form-select" type="password" placeholder="Set password" value={doctorPassword} onChange={(event) => { setDoctorPassword(event.target.value); setDoctorError(''); }} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: '2 1 180px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>SPECIALTY</label>
                  <input className="form-select" placeholder="e.g. Machine Learning" value={doctorSpecialty} onChange={(event) => setDoctorSpecialty(event.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleAddDoctor} style={{ height: 42, whiteSpace: 'nowrap' }}>Save Doctor</button>
                </div>
              </div>
              {doctorError ? <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{doctorError}</p> : null}
            </div>
          ) : null}

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 200px 100px 80px 48px', gap: 12, padding: '10px 18px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.8 }}>
              <span />
              <span>NAME</span>
              <span>EMAIL</span>
              <span>SPECIALTY</span>
              <span>COURSES</span>
              <span />
            </div>

            {doctors.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: 'var(--text-muted)', gap: 10 }}>
                <p style={{ fontSize: 13 }}>No doctors yet. Click "+ Add Doctor" to create one.</p>
              </div>
            ) : doctors.map((doctor, index) => (
              <div
                key={doctor.id}
                style={{ display: 'grid', gridTemplateColumns: '44px 1fr 200px 100px 80px 48px', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarGrad(index), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{doctor.avatar}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{doctor.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {doctor.id}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.email}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doctor.specialty}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ background: 'rgba(99,102,241,0.12)', color: '#a78bfa', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{doctor.courses.length}</span>
                </div>
                <button
                  onClick={() => deleteDoctor(doctor.id)}
                  title="Remove doctor"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 15, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(239,68,68,0.22)'; }}
                  onMouseLeave={(event) => { event.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">FILTER BY DOCTOR</label>
              <select className="form-select" value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)}>
                <option value="">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ height: 42 }} onClick={() => { setShowCourseForm((value) => !value); resetCourseForm(); setCourseError(''); }}>
              {showCourseForm ? 'Cancel' : '+ Assign Course'}
            </button>
          </div>

          {showCourseForm ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>ASSIGN COURSE TO DOCTOR</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                  <label className="form-label">DOCTOR *</label>
                  <select className="form-select" value={selectedDoctor} onChange={(event) => { setSelectedDoctor(event.target.value); setCourseError(''); }}>
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                  <label className="form-label">FACULTY *</label>
                  <select className="form-select" value={selectedFaculty} onChange={(event) => { setSelectedFaculty(event.target.value); setSelectedCollege(''); setSelectedCourseId(''); setCourseError(''); }}>
                    <option value="">Faculty</option>
                    {FACULTY_CATALOG.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                  <label className="form-label">DEPARTMENT *</label>
                  <select className="form-select" value={selectedCollege} disabled={!selectedFaculty} onChange={(event) => { setSelectedCollege(event.target.value); setSelectedCourseId(''); setCourseError(''); }}>
                    <option value="">Department</option>
                    {colleges.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '2 1 180px', marginBottom: 0 }}>
                  <label className="form-label">COURSE *</label>
                  <select className="form-select" value={selectedCourseId} disabled={!selectedCollege} onChange={(event) => { setSelectedCourseId(event.target.value); setCourseError(''); }}>
                    <option value="">Course</option>
                    {catalogCourses.map((item) => (
                      <option key={item.id} value={item.id}>{item.id} - {item.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '0 1 140px', marginBottom: 0 }}>
                  <label className="form-label">TYPE</label>
                  <select className="form-select" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                    {CLASS_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleAddCourse} style={{ height: 42, whiteSpace: 'nowrap' }}>Assign</button>
                </div>
              </div>
              {courseError ? <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{courseError}</p> : null}
            </div>
          ) : null}

          {doctors.filter((doctor) => !selectedDoctor || doctor.id === selectedDoctor).map((doctor, index) => (
            <div key={doctor.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarGrad(index), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{doctor.avatar}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{doctor.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{doctor.email} - {doctor.courses.length} course{doctor.courses.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {doctor.courses.length === 0 ? (
                <div style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 13 }}>No courses assigned yet.</div>
              ) : doctor.courses.map((course) => {
                const typeStyle = TYPE_STYLE[course.type] || TYPE_STYLE.Lecture;

                return (
                  <div
                    key={course.uid}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', background: 'rgba(99,102,241,0.10)', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>{course.id}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{course.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: typeStyle.bg, color: typeStyle.color, flexShrink: 0 }}>{course.type}</span>
                    <button
                      onClick={() => deleteCourse(doctor.id, course.uid)}
                      title="Remove assignment"
                      style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: 14, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                      onMouseEnter={(event) => { event.currentTarget.style.background = 'rgba(239,68,68,0.22)'; }}
                      onMouseLeave={(event) => { event.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
                    >
                      x
                    </button>
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

export default AdminPanelPage;
