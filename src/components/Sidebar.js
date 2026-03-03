import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard',  section: 'MAIN' },
  { id: 'attendance', icon: '📋', label: 'Attendance', section: 'MAIN' },
  { id: 'qr',         icon: '📱', label: 'QR Control', section: 'MAIN' },
  { id: 'students',   icon: '👥', label: 'Students',   section: 'ACADEMIC' },
  { id: 'courses',    icon: '📚', label: 'Courses',    section: 'ACADEMIC' },
  { id: 'reports',    icon: '📊', label: 'Reports',    section: 'ACADEMIC' },
  { id: 'settings',   icon: '⚙️',  label: 'Settings',  section: 'SYSTEM' },
];

const Sidebar = ({ activePage, onPageChange, doctorName, onSignOut }) => {
  const sections  = [...new Set(NAV_ITEMS.map(i => i.section))];
  const initials  = doctorName
    ? doctorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'DR';

  return (
    <aside className="sidebar">
      {/* Logo / Branding */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        <h2>UniAttend</h2>
        <p>Smart Attendance System</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map(section => (
          <React.Fragment key={section}>
            <div className="sidebar-section-label">{section}</div>
            {NAV_ITEMS.filter(i => i.section === section).map(item => (
              <button
                key={item.id}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                onClick={() => onPageChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* Bottom: user card + sign out */}
      <div className="sidebar-bottom">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <p>{doctorName}</p>
            <span>Faculty Member</span>
          </div>
        </div>
        <button className="sidebar-signout-btn" onClick={onSignOut}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;