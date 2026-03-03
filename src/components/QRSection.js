import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Duration in seconds between QR code refreshes
const QR_INTERVAL = 10;

/**
 * Generates a random token for QR payload security
 */
function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Builds the QR code payload JSON string
 */
function buildPayload(lectureId) {
  return JSON.stringify({
    lecture_id:   lectureId,
    timestamp:    Date.now(),
    random_token: generateToken(),
  });
}

/**
 * Circular SVG countdown ring component
 */
const CountdownRing = ({ value, max }) => {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / max);
  const danger = value <= 3;

  return (
    <div className="countdown-ring">
      <svg width="46" height="46" viewBox="0 0 46 46">
        {/* Background track */}
        <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        {/* Animated progress */}
        <circle
          cx="23" cy="23" r={r}
          fill="none"
          stroke={danger ? '#f59e0b' : '#34d399'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
        />
      </svg>
      <span className="countdown-number" style={{ color: danger ? '#f59e0b' : '#34d399' }}>
        {value}
      </span>
    </div>
  );
};

/**
 * QRSection Component
 * Displays a dynamically refreshing QR code with countdown timer.
 * Refreshes every QR_INTERVAL seconds and shows an "Expired" animation before refresh.
 */
const QRSection = ({ lectureId, lectureActive }) => {
  const [qrPayload,   setQrPayload]   = useState('');
  const [countdown,   setCountdown]   = useState(QR_INTERVAL);
  const [isExpired,   setIsExpired]   = useState(false);

  // Generate a fresh QR payload
  const refreshQR = useCallback(() => {
    setIsExpired(false);
    setQrPayload(buildPayload(lectureId));
    setCountdown(QR_INTERVAL);
  }, [lectureId]);

  // On lecture start (or lectureId change), generate initial QR
  useEffect(() => {
    if (lectureActive) {
      refreshQR();
    } else {
      setQrPayload('');
      setCountdown(QR_INTERVAL);
      setIsExpired(false);
    }
  }, [lectureActive, lectureId, refreshQR]);

  // Tick countdown and handle expiry
  useEffect(() => {
    if (!lectureActive) return;

    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Mark as expired, then wait 1s before refreshing
          setIsExpired(true);
          setTimeout(refreshQR, 900);
          return QR_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [lectureActive, refreshQR]);

  return (
    <div className="card">
      <div className="card-title">
        <span>📱</span> Dynamic QR Code
      </div>

      <div className="qr-wrapper">
        {lectureActive ? (
          <>
            {/* ── QR Box with animated border ───── */}
            <div className="qr-container" style={{ width: 280, height: 280 }}>
              <div className="qr-border-animated" />
              <div className="qr-box" style={{ width: 266, height: 266, position: 'relative', zIndex: 1 }}>
                <QRCodeSVG
                  value={qrPayload || ' '}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#0f1923"
                  level="M"
                />
                {/* Expired overlay */}
                {isExpired && (
                  <div className="qr-expired-overlay">
                    <span className="expired-icon">🔄</span>
                    <p>QR EXPIRED</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Countdown timer ────────────────── */}
            <div className="qr-countdown">
              <CountdownRing value={countdown} max={QR_INTERVAL} />
              <div className="qr-meta">
                <p>Refreshes in <strong style={{ color: countdown <= 3 ? '#f59e0b' : '#34d399' }}>{countdown}s</strong></p>
                <span>Lecture #{lectureId?.slice(-4)}</span>
              </div>
            </div>

            {/* ── Token info ────────────────────── */}
            <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', width: '100%' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SCAN WITH STUDENT APP</p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {qrPayload ? JSON.parse(qrPayload).random_token : '—'}
              </p>
            </div>
          </>
        ) : (
          /* Inactive placeholder */
          <div className="qr-inactive-placeholder">
            <span className="qr-placeholder-icon">📵</span>
            <p>Start a lecture to<br />generate the QR code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRSection;
