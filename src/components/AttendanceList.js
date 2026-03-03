import React from 'react';

/**
 * Returns a deterministic gradient color based on student index
 */
const AVATAR_COLORS = [
  ['#1a6b45', '#34d399'],
  ['#2563eb', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#d97706', '#fbbf24'],
  ['#059669', '#6ee7b7'],
  ['#dc2626', '#f87171'],
  ['#0891b2', '#22d3ee'],
];

function getAvatarColors(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/**
 * AttendanceList Component
 * Shows a live-updating scrollable list of students who scanned the QR.
 * New entries animate in from the left.
 */
const AttendanceList = ({ students, lectureActive }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Header with total count ────────── */}
      <div className="card-title" style={{ marginBottom: 12 }}>
        <span>👥</span> Live Attendance
      </div>

      <div className="attendance-header-stats">
        <div className="total-badge">{students.length} Present</div>
        {lectureActive && students.length > 0 && (
          <div className="attendance-live-badge">
            <span className="live-dot" />
            LIVE TRACKING
          </div>
        )}
      </div>

      {/* ── Student rows ──────────────────── */}
      {students.length === 0 ? (
        <div className="empty-list">
          <span className="empty-list-icon">🧑‍🎓</span>
          <p>{lectureActive ? 'Waiting for students to scan…' : 'Start a lecture to track attendance'}</p>
        </div>
      ) : (
        <div className="student-list">
          {[...students].reverse().map((student, idx) => {
            const [c1, c2] = getAvatarColors(students.length - 1 - idx);
            const initial = student.name.charAt(0).toUpperCase();
            // Mark the 3 most recently added as "new entry" for highlight
            const isNew = idx < 3;
            return (
              <div
                key={student.id}
                className={`student-row ${isNew ? 'new-entry' : ''}`}
              >
                {/* Index number */}
                <span className="student-row-index">{students.length - idx}</span>

                {/* Avatar with gradient */}
                <div
                  className="student-row-avatar"
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                >
                  {initial}
                </div>

                {/* Name + ID */}
                <div className="student-row-info">
                  <div className="student-row-name">{student.name}</div>
                  <div className="student-row-id">ID: {student.universityId}</div>
                </div>

                {/* Time of scan */}
                <span className="student-row-time">{student.scanTime}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
