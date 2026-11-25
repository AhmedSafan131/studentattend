import { isStudentBrowserBlocked, STUDENT_BROWSER_BLOCKED } from '../utils/studentBrowserPolicy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { attendanceAPI } from '../utils/api';
import { deletePendingScan, loadPendingScans, savePendingScan } from './studentStorage';

export type QueuedAttendanceScan = {
  scanRequestId: string;
  qrPayload: string;
  sessionCode?: string;
  mode?: 'qr' | 'code';
  lectureId: string | null;
  qrTimestamp: number;
  createdAt: number;
  scannedAt: string;
  clockSyncedAt?: number;
  attendanceRecordId?: string | number;
  recordSource?: 'official' | 'flexible';
};

type ScanResult = Record<string, any>;
type QueueFailure = { item: QueuedAttendanceScan; error: unknown };

export type QueueSyncResult = {
  status: 'synced' | 'pending' | 'offline' | 'empty';
  attempted: number;
  synced: number;
  rejected: number;
  remaining: number;
};

const RETRY_INTERVAL_MS = 5000;
const MAX_RETRY_INTERVAL_MS = 60000;
const PERMANENT_QUEUE_ERROR_CODES = new Set([
  'ATTENDANCE_SESSION_NOT_FOUND',
  'INVALID_OFFLINE_PROOF',
  'INVALID_QR_PROOF',
  'INVALID_SESSION_CODE',
  'MISSING_OFFLINE_SCAN_TIME',
  'NOT_ENROLLED_IN_SUBJECT',
  'OFFLINE_SCAN_TOO_OLD',
  'QR_SESSION_MISMATCH',
  'WRONG_SUBJECT_GROUP',
]);

const responseErrorCode = (error: unknown): string => (
  typeof error === 'object' && error && 'response' in error
    ? String((error as { response?: { data?: { errorCode?: string } } }).response?.data?.errorCode || '')
    : ''
);

export const isPermanentQueueFailure = (error: unknown): boolean => (
  PERMANENT_QUEUE_ERROR_CODES.has(responseErrorCode(error))
);

const normalizeQueue = (items: QueuedAttendanceScan[]): QueuedAttendanceScan[] => items.map((item) => ({
  ...item,
  scannedAt: item.scannedAt || new Date(Number(item.createdAt) || Date.now()).toISOString(),
}));

export const useAttendanceQueue = (
  studentKey: string,
  onSynced: (result: ScanResult, item: QueuedAttendanceScan) => void | Promise<void>,
  onPermanentFailure?: (failure: QueueFailure) => void,
) => {
  const [items, setItems] = useState<QueuedAttendanceScan[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const itemsRef = useRef(items);
  const activeSyncRef = useRef<Promise<QueueSyncResult> | null>(null);
  const onSyncedRef = useRef(onSynced);
  const onPermanentFailureRef = useRef(onPermanentFailure);
  const nextAutomaticRetryAtRef = useRef(0);
  const retryDelayRef = useRef(RETRY_INTERVAL_MS);

  useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);
  useEffect(() => { onPermanentFailureRef.current = onPermanentFailure; }, [onPermanentFailure]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    void loadPendingScans<QueuedAttendanceScan>(studentKey).then((storedItems) => {
      if (cancelled) return;
      const nextItems = normalizeQueue(storedItems);
      itemsRef.current = nextItems;
      setItems(nextItems);
      setIsReady(true);
    });
    return () => { cancelled = true; };
  }, [studentKey]);

  const updateMemory = useCallback((nextItems: QueuedAttendanceScan[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const enqueue = useCallback(async (item: QueuedAttendanceScan) => {
    const current = itemsRef.current;
    if (current.some((queued) => queued.scanRequestId === item.scanRequestId)) return;
    await savePendingScan(studentKey, item);
    updateMemory([...itemsRef.current.filter((queued) => queued.scanRequestId !== item.scanRequestId), item]);
  }, [studentKey, updateMemory]);

  const syncNow = useCallback((): Promise<QueueSyncResult> => {
    // A manual click made while the automatic sync is already running must
    // observe that same attempt instead of looking like an ignored click.
    if (activeSyncRef.current) return activeSyncRef.current;
    if (itemsRef.current.length === 0) {
      return Promise.resolve({ status: 'empty', attempted: 0, synced: 0, rejected: 0, remaining: 0 });
    }
    if (navigator.onLine === false || isStudentBrowserBlocked()) {
      return Promise.resolve({
        status: 'offline',
        attempted: 0,
        synced: 0,
        rejected: 0,
        remaining: itemsRef.current.length,
      });
    }

    const syncPromise = (async (): Promise<QueueSyncResult> => {
      setIsSyncing(true);
      let hasRetryablePendingItem = false;
      let attempted = 0;
      let synced = 0;
      let rejected = 0;

      try {
        for (const originalItem of [...itemsRef.current]) {
          if (isStudentBrowserBlocked()) { hasRetryablePendingItem = true; break; }
          attempted += 1;
          let item = originalItem;
          try {
            if (!item.attendanceRecordId) {
              const scanResponse = await attendanceAPI.scan({
                ...(item.sessionCode
                  ? { sessionCode: item.sessionCode }
                  : { qrPayload: item.qrPayload }),
                scanRequestId: item.scanRequestId,
                queued: true,
                scannedAt: item.scannedAt,
              });
              if (isStudentBrowserBlocked()) { hasRetryablePendingItem = true; break; }
              const scanResult = scanResponse?.data || {};
              const recordId = scanResult.attendance?.attendanceRecordId || scanResult.attendance?.id;
              if (recordId) {
                item = {
                  ...item,
                  attendanceRecordId: recordId,
                  recordSource: scanResult.attendance?.isFlexible ? 'flexible' : 'official',
                };
                await savePendingScan(studentKey, item);
                updateMemory(itemsRef.current.map((queued) => (
                  queued.scanRequestId === item.scanRequestId ? item : queued
                )));
              }
            }

            const statusResponse = await attendanceAPI.scanStatus(
              item.scanRequestId,
              item.attendanceRecordId,
              item.recordSource,
            );
            if (isStudentBrowserBlocked()) { hasRetryablePendingItem = true; break; }
            const result = statusResponse?.data || {};
            const confirmedId = result.attendance?.attendanceRecordId || result.attendance?.id;
            if (result.confirmed !== true || !confirmedId) {
              hasRetryablePendingItem = true;
              continue;
            }

            await deletePendingScan(studentKey, item.scanRequestId);
            updateMemory(itemsRef.current.filter((queued) => queued.scanRequestId !== item.scanRequestId));
            synced += 1;
            await onSyncedRef.current(result, item);
          } catch (error) {
            if (responseErrorCode(error) === STUDENT_BROWSER_BLOCKED) { hasRetryablePendingItem = true; break; }
            if (isPermanentQueueFailure(error)) {
              await deletePendingScan(studentKey, item.scanRequestId);
              updateMemory(itemsRef.current.filter((queued) => queued.scanRequestId !== item.scanRequestId));
              rejected += 1;
              onPermanentFailureRef.current?.({ item, error });
            } else {
              hasRetryablePendingItem = true;
            }
          }
        }
      } finally {
        if (hasRetryablePendingItem) {
          nextAutomaticRetryAtRef.current = Date.now() + retryDelayRef.current;
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_INTERVAL_MS);
        } else {
          nextAutomaticRetryAtRef.current = 0;
          retryDelayRef.current = RETRY_INTERVAL_MS;
        }
        setIsSyncing(false);
      }

      const remaining = itemsRef.current.length;
      return {
        status: remaining > 0 ? 'pending' : 'synced',
        attempted,
        synced,
        rejected,
        remaining,
      };
    })();

    activeSyncRef.current = syncPromise;
    void syncPromise.finally(() => {
      if (activeSyncRef.current === syncPromise) activeSyncRef.current = null;
    });
    return syncPromise;
  }, [studentKey, updateMemory]);

  useEffect(() => {
    if (!isReady || items.length === 0) return undefined;
    const tryAutomaticSync = () => {
      if (navigator.onLine !== false && Date.now() >= nextAutomaticRetryAtRef.current) {
        void syncNow();
      }
    };
    const syncAfterReconnect = () => {
      nextAutomaticRetryAtRef.current = 0;
      retryDelayRef.current = RETRY_INTERVAL_MS;
      if (navigator.onLine !== false) void syncNow();
    };
    const timer = window.setInterval(tryAutomaticSync, RETRY_INTERVAL_MS);
    window.addEventListener('online', syncAfterReconnect);
    tryAutomaticSync();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', syncAfterReconnect);
    };
  }, [isReady, items.length, syncNow]);

  return { enqueue, syncNow, pendingCount: items.length, isSyncing, isReady };
};
