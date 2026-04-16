import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useLanguage } from '../i18n';
import AppHelmet from '../components/AppHelmet';
import { useAuth, useDashboard, useSocket } from '../hooks';
import { mnuLogo } from '../assets/images';
import { Activity, Clock3, LayoutDashboard, LogOut, QrCode, ScanLine, UserCircle2 } from '../assets/icons';
import { CustomBottom, LanguageSwitcher, ThemeToggle } from '../components';

// ── Icons ─────────────────────────────────────────────────────────
const CameraIcon = () => (
  <ScanLine size={24} />
);
const HistoryIcon = () => (
  <Activity size={24} />
);
const LogOutIcon = () => (
  <LogOut size={20} />
);
const ProfileIcon = () => (
  <UserCircle2 size={24} />
);
const StudentSplash = ({ lang }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 999, width: '100vw', height: '100dvh', minHeight: '100svh',
    display: 'grid', gridTemplateRows: '1fr auto', alignItems: 'center', justifyItems: 'center',
    padding: 'clamp(28px, 7vh, 52px) 16px calc(14px + env(safe-area-inset-bottom, 0px))',
    background: 'linear-gradient(160deg, #08131c, #0f1923 52%, #123f36)', overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(120deg, rgba(255,255,255,0.08), transparent 38%, rgba(52,211,153,0.13))'
    }} />
    <div className="student-splash-content" style={{
      position: 'relative', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18, minHeight: 0, animation: 'studentSplashIn 1.15s ease both'
    }}>
      <div style={{
        width: 'min(168px, 44vw, 25vh)', aspectRatio: '1 / 1', borderRadius: 28, padding: 16, background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 56px rgba(0,0,0,0.32), 0 0 36px rgba(52,211,153,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'studentLogoPulse 1.15s ease both'
      }}>
        <img src={mnuLogo} alt="MNU" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: 21, fontWeight: 800, letterSpacing: 0 }}>
          {lang === 'ar' ? 'مرحبا بك' : 'Welcome back'}
        </div>
        <div style={{ marginTop: 6, color: 'rgba(232,244,240,0.72)', fontSize: 13, fontWeight: 700 }}>
          {lang === 'ar' ? 'جاري تجهيز حضورك' : 'Preparing your attendance'}
        </div>
      </div>
      <div style={{ width: 'min(150px, 52vw)', height: 4, borderRadius: 8, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', animation: 'studentSplashBar 1.1s ease both' }} />
      </div>
    </div>
    <div style={{
      position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center',
      animation: 'studentSplashFooter 1.15s ease both'
    }}>
      <div style={{
        width: 'min(100%, 376px)', minHeight: 48, padding: '10px 12px', borderRadius: 8,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.1)',
        backdropFilter: 'blur(16px)', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center',
        gap: 10, color: 'rgba(232,244,240,0.9)', fontSize: 'clamp(10px, 2.8vw, 11.5px)',
        lineHeight: 1.45, fontWeight: 800, textAlign: 'start'
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.24)',
          boxShadow: '0 0 18px rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2, background: 'var(--accent)',
            boxShadow: '0 0 14px rgba(52,211,153,0.7)'
          }} />
        </span>
        <span style={{
          minWidth: 0, overflowWrap: 'anywhere', textAlign: lang === 'ar' ? 'right' : 'left',
          direction: lang === 'ar' ? 'rtl' : 'ltr'
        }}>
          {lang === 'ar'
            ? 'جميع الحقوق محفوظة لإدارة تكنولوجيا المعلومات 2026'
            : 'All rights reserved to Information Technology Department 2026'}
        </span>
      </div>
    </div>
    <style>{`
      @keyframes studentSplashIn {
        0% { opacity: 0; transform: translateY(16px) scale(0.94); }
        45% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-10px) scale(1.03); }
      }
      @keyframes studentLogoPulse {
        0% { transform: scale(0.82) rotate(-4deg); }
        55% { transform: scale(1.04) rotate(0deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes studentSplashBar {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
      @keyframes studentSplashFooter {
        0% { opacity: 0; transform: translateY(10px); }
        35% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(4px); }
      }
      @media (max-height: 620px) {
        .student-splash-content {
          gap: 12px !important;
        }
      }
      @media (max-height: 540px) {
        .student-splash-content {
          gap: 8px !important;
          transform-origin: center !important;
        }
      }
    `}</style>
  </div>
);

// ── Components ────────────────────────────────────────────────────
const parseQrPayload = (rawValue) => {
  try {
    const parsed = JSON.parse(rawValue);
    return {
      rawValue,
      lectureId: parsed.lecture_id || parsed.lectureId || null,
      timestamp: parsed.timestamp || Date.now(),
    };
  } catch (error) {
    return {
      rawValue,
      lectureId: rawValue,
      timestamp: Date.now(),
    };
  }
};

const useIsDesktop = () => {
  const getValue = () => (
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 900px)').matches
      : false
  );
  const [isDesktop, setIsDesktop] = useState(getValue);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
};

const ScanTab = ({ user, socket, lang }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const scanLockedRef = useRef(false);
  const [scannerState, setScannerState] = useState('starting');
  const [scannerMessage, setScannerMessage] = useState('');
  const [scanned, setScanned] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [capturedQrImage, setCapturedQrImage] = useState('');

  const isArabic = lang === 'ar';

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureQrFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return '';

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.max(0, (video.videoWidth - size) / 2);
    const sy = Math.max(0, (video.videoHeight - size) / 2);
    canvas.width = 420;
    canvas.height = 420;

    const context = canvas.getContext('2d');
    if (!context) return '';

    context.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.86);
  }, []);

  const submitAttendance = useCallback((rawValue) => {
    const qrData = parseQrPayload(rawValue);
    const qrImage = captureQrFrame();

    scanLockedRef.current = true;
    setScanned(true);
    setScannerState('success');
    setLastScan(qrData);
    setCapturedQrImage(qrImage);
    setScannerMessage(isArabic ? 'تم تسجيل حضورك بنجاح.' : 'Attendance recorded successfully.');
    stopCamera();

    socket?.emit('student_attended', {
      universityId: user.universityId,
      name: user.name,
      lectureId: qrData.lectureId,
      timestamp: qrData.timestamp,
      qrPayload: qrData.rawValue,
      qrImage,
    });
  }, [captureQrFrame, isArabic, socket, stopCamera, user.name, user.universityId]);

  const startCamera = useCallback(async () => {
    stopCamera();
    scanLockedRef.current = false;
    setScanned(false);
    setLastScan(null);
    setCapturedQrImage('');
    setScannerState('starting');
    setScannerMessage(isArabic ? 'جاري تشغيل الكاميرا...' : 'Starting camera...');

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState('error');
      setScannerMessage(isArabic ? 'المتصفح لا يدعم تشغيل الكاميرا.' : 'Your browser does not support camera access.');
      return;
    }

    try {
      if (!videoRef.current) {
        setScannerState('error');
        setScannerMessage(isArabic ? 'لم يتم تجهيز نافذة الكاميرا.' : 'Camera preview is not ready.');
        return;
      }

      if (!readerRef.current) {
        readerRef.current = new BrowserQRCodeReader();
      }

      const controls = await readerRef.current.decodeFromConstraints({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }, videoRef.current, (result) => {
        if (result && !scanLockedRef.current) {
          submitAttendance(result.getText());
        }
      });

      controlsRef.current = controls;
      setScannerState('scanning');
      setScannerMessage(isArabic
        ? 'وجه الكاميرا نحو رمز QR. سيتم التقاط صورة عند القراءة.'
        : 'Point the camera at the QR code. A photo is captured on scan.');
    } catch (error) {
      setScannerState('error');
      setScannerMessage(isArabic
        ? 'لم نتمكن من تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا.'
        : 'Could not start the camera. Please allow camera access.');
      stopCamera();
    }
  }, [isArabic, stopCamera, submitAttendance]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>
        {isArabic ? 'مسح رمز QR' : 'Scan QR Code'}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 40 }}>
        {isArabic ? 'وجه كاميرا الهاتف نحو رمز المحاضرة لتسجيل حضورك.' : 'Point your camera at the lecture QR code to register your attendance.'}
      </p>

      <div style={{ position: 'relative', width: 260, height: 260, marginBottom: 40 }}>
        {/* Frame corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '12px 0 0 0' }}></div>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 12px 0 0' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '4px solid var(--accent)', borderLeft: '4px solid var(--accent)', borderRadius: '0 0 0 12px' }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '4px solid var(--accent)', borderRight: '4px solid var(--accent)', borderRadius: '0 0 12px 0' }}></div>

        <div style={{ width: '100%', height: '100%', borderRadius: 16, background: '#111', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: scannerState === 'scanning' ? 1 : 0.18,
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {scanned ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(5,18,14,0.74)', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30 }}>✓</div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{isArabic ? 'تم تسجيل الحضور' : 'Attendance Recorded'}</span>
            </div>
          ) : scannerState !== 'scanning' ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0.55 }}>
              <CameraIcon />
            </div>
          ) : null}

          {scannerState === 'scanning' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)',
              boxShadow: '0 0 15px var(--accent)', animation: 'scanLineAnim 2s infinite linear'
            }} />
          )}
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 340, padding: 14, borderRadius: 16,
        background: scannerState === 'success' ? 'rgba(52,211,153,0.12)' : scannerState === 'error' ? 'rgba(248,113,113,0.12)' : 'var(--bg-card)',
        border: `1px solid ${scannerState === 'success' ? 'rgba(52,211,153,0.26)' : scannerState === 'error' ? 'rgba(248,113,113,0.26)' : 'var(--border)'}`,
        textAlign: 'center', marginBottom: 14
      }}>
        <div style={{ color: scannerState === 'error' ? '#f87171' : scannerState === 'success' ? '#34d399' : 'var(--text-primary)', fontSize: 14, fontWeight: 800 }}>
          {scannerMessage}
        </div>
        {lastScan?.lectureId && (
          <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
            {isArabic ? 'المحاضرة: ' : 'Lecture: '}{lastScan.lectureId}
          </div>
        )}
      </div>

      {capturedQrImage && (
        <div style={{
          width: '100%', maxWidth: 340, marginBottom: 14, padding: 12, borderRadius: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <img
            src={capturedQrImage}
            alt={isArabic ? 'صورة رمز QR الملتقطة' : 'Captured QR'}
            style={{ width: 58, height: 58, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
          />
          <div style={{ minWidth: 0, textAlign: isArabic ? 'right' : 'left' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 900 }}>
              {isArabic ? 'تم التقاط صورة QR' : 'QR photo captured'}
            </div>
            <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>
              {isArabic ? 'تم حفظ لقطة القراءة لهذه المحاولة.' : 'Snapshot saved for this scan.'}
            </div>
          </div>
        </div>
      )}

      <button onClick={startCamera} disabled={scannerState === 'starting'} style={{
        padding: '14px 40px', borderRadius: 8, border: 'none',
        background: scannerState === 'starting' ? '#4b5563' : 'linear-gradient(135deg, var(--primary), var(--accent))',
        color: '#fff', fontSize: 16, fontWeight: 700, cursor: scannerState === 'starting' ? 'default' : 'pointer', transition: 'all 0.3s',
        boxShadow: scannerState === 'starting' ? 'none' : '0 10px 25px rgba(26,107,69,0.4)', opacity: scannerState === 'starting' ? 0.7 : 1, width: '100%', maxWidth: 300,
      }}>
        {scannerState === 'starting'
          ? (isArabic ? 'جاري التشغيل...' : 'Starting...')
          : scanned
            ? (isArabic ? 'مسح QR آخر' : 'Scan Again')
            : (isArabic ? 'إعادة تشغيل الكاميرا' : 'Restart Camera')}
      </button>

      <style>{`
        @keyframes scanLineAnim {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const HistoryTab = ({ user, allSessions }) => {
  // In a real app we would load history for `user.universityId` from a database.
  // We'll mock some history combining the user's past data with any live sessions if we wanted.
  const MOCK_HISTORY = [
    { id: 1, course: 'CS301', name: 'Algorithms', type: 'Lecture', week: 6, date: 'Apr 02, 2026', time: '10:17 AM', status: 'present' },
    { id: 2, course: 'CS201', name: 'Data Structures', type: 'Lecture', week: 6, date: 'Apr 01, 2026', time: '08:15 AM', status: 'present' },
    { id: 3, course: 'CS401', name: 'Software Engineering', type: 'Section', week: 5, date: 'Mar 26, 2026', time: '-', status: 'absent' },
    { id: 4, course: 'CS301', name: 'Algorithms', type: 'Lecture', week: 5, date: 'Mar 26, 2026', time: '10:05 AM', status: 'present' },
    { id: 5, course: 'CS201', name: 'Data Structures', type: 'Lecture', week: 5, date: 'Mar 24, 2026', time: '08:22 AM', status: 'late' },
  ];

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, marginTop: 10 }}>History</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        Your recent attendance records.
      </p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: 16, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>ATTENDED</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>24</div>
        </div>
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: 16, borderRadius: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>ABSENT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>3</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK_HISTORY.map(session => (
          <div key={session.id} style={{
            background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                background: session.status === 'present' ? 'rgba(52,211,153,0.15)' : session.status === 'absent' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                color: session.status === 'present' ? '#34d399' : session.status === 'absent' ? '#f87171' : '#fbbf24',
              }}>
                {session.course}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{session.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.date} · W{session.week} {session.type}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 4,
                background: session.status === 'present' ? 'rgba(52,211,153,0.1)' : session.status === 'absent' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                color: session.status === 'present' ? '#34d399' : session.status === 'absent' ? '#f87171' : '#fbbf24',
              }}>
                {session.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{session.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileTab = ({ user, updateUser, lang }) => {
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(lang === 'ar' ? 'اختار ملف صورة فقط.' : 'Please choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateUser({ profileImage: reader.result });
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError(lang === 'ar' ? 'تعذر تحميل الصورة، حاول مرة أخرى.' : 'Could not load the image. Try again.');
    };
    reader.readAsDataURL(file);
  };

  const profileStats = [
    { label: lang === 'ar' ? 'نسبة الحضور' : 'Attendance', value: '89%' },
    { label: lang === 'ar' ? 'المحاضرات' : 'Lectures', value: '27' },
    { label: lang === 'ar' ? 'آخر حضور' : 'Last scan', value: '10:17' },
  ];

  const profileDetails = [
    { label: lang === 'ar' ? 'الاسم' : 'Name', value: user.name },
    { label: lang === 'ar' ? 'الرقم الجامعي' : 'University ID', value: user.universityId },
    { label: lang === 'ar' ? 'البريد الإلكتروني' : 'Email', value: user.email },
    { label: lang === 'ar' ? 'نوع الحساب' : 'Account type', value: lang === 'ar' ? 'طالب' : 'Student' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '18px 18px 108px' }}>
      <section style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 20,
        background: 'linear-gradient(150deg, rgba(18,96,104,0.95), rgba(13,22,32,0.96) 58%, rgba(26,107,69,0.88))',
        border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 22px 48px rgba(0,0,0,0.26)'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(120deg, rgba(255,255,255,0.12), transparent 36%, rgba(52,211,153,0.14))',
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 92, height: 92, borderRadius: 22, overflow: 'hidden',
              background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 28, fontWeight: 800
            }}>
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : user.avatar}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label={lang === 'ar' ? 'إضافة صورة شخصية' : 'Add profile photo'}
              style={{
                position: 'absolute', right: -8, bottom: -8, width: 38, height: 38,
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.22)',
                background: 'var(--accent)', color: '#07311f', display: 'flex',
                alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.25)'
              }}
            >
              <CameraIcon />
            </button>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)' }}>
              {lang === 'ar' ? 'ملف الطالب' : 'Student Profile'}
            </div>
            <h2 style={{ marginTop: 8, fontSize: 25, lineHeight: 1.15, color: '#fff' }}>{user.name}</h2>
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>
              {lang === 'ar' ? `رقم جامعي ${user.universityId}` : `University ID ${user.universityId}`}
            </p>
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        {uploadError && <p style={{ position: 'relative', marginTop: 10, color: '#fecaca', fontSize: 12, fontWeight: 700 }}>{uploadError}</p>}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
        {profileStats.map((stat) => (
          <div key={stat.label} style={{
            minHeight: 82, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 12
          }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: 21, lineHeight: 1 }}>{stat.value}</strong>
            <span style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>{stat.label}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 16, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {profileDetails.map((detail, index) => (
          <div key={detail.label} style={{
            padding: '15px 16px', borderTop: index === 0 ? 'none' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>{detail.label}</span>
            <strong style={{ color: 'var(--text-primary)', fontSize: 13, textAlign: 'right', wordBreak: 'break-word' }}>{detail.value}</strong>
          </div>
        ))}
      </section>
    </div>
  );
};

const StudentAvatar = ({ user, size = 42, radius = '50%' }) => (
  <div style={{
    width: size, height: size, borderRadius: radius, overflow: 'hidden',
    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, flexShrink: 0
  }}>
    {user.profileImage ? (
      <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : user.avatar}
  </div>
);

const StudentDesktopShell = ({ tab, setTab, pageTitle, user, signOut, renderContent, lang }) => {
  const isArabic = lang === 'ar';
  const showHistoryHero = tab === 'history';
  const navItems = [
    { key: 'scan', label: isArabic ? 'مسح QR' : 'Scan QR', icon: ScanLine, section: isArabic ? 'الحضور' : 'Attendance' },
    { key: 'history', label: isArabic ? 'السجل' : 'History', icon: Activity, section: isArabic ? 'الحضور' : 'Attendance' },
    { key: 'profile', label: isArabic ? 'البروفايل' : 'Profile', icon: UserCircle2, section: isArabic ? 'الحساب' : 'Account' },
  ];
  const summaryCards = [
    { label: isArabic ? 'الحضور' : 'Attendance', value: '89%', tone: '#34d399' },
    { label: isArabic ? 'محاضرات الشهر' : 'This month', value: '12', tone: '#60a5fa' },
    { label: isArabic ? 'آخر مسح' : 'Last scan', value: '10:17', tone: '#fbbf24' },
  ];

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100dvh', minHeight: '100vh', display: 'flex',
      flexDirection: isArabic ? 'row-reverse' : 'row',
      background: 'linear-gradient(135deg, #111816 0%, #17221e 48%, #0f1c18 100%)',
      color: 'var(--text-primary)', overflow: 'hidden'
    }}>
      <div className="student-desktop-bubble student-desktop-bubble-a" />
      <div className="student-desktop-bubble student-desktop-bubble-b" />
      <div className="student-desktop-bubble student-desktop-bubble-c" />
      <aside style={{
        position: 'relative', zIndex: 2, width: 304, flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(22,32,48,0.96), rgba(13,22,20,0.98))',
        borderRight: isArabic ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderLeft: isArabic ? '1px solid rgba(255,255,255,0.08)' : 'none',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: isArabic ? '-18px 0 50px rgba(0,0,0,0.16)' : '18px 0 50px rgba(0,0,0,0.16)'
      }} className="sidebar" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="sidebar-logo" style={{ padding: 0, borderBottom: 'none' }}>
          <div className="sidebar-brand-card">
            <div className="sidebar-brand-mark">
              <img
                src={mnuLogo}
                alt={isArabic ? 'بوابة الطالب' : 'Student Portal'}
                className="sidebar-brand-image"
              />
            </div>
            <div className="sidebar-brand-copy">
              <span className="sidebar-brand-eyebrow">{isArabic ? 'مساحة الطالب' : 'Student workspace'}</span>
              <h2>{isArabic ? 'بوابة الطالب' : 'Student Portal'}</h2>
            </div>
          </div>
        </div>

        <div style={{
          padding: '14px 14px 16px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.14)',
          background: 'rgba(52,211,153,0.06)'
        }}>
          <div style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 900 }}>
            {isArabic ? 'جاهز للتسجيل' : 'Ready to scan'}
          </div>
          <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.65, fontWeight: 700, textAlign: isArabic ? 'right' : 'left' }}>
            {isArabic
              ? 'افتح تبويب المسح ووجه الكاميرا نحو رمز المحاضرة.'
              : 'Open scan and point the camera at your lecture code.'}
          </div>
        </div>

        <nav className="sidebar-nav" style={{ padding: '2px 0 0' }}>
          {[...new Set(navItems.map((item) => item.section))].map((section) => (
            <React.Fragment key={section}>
              <div className="sidebar-section-label">{section}</div>
              {navItems.filter((item) => item.section === section).map((item) => {
                const ItemIcon = item.icon || LayoutDashboard;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`nav-item${tab === item.key ? ' active' : ''}`}
                  >
                    <span className="nav-icon">
                      <ItemIcon size={18} />
                    </span>
                    <span className="nav-item-text">{item.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-bottom" style={{ padding: 0, borderTop: 'none' }}>
          <div className="sidebar-preferences-panel">
            <div className="sidebar-preferences-grid">
              <LanguageSwitcher className="sidebar-preference-toggle" />
              <ThemeToggle className="sidebar-preference-toggle" />
            </div>
          </div>

          <div className="sidebar-user-card" style={{ border: '1px solid rgba(52,211,153,0.18)', background: 'rgba(52,211,153,0.08)' }}>
            <StudentAvatar user={user} size={44} radius={8} />
            <div className="sidebar-user-info">
              <p style={{ marginBottom: 2 }}>{user.name}</p>
              <span>{isArabic ? `طالب - ${user.universityId}` : `Student - ${user.universityId}`}</span>
            </div>
          </div>

          <CustomBottom
            type="button"
            text={isArabic ? 'تسجيل الخروج' : 'Sign out'}
            onClick={signOut}
            rigthIcon={<LogOut size={16} />}
            background="linear-gradient(135deg, #dc2626, #b91c1c)"
            textColor="#ffffff"
            border="1px solid rgba(127,29,29,0.28)"
            boxShadow="0 10px 22px rgba(185,28,28,0.2)"
            minHeight={42}
          />
        </div>
      </aside>

      <main style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          minHeight: 82, padding: '0 32px',
          background: 'rgba(17,24,22,0.72)', borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
          flexDirection: isArabic ? 'row-reverse' : 'row'
        }}>
          <div style={{ textAlign: isArabic ? 'right' : 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {tab === 'scan' && <QrCode size={14} />}
              {tab === 'history' && <Clock3 size={14} />}
              {tab === 'profile' && <UserCircle2 size={14} />}
              {isArabic ? 'مساحة الطالب' : 'Student workspace'}
            </div>
            <h1 style={{ marginTop: 4, color: 'var(--text-primary)', fontSize: 24, lineHeight: 1.15, fontWeight: 900 }}>
              {isArabic ? pageTitle.ar : pageTitle.en}
            </h1>
          </div>
          <div style={{
            minHeight: 46, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10,
            flexDirection: isArabic ? 'row-reverse' : 'row'
          }}>
            <StudentAvatar user={user} size={30} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 800 }}>{user.name}</span>
          </div>
        </header>

        <section style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px 32px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.025), rgba(52,211,153,0.035))'
        }}>
          {showHistoryHero && <div style={{
            maxWidth: 1180, margin: '0 auto 18px', display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14, alignItems: 'stretch'
          }}>
            <div style={{
              minHeight: 116, padding: 22, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(26,107,69,0.34), rgba(255,255,255,0.06))',
              border: '1px solid rgba(52,211,153,0.18)',
              boxShadow: '0 18px 48px rgba(0,0,0,0.18)',
              textAlign: isArabic ? 'right' : 'left',
              gridColumn: 'span 2'
            }}>
              <div style={{ color: '#9fe7c5', fontSize: 12, fontWeight: 900 }}>
                {isArabic ? 'مساحة حضور ذكية' : 'Smart attendance workspace'}
              </div>
              <div style={{ marginTop: 9, color: '#f2fbf7', fontSize: 25, lineHeight: 1.15, fontWeight: 900 }}>
                {isArabic ? `أهلًا ${user.name}` : `Welcome, ${user.name}`}
              </div>
              <div style={{ marginTop: 8, color: 'rgba(232,244,240,0.72)', fontSize: 13, lineHeight: 1.7, maxWidth: 560 }}>
                {isArabic
                  ? 'تابع حضورك، امسح رمز المحاضرة، وراجع بياناتك من لوحة واحدة.'
                  : 'Scan lecture codes, follow your attendance, and keep your student profile in one clean workspace.'}
              </div>
            </div>

            {summaryCards.map((card) => (
              <div key={card.label} style={{
                minHeight: 116, padding: 16, borderRadius: 8,
                background: 'rgba(22,32,48,0.72)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                boxShadow: '0 14px 34px rgba(0,0,0,0.14)'
              }}>
                <span style={{ width: 28, height: 4, borderRadius: 8, background: card.tone, marginBottom: 14 }} />
                <strong style={{ color: 'var(--text-primary)', fontSize: 24, lineHeight: 1 }}>{card.value}</strong>
                <span style={{ marginTop: 9, color: 'var(--text-muted)', fontSize: 12, fontWeight: 800 }}>{card.label}</span>
              </div>
            ))}
          </div>}

          <div style={{
            minHeight: showHistoryHero ? 'calc(100% - 134px)' : '100%',
            maxWidth: 1180, margin: '0 auto', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(14,22,20,0.6)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.22)', overflow: 'hidden',
            backdropFilter: 'blur(12px)'
          }}>
            {renderContent()}
          </div>
        </section>
      </main>
      <style>{`
        .student-desktop-bubble {
          position: absolute;
          z-index: 0;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(2px);
          opacity: 0.55;
          animation: studentDesktopBubbleFloat 9s ease-in-out infinite alternate;
        }
        .student-desktop-bubble-a {
          width: 220px;
          height: 220px;
          top: 12%;
          right: 8%;
          background: radial-gradient(circle, rgba(52, 211, 153, 0.18), transparent 68%);
        }
        .student-desktop-bubble-b {
          width: 150px;
          height: 150px;
          bottom: 12%;
          left: 28%;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.14), transparent 70%);
          animation-delay: -3s;
        }
        .student-desktop-bubble-c {
          width: 110px;
          height: 110px;
          top: 58%;
          right: 34%;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.1), transparent 70%);
          animation-delay: -5s;
        }
        @keyframes studentDesktopBubbleFloat {
          from { transform: translate3d(0, 0, 0) scale(1); }
          to { transform: translate3d(18px, -22px, 0) scale(1.08); }
        }
      `}</style>
    </div>
  );
};

// ── Main Student App Layout ──────────────────────────────────────
const StudentApp = () => {
  const [tab, setTab] = useState('scan');
  const [showSplash, setShowSplash] = useState(true);
  const isDesktop = useIsDesktop();
  const { lang } = useLanguage();
  const { user, signOut, updateUser } = useAuth();
  const { socket } = useSocket();
  const { allSessions } = useDashboard();
  const pageTitle = {
    scan: { en: 'Student QR Scan', ar: 'مسح رمز الحضور' },
    history: { en: 'Attendance History', ar: 'سجل الحضور' },
    profile: { en: 'Student Profile', ar: 'الملف الشخصي' },
  }[tab];

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(splashTimer);
  }, []);

  const renderContent = () => (
    <>
      {tab === 'scan' && <ScanTab user={user} socket={socket} lang={lang} />}
      {tab === 'history' && <HistoryTab user={user} allSessions={allSessions} />}
      {tab === 'profile' && <ProfileTab user={user} updateUser={updateUser} lang={lang} />}
    </>
  );

  return (
    <div style={{
      width: '100vw', height: '100dvh', minHeight: '100vh', overflow: 'hidden',
      display: 'flex', justifyContent: 'center', background: isDesktop ? 'var(--bg-dark)' : '#000'
    }}>
      <AppHelmet
        titleEn={pageTitle.en}
        titleAr={pageTitle.ar}
        descriptionEn={tab === 'scan'
          ? `Student attendance scanning screen for ${user.name}.`
          : tab === 'history'
            ? `Attendance history screen for ${user.name}.`
            : `Profile screen for ${user.name}.`
        }
        descriptionAr={tab === 'scan'
          ? `شاشة مسح الحضور للطالب ${user.name}.`
          : tab === 'history'
            ? `شاشة سجل الحضور للطالب ${user.name}.`
            : `شاشة الملف الشخصي للطالب ${user.name}.`
        }
      />
      {showSplash ? <StudentSplash lang={lang} /> : null}
      {isDesktop ? (
        <StudentDesktopShell
          tab={tab}
          setTab={setTab}
          pageTitle={pageTitle}
          user={user}
          signOut={signOut}
          renderContent={showSplash ? () => null : renderContent}
          lang={lang}
        />
      ) : (
      <>
      {/* Mobile container constraint wrapper */}
      <div style={{
        width: '100%', maxWidth: 480, height: '100%', background: 'var(--bg-dark)', position: 'relative',
        display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <header style={{
          padding: '24px 20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : user.avatar}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {user.universityId}</div>
            </div>
          </div>
          <button onClick={signOut} style={{
            background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <LogOutIcon />
          </button>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {!showSplash && renderContent()}
        </div>

        {/* Bottom Navigation */}
        <nav style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 10px',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)', zIndex: 20
        }}>
          <button onClick={() => setTab('scan')} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: tab === 'scan' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s'
          }}>
            <CameraIcon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'ar' ? 'مسح QR' : 'Scan QR'}</span>
          </button>
          
          <div style={{ width: 1, height: 30, background: 'var(--border)' }} />

          <button onClick={() => setTab('history')} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: tab === 'history' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s'
          }}>
            <HistoryIcon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'ar' ? 'السجل' : 'History'}</span>
          </button>

          <div style={{ width: 1, height: 30, background: 'var(--border)' }} />

          <button onClick={() => setTab('profile')} style={{
            flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: tab === 'profile' ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s'
          }}>
            <ProfileIcon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'ar' ? 'البروفايل' : 'Profile'}</span>
          </button>
        </nav>
      </div>
      </>
      )}
    </div>
  );
};

export default StudentApp;
