import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { requestPersistentStudentStorage } from '../StudentApp/studentStorage';
import { studentLoginOptionsAPI } from '../utils/api';
import { withAppBasePath } from '../utils/appBasePath';

const StudentPwaContext = createContext(null);
const DEFAULT_STUDENT_LOGIN_OPTIONS = Object.freeze({
  blockBraveForStudents: false,
  pwaEnabled: true,
  webLoginEnabled: true,
  privateBrowsingProtectionEnabled: true,
  deviceFingerprintProtectionEnabled: true,
  crossAccountDeviceProtectionEnabled: true,
  crossAccountFingerprintThreshold: 95,
  sessionCodeLength: 6,
});

const getStandalone = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const getIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export const StudentPwaProvider = ({ children }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(getStandalone);
  const [installStatus, setInstallStatus] = useState('checking');
  const [studentLoginOptions, setStudentLoginOptions] = useState(DEFAULT_STUDENT_LOGIN_OPTIONS);
  const [studentLoginOptionsStatus, setStudentLoginOptionsStatus] = useState('loading');
  const isIos = useMemo(getIos, []);

  const refreshStudentLoginOptions = useCallback(async () => {
    try {
      const response = await studentLoginOptionsAPI.get();
      const data = response?.data?.data || response?.data || {};
      const nextOptions = {
        blockBraveForStudents: data.blockBraveForStudents === true,
        pwaEnabled: data.pwaEnabled !== false,
        webLoginEnabled: data.webLoginEnabled !== false,
        privateBrowsingProtectionEnabled: data.privateBrowsingProtectionEnabled !== false,
        deviceFingerprintProtectionEnabled: data.deviceFingerprintProtectionEnabled !== false,
        crossAccountDeviceProtectionEnabled: data.crossAccountDeviceProtectionEnabled !== false,
        crossAccountFingerprintThreshold: Number(data.crossAccountFingerprintThreshold) === 80 ? 80 : 95,
        sessionCodeLength: Number(data.sessionCodeLength) === 4 ? 4 : 6,
      };

      // Keep a safe route into the student app if a malformed response is ever
      // returned while an older frontend is still running.
      setStudentLoginOptions(
        nextOptions.pwaEnabled || nextOptions.webLoginEnabled
          ? nextOptions
          : DEFAULT_STUDENT_LOGIN_OPTIONS,
      );
      setStudentLoginOptionsStatus('ready');
      return nextOptions;
    } catch (_) {
      setStudentLoginOptionsStatus('error');
      return DEFAULT_STUDENT_LOGIN_OPTIONS;
    }
  }, []);

  useEffect(() => {
    void refreshStudentLoginOptions();
  }, [refreshStudentLoginOptions]);

  useEffect(() => {
    if (!window.isSecureContext) {
      setInstallStatus('blocked-insecure');
      return undefined;
    }

    if (!('serviceWorker' in navigator)) {
      setInstallStatus(isStandalone ? 'installed' : 'blocked-unsupported');
      return undefined;
    }

    let active = true;
    navigator.serviceWorker.register(withAppBasePath('/student-service-worker.js'), {
      scope: withAppBasePath('/'),
    })
      .then((registration) => {
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .then(() => {
        if (active) {
          setInstallStatus((current) => (
            current === 'available' ? current : (getStandalone() ? 'installed' : 'instructions')
          ));
        }
      })
      .catch(() => {
        if (active) setInstallStatus('blocked-service-worker');
      });

    return () => { active = false; };
  }, [isStandalone]);

  useEffect(() => {
    const media = window.matchMedia?.('(display-mode: standalone)');
    const updateMode = () => {
      const installed = getStandalone();
      setIsStandalone(installed);
      if (installed) {
        setInstallStatus('installed');
        requestPersistentStudentStorage();
      }
    };
    const capturePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallStatus('available');
    };
    const installed = () => {
      setInstallPrompt(null);
      // Installation does not turn the current browser tab into the app. Keep
      // the gate closed until the student opens the new home-screen icon.
      setIsStandalone(getStandalone());
      setInstallStatus('installed');
      requestPersistentStudentStorage();
    };

    updateMode();
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', installed);
    media?.addEventListener?.('change', updateMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', installed);
      media?.removeEventListener?.('change', updateMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return { outcome: 'unavailable' };
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallStatus(choice.outcome === 'accepted' ? 'installing' : 'instructions');
    return choice;
  }, [installPrompt]);

  const value = useMemo(() => ({
    install,
    installStatus,
    isInstallAvailable: Boolean(installPrompt),
    isSecureContext: window.isSecureContext,
    isIos,
    isStandalone,
    refreshStudentLoginOptions,
    studentLoginOptions,
    studentLoginOptionsStatus,
  }), [
    install,
    installPrompt,
    installStatus,
    isIos,
    isStandalone,
    refreshStudentLoginOptions,
    studentLoginOptions,
    studentLoginOptionsStatus,
  ]);

  return <StudentPwaContext.Provider value={value}>{children}</StudentPwaContext.Provider>;
};

export const useStudentPwa = () => {
  const context = useContext(StudentPwaContext);
  if (!context) throw new Error('useStudentPwa must be used inside StudentPwaProvider');
  return context;
};
