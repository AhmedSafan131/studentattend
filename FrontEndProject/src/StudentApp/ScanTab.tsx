import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { attendanceAPI } from '../utils/api';
import { useStudentPwa } from '../pwa';
import { Minus, Plus, RefreshCcw, ZoomIn } from 'lucide-react';
import { QueuedAttendanceScan, useAttendanceQueue } from './useAttendanceQueue';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'confirming' | 'queued' | 'success' | 'warning' | 'error';

type UserLike = {
  id?: string | number;
  name?: string;
  studentId?: string | number;
  universityId?: string | number;
};

type SocketLike = {
  emit?: (event: string, payload: Record<string, unknown>) => void;
} | null | undefined;

type ScanTabProps = {
  user: UserLike;
  socket?: SocketLike;
  lang: string;
  onAttendanceRecorded?: (result: AttendanceScanResult) => void | Promise<void>;
};

type ParsedQrPayload = {
  rawValue: string;
  lectureId: string | null;
  timestamp: number;
};

type LastScanValue =
  | ParsedQrPayload
  | { message?: string; status?: string }
  | { id?: string }
  | string
  | null;

type AttendanceScanResult = {
  message?: string;
  confirmed?: boolean;
  replayed?: boolean;
  alreadyRecorded?: boolean;
  attendance?: {
    id?: string | number;
    attendanceRecordId?: string | number;
    sessionId?: string;
    scannedAt?: string;
    studentUniversityId?: string | number;
    studentName?: string;
    status?: string;
    isFlexible?: boolean;
  };
  session?: {
    id?: string;
    subjectName?: string;
    isFlexible?: boolean;
  };
};

type AttendanceErrorPayload = {
  message?: string;
  errorCode?: string;
  subjectName?: string;
  session?: {
    subjectName?: string;
    lectureType?: string;
    group?: string;
  };
};

type ZoomRange = {
  supported: boolean;
  min: number;
  max: number;
  step: number;
};

type ZoomCapability = {
  min?: number;
  max?: number;
  step?: number;
};

type CameraFacingMode = 'environment' | 'user';
type CameraPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';
type CameraDescriptor = {
  id: string;
  label: string;
  facing: CameraFacingMode;
};

type TrackWithZoom = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & { zoom?: ZoomCapability };
  getSettings?: () => MediaTrackSettings & { zoom?: number };
};

const DUPLICATE_SCAN_WINDOW_MS = 1800;
const AUTO_START_DELAY_MS = 300;
const CAMERA_START_TIMEOUT_MS = 10000;
const MAX_SCANS_PER_SECOND = 18;
const SCAN_REGION_RATIO = 0.62;
const SCAN_DOWNSCALED_SIZE = 320;
const CONFIRMATION_RETRY_DELAYS_MS = [0, 600, 1200];
const SERVER_CLOCK_STORAGE_PREFIX = 'student-attendance:server-clock:';

const createScanRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
};

const waitFor = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const parseQrPayload = (rawValue: string): ParsedQrPayload => {
  try {
    const parsed = JSON.parse(rawValue) as {
      s?: string;
      sessionId?: string;
      lecture_id?: string;
      lectureId?: string;
      i?: number;
      timestamp?: number;
      issuedAt?: number | string;
    };
    return {
      rawValue,
      lectureId: parsed.s || parsed.sessionId || parsed.lecture_id || parsed.lectureId || null,
      // QR validity is checked by the server token, never by the student's clock.
      timestamp: Number(parsed.i || parsed.timestamp || parsed.issuedAt) || 0,
    };
  } catch (error) {
    return {
      rawValue,
      lectureId: rawValue,
      timestamp: 0,
    };
  }
};

const getCurrentVideoTrack = (video: HTMLVideoElement | null): TrackWithZoom | null => {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return null;
  const track = stream.getVideoTracks()[0];
  return (track as TrackWithZoom) || null;
};

const getVideoTrackZoomSettings = (track: TrackWithZoom | null): number | null => {
  const settings = track?.getSettings?.() as (MediaTrackSettings & { zoom?: number }) | undefined;
  return typeof settings?.zoom === 'number' ? settings.zoom : null;
};

const normalizeCameraLabel = (label: string): string => label.trim().toLowerCase();

const inferCameraFacing = (label: string): CameraFacingMode => {
  const normalized = normalizeCameraLabel(label);
  if (
    normalized.includes('front')
    || normalized.includes('user')
    || normalized.includes('selfie')
    || normalized.includes('facetime')
  ) {
    return 'user';
  }

  return 'environment';
};

const getLastScanLabel = (value: LastScanValue, fallbackLabel: string): string => {
  if (!value) return fallbackLabel;
  if (typeof value === 'string') return value;
  if ('message' in value && value.message) return value.message;
  if ('status' in value && value.status) return value.status;
  if ('rawValue' in value && value.rawValue) return value.rawValue;
  if ('id' in value && value.id) return value.id;
  return fallbackLabel;
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
    }
  }
};

const stopVideoElement = (video: HTMLVideoElement | null) => {
  if (!video) return;

  try {
    video.pause();
  } catch (error) {
    // Ignore pause errors during teardown.
  }

  const activeStream = video.srcObject;
  if (activeStream instanceof MediaStream) {
    activeStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (error) {
        // Ignore track stop failures during cleanup.
      }
    });
  }
  

  video.srcObject = null;
};

const SCAN_COPY = {
  en: {
    recorded: 'Recorded',
    initialMessage: 'Tap the button below and allow camera access when your browser asks.',
    securePageRequired: 'Camera access needs a secure HTTPS page. Open the secure camera page first, then tap Allow camera access.',
    permissionBlocked: 'Camera permission was blocked. Tap the lock/site icon in the address bar, set Camera to Allow, then press Restart camera.',
    noCamera: 'No camera was found on this device.',
    cameraBusy: 'The camera is already being used by another app. Close it and try again.',
    cameraStartError: 'Could not start the camera.',
    allowCameraAccess: 'Please allow camera access.',
    checkingAttendance: 'Checking attendance with the database...',
    attendanceRecorded: 'Attendance recorded successfully.',
    invalidQr: 'Could not record attendance. Please scan the valid QR for your subject and group.',
    invalidOrExpiredQr: 'This QR code is invalid or expired. Please scan the latest QR from your instructor.',
    startingCamera: 'Starting camera...',
    unsupportedCamera: 'Your browser does not support camera access.',
    previewNotReady: 'Camera preview is not ready.',
    startupTimedOut: 'Camera startup timed out. Please allow camera access and try again.',
    pointCamera: 'Point the camera at the QR code. A photo is captured on scan.',
    openingSecurePage: 'Opening the secure camera page...',
    secureHttpsWarning: 'Camera access needs trusted HTTPS. Accept the certificate warning or use a trusted HTTPS link, then reload the page.',
    qrAttendance: 'QR Attendance',
    scanClassroomCode: 'Scan classroom code',
    permissionAutoOpen: 'Camera permission will open automatically.',
    ok: 'OK',
    attendanceRecordedShort: 'Attendance recorded',
    duplicateAttendance: 'You already have attendance recorded for this subject in this week.',
    duplicateAttendanceShort: 'Attendance already recorded',
    pointAtClassQr: 'Point the camera at your class QR code.',
    cameraZoom: 'Camera zoom',
    restartCamera: 'Restart camera',
    scanAnotherQr: 'Scan another QR',
    openSecureCameraPage: 'Open secure camera page',
    lastResult: 'Last result',
    capturedQrAlt: 'Captured QR',
    snapshotSaved: 'Snapshot saved',
    attachedToScan: 'Attached to this scan.',
    flipCamera: 'Flip camera',
    backCamera: 'Back camera',
    frontCamera: 'Front camera',
    savedForSync: 'Your scan is saved on this device. It will sync automatically when the connection returns. Do not scan the same QR again.',
    syncNow: 'Sync attendance now',
    syncingNow: 'Syncing attendance...',
    syncStillPending: 'The server has not confirmed this attendance yet. It is saved and will retry automatically.',
    syncOffline: 'The device is still offline. The attendance remains safely saved.',
    pendingSync: 'attendance request pending sync',
    syncRejected: 'The saved scan could not be accepted. Please scan a current QR again.',
    qrTab: 'Scan QR',
    codeTab: 'Enter session code',
    sessionCode: '6-digit session code',
    codePlaceholder: '000000',
    submitCode: 'Record attendance',
    codeMustBeSixDigits: 'Enter the 6-digit code shown by your instructor.',
    invalidOrExpiredCode: 'This session code is invalid or expired. Enter the latest code from your instructor.',
  },
  ar: {
    recorded: 'تم التسجيل',
    initialMessage: 'اضغط الزر بالأسفل واسمح للكاميرا عندما يطلب المتصفح ذلك.',
    securePageRequired: 'الوصول للكاميرا يحتاج صفحة HTTPS آمنة. افتح صفحة الكاميرا الآمنة أولاً ثم اسمح للكاميرا.',
    permissionBlocked: 'تم حظر إذن الكاميرا. اضغط على رمز القفل في شريط العنوان واجعل الكاميرا Allow ثم اضغط إعادة تشغيل الكاميرا.',
    noCamera: 'لم يتم العثور على كاميرا على هذا الجهاز.',
    cameraBusy: 'الكاميرا مستخدمة الآن بواسطة تطبيق آخر. أغلقه ثم حاول مرة أخرى.',
    cameraStartError: 'تعذر تشغيل الكاميرا.',
    allowCameraAccess: 'من فضلك اسمح بالوصول إلى الكاميرا.',
    checkingAttendance: 'جارٍ مراجعة الحضور مع قاعدة البيانات...',
    attendanceRecorded: 'تم تسجيل الحضور بنجاح.',
    invalidQr: 'تعذر تسجيل الحضور. من فضلك امسح QR الصحيح الخاص بالمادة والجروب.',
    invalidOrExpiredQr: 'رمز QR غير صالح أو انتهت صلاحيته. يرجى مسح أحدث رمز QR من المحاضر.',
    startingCamera: 'جارٍ تشغيل الكاميرا...',
    unsupportedCamera: 'متصفحك لا يدعم الوصول إلى الكاميرا.',
    previewNotReady: 'معاينة الكاميرا غير جاهزة بعد.',
    startupTimedOut: 'انتهت مهلة تشغيل الكاميرا. اسمح للكاميرا ثم حاول مرة أخرى.',
    pointCamera: 'وجّه الكاميرا نحو رمز QR. سيتم حفظ صورة عند المسح.',
    openingSecurePage: 'جارٍ فتح صفحة الكاميرا الآمنة...',
    secureHttpsWarning: 'الوصول للكاميرا يحتاج HTTPS موثوق. اقبل تحذير الشهادة أو استخدم رابط HTTPS موثوق ثم أعد تحميل الصفحة.',
    qrAttendance: 'حضور QR',
    scanClassroomCode: 'امسح كود القاعة',
    permissionAutoOpen: 'سيتم فتح إذن الكاميرا تلقائياً.',
    ok: 'تم',
    attendanceRecordedShort: 'تم تسجيل الحضور',
    duplicateAttendance: 'لديك حضور مسجل بالفعل لهذه المادة في هذا الأسبوع.',
    duplicateAttendanceShort: 'حضور مسجل مسبقًا',
    pointAtClassQr: 'وجّه الكاميرا إلى QR الخاص بالمحاضرة.',
    cameraZoom: 'تقريب الكاميرا',
    restartCamera: 'إعادة تشغيل الكاميرا',
    scanAnotherQr: 'امسح QR آخر',
    openSecureCameraPage: 'افتح صفحة الكاميرا الآمنة',
    lastResult: 'آخر نتيجة',
    capturedQrAlt: 'صورة QR المحفوظة',
    snapshotSaved: 'تم حفظ اللقطة',
    attachedToScan: 'تم إرفاقها بهذه العملية.',
    flipCamera: 'تبديل الكاميرا',
    backCamera: 'الكاميرا الخلفية',
    frontCamera: 'الكاميرا الأمامية',
    savedForSync: 'تم حفظ عملية المسح على هذا الجهاز، وستتم المزامنة تلقائيًا عند عودة الاتصال. لا تمسح نفس الرمز مرة أخرى.',
    syncNow: 'مزامنة الحضور الآن',
    syncingNow: 'جاري مزامنة الحضور...',
    syncStillPending: 'السيرفر لم يؤكد الحضور حتى الآن. العملية محفوظة وستتم إعادة المحاولة تلقائيًا.',
    syncOffline: 'الجهاز ما زال بدون إنترنت. عملية الحضور محفوظة بأمان.',
    pendingSync: 'عملية حضور في انتظار المزامنة',
    syncRejected: 'تعذر قبول عملية المسح المحفوظة. امسح رمز QR حديثًا مرة أخرى.',
    qrTab: 'مسح QR',
    codeTab: 'إدخال كود السيشن',
    sessionCode: 'كود السيشن المكوّن من 6 أرقام',
    codePlaceholder: '000000',
    submitCode: 'تسجيل الحضور',
    codeMustBeSixDigits: 'أدخل الكود المكوّن من 6 أرقام الظاهر عند المحاضر.',
    invalidOrExpiredCode: 'كود السيشن غير صالح أو انتهت صلاحيته. أدخل أحدث كود ظاهر عند المحاضر.',
  },
} as const;

const localizeAttendanceError = (payload: AttendanceErrorPayload, isArabic: boolean, fallback: string): string => {
  const message = String(payload.message || '').trim();
  const subjectName = String(payload.subjectName || payload.session?.subjectName || '').trim();
  const displaySubject = subjectName || (isArabic ? 'هذه المادة' : 'this subject');

  if (payload.errorCode === 'NOT_ENROLLED_IN_SUBJECT' || /not enrolled in/i.test(message)) {
    return isArabic
      ? `أنت غير مسجل في مادة ${displaySubject}.`
      : `You are not enrolled in ${displaySubject}.`;
  }
  if (payload.errorCode === 'WRONG_SUBJECT_GROUP' || /but not in .* group/i.test(message)) {
    const type = String(payload.session?.lectureType || '').trim();
    const group = String(payload.session?.group || '').trim();
    return isArabic
      ? `أنت مسجل في مادة ${displaySubject}، لكنك غير مسجل في ${type || 'هذا النوع'} للمجموعة ${group || '-'}.`
      : `You are enrolled in ${displaySubject}, but not in ${type || 'this class type'} group ${group || '-'}.`;
  }

  if (!isArabic) return message || fallback;
  if (/already recorded.*(?:week|session)/i.test(message)) return `تم تسجيل حضورك في مادة ${displaySubject} من قبل.`;
  if (/session.*(?:not found|ended)|has ended/i.test(message)) return 'جلسة الحضور غير موجودة أو انتهت. اطلب من المحاضر تحديث رمز QR.';
  if (/flexible attendance session.*not open/i.test(message)) return 'جلسة الحضور المرن غير مفتوحة.';
  if (/unsupported older format/i.test(message)) return 'رمز QR قديم وغير مدعوم. امسح أحدث رمز من المحاضر.';
  if (/(?:invalid|expired).*(?:qr|code)|(?:qr|code).*(?:invalid|expired|does not match|not a valid)/i.test(message)) return 'رمز QR غير صالح أو انتهت صلاحيته. امسح أحدث رمز من المحاضر.';
  if (/only student accounts/i.test(message)) return 'هذه العملية متاحة لحسابات الطلاب فقط.';
  return fallback;
};

const ScanTab = ({ user, socket, lang, onAttendanceRecorded }: ScanTabProps) => {
  const { studentLoginOptions } = useStudentPwa() as { studentLoginOptions?: { sessionCodeLength?: number } };
  const sessionCodeLength = Number(studentLoginOptions?.sessionCodeLength) === 4 ? 4 : 6;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const scanLockedRef = useRef(false);
  const lastDecodedValueRef = useRef('');
  const lastDecodedAtRef = useRef(0);
  const mountedRef = useRef(true);
  const startRequestIdRef = useRef(0);
  const zoomTrackRef = useRef<TrackWithZoom | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const zoomApplyInFlightRef = useRef(false);
  const serverClockOffsetRef = useRef(0);
  const serverClockSyncedAtRef = useRef(0);
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [entryMode, setEntryMode] = useState<'qr' | 'code'>('qr');
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const isArabic = lang === 'ar';
  const copy = useMemo(() => ({
    ...SCAN_COPY[isArabic ? 'ar' : 'en'],
    sessionCode: isArabic ? 'كود السيشن المكوّن من ' + sessionCodeLength + ' أرقام' : sessionCodeLength + '-digit session code',
    codeMustBeSixDigits: isArabic ? 'أدخل كود السيشن المكوّن من ' + sessionCodeLength + ' أرقام الظاهر عند المحاضر.' : 'Enter the ' + sessionCodeLength + '-digit code shown by your instructor.',
  }), [isArabic, sessionCodeLength]);
  const gateCopy = useMemo(() => ({
    openCamera: isArabic ? 'فتح الكاميرا' : 'Open camera',
    permissionHint: isArabic
      ? 'اضغط فتح الكاميرا ثم اسمح بالوصول عندما يطلب المتصفح ذلك.'
      : 'Tap Open camera, then allow access when your browser asks.',
  }), [isArabic]);
  const [scannerMessage, setScannerMessage] = useState<string>(copy.initialMessage);
  const [scanned, setScanned] = useState(false);
  const [isDuplicateAttendance, setIsDuplicateAttendance] = useState(false);
  const [isAttendanceScanError, setIsAttendanceScanError] = useState(false);
  const [lastScan, setLastScan] = useState<LastScanValue>(null);
  const [capturedQrImage, setCapturedQrImage] = useState('');
  const [zoomRange, setZoomRange] = useState<ZoomRange>({ supported: false, min: 1, max: 1, step: 0.1 });
  const [zoomValue, setZoomValue] = useState(1);
  const [preferredCamera, setPreferredCamera] = useState<CameraFacingMode>('environment');
  const [cameraPermissionState, setCameraPermissionState] = useState<CameraPermissionState>('unknown');
  const [availableCameras, setAvailableCameras] = useState<CameraDescriptor[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const recordingFailedMessage = isArabic
    ? 'لم يتم تأكيد حضورك ولم تظهر المادة في السجل. أنت غير مسجل حاضرًا حتى الآن؛ تأكد من الإنترنت وامسح QR مرة أخرى.'
    : 'Attendance was not confirmed and is not in your history. You are not marked present yet; check your connection and scan the QR again.';

  const applyConfirmedAttendance = useCallback(async (result: AttendanceScanResult, queuedItem?: QueuedAttendanceScan) => {
    const attendanceRecordId = result.attendance?.attendanceRecordId || result.attendance?.id;
    if (!attendanceRecordId || !mountedRef.current) return;
    const alreadyRecorded = Boolean(result.alreadyRecorded)
      || /already recorded.*(?:week|session)/i.test(String(result.message || ''));
    const queuedQr = queuedItem ? parseQrPayload(queuedItem.qrPayload) : null;

    setScanned(true);
    setIsAttendanceScanError(false);
    setIsDuplicateAttendance(alreadyRecorded);
    setScannerState(alreadyRecorded ? 'warning' : 'success');
    setLastScan(result.attendance || result.session || queuedQr);
    setScannerMessage(alreadyRecorded ? copy.duplicateAttendance : copy.attendanceRecorded);

    const liveSessionId = result.session?.isFlexible
      ? result.session.id
      : (result.attendance?.sessionId || result.session?.id || queuedItem?.lectureId);
    if (!alreadyRecorded) socket?.emit?.('student_attended', {
      attendanceRecordId,
      universityId: result.attendance?.studentUniversityId || user.universityId || user.studentId || user.id,
      name: result.attendance?.studentName || user.name,
      lectureId: liveSessionId,
      timestamp: result.attendance?.scannedAt ? Date.parse(result.attendance.scannedAt) : (queuedItem?.qrTimestamp || Date.now()),
    });
    await onAttendanceRecorded?.(result);
  }, [copy.attendanceRecorded, copy.duplicateAttendance, onAttendanceRecorded, socket, user.id, user.name, user.studentId, user.universityId]);

  const handleQueueFailure = useCallback(() => {
    if (!mountedRef.current) return;
    setScanned(false);
    setScannerState('error');
    setIsAttendanceScanError(true);
    setScannerMessage(copy.syncRejected);
  }, [copy.syncRejected]);

  const studentQueueKey = String(user.id || user.universityId || user.studentId || 'unknown');
  const [manualSyncMessage, setManualSyncMessage] = useState('');
  const { enqueue, syncNow, pendingCount, isSyncing } = useAttendanceQueue(
    studentQueueKey,
    applyConfirmedAttendance,
    handleQueueFailure,
  );

  const handleManualSync = useCallback(async () => {
    setManualSyncMessage(copy.syncingNow);
    const result = await syncNow();
    if (!mountedRef.current) return;
    if (result.status === 'offline') {
      setManualSyncMessage(copy.syncOffline);
    } else if (result.status === 'pending') {
      setManualSyncMessage(copy.syncStillPending);
    } else {
      setManualSyncMessage('');
    }
  }, [copy.syncOffline, copy.syncStillPending, copy.syncingNow, syncNow]);

  useEffect(() => {
    if (pendingCount === 0) setManualSyncMessage('');
  }, [pendingCount]);

  const syncServerClock = useCallback(async () => {
    const requestStartedAt = Date.now();
    const response = await attendanceAPI.serverTime();
    const responseReceivedAt = Date.now();
    const serverTime = Date.parse(String(response?.data?.serverTime || ''));
    if (!Number.isFinite(serverTime)) return;

    // Midpoint compensation avoids counting the whole network round-trip as
    // clock drift, which matters when the connection is slow.
    const offset = serverTime - Math.round((requestStartedAt + responseReceivedAt) / 2);
    serverClockOffsetRef.current = offset;
    serverClockSyncedAtRef.current = responseReceivedAt;
    try {
      window.localStorage.setItem(`${SERVER_CLOCK_STORAGE_PREFIX}${studentQueueKey}`, JSON.stringify({
        offset,
        syncedAt: responseReceivedAt,
      }));
    } catch {
      // The in-memory clock anchor remains usable for this page.
    }
  }, [studentQueueKey]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(`${SERVER_CLOCK_STORAGE_PREFIX}${studentQueueKey}`) || '{}');
      if (Number.isFinite(Number(stored.offset))) serverClockOffsetRef.current = Number(stored.offset);
      if (Number.isFinite(Number(stored.syncedAt))) serverClockSyncedAtRef.current = Number(stored.syncedAt);
    } catch {
      serverClockOffsetRef.current = 0;
      serverClockSyncedAtRef.current = 0;
    }

    const refreshClock = () => { if (navigator.onLine !== false) void syncServerClock().catch(() => {}); };
    refreshClock();
    const timer = window.setInterval(refreshClock, 60000);
    window.addEventListener('online', refreshClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', refreshClock);
    };
  }, [studentQueueKey, syncServerClock]);

  const isSecureContextAvailable = typeof window !== 'undefined' ? window.isSecureContext : true;
  const secureCameraUrl = typeof window !== 'undefined'
    ? `https://${window.location.hostname}:3443${window.location.pathname}${window.location.search}${window.location.hash}`
    : '';

  const resetZoomState = useCallback(() => {
    zoomTrackRef.current = null;
    pendingZoomRef.current = null;
    zoomApplyInFlightRef.current = false;
    setZoomRange({ supported: false, min: 1, max: 1, step: 0.1 });
    setZoomValue(1);
  }, []);

  const getCameraErrorMessage = useCallback((error: unknown) => {
    const errorName = typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
    const errorMessage = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';

    if (!isSecureContextAvailable) {
      return copy.securePageRequired;
    }

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return copy.permissionBlocked;
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return copy.noCamera;
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return copy.cameraBusy;
    }

    return `${copy.cameraStartError} ${errorMessage || copy.allowCameraAccess}`;
  }, [copy, isSecureContextAvailable]);

  const configureTrackZoom = useCallback(async (track: TrackWithZoom | null) => {
    zoomTrackRef.current = track;

    if (!track?.getCapabilities) {
      resetZoomState();
      return;
    }

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: ZoomCapability };
    const zoomCapability = capabilities.zoom;

    if (!zoomCapability) {
      resetZoomState();
      return;
    }

    const min = typeof zoomCapability.min === 'number' ? zoomCapability.min : 1;
    const max = typeof zoomCapability.max === 'number' ? zoomCapability.max : min;
    const step = typeof zoomCapability.step === 'number' && zoomCapability.step > 0 ? zoomCapability.step : 0.1;
    const currentZoom = getVideoTrackZoomSettings(track) ?? min;

    setZoomRange({
      supported: max > min || currentZoom !== min,
      min,
      max,
      step,
    });
    setZoomValue(currentZoom);
  }, [resetZoomState]);

  const stopScannerStream = useCallback(() => {
    try {
      scannerRef.current?.stop();
    } catch (error) {
      // Ignore camera stop races on mobile browsers.
    }

    scanLockedRef.current = false;
    lastDecodedValueRef.current = '';
    lastDecodedAtRef.current = 0;
    stopVideoElement(videoRef.current);
    resetZoomState();
  }, [resetZoomState]);

  const destroyScanner = useCallback(() => {
    stopScannerStream();

    try {
      scannerRef.current?.destroy();
    } catch (error) {
      // Ignore camera teardown races on mobile browsers.
    }

    scannerRef.current = null;
  }, [stopScannerStream]);

  const captureQrFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return '';

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.max(0, (video.videoWidth - size) / 2);
    const sy = Math.max(0, (video.videoHeight - size) / 2);
    canvas.width = 256;
    canvas.height = 256;

    const context = canvas.getContext('2d');
    if (!context) return '';

    context.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  }, []);

  const submitAttendance = useCallback(async (rawValue: string, qrImageOverride = '', sessionCode = '') => {
    const normalizedSessionCode = sessionCode.replace(/\D/g, '').slice(0, 6);
    const isCodeEntry = normalizedSessionCode.length > 0;
    const qrData = isCodeEntry
      ? { rawValue: '', lectureId: null, timestamp: 0 }
      : parseQrPayload(rawValue);
    const qrImage = isCodeEntry ? '' : (qrImageOverride || captureQrFrame());
    const scanRequestId = createScanRequestId();

    scanLockedRef.current = true;
    destroyScanner();
    setScanned(false);
    setIsDuplicateAttendance(false);
    setIsAttendanceScanError(false);
    setScannerState('confirming');
    setLastScan(null);
    setCapturedQrImage(qrImage);
    setScannerMessage(copy.checkingAttendance);

    const capturedAt = Date.now();
    const queuedItem: QueuedAttendanceScan = {
      scanRequestId,
      qrPayload: qrData.rawValue,
      ...(isCodeEntry ? { sessionCode: normalizedSessionCode, mode: 'code' as const } : { mode: 'qr' as const }),
      lectureId: qrData.lectureId,
      qrTimestamp: qrData.timestamp,
      createdAt: capturedAt,
      scannedAt: new Date(capturedAt + serverClockOffsetRef.current).toISOString(),
      clockSyncedAt: serverClockSyncedAtRef.current || undefined,
    };
    const showQueuedState = async (item: QueuedAttendanceScan = queuedItem) => {
      await enqueue(item);
      if (!mountedRef.current) return;
      setScanned(false);
      setIsDuplicateAttendance(false);
      setIsAttendanceScanError(false);
      setScannerState('queued');
      setLastScan(null);
      setScannerMessage(copy.savedForSync);
      scanLockedRef.current = false;
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await showQueuedState();
      return;
    }

    try {
      let response;
      try {
        response = await attendanceAPI.scan({
          ...(isCodeEntry ? { sessionCode: normalizedSessionCode } : { qrPayload: qrData.rawValue }),
          scanRequestId,
        });
      } catch (firstError) {
        const responseStatus = typeof firstError === 'object' && firstError && 'response' in firstError
          ? Number((firstError as { response?: { status?: number } }).response?.status || 0)
          : 0;
        const shouldSaveForRetry = responseStatus === 0
          || responseStatus >= 500
          || [401, 408, 429].includes(responseStatus);
        if (!shouldSaveForRetry) throw firstError;

        // Network loss, authentication refreshes, throttling, and temporary
        // server failures are retryable. Keep the exact same request id so a
        // response lost after commit can never create duplicate attendance.
        await showQueuedState();
        return;
      }

      const preliminaryResult = (response?.data || {}) as AttendanceScanResult;
      const preliminaryRecordId = preliminaryResult.attendance?.attendanceRecordId
        || preliminaryResult.attendance?.id;
      const recordSource = preliminaryResult.attendance?.isFlexible ? 'flexible' : 'official';

      if (response && (preliminaryResult.confirmed !== true || !preliminaryRecordId)) {
        throw new Error(recordingFailedMessage);
      }

      // Never trust the scan response alone for the success UI. Read the stored
      // attendance row again through an indexed confirmation endpoint. This also
      // recovers when a weak connection loses the original HTTP response after
      // the database transaction has already committed.
      let verifiedResult: AttendanceScanResult | null = null;
      for (const delay of CONFIRMATION_RETRY_DELAYS_MS) {
        if (delay > 0) await waitFor(delay);
        if (!mountedRef.current) return;

        try {
          const statusResponse = await attendanceAPI.scanStatus(
            scanRequestId,
            preliminaryRecordId,
            preliminaryRecordId ? recordSource : undefined,
          );
          const statusResult = (statusResponse?.data || {}) as AttendanceScanResult;
          const verifiedRecordId = statusResult.attendance?.attendanceRecordId
            || statusResult.attendance?.id;
          if (statusResult.confirmed === true && verifiedRecordId) {
            verifiedResult = statusResult;
            break;
          }
        } catch {
          // Keep the pending UI visible while retrying a weak connection.
        }
      }

      if (!verifiedResult) {
        await showQueuedState({
          ...queuedItem,
          ...(preliminaryRecordId ? { attendanceRecordId: preliminaryRecordId, recordSource } : {}),
        });
        return;
      }

      const result: AttendanceScanResult = {
        ...preliminaryResult,
        ...verifiedResult,
        alreadyRecorded: Boolean(preliminaryResult.alreadyRecorded || verifiedResult.alreadyRecorded),
      };
      const attendanceRecordId = result.attendance?.attendanceRecordId || result.attendance?.id;
      if (!attendanceRecordId) throw new Error(recordingFailedMessage);
      if (!mountedRef.current) return;

      await applyConfirmedAttendance(result);
    } catch (error) {
      if (!mountedRef.current) return;

      const errorPayload = typeof error === 'object'
        && error
        && 'response' in error
        ? ((error as { response?: { data?: AttendanceErrorPayload } }).response?.data || {})
        : {};
      const responseStatus = typeof error === 'object'
        && error
        && 'response' in error
        ? Number((error as { response?: { status?: number } }).response?.status || 0)
        : 0;
      const responseMessage = String(errorPayload.message || '');

      const isInvalidOrExpiredQr = /(?:invalid|expired).*(?:qr|code)|(?:qr|code).*(?:invalid|expired)/i.test(responseMessage);
      const isServerFailure = responseStatus >= 500 || responseStatus === 0;
      const message = isServerFailure
        ? recordingFailedMessage
        : isInvalidOrExpiredQr
        ? (isCodeEntry ? copy.invalidOrExpiredCode : copy.invalidOrExpiredQr)
        : (responseMessage
          ? localizeAttendanceError(errorPayload, isArabic, copy.invalidQr)
          : recordingFailedMessage);
      setScanned(false);
      setIsDuplicateAttendance(false);
      setIsAttendanceScanError(true);
      setScannerState('error');
      setLastScan(null);
      setCapturedQrImage('');
      setScannerMessage(message);
      scanLockedRef.current = false;
    }
  }, [applyConfirmedAttendance, captureQrFrame, copy.checkingAttendance, copy.invalidOrExpiredCode, copy.invalidOrExpiredQr, copy.invalidQr, copy.savedForSync, destroyScanner, enqueue, isArabic, recordingFailedMessage]);

  const handleEntryModeChange = useCallback((mode: 'qr' | 'code') => {
    if (mode === entryMode) return;
    if (mode === 'code') destroyScanner();
    setEntryMode(mode);
    setScanned(false);
    setIsDuplicateAttendance(false);
    setIsAttendanceScanError(false);
    setScannerState('idle');
    setScannerMessage(mode === 'qr' ? copy.initialMessage : copy.codeMustBeSixDigits);
    scanLockedRef.current = false;
  }, [copy.codeMustBeSixDigits, copy.initialMessage, destroyScanner, entryMode]);

  const handleSessionCodeSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = sessionCodeInput.replace(/\D/g, '').slice(0, 6);
    if (![4, 6].includes(normalized.length)) {
      setIsAttendanceScanError(true);
      setScannerState('error');
      setScannerMessage(copy.codeMustBeSixDigits);
      return;
    }
    setSessionCodeInput('');
    void submitAttendance('', '', normalized);
  }, [copy.codeMustBeSixDigits, sessionCodeInput, submitAttendance]);

  const applyZoom = useCallback(async (requestedZoom: number) => {
    const nextZoom = Math.min(zoomRange.max, Math.max(zoomRange.min, requestedZoom));
    setZoomValue(nextZoom);
    pendingZoomRef.current = nextZoom;

    if (zoomApplyInFlightRef.current) return;
    zoomApplyInFlightRef.current = true;

    try {
      while (pendingZoomRef.current !== null) {
        const targetZoom = pendingZoomRef.current;
        pendingZoomRef.current = null;
        const track = zoomTrackRef.current;
        if (!track?.applyConstraints) continue;

        try {
          await track.applyConstraints({
            advanced: [{ zoom: targetZoom } as MediaTrackConstraintSet],
          });
          const appliedZoom = getVideoTrackZoomSettings(track);
          if (pendingZoomRef.current === null && typeof appliedZoom === 'number') {
            setZoomValue(appliedZoom);
          }
        } catch (error) {
          const appliedZoom = getVideoTrackZoomSettings(track);
          setZoomValue(typeof appliedZoom === 'number' ? appliedZoom : zoomRange.min);
        }
      }
    } finally {
      zoomApplyInFlightRef.current = false;
    }
  }, [zoomRange.max, zoomRange.min]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    void applyZoom(Number(event.target.value));
  }, [applyZoom]);

  const adjustZoom = useCallback((direction: 1 | -1) => {
    void applyZoom(zoomValue + (direction * zoomRange.step));
  }, [applyZoom, zoomRange.step, zoomValue]);

  const handleDecode = useCallback((result: QrScanner.ScanResult) => {
    const now = Date.now();

    if (scanLockedRef.current) return;
    if (result.data === lastDecodedValueRef.current && now - lastDecodedAtRef.current < DUPLICATE_SCAN_WINDOW_MS) {
      return;
    }

    lastDecodedValueRef.current = result.data;
    lastDecodedAtRef.current = now;
    scanLockedRef.current = true;

    void submitAttendance(result.data);
  }, [submitAttendance]);

  const handleOpenSecureCameraUrl = useCallback(() => {
    if (secureCameraUrl) {
      window.location.href = secureCameraUrl;
    }
  }, [secureCameraUrl]);

  const syncCameraPermissionState = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionState('unsupported');
      return;
    }

    if (!navigator.permissions?.query) {
      setCameraPermissionState((current) => (current === 'denied' ? current : 'unknown'));
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (status.state === 'granted') {
        setCameraPermissionState('granted');
      } else if (status.state === 'denied') {
        setCameraPermissionState('denied');
      } else {
        setCameraPermissionState('unknown');
      }
    } catch (error) {
      setCameraPermissionState((current) => (current === 'denied' ? current : 'unknown'));
    }
  }, []);

  const syncAvailableCameras = useCallback(async (activeTrack: TrackWithZoom | null = null) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setAvailableCameras([]);
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device): device is MediaDeviceInfo => device.kind === 'videoinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          facing: inferCameraFacing(device.label || ''),
        }));

      setAvailableCameras(cameras);

      const activeDeviceId = activeTrack?.getSettings?.().deviceId || '';
      if (activeDeviceId) {
        setCurrentCameraId(activeDeviceId);
        const activeCamera = cameras.find((camera) => camera.id === activeDeviceId);
        if (activeCamera) {
          setPreferredCamera(activeCamera.facing);
        }
      } else if (!currentCameraId && cameras.length > 0) {
        const preferredMatch = cameras.find((camera) => camera.facing === preferredCamera) || cameras[0];
        setCurrentCameraId(preferredMatch.id);
      }

      return cameras;
    } catch (error) {
      return [];
    }
  }, [currentCameraId, preferredCamera]);

  const startCamera = useCallback(async (cameraTarget?: string | CameraFacingMode) => {
    const requestId = startRequestIdRef.current + 1;
    startRequestIdRef.current = requestId;

    stopScannerStream();
    setIsSwitchingCamera(false);
    setScanned(false);
    setIsDuplicateAttendance(false);
    setIsAttendanceScanError(false);
    setLastScan(null);
    setCapturedQrImage('');
    setScannerState('starting');
    setScannerMessage(copy.startingCamera);

    if (!isSecureContextAvailable) {
      setScannerState('error');
      setScannerMessage(copy.securePageRequired);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionState('unsupported');
      setScannerState('error');
      setScannerMessage(copy.unsupportedCamera);
      return;
    }

    if (!videoRef.current) {
      setScannerState('error');
      setScannerMessage(copy.previewNotReady);
      return;
    }

    try {
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('muted', 'true');

      const primaryCameraTarget = cameraTarget || currentCameraId || preferredCamera;
      let scannerInstance = scannerRef.current;

      if (!scannerInstance) {
        scannerInstance = new QrScanner(videoRef.current, handleDecode, {
          onDecodeError: (error) => {
            if (error === QrScanner.NO_QR_CODE_FOUND) return;
          },
          preferredCamera: primaryCameraTarget as string | undefined,
          maxScansPerSecond: MAX_SCANS_PER_SECOND,
          calculateScanRegion: (video) => {
            const size = Math.floor(Math.min(video.videoWidth, video.videoHeight) * SCAN_REGION_RATIO);
            return {
              x: Math.max(0, (video.videoWidth - size) / 2),
              y: Math.max(0, (video.videoHeight - size) / 2),
              width: size,
              height: size,
              downScaledWidth: SCAN_DOWNSCALED_SIZE,
              downScaledHeight: SCAN_DOWNSCALED_SIZE,
            };
          },
          returnDetailedScanResult: true,
        });
        scannerRef.current = scannerInstance;
      } else if (cameraTarget) {
        await scannerInstance.setCamera(cameraTarget);
      }

      await withTimeout(
        scannerInstance.start(),
        CAMERA_START_TIMEOUT_MS,
        copy.startupTimedOut,
      );

      if (!mountedRef.current) {
        destroyScanner();
        return;
      }

      if (startRequestIdRef.current !== requestId) {
        stopScannerStream();
        return;
      }

      const activeTrack = getCurrentVideoTrack(videoRef.current);
      await configureTrackZoom(activeTrack);
      await syncAvailableCameras(activeTrack);

      if (!mountedRef.current || startRequestIdRef.current !== requestId) {
        stopScannerStream();
        return;
      }
      setCameraPermissionState('granted');
      setScannerState('scanning');
      setScannerMessage(copy.pointCamera);
    } catch (error) {
      if (!mountedRef.current) return;
      if (startRequestIdRef.current !== requestId) return;
      const errorName = typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
      setCameraPermissionState(errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' ? 'denied' : 'unknown');
      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setScannerMessage(copy.noCamera);
        setScannerState('error');
        destroyScanner();
        return;
      }
      setScannerState('error');
      setScannerMessage(getCameraErrorMessage(error));
      destroyScanner();
    }
  }, [configureTrackZoom, copy.noCamera, copy.pointCamera, copy.previewNotReady, copy.securePageRequired, copy.startingCamera, copy.startupTimedOut, copy.unsupportedCamera, currentCameraId, destroyScanner, getCameraErrorMessage, handleDecode, isSecureContextAvailable, preferredCamera, stopScannerStream, syncAvailableCameras]);

  const handleFlipCamera = useCallback(async () => {
    if (scannerState === 'starting' || cameraPermissionState !== 'granted' || !scannerRef.current) {
      return;
    }

    const cameras = availableCameras.length > 0 ? availableCameras : await syncAvailableCameras();
    if (cameras.length === 0) {
      const nextFacing = preferredCamera === 'environment' ? 'user' : 'environment';
      setIsSwitchingCamera(true);
      setScannerMessage(copy.startingCamera);
      try {
        await withTimeout(scannerRef.current.setCamera(nextFacing), CAMERA_START_TIMEOUT_MS, copy.startupTimedOut);
        const activeTrack = getCurrentVideoTrack(videoRef.current);
        await configureTrackZoom(activeTrack);
        await syncAvailableCameras(activeTrack);
        if (!mountedRef.current) return;
        setPreferredCamera(nextFacing);
        setScannerState('scanning');
        setScannerMessage(copy.pointCamera);
      } catch (error) {
        if (!mountedRef.current) return;
        setScannerState('error');
        setScannerMessage(getCameraErrorMessage(error));
        destroyScanner();
      } finally {
        if (mountedRef.current) {
          setIsSwitchingCamera(false);
        }
      }
      return;
    }

    if (cameras.length === 1) {
      const onlyCamera = cameras[0];
      setCurrentCameraId(onlyCamera.id);
      setPreferredCamera(onlyCamera.facing);
      return;
    }

    const currentIndex = cameras.findIndex((camera) => camera.id === currentCameraId);
    const oppositeFacing = preferredCamera === 'environment' ? 'user' : 'environment';
    const nextCamera = cameras.find((camera) => camera.facing === oppositeFacing && camera.id !== currentCameraId)
      || cameras[(currentIndex + 1 + cameras.length) % cameras.length]
      || cameras[0];

    setIsSwitchingCamera(true);
    setScannerMessage(copy.startingCamera);

    try {
      await withTimeout(scannerRef.current.setCamera(nextCamera.id), CAMERA_START_TIMEOUT_MS, copy.startupTimedOut);
      const activeTrack = getCurrentVideoTrack(videoRef.current);
      await configureTrackZoom(activeTrack);
      await syncAvailableCameras(activeTrack);
      if (!mountedRef.current) return;
      setCurrentCameraId(nextCamera.id);
      setPreferredCamera(nextCamera.facing);
      setScannerState('scanning');
      setScannerMessage(copy.pointCamera);
    } catch (error) {
      if (!mountedRef.current) return;
      setScannerState('error');
      setScannerMessage(getCameraErrorMessage(error));
      destroyScanner();
    } finally {
      if (mountedRef.current) {
        setIsSwitchingCamera(false);
      }
    }
  }, [availableCameras, cameraPermissionState, configureTrackZoom, copy.pointCamera, copy.startingCamera, copy.startupTimedOut, currentCameraId, destroyScanner, getCameraErrorMessage, preferredCamera, scannerState, syncAvailableCameras]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return destroyScanner;
    }

    if (!isSecureContextAvailable) {
      setScannerState('error');
      setScannerMessage(copy.secureHttpsWarning);
      return destroyScanner;
    }

    const timer = window.setTimeout(() => {
      void syncCameraPermissionState();
    }, AUTO_START_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      destroyScanner();
    };
  }, [copy.secureHttpsWarning, destroyScanner, isSecureContextAvailable, syncCameraPermissionState]);

  const handleRequestCamera = useCallback(() => {
    void startCamera();
  }, [startCamera]);

  const canAttemptLiveCamera = isSecureContextAvailable && cameraPermissionState !== 'unsupported';
  const scannerBusy = scannerState === 'starting' || isSwitchingCamera;
  const startingStatusMessage = copy.allowCameraAccess;
  const isConfirmingAttendance = scannerState === 'confirming';
  const scanStatusTone = scannerState === 'error'
    ? '#f87171'
    : (scannerState === 'queued' ? '#60a5fa' : scannerState === 'warning' ? '#f59e0b' : scanned ? '#34d399' : '#fbbf24');
  const isInvalidOrExpiredQrError = scannerState === 'error' && isAttendanceScanError;
  const showCameraGate = scannerState !== 'scanning' && scannerState !== 'queued' && !isConfirmingAttendance && !scanned;
  const gateActionLabel = scannerState === 'starting'
    ? copy.startingCamera
    : (scannerState === 'error' ? copy.restartCamera : gateCopy.openCamera);
  const gateMessage = useMemo(() => {
    if (!isSecureContextAvailable) {
      return copy.securePageRequired;
    }

    if (cameraPermissionState === 'denied') {
      return copy.permissionBlocked;
    }

    if (cameraPermissionState === 'unsupported') {
      return copy.unsupportedCamera;
    }

    if (scannerState === 'error' && scannerMessage) {
      return scannerMessage;
    }

    if (scannerState === 'starting') {
      return copy.allowCameraAccess;
    }

    return gateCopy.permissionHint;
  }, [
    cameraPermissionState,
    copy.allowCameraAccess,
    copy.permissionBlocked,
    copy.securePageRequired,
    copy.unsupportedCamera,
    gateCopy.permissionHint,
    isSecureContextAvailable,
    scannerMessage,
    scannerState,
  ]);
  const shouldDisplayPreview = scannerState === 'starting' || scannerState === 'scanning' || scanned;
  const zoomProgress = useMemo(() => {
    if (!zoomRange.supported || zoomRange.max <= zoomRange.min) return 0;
    return ((zoomValue - zoomRange.min) / (zoomRange.max - zoomRange.min)) * 100;
  }, [zoomRange, zoomValue]);

  return (
    <div style={{
      padding: 'clamp(14px, 4vw, 34px)',
      minHeight: '100%',
      overflowY: 'visible',
      paddingBottom: 54,
      display: 'flex',
      justifyContent: 'center',
    }}>
      <section style={{
        width: '100%',
        maxWidth: 720,
      }}>
        <div style={{
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
          padding: 'clamp(18px, 3vw, 28px)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{copy.qrAttendance}</div>
              <h2 style={{ margin: '7px 0 0', color: 'var(--text-primary)', fontSize: 26, lineHeight: 1.1, fontWeight: 900 }}>
                {entryMode === 'qr' ? copy.scanClassroomCode : copy.codeTab}
              </h2>
            </div>
            {entryMode === 'qr' && scannerState === 'scanning' ? (
              <button
                type="button"
                onClick={handleFlipCamera}
                disabled={isSwitchingCamera}
                aria-label={copy.flipCamera}
                title={`${copy.flipCamera} - ${preferredCamera === 'environment' ? copy.backCamera : copy.frontCamera}`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card2)',
                  color: 'var(--accent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSwitchingCamera ? 'default' : 'pointer',
                  opacity: isSwitchingCamera ? 0.7 : 1,
                }}
              >
                <RefreshCcw
                  size={20}
                  style={{ animation: isSwitchingCamera ? 'studentCameraFlip 0.62s cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
                />
              </button>
            ) : (
              <div style={{ width: 48, height: 48 }} />
            )}
          </div>

          <div role="tablist" aria-label={isArabic ? 'طريقة تسجيل الحضور' : 'Attendance method'} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, padding: 5, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card2)' }}>
            {(['qr', 'code'] as const).map((mode) => {
              const active = entryMode === mode;
              return (
                <button key={mode} type="button" role="tab" aria-selected={active} onClick={() => handleEntryModeChange(mode)} style={{ minHeight: 46, borderRadius: 8, border: active ? '1px solid rgba(52,211,153,.45)' : '1px solid transparent', background: active ? 'linear-gradient(135deg, rgba(16,185,129,.24), rgba(52,211,153,.12))' : 'transparent', color: active ? '#34d399' : 'var(--text-muted)', fontWeight: 900, cursor: 'pointer' }}>
                  {mode === 'qr' ? copy.qrTab : copy.codeTab}
                </button>
              );
            })}
          </div>

          {isDuplicateAttendance ? (
            <div style={{
              marginBottom: 18,
              borderRadius: 10,
              border: '1px solid rgba(245,158,11,0.5)',
              background: 'rgba(245,158,11,0.13)',
              padding: '13px 15px',
              color: '#f59e0b',
              fontSize: 14,
              fontWeight: 900,
              lineHeight: 1.7,
              textAlign: 'center',
              boxShadow: '0 10px 24px rgba(245,158,11,0.1)',
            }}>
              {scannerMessage}
            </div>
          ) : null}

          {entryMode === 'code' ? (
            <form onSubmit={handleSessionCodeSubmit} style={{ width: 'min(100%, 520px)', margin: '0 auto', minHeight: 260, borderRadius: 12, border: '1px solid color-mix(in srgb, var(--accent) 32%, var(--border))', background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--bg-card)), var(--bg-card2))', boxShadow: '0 18px 44px color-mix(in srgb, var(--text-primary) 9%, transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: 'clamp(22px, 6vw, 42px)' }}>
              <label htmlFor="student-session-code" style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 900, textAlign: 'center' }}>{copy.sessionCode}</label>
              <input
                id="student-session-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}|[0-9]{6}"
                maxLength={6}
                value={sessionCodeInput}
                onChange={(event) => setSessionCodeInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={'0'.repeat(sessionCodeLength)}
                disabled={scannerState === 'confirming'}
                dir="ltr"
                style={{ width: '100%', minHeight: 62, borderRadius: 10, border: isAttendanceScanError ? '1px solid rgba(239,68,68,.65)' : '1px solid color-mix(in srgb, var(--accent) 42%, var(--border))', background: 'var(--bg-card)', color: 'var(--text-primary)', caretColor: 'var(--accent)', boxShadow: 'inset 0 1px 2px color-mix(in srgb, var(--text-primary) 8%, transparent)', textAlign: 'center', letterSpacing: 9, fontSize: 28, fontWeight: 950, outline: 'none' }}
              />
              <button type="submit" disabled={scannerState === 'confirming' || ![4, 6].includes(sessionCodeInput.length)} style={{ minHeight: 50, borderRadius: 8, border: '1px solid color-mix(in srgb, var(--accent) 34%, var(--border))', background: scannerState === 'confirming' || ![4, 6].includes(sessionCodeInput.length) ? 'color-mix(in srgb, var(--text-muted) 16%, var(--bg-card2))' : 'linear-gradient(135deg, var(--primary), var(--accent))', color: scannerState === 'confirming' || ![4, 6].includes(sessionCodeInput.length) ? 'var(--text-muted)' : '#fff', fontSize: 15, fontWeight: 900, cursor: scannerState === 'confirming' || ![4, 6].includes(sessionCodeInput.length) ? 'default' : 'pointer' }}>
                {scannerState === 'confirming' ? copy.checkingAttendance : copy.submitCode}
              </button>
            </form>
          ) : null}

          {entryMode === 'code' && scannerState === 'error' ? (
            <div role="alert" style={{ width: 'min(100%, 520px)', margin: '12px auto 0', borderRadius: 8, border: '1px solid rgba(239,68,68,.48)', background: 'color-mix(in srgb, #ef4444 11%, var(--bg-card))', color: '#ef4444', padding: 13, textAlign: 'center', fontSize: 13, fontWeight: 900, lineHeight: 1.7 }}>
              {scannerMessage}
            </div>
          ) : null}

          <div style={{
            display: entryMode === 'qr' ? 'block' : 'none',
            position: 'relative',
            width: 'min(100%, 520px)',
            aspectRatio: '1 / 1',
            margin: '0 auto',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#050b11',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: shouldDisplayPreview ? 1 : 0,
                transition: 'opacity 180ms ease',
                transform: preferredCamera === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {showCameraGate && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: isInvalidOrExpiredQrError ? '#fecaca' : 'var(--text-muted)',
                fontWeight: 800,
                textAlign: 'center',
                padding: 22,
                background: isInvalidOrExpiredQrError
                  ? 'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.22), transparent 56%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(52,211,153,0.14), transparent 46%)',
              }}>
                {scannerState === 'starting' ? (
                  <>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '3px solid rgba(255,255,255,0.18)',
                      borderTopColor: '#34d399',
                      animation: 'studentCameraSpin 0.85s linear infinite',
                    }} />
                    <div style={{ maxWidth: 280, lineHeight: 1.6 }}>
                      {startingStatusMessage}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={isInvalidOrExpiredQrError ? 'student-qr-validation-error' : ''}
                      style={{ maxWidth: 280, lineHeight: 1.7 }}
                    >
                      {gateMessage}
                    </div>
                    {canAttemptLiveCamera ? (
                      <button
                        type="button"
                        onClick={handleRequestCamera}
                        className={isInvalidOrExpiredQrError ? 'student-qr-validation-action' : ''}
                        style={{
                          minWidth: 152,
                          minHeight: 44,
                          borderRadius: 8,
                          border: isInvalidOrExpiredQrError
                            ? '1px solid rgba(252,165,165,0.72)'
                            : '1px solid rgba(52,211,153,0.25)',
                          background: isInvalidOrExpiredQrError
                            ? 'linear-gradient(135deg, #b91c1c, #ef4444)'
                            : 'linear-gradient(135deg, var(--primary), var(--accent))',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: isInvalidOrExpiredQrError
                            ? '0 16px 32px rgba(239,68,68,0.3)'
                            : '0 16px 32px rgba(26,107,69,0.22)',
                          padding: '0 18px',
                        }}
                      >
                        {gateActionLabel}
                      </button>
                    ) : null}
                    {!isSecureContextAvailable && secureCameraUrl ? (
                      <button
                        type="button"
                        onClick={handleOpenSecureCameraUrl}
                        style={{
                          minWidth: 152,
                          minHeight: 40,
                          borderRadius: 8,
                          border: '1px solid rgba(52,211,153,0.28)',
                          background: 'rgba(52,211,153,0.12)',
                          color: '#bbf7d0',
                          fontWeight: 900,
                          cursor: 'pointer',
                          padding: '0 16px',
                        }}
                      >
                        {copy.openSecureCameraPage}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {scannerState === 'scanning' && !scanned && (
              <>
                <div style={{ position: 'absolute', inset: 24, borderRadius: 8, border: '2px solid rgba(52,211,153,0.78)', boxShadow: '0 0 0 999px rgba(0,0,0,0.22)' }} />
                <div style={{ position: 'absolute', left: 34, right: 34, height: 2, background: 'linear-gradient(90deg, transparent, #34d399, transparent)', animation: 'scanLineAnim 2s ease-in-out infinite' }} />
              </>
            )}

            {isConfirmingAttendance && !scanned ? (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
                background: 'rgba(3,12,10,0.9)', color: '#fbbf24', textAlign: 'center',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.18)',
                  borderTopColor: '#fbbf24', animation: 'studentCameraSpin 0.85s linear infinite',
                }} />
                <div style={{ color: '#fef3c7', fontSize: 14, fontWeight: 900, lineHeight: 1.7 }}>
                  {scannerMessage}
                </div>
              </div>
            ) : null}

            {scannerState === 'queued' && !scanned ? (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
                background: 'rgba(5,15,30,0.94)', color: '#bfdbfe', textAlign: 'center',
              }}>
                <RefreshCcw size={38} />
                <div style={{ maxWidth: 360, fontSize: 14, fontWeight: 900, lineHeight: 1.8 }}>
                  {copy.savedForSync}
                </div>
              </div>
            ) : null}

            {scannerState === 'scanning' && !scanned && zoomRange.supported ? (
              <div style={{
                position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 3,
                minHeight: 46, padding: '6px 8px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(5,15,24,0.22)',
                backdropFilter: 'blur(8px) saturate(1.15)', WebkitBackdropFilter: 'blur(8px) saturate(1.15)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.16)', display: 'flex', alignItems: 'center', gap: 6,
                touchAction: 'manipulation', direction: 'ltr',
              }}>
                <div style={{ color: '#d1fae5', display: 'grid', placeItems: 'center' }}><ZoomIn size={14} strokeWidth={2.3} /></div>
                <button type="button" onClick={() => adjustZoom(-1)} disabled={zoomValue <= zoomRange.min} aria-label="Zoom out" style={{ width: 27, height: 27, minWidth: 27, borderRadius: 9, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#dbeafe', display: 'grid', placeItems: 'center', cursor: zoomValue <= zoomRange.min ? 'default' : 'pointer', opacity: zoomValue <= zoomRange.min ? 0.45 : 1 }}><Minus size={14} strokeWidth={2.7} /></button>
                <input className="student-camera-zoom-slider" type="range" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step} value={zoomValue} onChange={handleZoomChange} aria-label={copy.cameraZoom} style={{ flex: 1, minWidth: 0, background: `linear-gradient(90deg, #34d399 0%, #34d399 ${zoomProgress}%, rgba(255,255,255,0.2) ${zoomProgress}%, rgba(255,255,255,0.2) 100%)` }} />
                <button type="button" onClick={() => adjustZoom(1)} disabled={zoomValue >= zoomRange.max} aria-label="Zoom in" style={{ width: 27, height: 27, minWidth: 27, borderRadius: 9, border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.13)', color: '#6ee7b7', display: 'grid', placeItems: 'center', cursor: zoomValue >= zoomRange.max ? 'default' : 'pointer', opacity: zoomValue >= zoomRange.max ? 0.45 : 1 }}><Plus size={14} strokeWidth={2.7} /></button>
                <span style={{ color: '#d1fae5', minWidth: 27, textAlign: 'right', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>{zoomValue.toFixed(1)}x</span>
              </div>
            ) : null}

            {scanned && (
              <div style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                background: isDuplicateAttendance ? 'rgba(31,20,3,0.8)' : 'rgba(3,12,10,0.74)',
                color: isDuplicateAttendance ? '#fbbf24' : '#34d399', textAlign: 'center', padding: 22,
              }}>
                <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 900 }}>{isDuplicateAttendance ? '!' : copy.ok}</div>
                <div style={{ marginTop: 10, color: isDuplicateAttendance ? '#fde68a' : '#d1fae5', fontSize: 14, fontWeight: 800 }}>
                  {isDuplicateAttendance ? copy.duplicateAttendanceShort : copy.attendanceRecordedShort}
                </div>
              </div>
            )}
          </div>

          {scannerState !== 'error' && !isDuplicateAttendance ? (
            <div style={{
              marginTop: 18,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-card2)',
              padding: 14,
              color: scanStatusTone,
              fontSize: 13,
              fontWeight: 800,
              textAlign: 'center',
            }}>
              {scannerState === 'starting'
                ? startingStatusMessage
                : isConfirmingAttendance
                  ? scannerMessage
                : (scannerMessage || (scanned ? copy.attendanceRecorded : (entryMode === 'qr' ? copy.pointAtClassQr : copy.codeMustBeSixDigits)))}
            </div>
          ) : null}

          {pendingCount > 0 ? (
            <div style={{ marginTop: 14, borderRadius: 8, border: '1px solid rgba(96,165,250,.35)', background: 'rgba(59,130,246,.10)', padding: 12 }}>
              <div style={{ marginBottom: 10, color: '#bfdbfe', fontSize: 13, fontWeight: 900, textAlign: 'center' }}>
                {pendingCount} {copy.pendingSync}
              </div>
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={isSyncing}
                style={{ width: '100%', minHeight: 46, borderRadius: 8, border: '1px solid rgba(96,165,250,.5)', background: isSyncing ? '#334155' : 'linear-gradient(135deg,#2563eb,#0ea5e9)', color: '#fff', fontWeight: 900, cursor: isSyncing ? 'default' : 'pointer' }}
              >
                {isSyncing ? copy.syncingNow : copy.syncNow}
              </button>
              {manualSyncMessage ? (
                <div style={{ marginTop: 9, color: '#bfdbfe', fontSize: 12, fontWeight: 700, lineHeight: 1.6, textAlign: 'center' }}>
                  {manualSyncMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {entryMode === 'qr' && !showCameraGate && !isConfirmingAttendance ? (
            <button
              type="button"
              onClick={handleRequestCamera}
              disabled={scannerBusy}
              style={{
                marginTop: 14,
                width: '100%',
                minHeight: 48,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: scannerBusy
                  ? '#334155'
                  : (isDuplicateAttendance ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, var(--primary), var(--accent))'),
                color: '#fff',
                fontSize: 15,
                fontWeight: 900,
                cursor: scannerBusy ? 'default' : 'pointer',
                boxShadow: scannerBusy
                  ? 'none'
                  : (isDuplicateAttendance ? '0 16px 32px rgba(245,158,11,0.22)' : '0 16px 32px rgba(26,107,69,0.28)'),
                opacity: scannerBusy ? 0.75 : 1,
              }}
            >
              {scannerBusy
                ? copy.startingCamera
                : (scanned || scannerState === 'queued' ? copy.scanAnotherQr : copy.restartCamera)}
            </button>
          ) : null}

          {lastScan ? (
            <div style={{
              marginTop: 12,
              borderRadius: 8,
              border: isDuplicateAttendance ? '1px solid rgba(245,158,11,0.32)' : '1px solid rgba(52,211,153,0.22)',
              background: isDuplicateAttendance ? 'rgba(245,158,11,0.09)' : 'rgba(52,211,153,0.09)',
              padding: 14,
            }}>
              <div style={{ color: isDuplicateAttendance ? '#fbbf24' : '#86efac', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{copy.lastResult}</div>
              <div style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, wordBreak: 'break-word' }}>
                {getLastScanLabel(lastScan, copy.recorded)}
              </div>
            </div>
          ) : null}

          {entryMode === 'qr' && capturedQrImage ? (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.025)', padding: 12 }}>
              <img src={capturedQrImage} alt={copy.capturedQrAlt} style={{ width: 66, height: 66, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13 }}>{copy.snapshotSaved}</strong>
                <span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>{copy.attachedToScan}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <style>{`
        @keyframes scanLineAnim {
          0% { top: 24px; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: calc(100% - 24px); opacity: 0; }
        }
        @keyframes studentCameraSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes studentCameraFlip {
          0% { transform: rotateY(0deg) rotate(0deg); }
          48% { transform: rotateY(180deg) rotate(110deg); }
          100% { transform: rotateY(360deg) rotate(180deg); }
        }
        @keyframes studentQrValidationPulse {
          0%, 100% { opacity: 1; transform: scale(1); text-shadow: 0 0 0 rgba(248,113,113,0); }
          50% { opacity: 0.72; transform: scale(1.025); text-shadow: 0 0 20px rgba(248,113,113,0.82); }
        }
        .student-qr-validation-error {
          color: #fca5a5;
          animation: studentQrValidationPulse 1.15s ease-in-out infinite;
        }
        .student-qr-validation-action {
          animation: studentQrValidationPulse 1.15s ease-in-out infinite;
        }
        .student-camera-zoom-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 7px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          touch-action: pan-x;
        }
        .student-camera-zoom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 3px solid #ecfdf5;
          background: #34d399;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.62);
        }
        .student-camera-zoom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid #ecfdf5;
          background: #34d399;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.62);
        }
      `}</style>
    </div>
  );
};

export default ScanTab;
