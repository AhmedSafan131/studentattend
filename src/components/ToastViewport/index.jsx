import React from 'react';
import { Check, X } from '../../assets/icons';

const TOAST_TONE_STYLES = {
  success: {
    accent: '#34d399',
    soft: 'rgba(52, 211, 153, 0.16)',
    border: 'rgba(52, 211, 153, 0.22)',
    glow: '0 18px 36px rgba(10, 20, 30, 0.24)',
  },
  info: {
    accent: '#38bdf8',
    soft: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.22)',
    glow: '0 18px 36px rgba(10, 20, 30, 0.24)',
  },
  error: {
    accent: '#f87171',
    soft: 'rgba(248, 113, 113, 0.14)',
    border: 'rgba(248, 113, 113, 0.22)',
    glow: '0 18px 36px rgba(10, 20, 30, 0.24)',
  },
};

const DefaultToastIcon = ({ tone }) => (
  <Check size={16} color={TOAST_TONE_STYLES[tone]?.accent || TOAST_TONE_STYLES.success.accent} />
);

const ToastViewport = ({ toasts, removeToast }) => (
  <div
    style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2500,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      width: 'min(92vw, 360px)',
      pointerEvents: 'none',
    }}
  >
    {toasts.map((toast) => {
      const toneStyle = TOAST_TONE_STYLES[toast.tone] || TOAST_TONE_STYLES.success;
      const ToastIcon = toast.icon || DefaultToastIcon;

      return (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 22,
            border: `1px solid ${toneStyle.border}`,
            background: 'color-mix(in srgb, var(--bg-card) 94%, transparent)',
            boxShadow: toneStyle.glow,
            backdropFilter: 'blur(18px)',
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: toneStyle.accent,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: toneStyle.soft,
                color: toneStyle.accent,
              }}
            >
              <ToastIcon tone={toast.tone} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {toast.title}
              </p>
              {toast.message ? (
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
                  {toast.message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close toast"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: 10,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

export default ToastViewport;
