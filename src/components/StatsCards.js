import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

/**
 * Custom Recharts tooltip
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#162030',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12,
        color: '#e8f4f0',
      }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
        <p>Attendance: <strong style={{ color: '#34d399' }}>{payload[0].value}%</strong></p>
      </div>
    );
  }
  return null;
};

/**
 * Circular SVG ring for attendance percentage
 */
const PctRing = ({ percentage }) => {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percentage / 100);
  const color = percentage >= 75 ? '#34d399' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="pct-ring-container">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span className="pct-value" style={{ color }}>{percentage}%</span>
    </div>
  );
};

/**
 * StatsCards Component
 * Shows 4 stat cards + attendance ring + weekly bar chart.
 */
const StatsCards = ({ attendedCount, totalRegistered, lectureActive }) => {
  const absentCount   = Math.max(0, totalRegistered - attendedCount);
  const percentage    = totalRegistered > 0
    ? Math.round((attendedCount / totalRegistered) * 100)
    : 0;

  // Mock weekly attendance chart data
  const chartData = [
    { day: 'Mon', pct: 72 },
    { day: 'Tue', pct: 85 },
    { day: 'Wed', pct: 68 },
    { day: 'Thu', pct: 91 },
    { day: 'Fri', pct: 77 },
    { day: 'Sat', pct: 60 },
    { day: 'Today', pct: percentage },
  ];

  const STAT_CARDS = [
    {
      icon: '✅',
      value: attendedCount,
      label: 'Attended',
      sub: 'This lecture',
      color: '#34d399',
    },
    {
      icon: '❌',
      value: absentCount,
      label: 'Absent',
      sub: 'This lecture',
      color: '#ef4444',
    },
    {
      icon: '👥',
      value: totalRegistered,
      label: 'Registered',
      sub: 'Total enrolled',
      color: '#60a5fa',
    },
    {
      icon: '📅',
      value: '6',
      label: 'Sessions',
      sub: 'This semester',
      color: '#a78bfa',
    },
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title">
        <span>📊</span> Statistics
      </div>

      {/* ── Attendance percentage ring ─────── */}
      <div className="attendance-pct-wrapper">
        <PctRing percentage={percentage} />
        <div className="pct-info">
          <h3>Attendance Rate</h3>
          <p>{attendedCount} of {totalRegistered} students present</p>
          {!lectureActive && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Start a lecture to update live
            </p>
          )}
        </div>
      </div>

      {/* ── 4 stat mini-cards ──────────────── */}
      <div className="stats-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="stat-card">
            {/* Background accent blob */}
            <div className="stat-card-accent" style={{ background: s.color }} />
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Weekly bar chart ───────────────── */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
          WEEKLY ATTENDANCE (%)
        </p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#546a7b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#546a7b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    index === chartData.length - 1
                      ? '#34d399'
                      : entry.pct >= 75
                        ? '#1a6b45'
                        : '#164a30'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsCards;
