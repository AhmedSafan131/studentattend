import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from '../context';
import ToastViewport from '../components/ToastViewport';

const DEFAULT_TOAST_DURATION = 3200;

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((toastId) => {
    const timer = timersRef.current.get(toastId);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(toastId);
    }

    setToasts((previous) => previous.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((config) => {
    const id = config.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = config.duration ?? DEFAULT_TOAST_DURATION;

    const nextToast = {
      id,
      tone: config.tone || 'success',
      title: config.title || 'Done',
      message: config.message || '',
      icon: config.icon,
    };

    setToasts((previous) => [...previous, nextToast]);

    if (duration > 0 && typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const value = useMemo(() => ({
    toasts,
    showToast,
    removeToast,
    clearToasts,
  }), [clearToasts, removeToast, showToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
