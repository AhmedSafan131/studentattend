import React, { useState } from 'react';
import { BookOpen, ChevronDown } from '../../../../assets/icons';
import { PERMISSIONS } from '../../../../utils/permissions';

const UserCard = ({ user, roleLabel, onEdit, onDelete, editLabel, selected = false, t }) => {
  const [expandedSections, setExpandedSections] = useState({ permissions: false, subjects: false });
  const permissions = user.permissions || [];
  const subjects = user.courses || [];

  const toggleSection = (section) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const renderSectionButton = (section, label, count) => {
    const isExpanded = expandedSections[section];

    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        aria-expanded={isExpanded}
        aria-controls={`${user.id}-${section}`}
        style={{
          width: '100%', minHeight: 40, padding: '9px 12px', borderRadius: 13,
          border: '1px solid var(--border)', background: 'rgba(255,255,255,0.025)',
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, cursor: 'pointer', textAlign: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          {section === 'subjects' ? <BookOpen size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : null}
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800 }}>
            {count}
          </span>
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease',
          }}
        />
      </button>
    );
  };

  return (
    <div
      className="settings-user-card"
      style={{
        borderRadius: 22,
        border: selected ? '1px solid rgba(52,211,153,0.42)' : '1px solid var(--border)',
        background: selected ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
        padding: 18, display: 'grid', gap: 14,
      }}
    >
      <div className="settings-user-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="settings-user-identity" style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 50, height: 50, borderRadius: 18,
              background: user.userRole === 'admin'
                ? 'linear-gradient(135deg, #7f1d1d, #ef4444)'
                : 'linear-gradient(135deg, #0f766e, #3b82f6)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, flexShrink: 0,
            }}
          >
            {user.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>{user.email}</div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 800 }}>
                {roleLabel}
              </span>
              {user.isSystem ? (
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(251,191,36,0.14)', color: '#fbbf24', fontSize: 12, fontWeight: 800 }}>
                  {t('settingsProtectedBadge')}
                </span>
              ) : null}
              {permissions.includes(PERMISSIONS.FULL_DASHBOARD_ACCESS) ? (
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 12, fontWeight: 800 }}>
                  {t('settingsFullAccessBadge')}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="settings-user-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onEdit(user)}
            style={{
              minWidth: 92, height: 40, borderRadius: 14, border: '1px solid rgba(96,165,250,0.24)',
              background: 'rgba(96,165,250,0.12)', color: '#93c5fd', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}
          >
            {editLabel || t('studentsEditButton')}
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(user)}
              disabled={user.isSystem}
              style={{
                minWidth: 92, height: 40, borderRadius: 14, border: '1px solid rgba(239,68,68,0.24)',
                background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 13, fontWeight: 800,
                cursor: user.isSystem ? 'not-allowed' : 'pointer', opacity: user.isSystem ? 0.52 : 1,
              }}
            >
              {t('studentsDeleteButton')}
            </button>
          ) : null}
        </div>
      </div>

      {user.specialty ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{user.specialty}</div>
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        {renderSectionButton('permissions', t('settingsPermissionsLabel'), permissions.length)}
        {expandedSections.permissions ? (
          <div id={`${user.id}-permissions`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '2px 4px 0' }}>
            {permissions.length ? permissions.map((permission) => (
              <span
                key={`${user.id}-${permission}`}
                style={{
                  padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700,
                }}
              >
                {t(`settingsPermissionCode_${permission}`)}
              </span>
            )) : (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('settingsNoPermissionsAssigned')}</span>
            )}
          </div>
        ) : null}
      </div>

      {user.userRole !== 'admin' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {renderSectionButton('subjects', t('settingsAssignedSubjectsLabel'), subjects.length)}
          {expandedSections.subjects ? (
            <div id={`${user.id}-subjects`} style={{ display: 'grid', gap: 8, padding: '2px 4px 0' }}>
              {subjects.length ? subjects.map((subject, index) => (
                <div
                  key={subject.uid || `${user.id}-subject-${index}`}
                  style={{
                    padding: '10px 12px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.16)',
                    background: 'rgba(52,211,153,0.06)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 900 }}>{subject.id || subject.courseCode || subject.uid}</span>
                    <span style={{ marginInlineStart: 8, color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 700 }}>{subject.name}</span>
                  </div>
                  {subject.type ? (
                    <span style={{ padding: '4px 9px', borderRadius: 999, background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: 11, fontWeight: 800 }}>
                      {subject.type}
                    </span>
                  ) : null}
                </div>
              )) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('settingsNoAssignedSubjects')}</span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {user.userRole === 'admin' ? <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('settingsAllowedCollegesLabel')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(user.allowedColleges?.length ? user.allowedColleges : [t('settingsAllColleges')]).map((college) => (
            <span
              key={`${user.id}-${college}`}
              style={{
                padding: '5px 10px', borderRadius: 999, background: 'rgba(52,211,153,0.12)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 800,
              }}
            >
              {college}
            </span>
          ))}
        </div>
      </div> : null}
    </div>
  );
};

export default UserCard;
