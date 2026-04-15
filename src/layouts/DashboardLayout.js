import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHelmet from '../components/AppHelmet';
import Sidebar from '../Dashboard/layout/Sidebar';
import { Menu, X } from '../assets/icons';
import { CustomBottom } from '../components';
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
          zIndex: 55,
          width: 56,
        }}
      >
        <CustomBottom
          text=""
          title={sidebarOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
          onClick={() => setSidebarOpen((open) => !open)}
          rigthIcon={sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          minHeight={42}
          background={sidebarOpen ? 'linear-gradient(135deg, rgba(26,107,69,0.92), rgba(52,211,153,0.78))' : 'rgba(9, 16, 23, 0.86)'}
          border={sidebarOpen ? '1px solid rgba(52,211,153,0.26)' : '1px solid rgba(255,255,255,0.08)'}
          boxShadow={sidebarOpen ? '0 14px 28px rgba(26,107,69,0.24)' : '0 12px 26px rgba(0,0,0,0.18)'}
        />
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
