import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHelmet from '../components/AppHelmet';
import Sidebar from '../Dashboard/layout/Sidebar';
import { Menu, X } from '../assets/icons';
import { DASHBOARD_META_BY_ROUTE } from '../Dashboard/pages';
import { DEFAULT_DASHBOARD_META, DASHBOARD_META } from '../app/dashboardMeta';
import { useDashboard } from '../hooks';
import { useLanguage } from '../i18n';

const getDashboardMeta = (pathname) => {
  const normalizedPathname = pathname.replace(/\/$/, '') || '/dashboard';
  const metaKey = DASHBOARD_META_BY_ROUTE[normalizedPathname] || 'dashboard';
  return DASHBOARD_META[metaKey] || DEFAULT_DASHBOARD_META;
};

const DashboardLayout = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useDashboard();
  const { isRTL } = useLanguage();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const currentMeta = getDashboardMeta(location.pathname);
  return (
    <div className="app-shell" dir={isRTL ? 'rtl' : 'ltr'}>
      <AppHelmet
        titleEn={currentMeta.titleEn}
        titleAr={currentMeta.titleAr}
        descriptionEn={currentMeta.descriptionEn}
        descriptionAr={currentMeta.descriptionAr}
      />

      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`dashboard-menu-trigger-wrap${sidebarOpen ? ' open' : ''}`}
        style={{
          position: 'fixed',
          top: 12,
          left: isRTL ? 'auto' : 12,
          right: isRTL ? 12 : 'auto',
        }}
      >
        <button
          type="button"
          className="dashboard-menu-trigger"
          title={sidebarOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
          aria-label={sidebarOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span className="dashboard-menu-trigger-icon">
            {sidebarOpen ? <X size={21} strokeWidth={2.4} /> : <Menu size={21} strokeWidth={2.4} />}
          </span>
        </button>
      </div>

      <Sidebar className={sidebarOpen ? 'open' : ''} />

      <div className="main-layout">
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
