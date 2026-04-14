import React from 'react';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Users,
} from '../../../../assets/icons';
import { useLanguage } from '../../../../i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, t }) => {
  if (!(active && payload && payload.length)) return null;

  return (
    <div
      style={{
        background: '#162030',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 12,
        color: '#e8f4f0',
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p>{t('attendanceTooltip')}: <strong style={{ color: '#34d399' }}>{payload[0].value}%</strong></p>
    </div>
  );
};

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
          cx="40"
          cy="40"
          r={r}
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

const StatsCards = ({ attendedCount, totalRegistered, lectureActive }) => {
  const { t, lang } = useLanguage();
  const absentCount = Math.max(0, totalRegistered - attendedCount);
  const percentage = totalRegistered > 0 ? Math.round((attendedCount / totalRegistered) * 100) : 0;

  const chartData = [
    { day: t('monShort'), pct: 72 },
    { day: t('tueShort'), pct: 85 },
    { day: t('wedShort'), pct: 68 },
    { day: t('thuShort'), pct: 91 },
    { day: t('friShort'), pct: 77 },
    { day: t('satShort'), pct: 60 },
    { day: t('todayLabel'), pct: percentage },
  ];

  const statCards = [
    { icon: Users, value: attendedCount, label: t('attendedLabel'), sub: t('thisLecture'), color: '#34d399' },
    { icon: Activity, value: absentCount, label: t('absentLabel'), sub: t('thisLecture'), color: '#ef4444' },
    { icon: BookOpen, value: totalRegistered, label: t('registeredLabel'), sub: t('totalEnrolled'), color: '#60a5fa' },
    { icon: CalendarDays, value: '6', label: t('sessionsLabel'), sub: t('thisSemester'), color: '#a78bfa' },
  ];

  return (
    <div className="card doctor-dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title doctor-dashboard-card-title">
        <span className="doctor-dashboard-card-title-icon"><Activity size={18} /></span>
        {t('statisticsTitle')}
      </div>

      <div className="attendance-pct-wrapper">
        <PctRing percentage={percentage} />
        <div className="pct-info">
          <h3>{t('attendanceRate')}</h3>
          <p>{attendedCount} {t('ofWord')} {totalRegistered} {t('studentsPresentSummary')}</p>
          {!lectureActive ? (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('startLectureToUpdateLive')}</p>
          ) : null}
        </div>
      </div>

      <div className="stats-grid doctor-stats-grid">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div key={card.label} className="stat-card doctor-stat-card">
              <div className="stat-card-accent" style={{ background: card.color }} />
              <div className="stat-card-icon" style={{ color: card.color }}><CardIcon size={20} /></div>
              <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-sub">{card.sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
          {t('weeklyAttendance')}
        </p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20} margin={{ left: lang === 'ar' ? 4 : -20, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#546a7b' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#546a7b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip t={t} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.day}
                  fill={index === chartData.length - 1 ? '#34d399' : entry.pct >= 75 ? '#1a6b45' : '#164a30'}
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
