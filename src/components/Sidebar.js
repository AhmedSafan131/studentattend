import React from 'react';
import { useLanguage } from '../i18n';

const Sidebar = ({ activePage, onPageChange, doctorName, userRole, onSignOut, className = '' }) => {
  const { t, isRTL } = useLanguage();

  const DOCTOR_NAV = [
    { id: 'dashboard',  icon: '🏠', label: t('navDashboard'),  section: t('sectionMain') },
    { id: 'attendance', icon: '📋', label: t('navAttendance'), section: t('sectionMain') },
    { id: 'reports',    icon: '📊', label: t('navReports'),    section: t('sectionMain') },
  ];

  const ADMIN_NAV = [
    { id: 'admin',      icon: '🛡️', label: t('navAdmin'),      section: t('sectionAdministration') },
    { id: 'dashboard',  icon: '🏠', label: t('navDashboard'),  section: t('sectionAdministration') },
    { id: 'attendance', icon: '📋', label: t('navAttendance'), section: t('sectionAcademic')        },
    { id: 'students',   icon: '👥', label: t('navStudents'),   section: t('sectionAcademic')        },
    { id: 'courses',    icon: '📚', label: t('navCourses'),    section: t('sectionAcademic')        },
    { id: 'reports',    icon: '📊', label: t('navReports'),    section: t('sectionAcademic')        },
    { id: 'qr',         icon: '📱', label: t('navQR'),         section: t('sectionSystem')          },
    { id: 'settings',   icon: '⚙️', label: t('navSettings'),  section: t('sectionSystem')          },
  ];

  const NAV_ITEMS = userRole === 'admin' ? ADMIN_NAV : DOCTOR_NAV;
  const sections  = [...new Set(NAV_ITEMS.map(i => i.section))];

  const initials  = doctorName
    ? doctorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'DR';

  const roleBadgeBg = userRole === 'admin'
    ? 'linear-gradient(135deg,#dc2626,#f87171)'
    : 'linear-gradient(135deg,#4f46e5,#818cf8)';

  return (
    <aside className={`sidebar ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* University Logo */}
      <div className="sidebar-logo" style={{ paddingBottom: 12 }}>
        <img
          src="/university-logo.png"
          alt="University Logo"
          style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: '50%', marginBottom: 6 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <h2 style={{ fontSize: 16 }}>{t('appName')}</h2>
        <p style={{ fontSize: 10, opacity: 0.6, margin: 0 }}>{t('universityName')}</p>
      </div>

      {/* Role badge */}
      <div style={{
        margin: '0 16px 8px',
        padding: '6px 12px',
        borderRadius: 8,
        background: userRole === 'admin' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
        border: userRole === 'admin' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>{userRole === 'admin' ? '🛡️' : '👨‍⚕️'}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: userRole === 'admin' ? '#f87171' : '#a78bfa', letterSpacing: 0.5 }}>
          {userRole === 'admin' ? t('adminAccess') : t('doctorAccess')}
        </span>
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

      {/* User card */}
      <div className="sidebar-bottom">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar" style={{ background: roleBadgeBg }}>{initials}</div>
          <div className="sidebar-user-info">
            <p>{doctorName}</p>
            <span>{userRole === 'admin' ? t('sysAdmin') : t('facultyMember')}</span>
          </div>
        </div>
        <button className="sidebar-signout-btn" onClick={onSignOut}>
          <span>🚪</span> {t('signOut')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;