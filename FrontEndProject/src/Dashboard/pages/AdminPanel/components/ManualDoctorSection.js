import React from 'react';
import { Check, LockKeyhole, UserCircle2, Users, X } from '../../../../assets/icons';
import { CustomBottom, CustomInput } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import FacultyMultiSelect from './FacultyMultiSelect';
import SectionCard from './SectionCard';
import SubjectAssignmentsBuilder from './SubjectAssignmentsBuilder';

const ManualDoctorSection = ({
  students,
  form,
  draft,
  assignments,
  error,
  onFormChange,
  onDraftChange,
  onAddAssignment,
  onRemoveAssignment,
  onToggleFaculty,
  onSubmit,
  onCancelEdit,
  isEditing = false,
  isSubmitting = false,
}) => {
  const { t } = useLanguage();

  return (
    <SectionCard
      icon={<UserCircle2 size={22} />}
      eyebrow={isEditing ? t('adminManualEditEyebrow') : t('adminManualAddEyebrow')}
      title={isEditing ? t('adminManualEditTitle') : t('adminManualAddTitle')}
    >
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="admin-doctor-fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <CustomInput
          label={t('adminDoctorNameLabel')}
          name="name"
          value={form.name}
          onChange={onFormChange}
          placeholder={t('adminDoctorNamePlaceholder')}
          icon={<Users size={16} />}
        />
        <CustomInput
          label={t('adminDoctorIdLabel')}
          name="nationalId"
          value={form.nationalId}
          onChange={onFormChange}
          placeholder={t('adminDoctorIdPlaceholder')}
          icon={<UserCircle2 size={16} />}
        />
        <CustomInput
          label={isEditing ? t('adminDoctorPasswordEditLabel') : t('adminDoctorPasswordLabel')}
          name="password"
          type="password"
          value={form.password}
          onChange={onFormChange}
          placeholder={isEditing ? t('adminDoctorPasswordEditPlaceholder') : t('adminDoctorPasswordPlaceholder')}
          icon={<LockKeyhole size={16} />}
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: 'var(--text-muted)',
          }}
        >
          {t('adminDoctorFacultiesLabel')}
        </label>
        <FacultyMultiSelect
          value={form.faculties}
          onToggle={onToggleFaculty}
          t={t}
        />
      </div>

      <SubjectAssignmentsBuilder
        students={students}
        draft={draft}
        assignments={assignments}
        onDraftChange={onDraftChange}
        onAddAssignment={onAddAssignment}
        onRemoveAssignment={onRemoveAssignment}
        addButtonText={t('adminQueueSubject')}
        showFacultySelect={false}
        facultyScope={form.faculties}
      />

      {error ? <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f87171' }}>{error}</div> : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', maxWidth: isEditing ? 'none' : 260 }}>
          <CustomBottom
            text={isEditing ? t('adminUpdateDoctor') : t('adminCreateDoctor')}
            onClick={onSubmit}
            rigthIcon={<Check size={16} />}
            loading={isSubmitting}
          />
        </div>
        {isEditing ? (
          <div style={{ flex: '1 1 160px' }}>
            <CustomBottom
              text={t('adminCancelDoctorEdit')}
              onClick={onCancelEdit}
              rigthIcon={<X size={16} />}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
              disabled={isSubmitting}
            />
          </div>
        ) : null}
      </div>
    </div>
  </SectionCard>
  );
};

export default ManualDoctorSection;
