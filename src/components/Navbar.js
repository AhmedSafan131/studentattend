import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';

const Navbar = ({ doctorName, lectureActive, socketConnected, socketError, userRole, onMenuToggle, sidebarOpen }) => {
  const { t, isRTL, lang, theme, toggleTheme, toggleLang } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initials = doctorName
    ? doctorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'DR';

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const formattedTime = currentTime.toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const socketStatus = socketError
    ? { color: '#f87171', label: t('serverError'),  dot: '#ef4444' }
    : socketConnected
      ? { color: '#34d399', label: t('serverOnline'), dot: '#34d399' }
      : { color: '#f59e0b', label: t('connecting'),   dot: '#f59e0b' };

  const avatarBg = userRole === 'admin'
    ? 'linear-gradient(135deg,#dc2626,#f87171)'
    : 'linear-gradient(135deg,#4f46e5,#818cf8)';

  return (
    <header className="navbar" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hamburger (mobile only) */}
      <button className="navbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Left: title + date */}
      <div className="navbar-left">
        <span className="navbar-title">{t('navbarTitle')}</span>
        <span className="navbar-subtitle">{formattedDate}</span>
      </div>

      {/* Right: status + clock + badge */}
      <div className="navbar-right">
        {/* Socket status */}
        <div className="navbar-socket-pill" style={{ borderColor: `${socketStatus.dot}33` }}>
          <span className="navbar-socket-dot" style={{
            background: socketStatus.dot,
            animation: socketConnected && !socketError ? 'pulseAnim 1.8s infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: socketStatus.color, letterSpacing: '0.5px' }}>
            {socketStatus.label}
          </span>
        </div>

        {/* Lecture live badge */}
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
              background: '#34d399', animation: 'pulseAnim 1.2s infinite', display: 'inline-block',
            }} />
            {t('lectureLive')}
          </span>
        )}

        {/* Clock */}
        <span className="navbar-time" style={{ direction: 'ltr' }}>{formattedTime}</span>

        {/* ── Language + Theme toggles grouped ──────── */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Language */}
          <button
            onClick={toggleLang}
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
            style={{
              padding: '7px 13px',
              border: 'none',
              borderRight: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-glow)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            🌐 {lang === 'en' ? 'عربي' : 'EN'}
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              padding: '7px 13px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* User badge */}
        <div className="navbar-badge">
          <div className="navbar-badge-avatar" style={{ background: avatarBg }}>{initials}</div>
          <div>
            <p>{doctorName}</p>
            <span>{userRole === 'admin' ? t('sysAdmin') : t('lecturer')}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
