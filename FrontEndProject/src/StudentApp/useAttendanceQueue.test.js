import { updateStudentBrowserAccess } from '../utils/studentBrowserPolicy';
import { act, renderHook, waitFor } from '@testing-library/react';
import { attendanceAPI } from '../utils/api';
import { deletePendingScan, loadPendingScans, savePendingScan } from './studentStorage';
import { isPermanentQueueFailure, useAttendanceQueue } from './useAttendanceQueue';

jest.mock('../utils/api', () => ({
  attendanceAPI: {
    scan: jest.fn(),
    scanStatus: jest.fn(),
  },
}));

jest.mock('./studentStorage', () => ({
  deletePendingScan: jest.fn(),
  loadPendingScans: jest.fn(),
  savePendingScan: jest.fn(),
}));

const responseError = (status, errorCode) => ({
  response: {
    status,
    data: errorCode ? { errorCode } : {},
  },
});

describe('attendance queue failure policy', () => {
  const queuedItem = {
    scanRequestId: '10000000-2000-4000-8000-000000000001',
    qrPayload: 'LQ-SAVEDPROOF',
    lectureId: 'session-1',
    qrTimestamp: 1,
    createdAt: 1,
    scannedAt: '2026-10-05T08:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    updateStudentBrowserAccess({ blocked: false });
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    loadPendingScans.mockResolvedValue([queuedItem]);
    savePendingScan.mockResolvedValue(undefined);
    deletePendingScan.mockResolvedValue(undefined);
  });

  test.each([
    'INVALID_OFFLINE_PROOF',
    'OFFLINE_SCAN_TOO_OLD',
    'INVALID_SESSION_CODE',
    'NOT_ENROLLED_IN_SUBJECT',
    'WRONG_SUBJECT_GROUP',
  ])('removes a proof rejected permanently with %s', (errorCode) => {
    expect(isPermanentQueueFailure(responseError(422, errorCode))).toBe(true);
  });

  test.each([
    responseError(403, 'STUDENT_BROWSER_BLOCKED'),
    responseError(401),
    responseError(408),
    responseError(429, 'SESSION_CODE_RATE_LIMITED'),
    responseError(500),
    responseError(503),
    responseError(422),
    { code: 'ERR_NETWORK' },
  ])('keeps temporary or unclassified failures retryable', (error) => {
    expect(isPermanentQueueFailure(error)).toBe(false);
  });

  test('browser policy rejection preserves pending proof and stops the batch', async () => {
    loadPendingScans.mockResolvedValue([queuedItem, { ...queuedItem, scanRequestId: 'second' }]);
    attendanceAPI.scan.mockRejectedValueOnce(responseError(403, 'STUDENT_BROWSER_BLOCKED'));
    const { result, unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn()));
    await waitFor(() => expect(attendanceAPI.scan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(deletePendingScan).not.toHaveBeenCalled();
    expect(attendanceAPI.scanStatus).not.toHaveBeenCalled();
    expect(result.current.pendingCount).toBe(2);
    unmount();
  });

  test('blocked browser does not send scans or status requests', async () => {
    updateStudentBrowserAccess({ blocked: true });
    const { result, unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn()));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => { await result.current.syncNow(); });
    expect(attendanceAPI.scan).not.toHaveBeenCalled();
    expect(attendanceAPI.scanStatus).not.toHaveBeenCalled();
    expect(deletePendingScan).not.toHaveBeenCalled();
    unmount();
  });

  test('does not delete a queued proof after a temporary network failure', async () => {
    attendanceAPI.scan.mockRejectedValueOnce({ code: 'ERR_NETWORK' });

    const { unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn()));

    await waitFor(() => expect(attendanceAPI.scan).toHaveBeenCalledTimes(1));
    expect(deletePendingScan).not.toHaveBeenCalled();
    unmount();
  });

  test('deletes a queued proof only after an explicit permanent rejection', async () => {
    attendanceAPI.scan.mockRejectedValueOnce(responseError(422, 'OFFLINE_SCAN_TOO_OLD'));

    const onPermanentFailure = jest.fn();
    const { unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn(), onPermanentFailure));

    await waitFor(() => expect(deletePendingScan).toHaveBeenCalledWith(
      'student-1',
      queuedItem.scanRequestId,
    ));
    expect(onPermanentFailure).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('restores a queued proof after refresh and publishes it only after server confirmation', async () => {
    attendanceAPI.scan.mockResolvedValueOnce({
      data: { attendance: { attendanceRecordId: 3427, isFlexible: true } },
    });
    attendanceAPI.scanStatus.mockResolvedValueOnce({
      data: { confirmed: true, attendance: { attendanceRecordId: 3427, status: 'present' } },
    });
    const onSynced = jest.fn();

    const { result, unmount } = renderHook(() => useAttendanceQueue('student-1', onSynced));

    await waitFor(() => expect(onSynced).toHaveBeenCalledTimes(1));
    expect(attendanceAPI.scan).toHaveBeenCalledWith(expect.objectContaining({
      scanRequestId: queuedItem.scanRequestId,
      queued: true,
      scannedAt: queuedItem.scannedAt,
    }));
    expect(attendanceAPI.scanStatus).toHaveBeenCalledWith(queuedItem.scanRequestId, 3427, 'flexible');
    expect(deletePendingScan).toHaveBeenCalledWith('student-1', queuedItem.scanRequestId);
    expect(result.current.pendingCount).toBe(0);
    unmount();
  });

  test('a manual click joins an automatic sync already in progress', async () => {
    let resolveScan;
    attendanceAPI.scan.mockImplementationOnce(() => new Promise((resolve) => { resolveScan = resolve; }));
    attendanceAPI.scanStatus.mockResolvedValueOnce({
      data: { confirmed: true, attendance: { attendanceRecordId: 3428 } },
    });

    const { result, unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn()));
    await waitFor(() => expect(attendanceAPI.scan).toHaveBeenCalledTimes(1));

    let manualAttempt;
    act(() => { manualAttempt = result.current.syncNow(); });
    expect(attendanceAPI.scan).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveScan({ data: { attendance: { attendanceRecordId: 3428 } } });
      await manualAttempt;
    });
    expect(attendanceAPI.scan).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCount).toBe(0);
    unmount();
  });

  test('reports a retryable failure as pending without deleting it', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    attendanceAPI.scan.mockRejectedValueOnce({ code: 'ERR_NETWORK' });
    const { result, unmount } = renderHook(() => useAttendanceQueue('student-1', jest.fn()));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
    let syncResult;
    await act(async () => { syncResult = await result.current.syncNow(); });

    expect(syncResult).toEqual(expect.objectContaining({ status: 'pending', attempted: 1, remaining: 1 }));
    expect(deletePendingScan).not.toHaveBeenCalled();
    unmount();
  });
});
