import React, { useEffect, useState } from 'react';
import { Check, Settings2 } from '../../../../assets/icons';
import { COLLEGE_OPTIONS } from '../../../../utils/permissions';

const CollegeMultiSelect = ({ value, onToggle, disabled, t }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 56,
          borderRadius: 18,
          border: '1.5px solid var(--border)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 94%, transparent), color-mix(in srgb, var(--bg-dark) 96%, transparent))',
          color: value.length ? 'var(--text-primary)' : 'var(--text-muted)',
          padding: '12px 16px',
          textAlign: 'left',
          fontSize: 14,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value.length
            ? t('settingsCollegesSelectedLabel').replace('{count}', value.length)
            : t('settingsCollegesSelectPlaceholder')}
        </span>
        <Settings2 size={16} />
      </button>

      {value.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {value.map((college) => (
            <span
              key={college}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(52,211,153,0.12)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {college}
            </span>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 12px)',
            zIndex: 40,
            padding: 10,
            borderRadius: 22,
            border: '1px solid var(--border)',
            background: 'color-mix(in srgb, var(--bg-card) 96%, transparent)',
            boxShadow: '0 24px 50px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(18px)',
            display: 'grid',
            gap: 6,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {COLLEGE_OPTIONS.map((college) => {
            const active = value.includes(college.value);

            return (
              <button
                key={college.value}
                type="button"
                onClick={() => onToggle(college.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 16,
                  background: active ? 'rgba(52,211,153,0.12)' : 'transparent',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'grid', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{college.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{college.facultyName}</span>
                </span>
                {active ? <Check size={16} color="var(--accent)" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default CollegeMultiSelect;
