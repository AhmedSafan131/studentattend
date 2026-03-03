import React, { useState, useEffect } from 'react';

/**
 * Navbar Component
 * Top bar: title, live clock, socket status, lecture live badge, doctor badge.
 */
const Navbar = ({ doctorName, lectureActive, socketConnected, socketError }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock — updates every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initials = doctorName
    ? doctorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'DR';

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Socket status appearance
  const socketStatus = socketError
    ? { color: '#f87171', label: 'SERVER ERROR',  dot: '#ef4444' }
    : socketConnected
      ? { color: '#34d399', label: 'SERVER ONLINE', dot: '#34d399' }
      : { color: '#f59e0b', label: 'CONNECTING…',   dot: '#f59e0b' };

  return (
    <header className="navbar">
      {/* Left: page title + date */}
      <div className="navbar-left">
        <span className="navbar-title">Doctor Attendance Dashboard</span>
        <span className="navbar-subtitle">{formattedDate}</span>
      </div>

      {/* Right: socket pill + lecture badge + time + notifs + doctor */}
      <div className="navbar-right">

        {/* ── Socket Server Status ─────────────────── */}
        <div className="navbar-socket-pill" style={{ borderColor: `${socketStatus.dot}33` }}>
          <span
            className="navbar-socket-dot"
            style={{
              background: socketStatus.dot,
              animation: socketConnected && !socketError ? 'pulseAnim 1.8s infinite' : 'none',
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: socketStatus.color, letterSpacing: '0.5px' }}>
            {socketStatus.label}
          </span>
        </div>

        {/* ── Lecture Live Badge ───────────────────── */}
        {lectureActive && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#34d399',
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 50, padding: '4px 12px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#34d399',
              animation: 'pulseAnim 1.2s infinite',
              display: 'inline-block',
            }} />
            LECTURE LIVE
          </span>
        )}

        {/* ── Clock ─────────────────────────────────── */}
        <span className="navbar-time">{formattedTime}</span>

        {/* ── Notification bell ─────────────────────── */}
        <button className="navbar-notif-btn">🔔</button>

        {/* ── Doctor badge ──────────────────────────── */}
        <div className="navbar-badge">
          <div className="navbar-badge-avatar">{initials}</div>
          <div>
            <p>{doctorName}</p>
            <span>Lecturer</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
