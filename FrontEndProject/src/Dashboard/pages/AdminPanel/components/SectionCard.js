import React from 'react';

const SectionCard = ({ icon, eyebrow, title, description, children }) => (
  <section
    className="dashboard-responsive-card"
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
      border: '1px solid var(--border)',
      borderRadius: 24,
      padding: 22,
      boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
    }}
  >
    <div className="dashboard-responsive-card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          background: 'rgba(52,211,153,0.12)',
          border: '1px solid rgba(52,211,153,0.22)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        {eyebrow ? (
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {eyebrow}
          </div>
        ) : null}
        <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h2>
        {description ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7 }}>{description}</p>
        ) : null}
      </div>
    </div>

    {children}
  </section>
);

export default SectionCard;
