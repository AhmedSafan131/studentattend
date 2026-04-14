import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ScanLine } from '../../../../assets/icons';
import { useLanguage } from '../../../../i18n';

const QR_INTERVAL = 10;

function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function buildPayload(lectureId) {
  return JSON.stringify({
    lecture_id: lectureId,
    timestamp: Date.now(),
    random_token: generateToken(),
  });
}

const CountdownRing = ({ value, max }) => {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / max);
  const danger = value <= 3;

  return (
    <div className="countdown-ring">
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={danger ? '#f59e0b' : '#34d399'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
        />
      </svg>
      <span className="countdown-number" style={{ color: danger ? '#f59e0b' : '#34d399' }}>{value}</span>
    </div>
  );
};

const QRSection = ({ lectureId, lectureActive }) => {
  const { t } = useLanguage();
  const [qrPayload, setQrPayload] = useState('');
  const [countdown, setCountdown] = useState(QR_INTERVAL);
  const [isExpired, setIsExpired] = useState(false);

  const refreshQR = useCallback(() => {
    setIsExpired(false);
    setQrPayload(buildPayload(lectureId));
    setCountdown(QR_INTERVAL);
  }, [lectureId]);

  useEffect(() => {
    if (lectureActive) {
      refreshQR();
    } else {
      setQrPayload('');
      setCountdown(QR_INTERVAL);
      setIsExpired(false);
    }
  }, [lectureActive, lectureId, refreshQR]);

  useEffect(() => {
    if (!lectureActive) return undefined;

    const tick = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          setIsExpired(true);
          setTimeout(refreshQR, 900);
          return QR_INTERVAL;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [lectureActive, refreshQR]);

  return (
    <div className="card doctor-dashboard-card doctor-qr-card">
      <div className="card-title doctor-dashboard-card-title">
        <span className="doctor-dashboard-card-title-icon"><QrCode size={18} /></span>
        {t('dynamicQrCode')}
      </div>

      <div className="qr-wrapper">
        {lectureActive ? (
          <>
            <div className="qr-container" style={{ width: 260, height: 260 }}>
              <div className="qr-border-animated" />
              <div className="qr-box" style={{ width: 248, height: 248, position: 'relative', zIndex: 1 }}>
                <QRCodeSVG value={qrPayload || ' '} size={220} bgColor="#ffffff" fgColor="#0f1923" level="M" />
                {isExpired ? (
                  <div className="qr-expired-overlay">
                    <span className="expired-icon"><ScanLine size={24} /></span>
                    <p>{t('qrExpired')}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="qr-countdown">
              <CountdownRing value={countdown} max={QR_INTERVAL} />
              <div className="qr-meta">
                <p>{t('refreshesIn')} <strong style={{ color: countdown <= 3 ? '#f59e0b' : '#34d399' }}>{countdown}s</strong></p>
                <span>{t('lectureIdLabel')} #{lectureId?.slice(-4)}</span>
              </div>
            </div>

            <div className="doctor-qr-token-box">
              <p className="doctor-qr-token-label">{t('scanWithStudentApp')}</p>
              <p className="doctor-qr-token-value">{qrPayload ? JSON.parse(qrPayload).random_token : '--'}</p>
            </div>
          </>
        ) : (
          <div className="qr-inactive-placeholder doctor-qr-placeholder">
            <span className="qr-placeholder-icon"><QrCode size={34} /></span>
            <p>{t('startLectureToGenerateQr')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRSection;
