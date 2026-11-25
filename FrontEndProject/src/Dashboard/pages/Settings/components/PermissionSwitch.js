import React from 'react';

const PermissionSwitch = ({ item, enabled, onToggle, disabled }) => (
  <button
    className="settings-permission-switch"
    type="button"
    onClick={() => onToggle(item.key)}
    disabled={disabled}
    role="switch"
    aria-checked={enabled}
    style={{
      width: '100%',
      borderRadius: 20,
      border: enabled ? '1px solid rgba(52,211,153,0.28)' : '1px solid var(--border)',
      background: enabled
        ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, var(--bg-card)), color-mix(in srgb, var(--accent) 7%, var(--bg-card)))'
        : 'color-mix(in srgb, var(--bg-card2) 72%, var(--bg-card))',
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.64 : 1,
      textAlign: 'left',
    }}
  >
    <span style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{item.title}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.description}</span>
    </span>
    <span
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: enabled
          ? '1px solid rgba(52,211,153,0.48)'
          : '1px solid color-mix(in srgb, var(--text-secondary) 42%, var(--border))',
        background: enabled
          ? 'linear-gradient(135deg, #1a6b45, #22c55e)'
          : 'color-mix(in srgb, var(--text-secondary) 30%, var(--bg-card))',
        boxShadow: enabled
          ? '0 4px 12px rgba(5,150,105,0.24)'
          : 'inset 0 1px 2px rgba(15,23,42,0.12)',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: enabled ? 24 : 4,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '0 2px 6px rgba(15,23,42,0.24)',
          transition: 'left 0.22s ease',
        }}
      />
    </span>
  </button>
);

export default PermissionSwitch;
