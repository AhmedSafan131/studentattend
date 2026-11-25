import React from 'react';
import { Clock3, Shield, UsersRound } from '../../../../assets/icons';
const SettingsPermissionOverview = ({ permissionGroups, t, cardStyle }) => (
  <div style={{ display: 'grid', gap: 18 }}>
    <div className="dashboard-responsive-card" style={{ ...cardStyle, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {t('settingsPermissionModelEyebrow')}
          </div>
          <h3 style={{ margin: '10px 0 0', fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>
            {t('settingsPermissionModelTitle')}
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 740 }}>
            {t('settingsPermissionModelDescription')}
          </p>
        </div>

        <div
          className="settings-live-behavior"
          style={{
            minWidth: 250,
            padding: 18,
            borderRadius: 20,
            border: '1px solid rgba(52,211,153,0.22)',
            background: 'rgba(52,211,153,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', fontWeight: 800 }}>
            <Clock3 size={18} />
            {t('settingsLiveBehaviorTitle')}
          </div>
          <div style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
            {t('settingsLiveBehaviorDescription')}
          </div>
        </div>
      </div>
    </div>

    <div className="settings-permission-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
      {Object.entries(permissionGroups).map(([role, groups]) => (
        <div key={role} className="dashboard-responsive-card" style={{ ...cardStyle, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
            {role === 'admin' ? <Shield size={20} /> : <UsersRound size={20} />}
            <span style={{ fontSize: 18, fontWeight: 900 }}>
              {role === 'admin' ? t('settingsTabAdmins') : t('settingsTabDoctors')}
            </span>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
            {groups.map((group) => (
              <div key={`${role}-${group.title}`} style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {group.title}
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {item.description}
                    </div>
                    <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                      {t(`settingsPermissionCode_${item.key}`)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SettingsPermissionOverview;
