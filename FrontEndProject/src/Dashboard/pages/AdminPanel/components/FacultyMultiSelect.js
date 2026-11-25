import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Building2 } from '../../../../assets/icons';
import { FACULTY_OPTIONS } from '../utils/adminPanelUtils';

const FacultyMultiSelect = ({ value = [], onToggle, disabled = false, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const options = useMemo(
    () => FACULTY_OPTIONS.map((option) => ({
      ...option,
      label: t(option.labelKey),
    })),
    [t],
  );

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
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
            ? t('adminFacultiesSelectedLabel').replace('{count}', value.length)
            : t('adminFacultyOptionalPlaceholder')}
        </span>
        <Building2 size={16} />
      </button>

      {value.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {options
            .filter((option) => value.includes(option.value))
            .map((option) => (
              <span
                key={option.value}
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
                {option.label}
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
          {options.map((option) => {
            const active = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
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
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{option.label}</span>
                {active ? <Check size={16} color="var(--accent)" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default FacultyMultiSelect;
