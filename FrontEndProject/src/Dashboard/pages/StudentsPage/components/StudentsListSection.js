import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Search, Users } from '../../../../assets/icons';
import { CustomBottom, CustomInput, Loading, Pagination } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import { avatarGradient } from '../../AdminPanel/utils/adminPanelUtils';
import SectionCard from './SectionCard';

const StudentsListSection = ({
  students,
  totalStudents,
  allStudentsCount,
  isLoading = false,
  search,
  currentTermOnly = false,
  onCurrentTermOnlyChange,
  currentPage,
  totalPages,
  pageSize,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onEditStudent,
  onDeleteStudent,
  canEditStudents,
  canDeleteStudents,
}) => {
  const { t } = useLanguage();
  const [expandedStudentIds, setExpandedStudentIds] = useState({});

  useEffect(() => {
    setExpandedStudentIds({});
  }, [students]);

  const toggleStudentExpanded = (studentId) => {
    setExpandedStudentIds((current) => ({
      ...current,
      [studentId]: !current[studentId],
    }));
  };

  return (
    <SectionCard
      icon={<Users size={22} />}
      eyebrow={t('studentsRegistryEyebrow')}
      title={t('studentsRegistryTitle')}
    >
    <div style={{ display: 'grid', gap: 18 }}>
      <div
        className="students-list-summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) repeat(2, minmax(140px, 180px))',
          gap: 14,
          alignItems: 'end',
        }}
      >
        <CustomInput
          label={t('searchLabel')}
          name="students-search"
          value={search}
          onChange={onSearchChange}
          placeholder={t('studentsSearchPlaceholder')}
          icon={<Search size={16} />}
        />

        <div
          style={{
            minHeight: 88,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('studentsTotalStudents')}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginTop: 6 }}>{allStudentsCount}</div>
        </div>

        <div
          style={{
            minHeight: 88,
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('studentsFilteredResults')}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginTop: 6 }}>{totalStudents}</div>
        </div>
      </div>

      <label
        htmlFor="students-current-term-only"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
          borderRadius: 18, cursor: 'pointer',
          border: currentTermOnly ? '1px solid rgba(16,185,129,0.45)' : '1px solid var(--border)',
          background: currentTermOnly ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(8,145,178,0.06))' : 'var(--bg-dark)',
          transition: 'background 180ms ease, border-color 180ms ease',
        }}
      >
        <input
          id="students-current-term-only"
          type="checkbox"
          checked={currentTermOnly}
          onChange={onCurrentTermOnlyChange}
          aria-describedby="students-current-term-hint"
          style={{ width: 21, height: 21, margin: 0, flexShrink: 0, accentColor: '#059669', cursor: 'pointer' }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500"
        />
        <span style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>{t('studentsCurrentTermOnly')}</span>
          <span id="students-current-term-hint" style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{t('studentsCurrentTermOnlyHint')}</span>
        </span>
      </label>

      {isLoading ? (
        <div
          style={{
            borderRadius: 20,
            border: '1px dashed var(--border)',
            padding: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loading />
        </div>
      ) : students.length === 0 ? (
        <div
          style={{
            borderRadius: 20,
            border: '1px dashed var(--border)',
            padding: 28,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          {t('studentsNoSearchResults')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {students.map((student, index) => (
            <div
              key={student.id}
              className="students-record-card"
              style={{
                borderRadius: 22,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
              }}
            >
              {(() => {
                const isExpanded = Boolean(expandedStudentIds[student.id]);

                return (
                  <>
                    <div
                      style={{
                        padding: 18,
                        display: 'grid',
                        gap: 16,
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      }}
                    >
              <div className="students-record-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div className="students-record-identity" style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 18,
                      background: avatarGradient(index),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {student.avatar}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{student.name}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {student.studentId ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', borderRadius: 999, padding: '4px 10px' }}>
                          {t('studentsStudentIdTag')}: {student.studentId}
                        </span>
                      ) : null}
                      {student.nationalId ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', borderRadius: 999, padding: '4px 10px' }}>
                          {t('studentsNationalIdTag')}: {student.nationalId}
                        </span>
                      ) : null}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'rgba(52,211,153,0.12)', borderRadius: 999, padding: '4px 10px' }}>
                        {student.college || t('studentsNoCollege')}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStudentExpanded(student.id)}
                        title={isExpanded ? t('studentsHideSubjects') : t('studentsShowSubjects')}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-primary)',
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {isExpanded ? t('studentsHideSubjects') : t('studentsShowSubjects')}
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-secondary)' }}>
                          ({student.registrations.length})
                        </span>
                        <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                          <ChevronDown size={14} />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="students-record-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ width: 90 }}>
                    <CustomBottom
                      text={t('studentsEditButton')}
                      onClick={() => onEditStudent(student)}
                      disabled={!canEditStudents}
                      minHeight={40}
                      background="rgba(96,165,250,0.12)"
                      textColor="#93c5fd"
                      border="1px solid rgba(96,165,250,0.24)"
                      boxShadow="none"
                      disabledOpacity={0.56}
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <CustomBottom
                      text={t('studentsDeleteButton')}
                      onClick={() => onDeleteStudent(student)}
                      disabled={!canDeleteStudents}
                      minHeight={40}
                      background="rgba(239,68,68,0.12)"
                      textColor="#f87171"
                      border="1px solid rgba(239,68,68,0.24)"
                      boxShadow="none"
                      disabledOpacity={0.56}
                    />
                  </div>
                </div>
              </div>

                    </div>

                    {isExpanded ? (
                      <div style={{ padding: 18 }}>
                        {student.registrations.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('studentsNoRegistrations')}</div>
                        ) : (
                          <div
                            className="students-record-registrations"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                              gap: 12,
                            }}
                          >
                            {student.registrations.map((registration) => (
                              <div
                                key={`${student.id}-${registration.subjectCode}-${registration.group}-${registration.type}`}
                                style={{
                                  borderRadius: 18,
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '14px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{registration.subjectCode}</div>
                                  {registration.subjectName ? (
                                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-secondary)' }}>{registration.subjectName}</div>
                                  ) : null}
                                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                    {t(`studentsTypeOption${registration.type}`)} • {t('studentsGroupWord')} {registration.group}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 12,
                                    background: 'rgba(52,211,153,0.12)',
                                    color: 'var(--accent)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Check size={16} />
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
    </SectionCard>
  );
};

export default StudentsListSection;
