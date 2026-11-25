import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Search, UserCircle2, X } from '../../../../assets/icons';
import { CustomInput, Loading, Pagination } from '../../../../components';
import { useLanguage } from '../../../../i18n';
import SectionCard from './SectionCard';
import { avatarGradient, getDoctorCourseCountLabel, getTeachingFacultyIds } from '../utils/adminPanelUtils';

const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];
const DEFAULT_PAGE_SIZE = 5;

const DoctorsDirectory = ({ doctors, isLoading = false, onEditDoctor, onRemoveDoctor, onRemoveAssignment }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedDoctorIds, setExpandedDoctorIds] = useState({});

  const filteredDoctors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return doctors;
    }

    return doctors.filter((doctor) => {
      const baseMatch = [doctor.name, doctor.email, doctor.specialty]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const courseMatch = doctor.courses.some((course) => (
        String(course.id || '').toLowerCase().includes(normalizedSearch) ||
        String(course.name || '').toLowerCase().includes(normalizedSearch)
      ));

      const facultyMatch = getTeachingFacultyIds(doctor.courses).some((facultyId) => (
        t(`faculty_${facultyId}`).toLowerCase().includes(normalizedSearch)
        || facultyId.includes(normalizedSearch)
      ));
      return baseMatch || courseMatch || facultyMatch;
    });
  }, [doctors, search, t]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDoctors.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredDoctors, pageSize]);

  const toggleDoctorExpanded = (doctorId) => {
    setExpandedDoctorIds((current) => ({
      ...current,
      [doctorId]: !current[doctorId],
    }));
  };

  return (
    <SectionCard
      icon={<UserCircle2 size={22} />}
      eyebrow={t('adminDirectoryEyebrow')}
      title={t('adminDirectoryTitle')}
      description={t('adminDirectoryDescription')}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            width: 'fit-content',
            padding: '12px 16px',
            borderRadius: 18,
            border: '1px solid rgba(52,211,153,0.18)',
            background: 'rgba(52,211,153,0.08)',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {t('adminTotalDoctorsLabel')}
          </span>
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
            {doctors.length}
          </span>
        </div>

        <CustomInput
          label={t('adminDoctorSearchLabel')}
          name="doctor-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('adminDoctorSearchPlaceholder')}
          icon={<Search size={16} />}
        />

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
        ) : doctors.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              border: '1px dashed var(--border)',
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            {t('adminNoDoctorsAvailable')}
          </div>
        ) : (
          <>
            {filteredDoctors.length === 0 ? (
              <div
                style={{
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '14px 16px',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                }}
              >
                {t('adminDoctorSearchEmpty')}
              </div>
            ) : null}

            {paginatedDoctors.map((doctor, index) => {
              const isExpanded = Boolean(expandedDoctorIds[doctor.id]);

              return (
                <div
                  key={doctor.id}
                  className="admin-doctor-card"
                  style={{
                    borderRadius: 22,
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="admin-doctor-card-header"
                    style={{
                      padding: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 14,
                      flexWrap: 'wrap',
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div className="admin-doctor-identity" style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 18,
                          background: avatarGradient(((currentPage - 1) * pageSize) + index),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 15,
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {doctor.avatar}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{doctor.name}</div>
                        <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-secondary)' }}>{doctor.email}</div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('adminTeachingFaculties')}:</span>
                          {getTeachingFacultyIds(doctor.courses).map((facultyId) => (
                            <span key={facultyId} style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 999, padding: '4px 10px' }}>
                              {t(`faculty_${facultyId}`)}
                            </span>
                          ))}
                          {!getTeachingFacultyIds(doctor.courses).length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', background: 'rgba(99,102,241,0.12)', borderRadius: 999, padding: '4px 10px' }}>
                            {getDoctorCourseCountLabel(doctor)}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '4px 10px' }}>
                            {doctor.specialty || '--'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDoctorExpanded(doctor.id)}
                            title={isExpanded ? t('adminHideSubjects') : t('adminShowSubjects')}
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
                            {isExpanded ? t('adminHideSubjects') : t('adminShowSubjects')}
                            <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                              <ChevronDown size={14} />
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="admin-doctor-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onEditDoctor(doctor)}
                        title={t('adminEditDoctorTitle')}
                        style={{
                          minHeight: 42,
                          borderRadius: 14,
                          border: '1px solid rgba(52,211,153,0.22)',
                          background: 'rgba(52,211,153,0.12)',
                          color: '#86efac',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: '0 14px',
                          fontSize: 12.5,
                          fontWeight: 800,
                        }}
                      >
                        {t('studentsEditButton')}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveDoctor(doctor)}
                        title={t('adminRemoveDoctorTitle')}
                        style={{
                          minWidth: 42,
                          height: 42,
                          borderRadius: 14,
                          border: '1px solid rgba(239,68,68,0.25)',
                          background: 'rgba(239,68,68,0.12)',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div style={{ padding: 18, display: 'grid', gap: 10 }}>
                      {doctor.courses.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('adminNoAssignedSubjects')}</div>
                      ) : doctor.courses.map((course) => (
                        <div
                          key={course.uid}
                          className="admin-doctor-course-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '12px 14px',
                            borderRadius: 18,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent)',
                                background: 'rgba(52,211,153,0.12)',
                                flexShrink: 0,
                              }}
                            >
                              <BookOpen size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{course.id}</span>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', background: 'rgba(99,102,241,0.12)', borderRadius: 999, padding: '4px 10px' }}>
                                  {course.type}
                                </span>
                              </div>
                              <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{course.name}</div>
                              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
                                {getTeachingFacultyIds([course]).map((facultyId) => t(`faculty_${facultyId}`)).join('، ') || course.faculty || '—'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveAssignment(doctor.id, course.uid)}
                            title={t('adminRemoveAssignmentTitle')}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              border: '1px solid rgba(239,68,68,0.25)',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#f87171',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          </>
        )}
      </div>
    </SectionCard>
  );
};

export default DoctorsDirectory;
