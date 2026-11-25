import React from 'react';
import { Building2, Check, Shield, UserCircle2, Users, X } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown, CustomInput } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { COLLEGE_OPTIONS } from '../utils/studentUtils';
import SectionCard from './SectionCard';
import StudentRegistrationsBuilder from './StudentRegistrationsBuilder';

const StudentFormSection = ({
  form,
  students,
  catalogSubjects,
  isLoadingSubjects,
  registrationDraft,
  registrations,
  editingRegistrationIndex,
  formError,
  isEditing,
  isSaving,
  canEditStudents,
  allowedColleges,
  onFormChange,
  onRegistrationDraftChange,
  onAddRegistration,
  onRemoveRegistration,
  onEditRegistration,
  onCancelRegistrationEdit,
  onSubmit,
  onCancelEdit,
}) => {
  const { t } = useLanguage();
  const editorDisabled = !canEditStudents || isSaving;
  const collegeOptions = allowedColleges?.length
    ? COLLEGE_OPTIONS.filter((option) => allowedColleges.includes(option.value))
    : COLLEGE_OPTIONS;
  const translatedCollegeOptions = collegeOptions.map((option) => ({
    ...option,
    label: t(option.labelKey),
  }));

  return (
    <SectionCard
      icon={<UserCircle2 size={22} />}
      eyebrow={isEditing ? t('studentsEditEyebrow') : t('studentsEditorEyebrow')}
      title={isEditing ? t('studentsEditTitle') : t('studentsCreateTitle')}
    >
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="students-form-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <CustomInput
          label={t('studentsFullNameLabel')}
          name="name"
          value={form.name}
          onChange={onFormChange}
          placeholder={t('studentsFullNamePlaceholder')}
          icon={<Users size={16} />}
          disabled={editorDisabled}
        />
        <CustomInput
          label={t('studentsStudentIdLabel')}
          name="studentId"
          value={form.studentId}
          onChange={onFormChange}
          placeholder={t('studentsStudentIdPlaceholder')}
          icon={<UserCircle2 size={16} />}
          disabled={editorDisabled}
        />
        <CustomInput
          label={t('studentsNationalIdLabel')}
          name="nationalId"
          value={form.nationalId}
          onChange={onFormChange}
          placeholder={t('studentsNationalIdPlaceholder')}
          icon={<Shield size={16} />}
          disabled={editorDisabled}
        />
      </div>

      <div style={{ width: '100%' }}>
        <CustomDropdown
          label={t('studentsCollegeLabel')}
          name="college"
          value={form.college}
          onChange={onFormChange}
          options={translatedCollegeOptions}
          placeholder={t('studentsCollegePlaceholder')}
          icon={<Building2 size={16} />}
          disabled={editorDisabled}
        />
      </div>

      <StudentRegistrationsBuilder
        college={form.college}
        students={students}
        catalogSubjects={catalogSubjects}
        isLoadingSubjects={isLoadingSubjects}
        draft={registrationDraft}
        registrations={registrations}
        editingRegistrationIndex={editingRegistrationIndex}
        onDraftChange={onRegistrationDraftChange}
        onAddRegistration={onAddRegistration}
        onRemoveRegistration={onRemoveRegistration}
        onEditRegistration={onEditRegistration}
        onCancelEdit={onCancelRegistrationEdit}
        disabled={editorDisabled}
      />

      {formError ? (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>{formError}</div>
      ) : !canEditStudents ? (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)' }}>
          Student editing is disabled for your current role.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 190px' }}>
          <CustomBottom
            text={isEditing ? t('studentsSaveChanges') : t('studentsCreateButton')}
            onClick={onSubmit}
            loading={isSaving}
            loadingText={t('studentsSaving')}
            rigthIcon={<Check size={16} />}
            disabled={editorDisabled}
          />
        </div>
        {isEditing ? (
          <div style={{ flex: '1 1 160px' }}>
            <CustomBottom
              text={t('studentsCancelEdit')}
              onClick={onCancelEdit}
              rigthIcon={<X size={16} />}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
              disabled={isSaving}
            />
          </div>
        ) : null}
      </div>
    </div>
    </SectionCard>
  );
};

export default StudentFormSection;
