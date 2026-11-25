import React, { useMemo } from 'react';
import { Building2, Check, X } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { CLASS_TYPE_OPTIONS, FACULTY_OPTIONS, getSubjectOptions, getTeachingFacultyIds } from '../utils/adminPanelUtils';

const SubjectAssignmentsBuilder = ({
  students,
  draft,
  assignments,
  onDraftChange,
  onAddAssignment,
  onRemoveAssignment,
  addButtonText,
  showFacultySelect = true,
  facultyScope = '',
}) => {
  const { t } = useLanguage();
  const subjectOptions = useMemo(
    () => getSubjectOptions(showFacultySelect ? draft.faculty : facultyScope, students),
    [draft.faculty, facultyScope, showFacultySelect, students],
  );
  const facultyOptions = useMemo(
    () => FACULTY_OPTIONS.map((option) => ({
      ...option,
      label: t(option.labelKey),
    })),
    [t],
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        className="admin-assignment-primary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: showFacultySelect ? 'minmax(180px, 0.85fr) minmax(260px, 1.15fr)' : '1fr',
          gap: 14,
          alignItems: 'end',
        }}
      >
        {showFacultySelect ? (
          <CustomDropdown
            label={t('adminFacultyLabel')}
            name="faculty"
            value={draft.faculty}
            onChange={onDraftChange}
            options={facultyOptions}
            placeholder={t('adminFacultyPlaceholder')}
            icon={<Building2 size={16} />}
          />
        ) : null}

        <CustomDropdown
          label={t('adminDoctorSpecialtyLabel')}
          name="subjectKey"
          value={draft.subjectKey}
          onChange={onDraftChange}
          options={subjectOptions}
          placeholder={t('adminDoctorSpecialtyPlaceholder')}
          disabled={showFacultySelect ? !draft.faculty : !Array.isArray(facultyScope) || facultyScope.length === 0}
          searchable
          searchPlaceholder={t('adminDoctorSpecialtyPlaceholder')}
          emptyMessage="No subjects found."
          getSearchText={(option) => `${option.courseCode} ${option.courseName} ${option.label} ${option.collegeName}`}
          icon={<Building2 size={16} />}
        />
      </div>

      <div
        className="admin-assignment-action-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 220px)',
          gap: 14,
          alignItems: 'end',
        }}
      >
        <CustomDropdown
          label={t('adminTypeLabel')}
          name="type"
          value={draft.type}
          onChange={onDraftChange}
          options={CLASS_TYPE_OPTIONS}
          placeholder={t('adminTypePlaceholder')}
          icon={<Check size={16} />}
        />

        <div>
          <CustomBottom
            text={addButtonText}
            onClick={onAddAssignment}
            minHeight={56}
            rigthIcon={<Check size={16} />}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('adminPendingSubjectsLabel')} ({assignments.length})
        </div>

        {assignments.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: '1px dashed var(--border)',
              padding: '18px 16px',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            {t('adminNoPendingSubjects')}
          </div>
        ) : assignments.map((assignment, index) => (
          <div
            key={`${assignment.id}-${assignment.type}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'space-between',
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              padding: '14px 16px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{assignment.id}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', background: 'rgba(99,102,241,0.12)', borderRadius: 999, padding: '4px 10px' }}>
                  {assignment.type}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{assignment.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                {getTeachingFacultyIds([assignment]).map((facultyId) => t(`faculty_${facultyId}`)).join('، ') || assignment.faculty || '—'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemoveAssignment(index)}
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
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title={t('adminRemovePendingSubject')}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectAssignmentsBuilder;
