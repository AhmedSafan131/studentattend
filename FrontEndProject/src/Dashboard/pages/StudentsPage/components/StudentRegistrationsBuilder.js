import React, { useMemo } from 'react';
import { BookOpen, Check, Users, X } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import {
  getGroupOptionsForSubject,
  getSubjectOptionsForCollege,
  getTypeOptionsForSubject,
} from '../utils/studentUtils';

const StudentRegistrationsBuilder = ({
  college,
  students,
  catalogSubjects = [],
  isLoadingSubjects = false,
  draft,
  registrations,
  editingRegistrationIndex,
  onDraftChange,
  onAddRegistration,
  onRemoveRegistration,
  onEditRegistration,
  onCancelEdit,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const subjectOptions = useMemo(
    () => getSubjectOptionsForCollege(college, students, catalogSubjects),
    [catalogSubjects, college, students],
  );
  const groupOptions = useMemo(
    () => getGroupOptionsForSubject(draft.subjectCode, students, college, draft.type, catalogSubjects),
    [catalogSubjects, college, draft.subjectCode, draft.type, students],
  );
  const typeOptions = useMemo(
    () => getTypeOptionsForSubject(draft.subjectCode, students, college, catalogSubjects).map((option) => ({
      ...option,
      label: t(`studentsTypeOption${option.value}`),
    })),
    [catalogSubjects, college, draft.subjectCode, students, t],
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gap: 14,
        }}
      >
        <div style={{ width: '100%' }}>
          <CustomDropdown
            label={t('studentsSubjectCodeLabel')}
            name="subjectCode"
            value={draft.subjectCode}
            onChange={onDraftChange}
            options={subjectOptions}
            placeholder={college ? t('studentsSubjectCodePlaceholder') : t('studentsChooseCollegeFirst')}
            disabled={disabled || !college}
            icon={<BookOpen size={16} />}
            searchable
            searchPlaceholder={t('studentsSubjectSearchPlaceholder')}
            emptyMessage={t('studentsNoSubjectOptions')}
            loading={isLoadingSubjects}
            loadingText={t('loadingLabel')}
          />
        </div>

        <div
          className="students-registration-fields"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            alignItems: 'end',
          }}
        >
          <CustomDropdown
            label={t('studentsTypeLabel')}
            name="type"
            value={draft.type}
            onChange={onDraftChange}
            options={typeOptions}
            placeholder={draft.subjectCode ? t('studentsTypePlaceholder') : t('studentsChooseSubjectFirst')}
            disabled={disabled || !draft.subjectCode}
          />

          <CustomDropdown
            label={t('studentsGroupLabel')}
            name="group"
            value={draft.group}
            onChange={onDraftChange}
            options={groupOptions}
            placeholder={draft.type ? t('studentsGroupPlaceholder') : t('studentsChooseTypeFirst')}
            disabled={disabled || !draft.subjectCode || !draft.type}
            icon={<Users size={16} />}
          />

          <div>
            <CustomBottom
              text={editingRegistrationIndex === null ? t('studentsAddSubject') : t('studentsUpdateSubject')}
              onClick={onAddRegistration}
              minHeight={56}
              rigthIcon={<Check size={16} />}
              disabled={disabled}
            />
          </div>
        </div>

        {editingRegistrationIndex !== null ? (
          <div style={{ maxWidth: 220 }}>
            <CustomBottom
              text={t('studentsCancelSubjectEdit')}
              onClick={onCancelEdit}
              minHeight={50}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
              disabled={disabled}
            />
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('studentsRegisteredSubjects')} ({registrations.length})
        </div>

        {registrations.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: '1px dashed var(--border)',
              padding: '18px 16px',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            {t('studentsNoRegistrations')}
          </div>
        ) : registrations.map((registration, index) => (
          <div
            key={`${registration.subjectCode}-${registration.group}-${registration.type}-${index}`}
            className="students-registration-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 18,
              border: editingRegistrationIndex === index ? '1px solid rgba(52,211,153,0.36)' : '1px solid var(--border)',
              background: editingRegistrationIndex === index ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
            }}
          >
            <button
              type="button"
              onClick={() => onEditRegistration(index)}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'block',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: 'inherit',
              }}
              disabled={disabled}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
                {registration.subjectName || registration.subjectCode}
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {t(`studentsTypeOption${registration.type}`)} • {t('studentsGroupWord')} {registration.group}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onRemoveRegistration(index)}
              title={t('studentsRemoveRegistration')}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.28)',
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
              disabled={disabled}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentRegistrationsBuilder;
