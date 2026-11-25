import React, { useEffect, useState } from 'react';
import { Check, Clock3, LockKeyhole } from '../../../../assets/icons';
import { ConfirmationDialog } from '../../../../components';
import { useAuth } from '../../../../hooks';
import { useLanguage } from '../../../../i18n';
import { authAPI } from '../../../../utils/api';

const getRemainingSeconds = (expiresAt) => {
  const expiresAtMs = Date.parse(expiresAt || '');
  return Number.isFinite(expiresAtMs) ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)) : 0;
};

const formatRemaining = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const getStoredAccessCode = (storageKey) => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');

    if (!saved?.code || !saved?.expiresAt || getRemainingSeconds(saved.expiresAt) === 0) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return saved;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

const StaffAccessCodeCard = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const storageKey = user?.id ? `studentattend.staff-access-code.${user.id}` : '';

  useEffect(() => {
    if (!storageKey) return undefined;

    let isCurrent = true;
    const savedAccessCode = getStoredAccessCode(storageKey);

    if (!savedAccessCode) return undefined;

    const restoreAccessCode = async () => {
      try {
        const response = await authAPI.getStaffAccessCodeStatus();
        const expiresAtFromServer = response?.data?.data?.expiresAt || response?.data?.expiresAt || '';
        const sameExpiry = Math.floor(Date.parse(expiresAtFromServer) / 1000) === Math.floor(Date.parse(savedAccessCode.expiresAt) / 1000);

        if (!isCurrent) return;

        if (expiresAtFromServer && sameExpiry && getRemainingSeconds(expiresAtFromServer) > 0) {
          setCode(savedAccessCode.code);
          setExpiresAt(expiresAtFromServer);
          return;
        }

        window.localStorage.removeItem(storageKey);
      } catch {
        // Keep the locally saved code when connectivity is temporarily unavailable.
        if (isCurrent) {
          setCode(savedAccessCode.code);
          setExpiresAt(savedAccessCode.expiresAt);
        }
      }
    };

    restoreAccessCode();

    return () => {
      isCurrent = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!expiresAt) return undefined;

    const updateRemaining = () => {
      const nextRemaining = getRemainingSeconds(expiresAt);
      setRemaining(nextRemaining);

      if (nextRemaining === 0) {
        setCode('');
        setExpiresAt('');
        if (storageKey) window.localStorage.removeItem(storageKey);
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, storageKey]);

  const generateCode = async () => {
    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const response = await authAPI.createStaffAccessCode();
      const payload = response?.data?.data || response?.data || {};
      const nextCode = String(payload.code || '');
      const nextExpiresAt = payload.expiresAt || '';

      setCode(nextCode);
      setExpiresAt(nextExpiresAt);

      if (storageKey && nextCode && nextExpiresAt) {
        window.localStorage.setItem(storageKey, JSON.stringify({ code: nextCode, expiresAt: nextExpiresAt }));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || (lang === 'ar'
        ? '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 \u0627\u0644\u062f\u062e\u0648\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'
        : 'Could not create an access code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!code || remaining === 0 || !navigator.clipboard) return;

    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  const revokeCode = async () => {
    setRevoking(true);
    setError('');

    try {
      await authAPI.revokeStaffAccessCode();
      setCode('');
      setExpiresAt('');
      setRemaining(0);
      setCopied(false);
      if (storageKey) window.localStorage.removeItem(storageKey);
      setShowRevokeConfirm(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || (lang === 'ar'
        ? '\u062a\u0639\u0630\u0631 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0624\u0642\u062a. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'
        : 'Could not end the temporary access. Please try again.'));
    } finally {
      setRevoking(false);
    }
  };

  const isActive = Boolean(code) && remaining > 0;

  return (
    <section className="staff-access-code-panel tw-card mb-5 overflow-hidden p-5 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent/35 bg-accent/10 text-accent"><LockKeyhole size={22} /></div>
          <div>
            <h2 className="font-bold text-text-primary">{lang === 'ar' ? '\u0631\u0645\u0632 \u062f\u062e\u0648\u0644 \u0645\u0624\u0642\u062a' : 'Temporary sign-in code'}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{lang === 'ar' ? '\u0623\u0646\u0634\u0626 \u0631\u0645\u0632\u064b\u0627 \u0631\u0642\u0645\u064a\u064b\u0627 \u0645\u0646 4 \u0623\u0631\u0642\u0627\u0645 \u0644\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644 \u062c\u062f\u064a\u062f \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u0643 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0628\u0631\u064a\u062f\u0643. \u0627\u0644\u0631\u0645\u0632 \u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 10 \u062f\u0642\u0627\u0626\u0642.' : 'Create a four-digit code for a new sign-in to your account using your email. The code remains valid for 10 minutes.'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isActive ? <div className="rounded-2xl border border-accent/30 bg-surface/70 px-4 py-3 text-center"><span className="block text-xs font-semibold text-text-secondary">{lang === 'ar' ? '\u0627\u0644\u0631\u0645\u0632' : 'Code'}</span><strong dir="ltr" className="mt-1 block font-mono text-3xl tracking-[0.28em] text-accent">{code}</strong></div> : null}
          {isActive ? <div className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-center"><span className="flex items-center justify-center gap-1 text-xs font-semibold text-text-secondary"><Clock3 size={13} />{lang === 'ar' ? '\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a' : 'Time left'}</span><strong dir="ltr" className="mt-1 block font-mono text-xl text-text-primary">{formatRemaining(remaining)}</strong></div> : null}
          {isActive ? <button type="button" onClick={copyCode} className="min-h-[48px] rounded-2xl border border-border bg-surface px-4 text-sm font-bold text-text-primary transition hover:border-accent/45 hover:text-accent">{copied ? <span className="flex items-center gap-2"><Check size={16} />{lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : 'Copied'}</span> : (lang === 'ar' ? '\u0646\u0633\u062e \u0627\u0644\u0631\u0645\u0632' : 'Copy code')}</button> : null}
          {isActive ? <button type="button" onClick={() => setShowRevokeConfirm(true)} className="staff-access-revoke min-h-[48px] rounded-2xl border border-red-400/35 bg-red-500/10 px-4 text-sm font-bold text-red-300 transition hover:bg-red-500/20">{lang === 'ar' ? '\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0631\u0645\u0632' : 'End code'}</button> : null}
          <button type="button" onClick={generateCode} disabled={loading} className="min-h-[48px] rounded-2xl border border-emerald-300/45 bg-[linear-gradient(135deg,#047857,#10b981)] px-5 text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(5,150,105,.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">{loading ? (lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...' : 'Creating...') : (isActive ? (lang === 'ar' ? '\u062a\u062c\u062f\u064a\u062f \u0627\u0644\u0631\u0645\u0632' : 'Generate new code') : (lang === 'ar' ? '\u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632' : 'Generate code'))}</button>
        </div>
      </div>
      {error ? <p className="staff-access-error mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">{error}</p> : null}
      <ConfirmationDialog
        isOpen={showRevokeConfirm}
        onClose={() => !revoking && setShowRevokeConfirm(false)}
        onConfirm={revokeCode}
        title={lang === 'ar' ? '\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u0624\u0642\u062a\u061f' : 'End temporary access?'}
        message={lang === 'ar' ? '\u0633\u064a\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0631\u0645\u0632 \u0648\u062a\u0633\u062c\u064a\u0644 \u062e\u0631\u0648\u062c \u0643\u0644 \u0645\u0646 \u062f\u062e\u0644 \u0628\u0647 \u0641\u0648\u0631\u064b\u0627.' : 'This will revoke the code and sign out every session that used it immediately.'}
        confirmText={lang === 'ar' ? '\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0648\u0635\u0648\u0644' : 'End access'}
        cancelText={lang === 'ar' ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
        loading={revoking}
        loadingText={lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u064a\u0642\u0627\u0641...' : 'Ending...'}
      />
    </section>
  );
};

export default StaffAccessCodeCard;
