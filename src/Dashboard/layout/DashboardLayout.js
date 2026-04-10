import React from 'react';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

/**
 * DashboardLayout — Main authenticated app shell.
 * Wraps every page with Sidebar + Navbar.
 */
const DashboardLayout = ({
  children,
  user,
  activePage,
  onPageChange,
  onSignOut,
  sidebarOpen,
  onMenuToggle,
  lectureActive,
  socketConnected,
  socketError,
}) => (
  <div className="app-shell">
    {/* Mobile overlay */}
    <div
      className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
      onClick={() => onMenuToggle(false)}
    />

    <Sidebar
      activePage={activePage}
      onPageChange={onPageChange}
      doctorName={user.name}
      userRole={user.userRole}
      onSignOut={onSignOut}
      className={sidebarOpen ? 'open' : ''}
    />

    <div className="main-layout">
      <Navbar
        doctorName={user.name}
        lectureActive={lectureActive}
        socketConnected={socketConnected}
        socketError={socketError}
        userRole={user.userRole}
        onMenuToggle={onMenuToggle}
        sidebarOpen={sidebarOpen}
      />
      <main className="content-area">
        {children}
      </main>
    </div>
  </div>
);

export default DashboardLayout;
