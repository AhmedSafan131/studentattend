import React, { useState } from 'react';
import { authenticate, store, ADMIN_ACCOUNT } from '../auth';
import { useLanguage } from '../i18n';

const SignIn = ({ onSignIn }) => {
  const { t, lang, toggleLang, isRTL, theme, toggleTheme } = useLanguage();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [loginRole, setLoginRole] = useState('doctor');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError(t('enterEmailPass')); return; }
    setLoading(true);
    setTimeout(() => {
      const account = authenticate(email, password);
      if (account) {
        if (account.userRole !== loginRole) {
          setError(t('wrongRole') + ` (${account.userRole === 'admin' ? t('adminRole') : t('doctorRole')})`);
          setLoading(false);
          return;
        }
        onSignIn(account);
      } else {
        setError(t('invalidCredentials'));
        setLoading(false);
      }
    }, 700);
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setLoginRole(acc.userRole);
    setError('');
  };

  const demoAccounts = [
    { ...ADMIN_ACCOUNT, password: 'admin123' },
    ...store.doctors.slice(0, 3),
  ];

  return (
    <div className="signin-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="signin-blob signin-blob-1" />
      <div className="signin-blob signin-blob-2" />
      <div className="signin-blob signin-blob-3" />

      {/* Combined Language + Theme pill — top corner */}
      <div style={{
        position: 'fixed', top: 20, right: isRTL ? 'auto' : 20, left: isRTL ? 20 : 'auto',
        zIndex: 100, display: 'flex',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10, overflow: 'hidden',
        backdropFilter: 'blur(10px)',
      }}>
        <button onClick={toggleLang} style={{
          padding: '8px 14px', border: 'none',
          borderRight: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: '#fff',
          fontWeight: 700, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          🌐 {lang === 'en' ? 'عربي' : 'EN'}
        </button>
        <button onClick={toggleTheme} style={{
          padding: '8px 14px', border: 'none',
          background: 'transparent', color: '#fff',
          fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="signin-card">
        {/* University Logo + Branding */}
        <div className="signin-logo">
          <img
            src="/university-logo.png"
            alt="Menoufia National University"
            style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 8, borderRadius: '50%' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <h1 style={{ fontSize: 20, margin: '4px 0 2px' }}>{t('appName')}</h1>
          <p style={{ fontSize: 12, opacity: 0.75, margin: 0 }}>{t('universityName')}</p>
        </div>

        <div className="signin-divider" />

        {/* Sign In heading (centered) + role toggle */}
        <div style={{ textAlign: 'center' }}>
          <h2 className="signin-heading" style={{ textAlign: 'center' }}>{t('signIn')}</h2>
          <p className="signin-subheading" style={{ textAlign: 'center' }}>{t('accessDashboard')}</p>

          {/* Role toggle */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(0,0,0,0.15)',
            padding: 4, borderRadius: 10, marginBottom: 24,
            border: '1px solid var(--border)',
          }}>
            <button type="button" onClick={() => { setLoginRole('doctor'); setError(''); }} style={{
              padding: '8px 24px', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: loginRole === 'doctor' ? 'var(--accent)' : 'transparent',
              color: loginRole === 'doctor' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>👨‍⚕️</span> {t('doctorRole')}
            </button>
            <button type="button" onClick={() => { setLoginRole('admin'); setError(''); }} style={{
              padding: '8px 24px', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: loginRole === 'admin' ? '#ef4444' : 'transparent',
              color: loginRole === 'admin' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>🛡️</span> {t('adminRole')}
            </button>
          </div>
        </div>

        {/* Form */}
        <form className="signin-form" onSubmit={handleSubmit} noValidate>
          <div className="signin-field">
            <label className="signin-label" htmlFor="signin-email">{t('emailLabel')}</label>
            <div className="signin-input-wrap">
              <span className="signin-input-icon">✉️</span>
              <input id="signin-email" type="email" className="signin-input"
                placeholder={t('emailPlaceholder')} value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoComplete="email" disabled={loading}
                style={{ textAlign: isRTL ? 'right' : 'left', direction: 'ltr' }}
              />
            </div>
          </div>

          <div className="signin-field">
            <label className="signin-label" htmlFor="signin-password">{t('passwordLabel')}</label>
            <div className="signin-input-wrap">
              <span className="signin-input-icon">🔐</span>
              <input id="signin-password" type={showPass ? 'text' : 'password'} className="signin-input"
                placeholder={t('passPlaceholder')} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password" disabled={loading}
                style={{ textAlign: isRTL ? 'right' : 'left', direction: 'ltr' }}
              />
              <button type="button" className="signin-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="signin-error"><span>⚠️</span> {error}</div>}

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? <span className="signin-spinner" /> : t('signInBtn')}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="signin-demo">
          <p className="signin-demo-label">{t('demoAccounts')}</p>
          <div className="signin-demo-accounts">
            {demoAccounts.map(acc => (
              <button key={acc.email} className="signin-demo-btn" onClick={() => fillDemo(acc)} type="button">
                <div className="signin-demo-avatar"
                  style={acc.userRole === 'admin' ? { background: 'linear-gradient(135deg,#dc2626,#f87171)' } : {}}>
                  {acc.avatar}
                </div>
                <div className="signin-demo-info">
                  <span>{acc.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {acc.userRole === 'admin'
                      ? <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{t('adminRole')}</span>
                      : <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{t('doctorRole')}</span>
                    }
                    {acc.specialty}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="signin-footer">{t('footer')}</p>
      </div>
    </div>
  );
};

export default SignIn;
