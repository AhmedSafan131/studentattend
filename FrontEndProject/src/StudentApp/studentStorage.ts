const DB_NAME = 'mnu-attend-db';
const DB_VERSION = 1;
const PENDING_STORE = 'pendingAttendanceScans';
const META_STORE = 'appMetadata';
const LEGACY_DEVICE_KEY = 'studentattend.auth.deviceId';
const DEVICE_META_KEY = 'deviceIdentifier';
const STORAGE_PROBE_META_KEY = 'studentStorageProbe';
const STORAGE_PROBE_LOCAL_KEY = 'studentattend.storage.probe';

type StoredPendingScan = Record<string, any> & {
  storageId: string;
  studentKey: string;
  scanRequestId: string;
};

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
});

let databasePromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PENDING_STORE)) {
        const store = database.createObjectStore(PENDING_STORE, { keyPath: 'storageId' });
        store.createIndex('studentKey', 'studentKey', { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error('Unable to open IndexedDB.'));
    };
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab.'));
  });

  return databasePromise;
};

const pendingStorageId = (studentKey: string, scanRequestId: string) => `${studentKey}:${scanRequestId}`;
const legacyQueueKey = (studentKey: string) => `student-attendance:pending-scans:${studentKey || 'unknown'}`;

const normalizeLegacyQueue = (studentKey: string): Array<Record<string, any>> => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(legacyQueueKey(studentKey)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadPendingScans = async <T extends { scanRequestId: string }>(studentKey: string): Promise<T[]> => {
  try {
    const database = await openDatabase();
    const transaction = database.transaction([PENDING_STORE], 'readwrite');
    const store = transaction.objectStore(PENDING_STORE);
    const legacyItems = normalizeLegacyQueue(studentKey);

    for (const item of legacyItems) {
      if (!item?.scanRequestId) continue;
      store.put({
        ...item,
        storageId: pendingStorageId(studentKey, String(item.scanRequestId)),
        studentKey,
      });
    }

    await transactionDone(transaction);
    if (legacyItems.length > 0) window.localStorage.removeItem(legacyQueueKey(studentKey));

    const readTransaction = database.transaction(PENDING_STORE, 'readonly');
    const index = readTransaction.objectStore(PENDING_STORE).index('studentKey');
    const records = await requestResult(index.getAll(IDBKeyRange.only(studentKey)));
    await transactionDone(readTransaction);

    return (records as StoredPendingScan[]).map(({ storageId, studentKey: ignoredStudentKey, ...item }) => item as T);
  } catch {
    return normalizeLegacyQueue(studentKey) as T[];
  }
};

export const savePendingScan = async <T extends { scanRequestId: string }>(studentKey: string, item: T): Promise<void> => {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(PENDING_STORE, 'readwrite');
    transaction.objectStore(PENDING_STORE).put({
      ...item,
      storageId: pendingStorageId(studentKey, item.scanRequestId),
      studentKey,
    });
    await transactionDone(transaction);
  } catch {
    const current = normalizeLegacyQueue(studentKey).filter((entry) => entry.scanRequestId !== item.scanRequestId);
    window.localStorage.setItem(legacyQueueKey(studentKey), JSON.stringify([...current, item]));
  }
};

export const deletePendingScan = async (studentKey: string, scanRequestId: string): Promise<void> => {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(PENDING_STORE, 'readwrite');
    transaction.objectStore(PENDING_STORE).delete(pendingStorageId(studentKey, scanRequestId));
    await transactionDone(transaction);
  } catch {
    const remaining = normalizeLegacyQueue(studentKey).filter((entry) => entry.scanRequestId !== scanRequestId);
    window.localStorage.setItem(legacyQueueKey(studentKey), JSON.stringify(remaining));
  }
};

const readMetadata = async (key: string): Promise<any> => {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readonly');
  const result = await requestResult(transaction.objectStore(META_STORE).get(key));
  await transactionDone(transaction);
  return result?.value;
};

const writeMetadata = async (key: string, value: any): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readwrite');
  transaction.objectStore(META_STORE).put({ key, value, updatedAt: Date.now() });
  await transactionDone(transaction);
};

const deleteMetadata = async (key: string): Promise<void> => {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readwrite');
  transaction.objectStore(META_STORE).delete(key);
  await transactionDone(transaction);
};

const probeRequiredStorage = async (): Promise<void> => {
  const probeValue = `${Date.now()}-${window.crypto?.randomUUID?.() || Math.random()}`;

  window.localStorage.setItem(STORAGE_PROBE_LOCAL_KEY, probeValue);
  if (window.localStorage.getItem(STORAGE_PROBE_LOCAL_KEY) !== probeValue) {
    throw new Error('Local storage is not readable.');
  }
  window.localStorage.removeItem(STORAGE_PROBE_LOCAL_KEY);

  await writeMetadata(STORAGE_PROBE_META_KEY, probeValue);
  if (await readMetadata(STORAGE_PROBE_META_KEY) !== probeValue) {
    throw new Error('IndexedDB storage is not readable.');
  }
  await deleteMetadata(STORAGE_PROBE_META_KEY);
};

const hasStrongPrivateBrowsingSignal = async (): Promise<boolean> => {
  const userAgent = window.navigator.userAgent || '';
  const isSafari = /safari/i.test(userAgent) && !/chrome|crios|android|edg|fxios/i.test(userAgent);
  const storageWithDirectory = window.navigator.storage as StorageManager & {
    getDirectory?: () => Promise<unknown>;
  };

  // WebKit does not expose a private-mode flag. On current Safari versions,
  // however, OPFS is unavailable in private windows while remaining available
  // in regular windows. Only use the signal when the API itself exists so old
  // Safari versions are not rejected merely for lacking the feature.
  if (isSafari && typeof storageWithDirectory?.getDirectory === 'function') {
    try {
      await storageWithDirectory.getDirectory();
    } catch {
      return true;
    }
  }

  // Older Chromium versions expose a temporary filesystem API that rejects in
  // Incognito. A successful call is not treated as proof of regular browsing.
  const chromiumWindow = window as Window & typeof globalThis & {
    webkitRequestFileSystem?: (
      type: number,
      size: number,
      successCallback: () => void,
      errorCallback: () => void,
    ) => void;
  };
  if (/android/i.test(userAgent) && /chrome|crios/i.test(userAgent)
    && typeof chromiumWindow.webkitRequestFileSystem === 'function') {
    const available = await new Promise<boolean>((resolve) => {
      chromiumWindow.webkitRequestFileSystem?.(0, 1, () => resolve(true), () => resolve(false));
    });
    if (!available) return true;
  }

  return false;
};

export type StudentStorageSafety = {
  safe: boolean;
  reason: 'storage-unavailable' | 'likely-private-browsing' | null;
};

export const assessStudentStorageSafety = async (): Promise<StudentStorageSafety> => {
  try {
    await probeRequiredStorage();
  } catch {
    return { safe: false, reason: 'storage-unavailable' };
  }

  if (await hasStrongPrivateBrowsingSignal()) {
    return { safe: false, reason: 'likely-private-browsing' };
  }

  return { safe: true, reason: null };
};

export const getOrCreatePersistentDeviceIdentifier = async (): Promise<string> => {
  try {
    const stored = await readMetadata(DEVICE_META_KEY);
    if (typeof stored === 'string' && stored) return stored;

    const legacy = window.localStorage.getItem(LEGACY_DEVICE_KEY);
    const identifier = legacy || window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    await writeMetadata(DEVICE_META_KEY, identifier);
    if (legacy) window.localStorage.removeItem(LEGACY_DEVICE_KEY);
    return identifier;
  } catch {
    const legacy = window.localStorage.getItem(LEGACY_DEVICE_KEY);
    if (legacy) return legacy;
    const identifier = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(LEGACY_DEVICE_KEY, identifier);
    return identifier;
  }
};

type UserAgentDataLike = {
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

const platformFamily = (userAgent: string, platform: string): string => {
  const value = `${userAgent} ${platform}`.toLowerCase();
  if (value.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(value)) return 'ios';
  if (value.includes('windows')) return 'windows';
  if (value.includes('cros')) return 'chromeos';
  if (value.includes('mac')) return 'macos';
  if (value.includes('linux')) return 'linux';
  return platform.trim().toLowerCase();
};

const webGlIdentity = (): { webglVendor?: string; webglRenderer?: string } => {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!(context instanceof WebGLRenderingContext)) return {};

    const extension = context.getExtension('WEBGL_debug_renderer_info');
    if (!extension) return {};

    return {
      webglVendor: String(context.getParameter(extension.UNMASKED_VENDOR_WEBGL) || ''),
      webglRenderer: String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL) || ''),
    };
  } catch {
    return {};
  }
};

/**
 * Collects a best-effort browser fingerprint used only when the persistent UUID
 * has been lost. It is deliberately made from coarse device characteristics;
 * it is not a hardware identifier and must not replace normal authentication.
 */
export const collectDeviceFingerprint = async (): Promise<Record<string, unknown>> => {
  const userAgentData = (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData;
  let highEntropy: Record<string, unknown> = {};

  try {
    highEntropy = await userAgentData?.getHighEntropyValues?.([
      'architecture',
      'bitness',
      'model',
    ]) || {};
  } catch {
    // Client hints are optional. The remaining characteristics are sufficient
    // for the backend to decide whether enough comparable evidence exists.
  }

  const width = Math.round(window.screen?.width || 0);
  const height = Math.round(window.screen?.height || 0);
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  return {
    version: 1,
    platform: platformFamily(navigator.userAgent || '', userAgentData?.platform || navigator.platform || ''),
    model: typeof highEntropy.model === 'string' ? highEntropy.model : '',
    architecture: typeof highEntropy.architecture === 'string' ? highEntropy.architecture : '',
    bitness: typeof highEntropy.bitness === 'string' ? highEntropy.bitness : '',
    screenResolution: shortSide > 0 && longSide > 0 ? `${shortSide}x${longSide}` : '',
    pixelRatio: Number((window.devicePixelRatio || 1).toFixed(2)),
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    colorDepth: window.screen?.colorDepth || null,
    ...webGlIdentity(),
  };
};

export const requestPersistentStudentStorage = async (): Promise<boolean> => {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
};
