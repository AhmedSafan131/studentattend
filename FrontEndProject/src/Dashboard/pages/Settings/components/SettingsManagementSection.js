import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Settings2, Shield, Users, UsersRound, UserCircle2, X } from '../../../../assets/icons';
import { CustomBottom, CustomDropdown, CustomInput, Loading, Pagination } from '../../../../components';
import { FACULTY_CATALOG } from '../../../../utils/constants';
import { ALL_DOCTOR_FACULTIES, doctorMatchesFaculty } from '../utils/doctorFacultyFilter';
import CollegeMultiSelect from './CollegeMultiSelect';
import PermissionSwitch from './PermissionSwitch';
import SessionCodeLengthSettings from './SessionCodeLengthSettings';
import UserCard from './UserCard';

const PAGE_SIZE_OPTIONS = [5, 8, 10, 20];

const SettingsManagementSection = ({
  activeTab,
  draft,
  meta,
  accessScopeOptions,
  permissionGroups,
  studentsPermissionEnabled,
  editorError,
  isSaving,
  isDeleting,
  managedUsers,
  cardStyle,
  t,
  showToast,
  onDraftChange,
  onAccessScopeChange,
  onDoctorSelectChange,
  onCollegeToggle,
  onSave,
  onReset,
  onPermissionToggle,
  onFlexibleAssignmentsOnlyToggle,
  onFlexibleStudentRegistrationToggle,
  onEditRequest,
  onDeleteRequest,
  allDoctorsOptionValue,
  isBulkDoctorSelection,
  editorRef,
}) => {
  const isDoctorTab = activeTab === 'doctors';
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [doctorFacultyFilter, setDoctorFacultyFilter] = useState(ALL_DOCTOR_FACULTIES);
  const selectedDoctor = managedUsers.find((user) => user.id === draft.id);
  const facultyFilterOptions = useMemo(() => [
    { value: ALL_DOCTOR_FACULTIES, label: t('settingsAllFacultiesOption') },
    ...FACULTY_CATALOG.map((faculty) => ({
      value: faculty.id,
      label: faculty.name,
    })),
  ], [t]);
  const filteredManagedUsers = useMemo(() => (
    isDoctorTab
      ? managedUsers.filter((doctor) => doctorMatchesFaculty(doctor, doctorFacultyFilter))
      : managedUsers
  ), [doctorFacultyFilter, isDoctorTab, managedUsers]);
  const doctorOptions = useMemo(() => [
    ...(isDoctorTab ? [{
      value: allDoctorsOptionValue,
      label: t('settingsAllDoctorsOption'),
    }] : []),
    ...filteredManagedUsers.map((doctor) => ({
      value: doctor.id,
      label: [doctor.name, doctor.email].filter(Boolean).join(' - '),
    })),
  ], [allDoctorsOptionValue, filteredManagedUsers, isDoctorTab, t]);
  const editorDisabled = isDoctorTab && !draft.id;
  const totalPages = Math.max(1, Math.ceil(filteredManagedUsers.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredManagedUsers.slice(start, start + pageSize);
  }, [activePage, filteredManagedUsers, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [doctorFacultyFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageSizeChange = (nextPageSize) => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };

  const handleDoctorFacultyFilterChange = (event) => {
    const nextFacultyFilter = event.target.value;
    setDoctorFacultyFilter(nextFacultyFilter);

    if (
      draft.id === allDoctorsOptionValue
      || (
        draft.id
        && !managedUsers.some((doctor) => (
          doctor.id === draft.id && doctorMatchesFaculty(doctor, nextFacultyFilter)
        ))
      )
    ) {
      onReset();
    }
  };

  return (
    <div
    className="settings-management-grid"
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)',
      gap: 20,
      alignItems: 'start',
    }}
  >
    <div ref={editorRef} className="settings-editor-card dashboard-responsive-card" style={{ ...cardStyle, padding: 22, background: meta.accent, scrollMarginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
        {activeTab === 'admins' ? <Shield size={20} /> : <UsersRound size={20} />}
        <span style={{ fontSize: 22, fontWeight: 900 }}>
          {isDoctorTab
            ? t('settingsSelectDoctorTitle')
            : draft.id
              ? t('settingsEditEntityTitle').replace('{entity}', meta.singular)
              : t('settingsAddEntityTitle').replace('{entity}', meta.singular)}
        </span>
      </div>
      <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.7 }}>
        {meta.description}
      </p>

      <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        {isDoctorTab ? (
          <>
            <CustomDropdown
              label={t('settingsDoctorFacultyFilterLabel')}
              name="doctorFacultyFilter"
              value={doctorFacultyFilter}
              onChange={handleDoctorFacultyFilterChange}
              options={facultyFilterOptions}
              placeholder={t('settingsAllFacultiesOption')}
              icon={<Building2 size={16} />}
            />
            <CustomDropdown
              label={t('settingsDoctorSelectLabel')}
              name="doctorId"
              value={draft.id}
              onChange={(event) => onDoctorSelectChange(event, filteredManagedUsers)}
              options={doctorOptions}
              placeholder={t('settingsDoctorSelectPlaceholder')}
              icon={<UserCircle2 size={16} />}
              searchable
              searchPlaceholder={t('settingsDoctorSearchPlaceholder')}
              emptyMessage={t('settingsNoDoctorsForPermissions')}
            />
            {isBulkDoctorSelection ? (
              <div
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{t('settingsAllDoctorsOption')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('settingsBulkDoctorsHint').replace('{count}', filteredManagedUsers.length)}
                </div>
              </div>
            ) : selectedDoctor ? (
              <div
                style={{
                  borderRadius: 18,
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.04)',
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{selectedDoctor.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedDoctor.email}</div>
                {selectedDoctor.specialty ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{selectedDoctor.specialty}</div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <CustomInput
              label={t('settingsFullNameLabel')}
              name="name"
              value={draft.name}
              onChange={onDraftChange}
              placeholder={t('settingsFullNamePlaceholder').replace('{entity}', meta.singular)}
              icon={<Users size={16} />}
              disabled={draft.isSystem}
            />
            <CustomInput
              label={t('settingsEmailLabel')}
              name="email"
              type="email"
              value={draft.email}
              onChange={onDraftChange}
              placeholder={t('settingsEmailPlaceholder').replace('{entity}', meta.singular)}
              icon={<UserCircle2 size={16} />}
              dir="ltr"
              disabled={draft.isSystem}
            />
            <CustomInput
              label={draft.id ? t('settingsPasswordEditLabel') : t('settingsPasswordLabel')}
              name="password"
              type="password"
              value={draft.password}
              onChange={onDraftChange}
              placeholder={draft.id ? t('settingsPasswordEditPlaceholder') : t('settingsPasswordPlaceholder')}
              icon={<Shield size={16} />}
              dir="ltr"
              disabled={draft.isSystem}
            />
            <CustomInput
              label={t('settingsDepartmentLabel')}
              name="specialty"
              value={draft.specialty}
              onChange={onDraftChange}
              placeholder={t('settingsDepartmentPlaceholder')}
              icon={<Building2 size={16} />}
              disabled={draft.isSystem}
            />
          </>
        )}

        {draft.userRole === 'admin' ? (
          <CustomDropdown
            label={t('settingsDashboardScopeLabel')}
            name="accessScope"
            value={draft.accessScope}
            onChange={onAccessScopeChange}
            options={accessScopeOptions}
            placeholder={t('settingsDashboardScopePlaceholder')}
            icon={<Settings2 size={16} />}
            disabled={draft.isSystem}
          />
        ) : null}

        {!isDoctorTab ? <div>
          <label
            htmlFor="settings-colleges"
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'var(--text-muted)',
            }}
          >
            {t('settingsAllowedCollegesLabel')}
          </label>
          <CollegeMultiSelect
            value={draft.allowedColleges}
            onToggle={onCollegeToggle}
            disabled={draft.isSystem || editorDisabled || !studentsPermissionEnabled || isBulkDoctorSelection}
            t={t}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {isBulkDoctorSelection ? t('settingsBulkDoctorsCollegesDisabledHint') : t('settingsAllowedCollegesHint')}
          </div>
        </div> : null}
      </div>

      {draft.isSystem ? (
        <div style={{ marginTop: 16, color: '#fbbf24', fontSize: 12.5, fontWeight: 800 }}>
          {t('settingsProtectedUserNote')}
        </div>
      ) : null}

      {editorError ? (
        <div style={{ marginTop: 16, color: '#f87171', fontSize: 12.5, fontWeight: 800 }}>
          {editorError}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <CustomBottom
            text={isDoctorTab
              ? (isBulkDoctorSelection ? t('settingsSaveAllDoctorPermissionsButton') : t('settingsSaveDoctorPermissionsButton'))
              : draft.id
                ? t('settingsSaveEntityButton').replace('{entity}', meta.singular)
                : t('settingsCreateEntityButton').replace('{entity}', meta.singular)}
            onClick={() => onSave(filteredManagedUsers)}
            loading={isSaving}
            loadingText={t('settingsSaving')}
            rigthIcon={<Check size={16} />}
            disabled={draft.isSystem || editorDisabled}
          />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <CustomBottom
            text={isDoctorTab ? t('settingsClearSelection') : t('settingsClearForm')}
            onClick={onReset}
            rigthIcon={<X size={16} />}
            background="var(--bg-dark)"
            textColor="var(--text-primary)"
            border="1px solid var(--border)"
            boxShadow="none"
          />
        </div>
      </div>
    </div>

    <div className="settings-content-column" style={{ display: 'grid', gap: 18 }}>
      <div className="dashboard-responsive-card" style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {meta.plural}
            </div>
            <h3 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>{meta.title}</h3>
          </div>
          <div
            className="settings-record-count"
            style={{
              minWidth: 200,
              borderRadius: 18,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
              padding: 16,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('settingsActiveRecords')}
            </div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{filteredManagedUsers.length}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-responsive-card" style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {isDoctorTab ? <SessionCodeLengthSettings t={t} showToast={showToast} /> : null}
          {isDoctorTab ? (
            <PermissionSwitch
              item={{
                key: 'restrictFlexibleAttendanceToAssignments',
                title: t('settingsFlexibleAssignmentsOnlyTitle'),
                description: t('settingsFlexibleAssignmentsOnlyDescription'),
              }}
              enabled={Boolean(draft.restrictFlexibleAttendanceToAssignments)}
              onToggle={onFlexibleAssignmentsOnlyToggle}
              disabled={draft.isSystem || editorDisabled}
            />
          ) : null}
          {isDoctorTab ? (
            <PermissionSwitch
              item={{
                key: 'requireFlexibleStudentRegistration',
                title: t('settingsFlexibleStudentRegistrationTitle'),
                description: t('settingsFlexibleStudentRegistrationDescription'),
              }}
              enabled={Boolean(draft.requireFlexibleStudentRegistration)}
              onToggle={onFlexibleStudentRegistrationToggle}
              disabled={draft.isSystem || editorDisabled}
            />
          ) : null}
          {permissionGroups[meta.role].map((group) => (
            <div key={group.title} style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {group.title}
              </div>
              {group.items.map((item) => (
                <PermissionSwitch
                  key={item.key}
                  item={item}
                  enabled={draft.permissions.includes(item.key)}
                  onToggle={onPermissionToggle}
                  disabled={draft.isSystem || editorDisabled}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-responsive-card" style={{ ...cardStyle, padding: 22 }}>
        {isDeleting ? (
          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loading />
          </div>
        ) : filteredManagedUsers.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              border: '1px dashed var(--border)',
              padding: 26,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            {isDoctorTab && doctorFacultyFilter !== ALL_DOCTOR_FACULTIES
              ? t('settingsNoDoctorsInFaculty')
              : t('settingsEmptyUsersMessage').replace('{entities}', meta.plural)}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {paginatedUsers.map((record) => (
              <UserCard
                key={record.id}
                user={record}
                roleLabel={record.userRole === 'admin' ? t('settingsRoleAdmin') : t('settingsRoleDoctor')}
                onEdit={onEditRequest}
                onDelete={isDoctorTab ? null : onDeleteRequest}
                editLabel={isDoctorTab ? t('settingsSelectDoctorButton') : undefined}
                selected={isDoctorTab && draft.id === record.id}
                t={t}
              />
            ))}
            <Pagination
              id={`settings-${activeTab}-pagination`}
              currentPage={activePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              showPageSizeWhenSinglePage
            />
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default SettingsManagementSection;
