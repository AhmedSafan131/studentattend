import React, { useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Search, UsersRound } from '../../../assets/icons';
import { ConfirmationDialog, CustomBottom, CustomDropdown, Loading, Pagination } from '../../../components';
import { useAuth, useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import {
  activateAllLockedStudents,
  activateLockedStudent,
  fetchLockedStudents,
} from '../../../services/studentsApi';
import { FACULTY_OPTIONS, getCollegeRecord } from '../StudentsPage/utils/studentUtils';
import { hasPermission, PERMISSIONS } from '../../../utils/permissions';

const PAGE_SIZE_OPTIONS = [5, 8, 12, 20];
const HISTORICAL_TERM_ERROR = 'You are viewing a historical academic term. Switch to the active term before making changes.';

const getActivationErrorMessage = (error, t) => {
  const message = error?.response?.data?.message || error?.message || '';
  return message === HISTORICAL_TERM_ERROR
    ? t('historicalTermWriteError')
    : (message || t('deactivatedActivateFailedMessage'));
};

const formatDate = (value, fallbackLabel) => {
  if (!value) return fallbackLabel;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallbackLabel;

  return parsed.toLocaleString();
};

const getStudentInitials = (student) => (
  String(student?.name || student?.studentId || 'ST')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ST'
);

const DeactivatedStudents = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [lockedStudents, setLockedStudents] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [activatingId, setActivatingId] = useState('');
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [isActivateAllDialogOpen, setIsActivateAllDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [reloadKey, setReloadKey] = useState(0);

  const canViewDeactivated = hasPermission(user, PERMISSIONS.VIEW_DEACTIVATED);
  const canManageDeactivated = hasPermission(user, PERMISSIONS.MANAGE_DEACTIVATED);

  useEffect(() => {
    if (!canViewDeactivated) {
      setLockedStudents([]);
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError('');

      fetchLockedStudents({
        page: currentPage,
        perPage: pageSize,
        search: search.trim() || undefined,
        facultyId: selectedFacultyId || undefined,
      })
        .then((result) => {
          if (!isMounted) return;
          setLockedStudents(result.students || []);
          setPagination(result.pagination || { currentPage: 1, totalPages: 1, total: 0 });
        })
        .catch((loadError) => {
          if (isMounted) {
            setLockedStudents([]);
            setError(loadError?.response?.data?.message || loadError.message || t('deactivatedLoadError'));
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [canViewDeactivated, currentPage, pageSize, reloadKey, search, selectedFacultyId, t]);

  const facultyOptions = useMemo(() => {
    return [
      { value: '', label: t('deactivatedAllFaculties') },
      ...FACULTY_OPTIONS
        .map((option) => ({
          ...option,
          label: t(option.labelKey) || option.label,
        })),
    ];
  }, [t]);

  useEffect(() => {
    if (!selectedFacultyId) return;
    if (facultyOptions.some((option) => option.value === selectedFacultyId)) return;

    setSelectedFacultyId('');
  }, [facultyOptions, selectedFacultyId]);

  const filteredStudents = lockedStudents;

  const facultyFilteredStudents = useMemo(() => (
    selectedFacultyId
      ? lockedStudents.filter(({ student }) => (
          getCollegeRecord(student?.college)?.facultyId === selectedFacultyId
        ))
      : lockedStudents
  ), [lockedStudents, selectedFacultyId]);

  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
  const paginatedStudents = filteredStudents;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleActivate = async (lockedStudent) => {
    if (!canManageDeactivated) return;

    setActivatingId(lockedStudent.id);

    try {
      const result = await activateLockedStudent(lockedStudent.id);
      const activatedStudentId = result.studentId || lockedStudent.student?.id;
      setLockedStudents((current) => current.filter((record) => (
        record.id !== lockedStudent.id
        && (!activatedStudentId || record.student?.id !== activatedStudentId)
      )));
      setPagination((current) => ({ ...current, total: Math.max(0, Number(current.total) - 1) }));
      showToast({
        tone: 'success',
        title: t('deactivatedActivatedTitle'),
        message: `${lockedStudent.student.name} ${t('deactivatedActivatedMessage')}`,
      });
    } catch (activationError) {
      showToast({
        tone: 'error',
        title: t('deactivatedActivateFailedTitle'),
        message: getActivationErrorMessage(activationError, t),
      });
    } finally {
      setActivatingId('');
    }
  };

  const handleActivateAll = async () => {
    if (!canManageDeactivated || facultyFilteredStudents.length === 0) return;

    const facultyId = selectedFacultyId;
    setIsActivatingAll(true);

    try {
      const activated = await activateAllLockedStudents({
        facultyId: facultyId || undefined,
      });
      setLockedStudents((current) => (
        facultyId
          ? current.filter(({ student }) => (
              getCollegeRecord(student?.college)?.facultyId !== facultyId
            ))
          : []
      ));
      setReloadKey((value) => value + 1);
      showToast({
        tone: 'success',
        title: t('deactivatedAllActivatedTitle'),
        message: `${activated} ${t('deactivatedAllActivatedMessage')}`,
      });
    } catch (activationError) {
      showToast({
        tone: 'error',
        title: t('deactivatedActivateFailedTitle'),
        message: getActivationErrorMessage(activationError, t),
      });
    } finally {
      setIsActivatingAll(false);
      setIsActivateAllDialogOpen(false);
    }
  };

  if (!canViewDeactivated) {
    return (
      <div className="dashboard-responsive-page deactivated-page" style={{ padding: 24, boxSizing: 'border-box' }}>
        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(239,68,68,0.22)',
            background: 'rgba(127,29,29,0.12)',
            padding: 24,
            color: 'var(--text-primary)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{t('deactivatedAccessTitle')}</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {t('deactivatedAccessDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-responsive-page deactivated-page" style={{ padding: 24, boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section
          className="deactivated-hero dashboard-responsive-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 24,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(52,211,153,0.08))',
            boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
          }}
        >
          <div className="deactivated-hero-layout" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div className="deactivated-hero-copy" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 260, flex: '1 1 420px' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fca5a5',
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid rgba(248,113,113,0.24)',
                  flexShrink: 0,
                }}
              >
                <LockKeyhole size={24} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {t('deactivatedEyebrow')}
                </div>
                <h1 style={{ margin: '4px 0 8px', fontSize: 30, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {t('deactivatedTitle')}
                </h1>
                <p style={{ margin: 0, maxWidth: 720, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {t('deactivatedDescription')}
                </p>
              </div>
            </div>

            <div className="deactivated-activate-all" style={{ width: 210 }}>
              <CustomBottom
                text={t('deactivatedActivateAll')}
                onClick={() => setIsActivateAllDialogOpen(true)}
                loading={isActivatingAll}
                loadingText={t('deactivatedActivating')}
                disabled={!canManageDeactivated || facultyFilteredStudents.length === 0 || isLoading}
                rigthIcon={<Check size={17} />}
                background="linear-gradient(135deg, #16a34a, #059669)"
                boxShadow="0 14px 30px rgba(5,150,105,0.22)"
                minHeight={46}
              />
            </div>
          </div>
        </section>

        {error ? (
          <div
            style={{
              borderRadius: 18,
              border: '1px solid rgba(239,68,68,0.22)',
              background: 'rgba(127,29,29,0.12)',
              padding: 16,
              color: '#f87171',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          className="deactivated-registry dashboard-responsive-card"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 22,
            boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  background: 'rgba(52,211,153,0.12)',
                  border: '1px solid rgba(52,211,153,0.22)',
                  flexShrink: 0,
                }}
              >
                <UsersRound size={22} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {t('deactivatedRegistryEyebrow')}
                </div>
                <h2 style={{ margin: '4px 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {t('deactivatedRegistryTitle')}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7 }}>
                  {pagination.total} {t('deactivatedFilteredCount')}
                </p>
              </div>
            </div>

            <div
              className="deactivated-filters"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 1.3fr) minmax(220px, 1fr)',
                gap: 12,
                width: 'min(100%, 720px)',
                flex: '1 1 520px',
              }}
            >
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('searchLabel')}
                </div>
                <label
                  style={{
                    width: '100%',
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '0 14px',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('deactivatedSearchPlaceholder')}
                    style={{
                      width: '100%',
                      border: 0,
                      outline: 0,
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      font: 'inherit',
                      fontSize: 14,
                    }}
                  />
                </label>
              </div>

              <CustomDropdown
                label={t('faculty')}
                name="deactivated-faculty"
                value={selectedFacultyId}
                options={facultyOptions}
                onChange={(event) => {
                  setSelectedFacultyId(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('selectFaculty')}
                icon={() => <UsersRound size={16} />}
                searchable
                emptyMessage={t('deactivatedNoFaculties')}
              />
            </div>
          </div>

          {isLoading ? (
            <div
              style={{
                borderRadius: 20,
                border: '1px dashed var(--border)',
                padding: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loading />
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div
              style={{
                minHeight: 220,
                border: '1px dashed var(--border)',
                borderRadius: 18,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                padding: 24,
                color: 'var(--text-secondary)',
              }}
            >
              <div>
                <LockKeyhole size={34} style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 900 }}>
                  {search ? t('deactivatedNoSearchResults') : t('deactivatedEmptyTitle')}
                </h3>
                <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                  {search ? t('deactivatedNoSearchDescription') : t('deactivatedEmptyDescription')}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {paginatedStudents.map((record) => {
                const { student } = record;

                return (
                  <article
                    key={record.id}
                    className="deactivated-student-card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                      gap: 14,
                      alignItems: 'center',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: 16,
                      background: 'rgba(255,255,255,0.035)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          color: '#fff',
                          background: 'linear-gradient(135deg, #dc2626, #059669)',
                          fontSize: 13,
                          fontWeight: 900,
                        }}
                      >
                        {getStudentInitials(student)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {student.name || t('deactivatedUnknownStudent')}
                        </h3>
                        <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                          {t('studentsStudentIdTag')}: {student.studentId || t('deactivatedNotAvailable')}
                        </p>
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.college || t('studentsNoCollege')}
                      </div>
                      <div style={{ marginTop: 5, color: 'var(--text-muted)', fontSize: 12 }}>
                        {t('studentsNationalIdTag')}: {student.nationalId || t('deactivatedNotAvailable')}
                      </div>
                      <div style={{ marginTop: 7, color: 'var(--accent)', fontSize: 12, fontWeight: 900 }}>
                        {t('deactivatedActivationCount')}: {student.activationCount || 0}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.deviceName || record.platform || t('deactivatedUnknownDevice')}
                      </div>
                      <div style={{ marginTop: 5, color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[record.platform, record.browser].filter(Boolean).join(' - ') || t('deactivatedDeviceBound')}
                      </div>
                      <div style={{ marginTop: 5, color: 'var(--text-muted)', fontSize: 12 }}>
                        {formatDate(record.lockedAt, t('deactivatedNotAvailable'))}
                      </div>
                    </div>

                    <CustomBottom
                      text={t('deactivatedActivateOne')}
                      onClick={() => handleActivate(record)}
                      loading={activatingId === record.id}
                      loadingText={t('deactivatedActivating')}
                      disabled={!canManageDeactivated || isActivatingAll}
                      rigthIcon={<Check size={16} />}
                      background="linear-gradient(135deg, #16a34a, #059669)"
                      boxShadow="0 12px 24px rgba(5,150,105,0.18)"
                      minHeight={42}
                    />
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setCurrentPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setCurrentPage(1);
            }}
            className="mt-5"
          />
        </section>
      </div>

      <ConfirmationDialog
        isOpen={isActivateAllDialogOpen}
        onClose={() => {
          if (!isActivatingAll) {
            setIsActivateAllDialogOpen(false);
          }
        }}
        onConfirm={handleActivateAll}
        title={t('deactivatedActivateAllConfirmTitle')}
        message={t('deactivatedActivateAllConfirmMessage')}
        confirmText={t('deactivatedActivateAll')}
        cancelText={t('dialogCancel')}
        tone="info"
        loading={isActivatingAll}
        loadingText={t('deactivatedActivating')}
      />
    </div>
  );
};

export default DeactivatedStudents;
