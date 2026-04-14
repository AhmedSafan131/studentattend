import React from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from '../../assets/icons';
import { CustomBottom } from '../../components';

const DashboardLayout = ({
  children,
  user,
  onSignOut,
  sidebarOpen,
  onMenuToggle,
}) => (
  <div className="app-shell">
    <div
      className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
      onClick={() => onMenuToggle(false)}
    />

    <div
      className={`dashboard-menu-trigger-wrap${sidebarOpen ? ' open' : ''}`}
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 55,
        width: 56,
      }}
    >
      <CustomBottom
        text=""
        title={sidebarOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
        onClick={() => onMenuToggle((open) => !open)}
        rigthIcon={sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        minHeight={42}
        background={sidebarOpen ? 'linear-gradient(135deg, rgba(26,107,69,0.92), rgba(52,211,153,0.78))' : 'rgba(9, 16, 23, 0.86)'}
        border={sidebarOpen ? '1px solid rgba(52,211,153,0.26)' : '1px solid rgba(255,255,255,0.08)'}
        boxShadow={sidebarOpen ? '0 14px 28px rgba(26,107,69,0.24)' : '0 12px 26px rgba(0,0,0,0.18)'}
      />
    </div>

    <Sidebar
      user={user}
      onSignOut={onSignOut}
      className={sidebarOpen ? 'open' : ''}
    />

    <div className="main-layout">
      <main className="content-area">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;
