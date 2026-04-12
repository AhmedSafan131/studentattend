import React, { useMemo, useState } from 'react';
import { authenticate } from '../../utils/auth';
import { useLanguage } from '../../i18n';
import AppHelmet from '../../components/AppHelmet';
import CustomInput from '../../components/CustomInput';
import CustomDropdown from '../../components/CustomDropdown';
import CustomBottom from '../../components/Bottom';
import Footer from '../../components/Footer';
import mnuLogo from '../../assets/images/mnu-logo.png';

const ProfessionalSignIn = ({ onSignIn }) => {
  const { t, lang, toggleLang, isRTL, theme, toggleTheme } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState('doctor');

  const roleOptions = useMemo(() => ([
    { value: 'doctor', label: t('doctorRole') },
    { value: 'admin', label: t('adminRole') },
    { value: 'student', label: t('studentRole') },
  ]), [t]);

  const roleContent = {
    doctor: {
      badge: t('doctorRole'),
      title: t('loginDoctorTitle'),
      description: t('loginDoctorDescription'),
      accent: 'linear-gradient(135deg, rgba(18,87,56,0.98), rgba(46,173,120,0.88))',
    },
    admin: {
      badge: t('adminRole'),
      title: t('loginAdminTitle'),
      description: t('loginAdminDescription'),
      accent: 'linear-gradient(135deg, rgba(120,28,28,0.98), rgba(220,38,38,0.82))',
    },
    student: {
      badge: t('studentRole'),
      title: t('loginStudentTitle'),
      description: t('loginStudentDescription'),
      accent: 'linear-gradient(135deg, rgba(8,94,89,0.98), rgba(20,184,166,0.82))',
    },
  };

  const activeRole = roleContent[loginRole];

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('enterEmailPass'));
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      const account = authenticate(email, password);

      if (!account) {
        setError(t('invalidCredentials'));
        setLoading(false);
        return;
      }

      if (account.userRole !== loginRole) {
        setError(`${t('wrongRole')} (${roleOptions.find((role) => role.value === loginRole)?.label || loginRole})`);
        setLoading(false);
        return;
      }

      onSignIn(account);
    }, 650);
  };

  return (
    <div className="signin-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <AppHelmet
        titleEn="Sign In"
        titleAr="تسجيل الدخول"
        descriptionEn="Sign in to UniAttend as an admin, doctor, or student."
        descriptionAr="سجّل الدخول إلى يوني أتند كمدير نظام أو دكتور أو طالب."
      />

      <div className="signin-blob signin-blob-1" />
      <div className="signin-blob signin-blob-2" />
      <div className="signin-blob signin-blob-3" />

      <div className="signin-pro-toolbar">
        <button type="button" onClick={toggleLang} className="signin-pro-toolbar-btn">
          <span>🌐</span>
          <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
        </button>
        <button type="button" onClick={toggleTheme} className="signin-pro-toolbar-btn signin-pro-toolbar-btn-icon">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="signin-pro-shell">
        <div className="signin-pro-card">
          <div className="signin-pro-grid">
            <section className="signin-pro-showcase" style={{ background: activeRole.accent }}>
              <div className="signin-pro-brand">
                <div className="signin-pro-brand-mark">
                  <img
                    src={mnuLogo}
                    alt="Menoufia National University"
                    style={{ width: 62, height: 62, objectFit: 'contain', borderRadius: 18 }}
                  />
                </div>

                <div>
                  <p className="signin-pro-overline">{t('loginPortalEyebrow')}</p>
                  <h1 className="signin-pro-brand-title">{t('appName')}</h1>
                  <p className="signin-pro-brand-subtitle">{t('universityName')}</p>
                </div>
              </div>

              <div className="signin-pro-highlight-card">
                <span className="signin-pro-highlight-chip">{activeRole.badge}</span>
                <h2>{t('loginWelcomeTitle')}</h2>
                <p>{t('loginWelcomeDescription')}</p>
              </div>

              <div className="signin-pro-spotlight-card">
                <div className="signin-pro-spotlight-header">
                  <span className="signin-pro-spotlight-badge">{t('loginFeatureBadge')}</span>
                  <strong>{activeRole.title}</strong>
                </div>
                <p>{activeRole.description}</p>
              </div>

              <div className="signin-pro-metrics">
                <div className="signin-pro-metric">
                  <strong>3</strong>
                  <span>{t('loginFeatureRoles')}</span>
                </div>
                <div className="signin-pro-metric">
                  <strong>Live</strong>
                  <span>{t('loginFeatureRealtime')}</span>
                </div>
                <div className="signin-pro-metric">
                  <strong>AR / EN</strong>
                  <span>{t('loginFeatureBilingual')}</span>
                </div>
              </div>
            </section>

            <section className="signin-pro-panel">
              <div className="signin-pro-panel-header">
                <p className="signin-pro-overline">{t('loginPortalEyebrow')}</p>
                <h2 className="signin-pro-title">{t('signIn')}</h2>
                <p className="signin-pro-subtitle">{t('accessDashboard')}</p>
              </div>

              <form className="signin-pro-form" onSubmit={handleSubmit} noValidate>
                <CustomDropdown
                  id="signin-role"
                  name="signin-role"
                  label={t('loginRoleLabel')}
                  value={loginRole}
                  onChange={(event) => {
                    setLoginRole(event.target.value);
                    setError('');
                  }}
                  options={roleOptions}
                  placeholder={t('loginRolePlaceholder')}
                  disabled={loading}
                />

                <CustomInput
                  id="signin-email"
                  name="email"
                  type="email"
                  label={t('emailLabel')}
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  autoComplete="email"
                  disabled={loading}
                  dir="ltr"
                  icon="✉"
                />

                <CustomInput
                  id="signin-password"
                  name="password"
                  type="password"
                  label={t('passwordLabel')}
                  placeholder={t('passPlaceholder')}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                  dir="ltr"
                  icon="🔒"
                  showPasswordLabel={t('loginShowPassword')}
                  hidePasswordLabel={t('loginHidePassword')}
                />

                <div className="signin-pro-helper-row">
                  <span className="signin-pro-helper-copy">{t('loginRoleHint')}</span>
                </div>

                {error ? <div className="signin-pro-error"><span>⚠</span>{error}</div> : null}

                <CustomBottom
                  type="submit"
                  text={t('signInBtn')}
                  loading={loading}
                  loadingText={lang === 'ar' ? 'جارٍ تسجيل الدخول...' : 'Signing in...'}
                  rigthIcon={isRTL ? '←' : '→'}
                />
              </form>

              <div className="signin-pro-support-card">
                <strong>{t('loginSupportLabel')}</strong>
                <span>{t('loginSupportDescription')}</span>
              </div>
            </section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default ProfessionalSignIn;
