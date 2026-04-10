import React from 'react';

/** Full course catalog with sections (used as fallback / admin view) */
export const COURSES = [
  { id: 'CS101',   name: 'CS101 — Intro to Programming',       sections: ['A', 'B', 'C'] },
  { id: 'CS201',   name: 'CS201 — Data Structures',            sections: ['A', 'B'] },
  { id: 'CS301',   name: 'CS301 — Algorithms & Complexity',    sections: ['A', 'B', 'C', 'D'] },
  { id: 'CS401',   name: 'CS401 — Software Engineering',       sections: ['A'] },
  { id: 'CS501',   name: 'CS501 — Machine Learning',           sections: ['A', 'B'] },
  { id: 'MATH211', name: 'MATH211 — Discrete Mathematics',     sections: ['A', 'B', 'C'] },
  { id: 'CS310',   name: 'CS310 — Operating Systems',          sections: ['A', 'B'] },
  { id: 'CS320',   name: 'CS320 — Computer Networks',          sections: ['A'] },
  { id: 'CS330',   name: 'CS330 — Database Systems',           sections: ['A', 'B'] },
  { id: 'CS420',   name: 'CS420 — Artificial Intelligence',    sections: ['A'] },
  { id: 'MATH101', name: 'MATH101 — Calculus I',               sections: ['A', 'B', 'C'] },
  { id: 'MATH201', name: 'MATH201 — Linear Algebra',           sections: ['A', 'B'] },
  { id: 'EE101',   name: 'EE101 — Circuit Analysis',           sections: ['A'] },
  { id: 'EE201',   name: 'EE201 — Digital Logic Design',       sections: ['A'] },
];

/**
 * LectureControl Component
 * Allows the doctor to select course/section and start/end a lecture.
 * Props:
 *   lectureActive — bool
 *   selectedCourse — string (course id)
 *   selectedSection — string
 *   onCourseChange(courseId)
 *   onSectionChange(section)
 *   onStartLecture()
 *   onEndLecture()
 */
const LectureControl = ({
  lectureActive,
  selectedCourse,
  selectedSection,
  selectedWeek,
  onCourseChange,
  onSectionChange,
  onWeekChange,
  onStartLecture,
  onEndLecture,
  doctorCourses = [],   // assigned courses for the logged-in doctor
  userRole = 'doctor',  // 'admin' sees full list
}) => {
  // Doctor sees only their assigned courses; admin sees everything
  const displayCourses = (userRole === 'admin' || doctorCourses.length === 0)
    ? COURSES
    : (() => {
        // Deduplicate by courseId, merge sections from the full COURSES list
        const ids = [...new Set(doctorCourses.map(c => c.id))];
        return ids.map(id => {
          const full = COURSES.find(c => c.id === id);
          return full || { id, name: `${id}`, sections: ['A'] };
        });
      })();

  const course   = displayCourses.find(c => c.id === selectedCourse);
  const sections = course ? course.sections : [];

  return (
    <div className="card">
      <div className="card-title">
        <span>🎙️</span> Lecture Control
      </div>

      {/* ── Status badge ──────────────────── */}
      <div className={`lecture-status-badge ${lectureActive ? 'active' : 'inactive'}`}>
        <span className={`status-dot ${lectureActive ? 'pulse' : ''}`} />
        {lectureActive ? 'Lecture Active' : 'No Active Lecture'}
      </div>

      {/* ── Course selector ───────────────── */}
      <div className="form-group">
        <label className="form-label" htmlFor="course-select">COURSE</label>
        <select
          id="course-select"
          className="form-select"
          value={selectedCourse}
          onChange={e => onCourseChange(e.target.value)}
          disabled={lectureActive}
        >
          <option value="">— Select a course —</option>
          {displayCourses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Section selector ──────────────── */}
      <div className="form-group">
        <label className="form-label" htmlFor="section-select">SECTION</label>
        <select
          id="section-select"
          className="form-select"
          value={selectedSection}
          onChange={e => onSectionChange(e.target.value)}
          disabled={!selectedCourse || lectureActive}
        >
          <option value="">— Select a section —</option>
          {sections.map(s => (
            <option key={s} value={s}>Section {s}</option>
          ))}
        </select>
      </div>

      {/* ── Week selector ─────────────────── */}
      <div className="form-group">
        <label className="form-label" htmlFor="week-select">WEEK</label>
        <select
          id="week-select"
          className="form-select"
          value={selectedWeek}
          onChange={e => onWeekChange(e.target.value)}
          disabled={!selectedCourse || lectureActive}
        >
          <option value="">— Select a week —</option>
          {Array.from({ length: 14 }, (_, i) => i + 1).map(week => (
            <option key={week} value={week}>Week {week}</option>
          ))}
        </select>
      </div>

      {/* ── Lecture info when active ──────── */}
      {lectureActive && selectedCourse && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(52,211,153,0.05)',
          border: '1px solid rgba(52,211,153,0.15)',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>Currently teaching</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
            {course?.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Section {selectedSection} • Week {selectedWeek}
          </p>
        </div>
      )}

      {/* ── Action buttons ────────────────── */}
      <div className="btn-row">
        <button
          className="btn btn-primary"
          onClick={onStartLecture}
          disabled={lectureActive || !selectedCourse || !selectedSection || !selectedWeek}
          id="start-lecture-btn"
        >
          ▶ Take Attendance
        </button>
        <button
          className="btn btn-danger"
          onClick={onEndLecture}
          disabled={!lectureActive}
          id="end-lecture-btn"
        >
          ■ End Attendance
        </button>
      </div>
    </div>
  );
};

export default LectureControl;
