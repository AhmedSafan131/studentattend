import React from 'react';
import { Activity, BookOpen, Shield, Users } from '../../../../assets/icons';

const statCardStyle = {
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 18,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const ICONS = [Shield, Users, BookOpen, Activity];

const AdminPanelHeader = ({ doctors, totalAssignments, uniqueSubjects }) => {
  const stats = [
    {
      label: 'Doctors',
      value: doctors.length,
      detail: 'All doctor accounts available in the system.',
    },
    {
      label: 'Assignments',
      value: totalAssignments,
      detail: 'Every doctor-subject link stored in the admin panel.',
    },
    {
      label: 'Unique Subjects',
      value: uniqueSubjects,
      detail: 'Distinct subject codes currently assigned.',
    },
    {
      label: 'Shared Subjects',
      value: Math.max(0, totalAssignments - uniqueSubjects),
      detail: 'Assignments where subjects are reused across doctors.',
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 28,
          border: '1px solid var(--border)',
          background: 'radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 38%), radial-gradient(circle at right, rgba(96,165,250,0.12), transparent 30%), linear-gradient(135deg, rgba(11,18,32,0.98), rgba(16,38,30,0.92))',
          padding: 28,
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.62)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Admin Workspace
          </div>
          <h1 style={{ margin: '10px 0 12px', fontSize: 30, fontWeight: 900, color: '#f8fafc' }}>
            Manage doctors one by one or from a single sheet
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.78)' }}>
            This page supports bulk CSV or Excel import, manual doctor creation, optional faculty access selection, and multi-subject assignment. The same subject can belong to more than one doctor.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {stats.map((stat, index) => {
          const Icon = ICONS[index];

          return (
            <div key={stat.label} style={statCardStyle}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(52,211,153,0.12)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.6 }}>
                  {stat.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminPanelHeader;
