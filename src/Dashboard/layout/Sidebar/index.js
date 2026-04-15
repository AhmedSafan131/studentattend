import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../../i18n';
import { mnuLogo } from '../../../assets';
import { Activity, LayoutDashboard, LogOut, QrCode, Settings2, Users } from '../../../assets/icons';
import { CustomBottom, ConfirmationDialog, LanguageSwitcher, ThemeToggle } from '../../../components';
import { DASHBOARD_PAGE_ROUTES } from '../../pages';
import { useAuth } from '../../../hooks';

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  attendance: Users,
  reports: Activity,
  admin: Settings2,
  students: Users,
  qr: QrCode,
  settings: Settings2,
};

const Sidebar = ({ className = '' }) => {
  const { t, isRTL } = useLanguage();
  const { user, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userRole = user?.userRole;
  const doctorName = user?.name;
  const navItems = useMemo(
    () => DASHBOARD_PAGE_ROUTES[userRole === 'admin' ? 'admin' : 'doctor'] || [],
    [userRole],
  );
  const sections = useMemo(() => [...new Set(navItems.map((item) => item.sectionKey))], [navItems]);

  const initials = doctorName
    ? doctorName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
    : 'DR';

  const roleMeta = userRole === 'admin'
    ? {
        subtitle: t('sysAdmin'),
        surface: 'linear-gradient(135deg, rgba(127,29,29,0.86), rgba(220,38,38,0.78))',
        soft: 'rgba(239,68,68,0.14)',
        border: 'rgba(248,113,113,0.28)',
      }
    : {
        subtitle: t('facultyMember'),
        surface: 'linear-gradient(135deg, rgba(30,64,175,0.88), rgba(79,70,229,0.78))',
        soft: 'rgba(99,102,241,0.14)',
        border: 'rgba(129,140,248,0.28)',
      };

  return (
    <>
      <aside className={`sidebar ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="sidebar-logo">
          <div className="sidebar-brand-card">
            <div className="sidebar-brand-mark">
              <img
                src={mnuLogo}
                alt={t('studentAttendanceTitle')}
                className="sidebar-brand-image"
              />
            </div>
            <div className="sidebar-brand-copy">
              <span className="sidebar-brand-eyebrow">{t('dashboardWorkspace')}</span>
              <h2>{t('studentAttendanceTitle')}</h2>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((sectionKey) => (
            <React.Fragment key={sectionKey}>
              <div className="sidebar-section-label">{t(sectionKey)}</div>
              {navItems.filter((item) => item.sectionKey === sectionKey).map((item) => {
                const ItemIcon = NAV_ICONS[item.key] || LayoutDashboard;
                return (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon">
                      <ItemIcon size={18} />
                    </span>
                    <span className="nav-item-text">{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-preferences-panel">
            <div className="sidebar-preferences-grid">
              <LanguageSwitcher className="sidebar-preference-toggle" />
              <ThemeToggle className="sidebar-preference-toggle" />
            </div>
          </div>

          <div className="sidebar-user-card" style={{ background: roleMeta.soft, border: `1px solid ${roleMeta.border}` }}>
            <div className="sidebar-avatar" style={{ background: roleMeta.surface }}>{initials}</div>
            <div className="sidebar-user-info">
              <p style={{ marginBottom: 2 }}>{doctorName}</p>
              <span>{roleMeta.subtitle}</span>
            </div>
          </div>

          <CustomBottom
            type="button"
            text={t('signOut')}
            onClick={() => setShowLogoutConfirm(true)}
            rigthIcon={<LogOut size={16} />}
            background="linear-gradient(135deg, #dc2626, #b91c1c)"
            textColor="#ffffff"
            border="1px solid rgba(127,29,29,0.28)"
            boxShadow="0 10px 22px rgba(185,28,28,0.2)"
            minHeight={42}
          />
        </div>
      </aside>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
        title={t('confirmSignOutTitle')}
        message={t('confirmSignOutMessage')}
        confirmText={t('signOut')}
        cancelText={t('stayHere')}
      />
    </>
  );
};

export default Sidebar;
