import React from 'react';
const MetricCard = ({ label, value, hint, cardStyle }) => (
  <div
    style={{
      ...cardStyle,
      padding: 20,
      display: 'grid',
      gap: 8,
      minHeight: 122,
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1.1, textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{hint}</div>
  </div>
);

export default MetricCard;
