import React, { useEffect, useState } from 'react';
import { Check } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useStudentPwa } from '../../../../pwa';
import { studentLoginOptionsAPI } from '../../../../utils/api';

const SessionCodeLengthSettings = ({ t, showToast }) => {
  const { refreshStudentLoginOptions, studentLoginOptions, studentLoginOptionsStatus } = useStudentPwa();
  const [sessionCodeLength, setSessionCodeLength] = useState(6);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSessionCodeLength(Number(studentLoginOptions.sessionCodeLength) === 4 ? 4 : 6);
  }, [studentLoginOptions]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      await studentLoginOptionsAPI.update({ ...studentLoginOptions, sessionCodeLength });
      await refreshStudentLoginOptions();
      showToast({
        tone: 'success',
        title: t('settingsUpdateSuccessTitle'),
        message: t('settingsSessionCodeSaved'),
      });
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError?.message || t('settingsSessionCodeSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6 }}>
        {t('settingsSessionCodeLengthHint')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 240px)', gap: 12, alignItems: 'end' }}>
        <CustomDropdown
          label={t('settingsSessionCodeLength')}
          name="sessionCodeLength"
          value={sessionCodeLength}
          onChange={(event) => setSessionCodeLength(Number(event.target.value))}
          options={[
            { value: 4, label: t('settingsSessionCodeFourDigits') },
            { value: 6, label: t('settingsSessionCodeSixDigits') },
          ]}
          disabled={isSaving || studentLoginOptionsStatus === 'loading'}
        />
        <CustomBottom
          text={t('settingsSessionCodeSave')}
          onClick={handleSave}
          loading={isSaving}
          loadingText={t('settingsSaving')}
          rigthIcon={<Check size={16} />}
          disabled={studentLoginOptionsStatus === 'loading'}
        />
      </div>
      {studentLoginOptionsStatus === 'error' ? (
        <div className="signin-pro-error">{t('settingsStudentAccessLoadError')}</div>
      ) : null}
      {error ? <div className="signin-pro-error">{error}</div> : null}
    </div>
  );
};

export default SessionCodeLengthSettings;
