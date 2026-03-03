import React from 'react';

/** Available courses and their sections */
const COURSES = [
  { id: 'CS101', name: 'CS101 — Intro to Programming',       sections: ['A', 'B', 'C'] },
  { id: 'CS201', name: 'CS201 — Data Structures',            sections: ['A', 'B'] },
  { id: 'CS301', name: 'CS301 — Algorithms & Complexity',    sections: ['A', 'B', 'C', 'D'] },
  { id: 'CS401', name: 'CS401 — Software Engineering',       sections: ['A'] },
  { id: 'CS501', name: 'CS501 — Machine Learning',           sections: ['A', 'B'] },
  { id: 'MATH211', name: 'MATH211 — Discrete Mathematics',   sections: ['A', 'B', 'C'] },
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
  onCourseChange,
  onSectionChange,
  onStartLecture,
  onEndLecture,
}) => {
  const course = COURSES.find(c => c.id === selectedCourse);
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
          {COURSES.map(c => (
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
            Section {selectedSection}
          </p>
        </div>
      )}

      {/* ── Action buttons ────────────────── */}
      <div className="btn-row">
        <button
          className="btn btn-primary"
          onClick={onStartLecture}
          disabled={lectureActive || !selectedCourse || !selectedSection}
          id="start-lecture-btn"
        >
          ▶ Start Lecture
        </button>
        <button
          className="btn btn-danger"
          onClick={onEndLecture}
          disabled={!lectureActive}
          id="end-lecture-btn"
        >
          ■ End Lecture
        </button>
      </div>
    </div>
  );
};

export { COURSES };
export default LectureControl;
