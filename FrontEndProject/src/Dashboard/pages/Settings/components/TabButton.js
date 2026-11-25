import React from 'react';

const TabButton = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      minHeight: 50,
      borderRadius: 16,
      border: active ? '1px solid rgba(52,211,153,0.34)' : '1px solid var(--border)',
      background: active
        ? 'linear-gradient(135deg, rgba(26,107,69,0.24), rgba(52,211,153,0.1))'
        : 'rgba(255,255,255,0.02)',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '0 18px',
      fontSize: 14,
      fontWeight: 800,
      cursor: 'pointer',
      transition: 'var(--transition)',
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default TabButton;
