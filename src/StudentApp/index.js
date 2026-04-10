import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';

// ── Icons ─────────────────────────────────────────────────────────
const CameraIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
    <circle cx="12" cy="13" r="3"></circle>
  </svg>
);
const HistoryIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
);
const LogOutIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

// ── Components ────────────────────────────────────────────────────
const ScanTab = ({ user, socketRef }) => {
  const [scanning, setScanning] = useState(true);
  const [scanned, setScanned]   = useState(false);

  const simulateScan = () => {
    setScanning(false);
    setScanned(true);
    // Simulate emitting to socket so doctor dashboard sees it
    if (socketRef && socketRef.current) {
      socketRef.current.emit('student_attended', {
        universityId: user.universityId,
        name: user.name,
      });
    }
    setTimeout(() => {
      setScanned(false);
      setScanning(true);
    }, 3000);
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>Scan QR Code</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 40 }}>
        Point your camera at the lecture QR code to register your attendance.
      </p>

      <div style={{ position: 'relative', width: 260, height: 260, marginBottom: 40 }}>
        {/* Frame corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '12px 0 0 0' }}></div>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 12px 0 0' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '0 0 0 12px' }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 0 12px 0' }}></div>

        {/* Camera feed mockup */}
        <div style={{ width: '100%', height: '100%', borderRadius: 16, background: '#111', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {scanned ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30 }}>✓</div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Attendance Recorded</span>
            </div>
          ) : (
            <div style={{ opacity: 0.3, color: '#fff' }}>
              <CameraIcon />
            </div>
          )}

          {/* Scanning line animation */}
          {scanning && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)',
              boxShadow: '0 0 15px var(--accent)', animation: 'scanLineAnim 2s infinite linear'
            }} />
          )}
        </div>
      </div>

      <button onClick={simulateScan} disabled={scanned} style={{
        padding: '14px 40px', borderRadius: 30, border: 'none', background: scanned ? '#4b5563' : 'linear-gradient(135deg, var(--primary), var(--accent))',
        color: '#fff', fontSize: 16, fontWeight: 700, cursor: scanned ? 'default' : 'pointer', transition: 'all 0.3s',
        boxShadow: scanned ? 'none' : '0 10px 25px rgba(26,107,69,0.4)', opacity: scanned ? 0.7 : 1, width: '100%', maxWidth: 300,
      }}>
        {scanned ? 'Please Wait...' : 'Simulate Scan'}
      </button>

      <style>{`
        @keyframes scanLineAnim {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const HistoryTab = ({ user, allSessions }) => {
  // In a real app we would load history for `user.universityId` from a database.
  // We'll mock some history combining the user's past data with any live sessions if we wanted.
  const MOCK_HISTORY = [
    { id: 1, course: 'CS301', name: 'Algorithms', type: 'Lecture', week: 6, date: 'Apr 02, 2026', time: '10:17 AM', status: 'present' },
    { id: 2, course: 'CS201', name: 'Data Structures', type: 'Lecture', week: 6, date: 'Apr 01, 2026', time: '08:15 AM', status: 'present' },
    { id: 3, course: 'CS401', name: 'Software Engineering', type: 'Section', week: 5, date: 'Mar 26, 2026', time: '-', status: 'absent' },
    { id: 4, course: 'CS301', name: 'Algorithms', type: 'Lecture', week: 5, date: 'Mar 26, 2026', time: '10:05 AM', status: 'present' },
    { id: 5, course: 'CS201', name: 'Data Structures', type: 'Lecture', week: 5, date: 'Mar 24, 2026', time: '08:22 AM', status: 'late' },
  ];

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>History</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        Your recent attendance records.
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: 16, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>ATTENDED</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>24</div>
        </div>
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: 16, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>ABSENT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>3</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK_HISTORY.map(session => (
          <div key={session.id} style={{
            background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                background: session.status === 'present' ? 'rgba(52,211,153,0.15)' : session.status === 'absent' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                color: session.status === 'present' ? '#34d399' : session.status === 'absent' ? '#f87171' : '#fbbf24',
              }}>
                {session.course}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{session.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.date} · W{session.week} {session.type}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 4,
                background: session.status === 'present' ? 'rgba(52,211,153,0.1)' : session.status === 'absent' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                color: session.status === 'present' ? '#34d399' : session.status === 'absent' ? '#f87171' : '#fbbf24',
              }}>
                {session.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{session.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Student App Layout ──────────────────────────────────────
const StudentApp = ({ user, onSignOut, socketRef, allSessions }) => {
  const [tab, setTab] = useState('scan');
  
  // Set body background to standard app dark color for mobile feel
  useEffect(() => {
    document.body.style.background = 'var(--bg-dark)';
    return () => { document.body.style.background = ''; };
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#000'
    }}>
      {/* Mobile container constraint wrapper */}
      <div style={{
        width: '100%', maxWidth: 480, height: '100%', background: 'var(--bg-dark)', position: 'relative',
        display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.5)'
      }}>
        
        {/* Header */}
        <header style={{
          padding: '24px 20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
              {user.avatar}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {user.universityId}</div>
            </div>
          </div>
          <button onClick={onSignOut} style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <LogOutIcon />
          </button>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'scan' ? <ScanTab user={user} socketRef={socketRef} /> : <HistoryTab user={user} allSessions={allSessions} />}
        </div>

        {/* Bottom Navigation */}
        <nav style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)', zIndex: 20
        }}>
          <button onClick={() => setTab('scan')} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: tab === 'scan' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s'
          }}>
            <CameraIcon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>Scan QR</span>
          </button>
          
          <div style={{ width: 1, height: 30, background: 'var(--border)' }} />

          <button onClick={() => setTab('history')} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: tab === 'history' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s'
          }}>
            <HistoryIcon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>History</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default StudentApp;
