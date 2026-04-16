import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, ScanLine } from '../../../../assets/icons';
import { CustomBottom } from '../../../../components';
import { useLanguage } from '../../../../i18n';

const QR_INTERVAL = 10;
const DEFAULT_QR_SIZE = {
  container: 320,
  box: 304,
  code: 272,
};

const FULLSCREEN_QR_SIZE = {
  container: 560,
  box: 520,
  code: 460,
};

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

const QRSection = ({ lectureId, lectureActive }) => {
  const { t } = useLanguage();
  const [qrPayload, setQrPayload] = useState('');
  const [countdown, setCountdown] = useState(QR_INTERVAL);
  const [isExpired, setIsExpired] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrFullscreenRef = useRef(null);

  const qrSize = useMemo(
    () => (isFullscreen ? FULLSCREEN_QR_SIZE : DEFAULT_QR_SIZE),
    [isFullscreen],
  );

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
                width: qrSize.container,
                height: qrSize.container,
                maxWidth: '100%',
                maxHeight: '100%',
                background: isFullscreen ? '#08131c' : 'transparent',
                borderRadius: isFullscreen ? 28 : undefined,
                padding: isFullscreen ? 20 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="qr-box"
                style={{
                  width: qrSize.box,
                  height: qrSize.box,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <QRCodeSVG
                  value={qrPayload || ' '}
                  size={qrSize.code}
                  bgColor="#ffffff"
                  fgColor="#0f1923"
                  level="M"
                />
                {isExpired ? (
                  <div className="qr-expired-overlay">
                    <span className="expired-icon"><ScanLine size={24} /></span>
                    <p>{t('qrExpired')}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="doctor-qr-token-box">
              <p className="doctor-qr-token-label">{t('refreshesIn')}</p>
              <p
                className="doctor-qr-token-value"
                style={{ color: countdown <= 3 ? '#f59e0b' : '#34d399', fontSize: 18, fontWeight: 800 }}
              >
                {countdown}s
              </p>
            </div>

            <CustomBottom
              type="button"
              onClick={handleOpenFullscreen}
              text={t('qrFullscreen')}
              rigthIcon={<QrCode size={16} />}
              minHeight={48}
            />
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
