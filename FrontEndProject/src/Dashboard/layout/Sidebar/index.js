import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '../../../i18n';
import { mnuLogo } from '../../../assets';
import { Activity, BookOpen, Calendar, LayoutDashboard, LockKeyhole, LogOut, QrCode, ScanLine, Settings2, UserCircle2, Users } from '../../../assets/icons';
import { CustomBottom, ConfirmationDialog, LanguageSwitcher, ThemeToggle } from '../../../components';
import TermSelector from '../../../components/TermSelector';
import { DASHBOARD_PAGE_ROUTES } from '../../pages';
import { useAuth, useDashboard } from '../../../hooks';
import { getVisibleDashboardRoutes, hasPermission, PERMISSIONS } from '../../../utils/permissions';
import { closeActiveFlexibleSession } from '../../../utils/flexibleAttendanceSession';
import { fetchTerms, setSelectedTermCode } from '../../../redux/slices/termsSlice';

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  attendance: Users,
  flexibleAttendance: Activity,
  reports: Activity,
  qr: QrCode,
  admin: Settings2,
  academicTerms: Calendar,
  subjectsCatalog: BookOpen,
  students: Users,
  deactivated: LockKeyhole,
  settings: Settings2,
  staffAccessCode: LockKeyhole,
  scan: ScanLine,
  history: Activity,
  profile: UserCircle2,
};

const preloadDashboardRoute = (routeKey) => {
  if (routeKey === 'reports') {
    void import('../../pages/ProfessionalReportsPage');
  }
};

const Sidebar = ({ className = '' }) => {
  const { t, isRTL } = useLanguage();
  const { user, signOut } = useAuth();
  const { lectureActive, endLecture } = useDashboard();
  const dispatch = useDispatch();
  const { activeTerm, selectedTermCode } = useSelector((state) => state.terms);
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userRole = user?.userRole;
  const canSelectAcademicTerm = userRole === 'admin'
    || hasPermission(user, PERMISSIONS.SELECT_ACADEMIC_TERM);
  const isTermSelectionRestricted = userRole !== 'student' && !canSelectAcademicTerm;
  const canShowSignOut = userRole !== 'student';
  const doctorName = user?.name;
  const roleKey = userRole === 'admin'
    ? 'admin'
    : userRole === 'student'
      ? 'student'
      : userRole === 'staff'
        ? 'staff'
        : 'doctor';
  const navItems = useMemo(
    () => (
      getVisibleDashboardRoutes(
        user,
        (DASHBOARD_PAGE_ROUTES[roleKey] || []),
      )
    ),
    [user, roleKey],
  );
  const sections = useMemo(() => [...new Set(navItems.map((item) => item.sectionKey))], [navItems]);

  useEffect(() => {
    if (navItems.some((item) => item.key === 'reports')) {
      preloadDashboardRoute('reports');
    }
  }, [navItems]);

  useEffect(() => {
    if (!isTermSelectionRestricted) return;

    if (!activeTerm) {
      dispatch(fetchTerms());
      return;
    }

    // Restricted staff always use the active term. Keep its code selected so
    // term-aware requests stay stable instead of clearing and reloading it.
    if (selectedTermCode !== activeTerm.code) {
      dispatch(setSelectedTermCode(activeTerm.code));
    }
  }, [activeTerm, dispatch, isTermSelectionRestricted, selectedTermCode]);

  const initials = doctorName
    ? doctorName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
    : userRole === 'student' ? 'ST' : 'DR';

  const roleMeta = userRole === 'admin'
    ? {
        subtitle: t('sysAdmin'),
        surface: 'linear-gradient(135deg, rgba(127,29,29,0.86), rgba(220,38,38,0.78))',
        soft: 'rgba(239,68,68,0.14)',
        border: 'rgba(248,113,113,0.28)',
      }
    : userRole === 'student'
      ? {
          subtitle: t('studentRole'),
          surface: 'linear-gradient(135deg, rgba(22,101,52,0.88), rgba(16,185,129,0.78))',
          soft: 'rgba(16,185,129,0.14)',
          border: 'rgba(52,211,153,0.28)',
        }
      : {
        subtitle: t('facultyMember'),
        surface: 'linear-gradient(135deg, rgba(30,64,175,0.88), rgba(79,70,229,0.78))',
        soft: 'rgba(99,102,241,0.14)',
        border: 'rgba(129,140,248,0.28)',
      };

  const handleFlexibleSessionExit = useCallback(async () => {
    if (userRole === 'admin') return;
    if (location.pathname !== '/dashboard/flexible-attendance') return;

    await closeActiveFlexibleSession();
  }, [location.pathname, userRole]);

  const handleNavClick = useCallback((event, nextPath) => {
    event.preventDefault();

    if (location.pathname === nextPath) return;

    // Always perform dashboard navigation synchronously. This avoids a stale
    // NavLink click being lost while role routes or lazy chunks are updating.
    navigate(nextPath);

    if (location.pathname === '/dashboard/flexible-attendance') {
      void handleFlexibleSessionExit();
    }
  }, [handleFlexibleSessionExit, location.pathname, navigate]);

  const handleConfirmSignOut = useCallback(async () => {
    setShowLogoutConfirm(false);
    await handleFlexibleSessionExit();
    if (lectureActive) {
      await endLecture();
    }
    signOut();
  }, [endLecture, handleFlexibleSessionExit, lectureActive, signOut]);

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
          <div style={{ marginTop: 12, display: 'flex', justify: 'center' }}>
            {canSelectAcademicTerm ? (
              <TermSelector />
            ) : (
              <div
                className="sidebar-term-badge"
                title={activeTerm?.academicYear || ''}
                style={{
                  width: '100%',
                  minWidth: 200,
                  minHeight: 44,
                  padding: '10px 13px',
                  borderRadius: 13,
                  border: '1px solid rgba(52, 211, 153, 0.28)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                <Calendar className="sidebar-term-badge-icon" size={16} style={{ color: '#6ee7b7', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTerm?.name || activeTerm?.code || '--'}
                </span>
              </div>
            )}
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
                    end={item.path === '/dashboard' || item.path === '/student'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    onPointerEnter={() => preloadDashboardRoute(item.key)}
                    onFocus={() => preloadDashboardRoute(item.key)}
                    onClick={(event) => {
                      handleNavClick(event, item.path);
                    }}
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

          {canShowSignOut ? (
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
          ) : null}
        </div>
      </aside>

      {canShowSignOut ? (
        <ConfirmationDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleConfirmSignOut}
          title={t('confirmSignOutTitle')}
          message={t('confirmSignOutMessage')}
          confirmText={t('signOut')}
          cancelText={t('stayHere')}
        />
      ) : null}
    </>
  );
};

export default Sidebar;
