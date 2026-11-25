import React, { useEffect, useState } from 'react';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useStudentPwa } from '../../../../pwa';
import { studentLoginOptionsAPI } from '../../../../utils/api';
import PermissionSwitch from './PermissionSwitch';

const StudentLoginSettings = ({ cardStyle, t, showToast }) => {
  const {
    refreshStudentLoginOptions,
    studentLoginOptions,
    studentLoginOptionsStatus,
  } = useStudentPwa();
  const [draft, setDraft] = useState(studentLoginOptions);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(studentLoginOptions);
  }, [studentLoginOptions]);

  const options = [
    { key: 'blockBraveForStudents', title: t('settingsStudentBraveTitle'), description: t('settingsStudentBraveDescription') },
    {
      key: 'pwaEnabled',
      title: t('settingsStudentPwaTitle'),
      description: t('settingsStudentPwaDescription'),
    },
    {
      key: 'webLoginEnabled',
      title: t('settingsStudentWebLoginTitle'),
      description: t('settingsStudentWebLoginDescription'),
    },
    {
      key: 'privateBrowsingProtectionEnabled',
      title: t('settingsStudentPrivateBrowsingTitle'),
      description: t('settingsStudentPrivateBrowsingDescription'),
    },
    {
      key: 'deviceFingerprintProtectionEnabled',
      title: t('settingsStudentDeviceFingerprintTitle'),
      description: t('settingsStudentDeviceFingerprintDescription'),
    },
    {
      key: 'crossAccountDeviceProtectionEnabled',
      title: t('settingsStudentCrossAccountDeviceTitle'),
      description: t('settingsStudentCrossAccountDeviceDescription'),
    },
  ];

  const handleToggle = (key) => {
    setDraft((current) => {
      const next = { ...current, [key]: !current[key] };
      if (!next.pwaEnabled && !next.webLoginEnabled) {
        setError(t('settingsStudentAccessRequired'));
        return current;
      }

      setError('');
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      await studentLoginOptionsAPI.update(draft);
      await refreshStudentLoginOptions();
      showToast({
        tone: 'success',
        title: t('settingsUpdateSuccessTitle'),
        message: t('settingsStudentAccessSaved'),
      });
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError?.message || t('settingsStudentAccessSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section style={{ ...cardStyle, padding: 24, display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gap: 7 }}>
        <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {t('settingsStudentAccessEyebrow')}
        </span>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 22 }}>
          {t('settingsStudentAccessTitle')}
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 760 }}>
          {t('settingsStudentAccessDescription')}
        </p>
      </div>

      {studentLoginOptionsStatus === 'error' ? (
        <div className="signin-pro-error">{t('settingsStudentAccessLoadError')}</div>
      ) : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {options.map((item) => (
          <PermissionSwitch
            key={item.key}
            item={item}
            enabled={Boolean(draft[item.key])}
            onToggle={handleToggle}
            disabled={isSaving || studentLoginOptionsStatus === 'loading'}
          />
        ))}
      </div>

      {draft.deviceFingerprintProtectionEnabled && draft.crossAccountDeviceProtectionEnabled ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
          <CustomDropdown
            id="student-cross-account-fingerprint-threshold"
            name="crossAccountFingerprintThreshold"
            label={t('settingsStudentFingerprintThresholdTitle')}
            value={Number(draft.crossAccountFingerprintThreshold) === 80 ? 80 : 95}
            onChange={(event) => setDraft((current) => ({
              ...current,
              crossAccountFingerprintThreshold: Number(event.target.value) === 80 ? 80 : 95,
            }))}
            options={[
              { value: 95, label: t('settingsStudentFingerprintThreshold95') },
              { value: 80, label: t('settingsStudentFingerprintThreshold80') },
            ]}
            disabled={isSaving || studentLoginOptionsStatus === 'loading'}
          />
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>
            {t('settingsStudentFingerprintThresholdDescription')}
          </p>
        </div>
      ) : null}

      <div style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
        {t('settingsStudentAccessSafetyHint')}
      </div>

      {error ? <div className="signin-pro-error">{error}</div> : null}

      <div style={{ width: 'min(100%, 280px)' }}>
        <CustomBottom
          type="button"
          text={t('settingsStudentAccessSave')}
          loading={isSaving}
          loadingText={t('settingsSaving')}
          disabled={isSaving || studentLoginOptionsStatus === 'loading'}
          onClick={handleSave}
        />
      </div>
    </section>
  );
};

export default StudentLoginSettings;
