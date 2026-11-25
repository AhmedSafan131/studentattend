import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Eye, EyeOff } from 'lucide-react';
import { Clock3, QrCode, ScanLine, X } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { lectureSessionsAPI } from '../../../../utils/api';

const DEFAULT_QR_SIZE = {
  container: 320,
  box: 304,
  code: 272,
};

const FULLSCREEN_QR_SIZE = {
  container: 860,
  box: 780,
  code: 700,
};

const FULLSCREEN_QR_RENDER_SIZE = 1024;
const FULLSCREEN_EXIT_BUTTON_POSITIONS = [
  { top: 20, left: 20 },
  { top: 20, right: 20 },
  { bottom: 20, left: 20 },
  { bottom: 20, right: 20 },
];

const getServerCountdown = (expiresAt, serverOffsetMs, fallbackSeconds) => {
  const expiresAtMs = Date.parse(expiresAt || '');
  if (!Number.isFinite(expiresAtMs)) return fallbackSeconds;

  return Math.max(0, Math.ceil((expiresAtMs - (Date.now() + serverOffsetMs)) / 1000));
};

const QRSection = ({ lectureId, lectureActive, lectureQrPayload = '', qrDuration = 10, onQrDurationChange, totalAttendance = 0 }) => {
  const { t, lang } = useLanguage();
  const secondsUnit = lang === 'ar' ? 'ث' : 's';
  const [qrPayload, setQrPayload] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isSessionCodeVisible, setIsSessionCodeVisible] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isExpired, setIsExpired] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrFullscreenRef = useRef(null);
  const serverClockOffsetRef = useRef(0);
  const qrExpiresAtRef = useRef('');
  const qrRefreshInFlightRef = useRef(false);
  const qrNextRetryAtRef = useRef(0);
  const qrIntervalOptions = useMemo(
    () => [
      { value: 3, label: '3 sec' },
      { value: 5, label: '5 sec' },
      { value: 10, label: '10 sec' },
      { value: 15, label: '15 sec' },
    ],
    [],
  );

  const qrSize = useMemo(
    () => (isFullscreen ? FULLSCREEN_QR_SIZE : DEFAULT_QR_SIZE),
    [isFullscreen],
  );

  const refreshQR = useCallback(async () => {
    if (!lectureId || qrRefreshInFlightRef.current) return;

    qrRefreshInFlightRef.current = true;
    qrNextRetryAtRef.current = Date.now() + 2000;
    setQrLoading(true);
    try {
      const response = await lectureSessionsAPI.qrToken(lectureId, qrDuration);
      const data = response?.data || {};
      const serverTimeMs = Date.parse(data.serverTime || '');

      if (Number.isFinite(serverTimeMs)) {
        serverClockOffsetRef.current = serverTimeMs - Date.now();
      }

      if (!data.qrPayload) throw new Error('Empty QR payload');
      qrExpiresAtRef.current = data.qrExpiresAt || '';
      setIsExpired(false);
      setQrLoadFailed(false);
      setQrPayload(data.qrPayload);
      setSessionCode(String(data.sessionCode || ''));
      setCountdown(getServerCountdown(
        qrExpiresAtRef.current,
        serverClockOffsetRef.current,
        Number(data.qrWindowSeconds || qrDuration),
      ));
    } finally {
      qrRefreshInFlightRef.current = false;
      setQrLoading(false);
    }
  }, [lectureId, qrDuration]);

  useEffect(() => {
    if (lectureActive) {
      if (lectureQrPayload) {
        setQrPayload(lectureQrPayload);
        setIsExpired(false);
        setQrLoadFailed(false);
      }
      refreshQR().catch(() => {
        setQrLoadFailed(true);
      });
    } else {
      setQrPayload('');
      setSessionCode('');
      qrExpiresAtRef.current = '';
      setCountdown(qrDuration);
      setIsExpired(false);
      setQrLoading(false);
      setQrLoadFailed(false);
    }
  }, [lectureActive, lectureId, lectureQrPayload, qrDuration, refreshQR]);

  useEffect(() => {
    setIsSessionCodeVisible(false);
  }, [lectureId]);

  useEffect(() => {
    if (!lectureActive) return undefined;

    const tick = () => {
      const remaining = getServerCountdown(
        qrExpiresAtRef.current,
        serverClockOffsetRef.current,
        qrDuration,
      );

      setCountdown(remaining);
      if ((!qrExpiresAtRef.current || remaining <= 1) && Date.now() >= qrNextRetryAtRef.current) {
        setIsExpired(true);
        refreshQR().catch(() => setQrLoadFailed(true));
      }
    };

    tick();
    const interval = setInterval(tick, 500);

    return () => clearInterval(interval);
  }, [lectureActive, qrDuration, refreshQR]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === qrFullscreenRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleOpenFullscreen = async () => {
    const target = qrFullscreenRef.current;

    if (!target || typeof target.requestFullscreen !== 'function') return;

    try {
      await target.requestFullscreen();
    } catch (error) {
      // Ignore fullscreen failures so the QR experience stays usable.
    }
  };

  const handleExitFullscreen = async () => {
    if (typeof document === 'undefined' || typeof document.exitFullscreen !== 'function') return;

    try {
      await document.exitFullscreen();
    } catch (error) {
      // Ignore fullscreen failures so the QR experience stays usable.
    }
  };

  return (
    <div className="card doctor-dashboard-card doctor-qr-card">
      <div className="card-title doctor-dashboard-card-title">
        <span className="doctor-dashboard-card-title-icon"><QrCode size={18} /></span>
        {t('dynamicQrCode')}
      </div>

      <div className="qr-wrapper">
        {lectureActive ? (
          <>
            <div
              ref={qrFullscreenRef}
              className="qr-container"
              style={{
                width: isFullscreen ? 'min(92vw, 92vh)' : qrSize.container,
                height: isFullscreen ? 'min(92vw, 92vh)' : qrSize.container,
                maxWidth: '100%',
                maxHeight: '100%',
                background: isFullscreen
                  ? '#08131c'
                  : 'radial-gradient(circle at top, rgba(52,211,153,0.12), rgba(15,25,35,0.94) 58%, rgba(8,19,28,1) 100%)',
                borderRadius: isFullscreen ? 28 : 24,
                border: isFullscreen ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(52,211,153,0.14)',
                padding: isFullscreen ? 32 : 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: isFullscreen ? '0 26px 70px rgba(0,0,0,0.36)' : '0 18px 34px rgba(0,0,0,0.18)',
              }}
            >
              {isFullscreen ? FULLSCREEN_EXIT_BUTTON_POSITIONS.map((position, index) => (
                <div
                  key={`exit-fullscreen-${index}`}
                  style={{
                    position: 'absolute',
                    ...position,
                    width: 'min(190px, calc(50% - 30px))',
                    zIndex: 3,
                  }}
                >
                      <CustomBottom
                        type="button"
                        onClick={handleExitFullscreen}
                        text={t('qrExitFullscreen')}
                        rigthIcon={<X size={16} />}
                        minHeight={46}
                        background="linear-gradient(135deg, #ef4444, #b91c1c)"
                        textColor="#ffffff"
                        border="1px solid rgba(127, 29, 29, 0.4)"
                        boxShadow="0 14px 28px rgba(185, 28, 28, 0.28)"
                      />
                </div>
              )) : null}

              <div
                className="qr-box"
                style={{
                  width: isFullscreen ? 'min(60vw, 60vh)' : qrSize.box,
                  height: isFullscreen ? 'min(60vw, 60vh)' : qrSize.box,
                  position: 'relative',
                  zIndex: 1,
                  padding: isFullscreen ? 6 : 10,
                }}
              >
                {qrPayload ? <QRCodeSVG
                  value={qrPayload}
                  size={isFullscreen ? FULLSCREEN_QR_RENDER_SIZE : qrSize.code}
                  bgColor="#ffffff"
                  fgColor="#0f1923"
                  level="M"
                  style={{ display: 'block', width: '100%', height: '100%' }}
                /> : <div className="qr-inactive-placeholder doctor-qr-placeholder" style={{ height: '100%', margin: 0 }}><span className="qr-placeholder-icon"><QrCode size={34} /></span><p>{qrLoadFailed ? t('qrLoadFailed') : t('qrGenerating')}</p></div>}
                {qrPayload && isExpired ? (
                  <div className="qr-expired-overlay">
                    <span className="expired-icon"><ScanLine size={24} /></span>
                    <p>{t('qrExpired')}</p>
                  </div>
                ) : null}
              </div>
              {isFullscreen ? <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 4, borderRadius: 999, padding: '10px 22px', background: 'rgba(15,25,35,.92)', border: '1px solid rgba(52,211,153,.35)', color: '#d1fae5', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>{t('temporaryRosterTotal')}: {totalAttendance}</div> : null}
              {isFullscreen && sessionCode ? (
                <div dir="ltr" style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 4, width: 'min(420px, calc(100% - 24px))', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px, 4vw, 28px)', borderRadius: 16, padding: '12px 16px', background: 'rgba(15,25,35,.94)', border: '1px solid rgba(52,211,153,.35)', color: '#d1fae5' }}>
                  <div style={{ flex: '1 1 176px', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <span style={{ minWidth: 112, textAlign: 'center', letterSpacing: isSessionCodeVisible ? 6 : 3, fontSize: 25, fontWeight: 950 }}>{isSessionCodeVisible ? sessionCode : '•'.repeat(sessionCode.length)}</span>
                    <button type="button" onClick={() => setIsSessionCodeVisible((visible) => !visible)} aria-label={isSessionCodeVisible ? 'إخفاء كود الجلسة' : 'إظهار كود الجلسة'} style={{ width: 42, height: 42, flex: '0 0 42px', borderRadius: 12, border: '1px solid rgba(52,211,153,.3)', background: 'rgba(52,211,153,.12)', color: '#6ee7b7', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{isSessionCodeVisible ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <span aria-hidden="true" style={{ width: 1, height: 38, background: 'rgba(255,255,255,.22)' }} />
                  <span style={{ flex: '0 0 70px', display: 'inline-flex', flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap', color: countdown <= 3 ? '#fbbf24' : '#6ee7b7', fontSize: 20, fontWeight: 950 }}><span>{secondsUnit}</span><span>{countdown}</span></span>
                </div>
              ) : null}
            </div>

            <div className="doctor-qr-token-box" dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
              <div style={{ minWidth: 120, textAlign: 'center' }}>
                <p className="doctor-qr-token-label">{t('refreshesIn')}</p>
                <p className="doctor-qr-token-value" style={{ display: 'inline-flex', flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap', color: countdown <= 3 ? '#f59e0b' : '#34d399', fontSize: 18, fontWeight: 800 }}><span>{secondsUnit}</span><span>{countdown}</span></p>
              </div>
              <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', minHeight: 54, background: 'var(--border)' }} />
              <div style={{ minWidth: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ minWidth: 92, display: 'grid', justifyItems: 'center', gap: 3 }}>
                  <small style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }}>{lang === 'ar' ? `كود الجلسة · ${sessionCode.length || 6} أرقام` : `Session code · ${sessionCode.length || 6} digits`}</small>
                  <span dir="ltr" style={{ color: 'var(--text-primary)', letterSpacing: isSessionCodeVisible ? 5 : 2, fontSize: 20, fontWeight: 950 }}>{sessionCode ? (isSessionCodeVisible ? sessionCode : '•'.repeat(sessionCode.length)) : '------'}</span>
                </div>
                <button type="button" onClick={() => setIsSessionCodeVisible((visible) => !visible)} disabled={!sessionCode} aria-label={isSessionCodeVisible ? 'إخفاء كود الجلسة' : 'إظهار كود الجلسة'} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: '#34d399', display: 'grid', placeItems: 'center', cursor: sessionCode ? 'pointer' : 'default', opacity: sessionCode ? 1 : .5 }}>{isSessionCodeVisible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </div>

            <CustomDropdown
              id="qr-duration"
              name="qr-duration"
              label={t('qrRefreshInterval')}
              value={qrDuration}
              onChange={(event) => onQrDurationChange?.(Number(event.target.value))}
              options={qrIntervalOptions}
              placeholder="10 sec"
              icon={() => <Clock3 size={16} />}
              menuPlacement="top"
            />

            <CustomBottom
              type="button"
              onClick={handleOpenFullscreen}
              text={t('qrFullscreen')}
              rigthIcon={<QrCode size={16} />}
              minHeight={48}
              disabled={!qrPayload || qrLoading}
            />
          </>
        ) : (
          <>
            <div className="qr-inactive-placeholder doctor-qr-placeholder">
              <span className="qr-placeholder-icon"><QrCode size={34} /></span>
              <p>{t('startLectureToGenerateQr')}</p>
            </div>
            <CustomDropdown
              id="qr-duration-before-session"
              name="qr-duration-before-session"
              label={t('qrRefreshInterval')}
              value={qrDuration}
              onChange={(event) => onQrDurationChange?.(Number(event.target.value))}
              options={qrIntervalOptions}
              placeholder="10 sec"
              icon={() => <Clock3 size={16} />}
              menuPlacement="top"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default QRSection;
