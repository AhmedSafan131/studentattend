import React from 'react';
import { useLanguage } from '../../i18n';
import mnuLogo from '../../assets/images/mnu-logo.png';

const footerLinkStyle = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  textDecoration: 'none',
};

const Footer = () => {
  const { t, isRTL } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 28,
        borderTop: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08))',
        borderRadius: 28,
        padding: '24px 22px 18px',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <img
              src={mnuLogo}
              alt="Menoufia National University"
              style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: 14 }}
            />
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 800 }}>
                {t('universityName')}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {t('appName')}
              </div>
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
            {t('footerUniversitySystem')}
          </p>
        </div>

        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
            {t('footerQuickLinks')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/" style={footerLinkStyle}>{t('footerPrivacy')}</a>
            <a href="/" style={footerLinkStyle}>{t('footerTerms')}</a>
            <a href="/" style={footerLinkStyle}>{t('footerSupport')}</a>
          </div>
        </div>

        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
            {t('footerReachUs')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            <span>support@mnu.edu.eg</span>
            <span>www.mnu.menofia.education</span>
            <span>+20 48 000 0000</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}
      >
        {t('footerRights').replace('{year}', year)}
      </div>
    </footer>
  );
};

export default Footer;
