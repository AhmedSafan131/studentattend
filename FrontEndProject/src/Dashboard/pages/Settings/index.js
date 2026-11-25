import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings2, Shield, UserCircle2, Users } from '../../../assets/icons';
import { ConfirmationDialog } from '../../../components';
import { useAuth, useToast } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import { DEFAULT_PERMISSIONS_BY_ROLE, PERMISSIONS } from '../../../utils/permissions';

import SettingsManagementSection from './components/SettingsManagementSection';
import SettingsPermissionOverview from './components/SettingsPermissionOverview';
import StudentLoginSettings from './components/StudentLoginSettings';
import AttendanceRosterSettings from './components/AttendanceRosterSettings';
import TabButton from './components/TabButton';

const wait = (timeout = 280) => new Promise((resolve) => window.setTimeout(resolve, timeout));
const createEntityId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const ALL_DOCTORS_OPTION = '__all_doctors__';

const cardStyle = {
  borderRadius: 24,
  border: '1px solid var(--border)',
  background: 'color-mix(in srgb, var(--bg-card) 94%, transparent)',
  boxShadow: '0 24px 50px rgba(0,0,0,0.14)',
};

const getEmptyDraft = (role) => ({
  id: '',
  name: '',
  email: '',
  password: '',
  specialty: '',
  userRole: role,
  accessScope: 'limited',
  permissions: role === 'staff' ? [...DEFAULT_PERMISSIONS_BY_ROLE.staff] : [],
  allowedColleges: [],
  restrictFlexibleAttendanceToAssignments: false,
  requireFlexibleStudentRegistration: false,
});

const getCommonPermissions = (users = []) => {
  if (!users.length) {
    return [...DEFAULT_PERMISSIONS_BY_ROLE.staff];
  }

  const [firstUser, ...restUsers] = users;
  const firstPermissions = Array.isArray(firstUser?.permissions) ? firstUser.permissions : [];

  return firstPermissions.filter((permission) => (
    restUsers.every((user) => Array.isArray(user?.permissions) && user.permissions.includes(permission))
  ));
};

const mergePermissionState = (role, accessScope, selectedPermissions) => {
  const nextPermissions = new Set(selectedPermissions);

  if (role === 'admin') {
    if (accessScope === 'full') {
      nextPermissions.add(PERMISSIONS.FULL_DASHBOARD_ACCESS);
      nextPermissions.add(PERMISSIONS.VIEW_ATTENDANCE);
      nextPermissions.add(PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE);
      nextPermissions.add(PERMISSIONS.VIEW_REPORTS);
      nextPermissions.add(PERMISSIONS.VIEW_STUDENTS);
      nextPermissions.add(PERMISSIONS.VIEW_DEACTIVATED);
      nextPermissions.add(PERMISSIONS.MANAGE_DEACTIVATED);
      nextPermissions.add(PERMISSIONS.MANAGE_DOCTORS);
      nextPermissions.add(PERMISSIONS.MANAGE_ADMINS);
      nextPermissions.add(PERMISSIONS.MANAGE_PERMISSIONS);
      nextPermissions.add(PERMISSIONS.MANAGE_ACADEMIC_TERMS);
      nextPermissions.add(PERMISSIONS.MANAGE_SUBJECT_CATALOG);
    } else {
      nextPermissions.delete(PERMISSIONS.FULL_DASHBOARD_ACCESS);
    }
  }

  if (nextPermissions.has(PERMISSIONS.EDIT_STUDENTS) || nextPermissions.has(PERMISSIONS.DELETE_STUDENTS)) {
    nextPermissions.add(PERMISSIONS.VIEW_STUDENTS);
  }

  if (nextPermissions.has(PERMISSIONS.MANAGE_DEACTIVATED)) {
    nextPermissions.add(PERMISSIONS.VIEW_DEACTIVATED);
  }

  return [...nextPermissions];
};

const validateDraft = (draft, existingUsers, activeTab) => {
  if (activeTab === 'doctors' && draft.id === ALL_DOCTORS_OPTION) {
    if (draft.permissions.length === 0) {
      return 'settingsValidationPermissionsRequired';
    }

    return '';
  }

  if (activeTab === 'doctors' && !draft.id) return 'settingsValidationDoctorRequired';
  if (!draft.name.trim()) return 'settingsValidationNameRequired';
  if (!draft.email.trim()) return 'settingsValidationEmailRequired';
  if (!draft.id && !draft.password.trim()) return 'settingsValidationPasswordRequired';

  const duplicateEmail = existingUsers.find(
    (user) => user.id !== draft.id && user.email.toLowerCase() === draft.email.trim().toLowerCase(),
  );

  if (duplicateEmail) {
    return activeTab === 'admins'
      ? 'settingsValidationAdminEmailDuplicate'
      : 'settingsValidationDoctorEmailDuplicate';
  }

  if (draft.permissions.length === 0) {
    return 'settingsValidationPermissionsRequired';
  }

  return '';
};

const SettingsPage = () => {
  const {
    admins,
    doctors,
    addAdmin,
    updateAdmin,
    deleteAdmin,
    updateDoctor,
  } = useAuth();
  const { showToast } = useToast();
  const { t, lang } = useLanguage();

  const tabOptions = useMemo(() => ([
    { key: 'attendanceRoster', label: lang === 'ar' ? 'قائمة طلاب الحضور' : 'Attendance roster', icon: <Users size={18} /> },
    { key: 'admins', label: t('settingsTabAdmins'), icon: <Shield size={18} /> },
    { key: 'doctors', label: t('settingsTabDoctors'), icon: <UserCircle2 size={18} /> },
    { key: 'students', label: t('settingsTabStudents'), icon: <Users size={18} /> },
    { key: 'permissions', label: t('settingsTabPermissions'), icon: <Settings2 size={18} /> },
  ]), [t, lang]);

  const accessScopeOptions = useMemo(() => ([
    { value: 'limited', label: t('settingsAccessLimited') },
    { value: 'full', label: t('settingsAccessFull') },
  ]), [t]);

  const permissionGroups = useMemo(() => ({
    admin: [
      {
        title: t('settingsGroupDashboardAccess'),
        items: [
          { key: PERMISSIONS.FULL_DASHBOARD_ACCESS, title: t('settingsPermissionTitle_full_dashboard_access'), description: t('settingsPermissionDesc_full_dashboard_access') },
          { key: PERMISSIONS.VIEW_ATTENDANCE, title: t('settingsPermissionTitle_view_attendance'), description: t('settingsPermissionDesc_view_attendance') },
          { key: PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE, title: t('settingsPermissionTitle_view_flexible_attendance'), description: t('settingsPermissionDesc_view_flexible_attendance') },
          { key: PERMISSIONS.VIEW_REPORTS, title: t('settingsPermissionTitle_view_reports'), description: t('settingsPermissionDesc_view_reports') },
          { key: PERMISSIONS.VIEW_STUDENTS, title: t('settingsPermissionTitle_view_students'), description: t('settingsPermissionDesc_view_students') },
          { key: PERMISSIONS.VIEW_DEACTIVATED, title: t('settingsPermissionTitle_view_deactivated'), description: t('settingsPermissionDesc_view_deactivated') },
        ],
      },
      {
        title: t('settingsGroupStudentActions'),
        items: [
          { key: PERMISSIONS.EDIT_STUDENTS, title: t('settingsPermissionTitle_edit_students'), description: t('settingsPermissionDesc_edit_students_admin') },
          { key: PERMISSIONS.DELETE_STUDENTS, title: t('settingsPermissionTitle_delete_students'), description: t('settingsPermissionDesc_delete_students_admin') },
          { key: PERMISSIONS.MANAGE_DEACTIVATED, title: t('settingsPermissionTitle_manage_deactivated'), description: t('settingsPermissionDesc_manage_deactivated') },
        ],
      },
      {
        title: t('settingsGroupAdministration'),
        items: [
          { key: PERMISSIONS.MANAGE_DOCTORS, title: t('settingsPermissionTitle_manage_doctors'), description: t('settingsPermissionDesc_manage_doctors') },
          { key: PERMISSIONS.MANAGE_ADMINS, title: t('settingsPermissionTitle_manage_admins'), description: t('settingsPermissionDesc_manage_admins') },
          { key: PERMISSIONS.MANAGE_PERMISSIONS, title: t('settingsPermissionTitle_manage_permissions'), description: t('settingsPermissionDesc_manage_permissions') },
        ],
      },
      {
        title: t('settingsGroupAcademicManagement'),
        items: [
          { key: PERMISSIONS.MANAGE_ACADEMIC_TERMS, title: t('settingsPermissionTitle_manage_academic_terms'), description: t('settingsPermissionDesc_manage_academic_terms') },
          { key: PERMISSIONS.MANAGE_SUBJECT_CATALOG, title: t('settingsPermissionTitle_manage_subject_catalog'), description: t('settingsPermissionDesc_manage_subject_catalog') },
        ],
      },
    ],
    staff: [
      {
        title: t('settingsGroupWorkspaceAccess'),
        items: [
          { key: PERMISSIONS.VIEW_ATTENDANCE, title: t('settingsPermissionTitle_view_attendance'), description: t('settingsPermissionDesc_view_attendance_doctor') },
          { key: PERMISSIONS.VIEW_FLEXIBLE_ATTENDANCE, title: t('settingsPermissionTitle_view_flexible_attendance'), description: t('settingsPermissionDesc_view_flexible_attendance_doctor') },
          { key: PERMISSIONS.VIEW_REPORTS, title: t('settingsPermissionTitle_view_reports'), description: t('settingsPermissionDesc_view_reports_doctor') },
          { key: PERMISSIONS.VIEW_STUDENTS, title: t('settingsPermissionTitle_view_students'), description: t('settingsPermissionDesc_view_students_doctor') },
          { key: PERMISSIONS.SELECT_ACADEMIC_TERM, title: t('settingsPermissionTitle_select_academic_term'), description: t('settingsPermissionDesc_select_academic_term') },
        ],
      },
      {
        title: t('settingsGroupStudentActions'),
        items: [
          { key: PERMISSIONS.EDIT_STUDENTS, title: t('settingsPermissionTitle_edit_students'), description: t('settingsPermissionDesc_edit_students_doctor') },
          { key: PERMISSIONS.DELETE_STUDENTS, title: t('settingsPermissionTitle_delete_students'), description: t('settingsPermissionDesc_delete_students_doctor') },
        ],
      },
    ],
  }), [t]);

  const entityMeta = useMemo(() => ({
    admins: {
      singular: t('settingsEntityAdminSingular'),
      plural: t('settingsEntityAdminsPlural'),
      role: 'admin',
      title: t('settingsAdminManagementTitle'),
      description: t('settingsAdminManagementDescription'),
      accent: 'linear-gradient(135deg, rgba(190,24,93,0.18), rgba(220,38,38,0.12))',
    },
    doctors: {
      singular: t('settingsEntityDoctorSingular'),
      plural: t('settingsEntityDoctorsPlural'),
      role: 'staff',
      title: t('settingsDoctorPermissionsTitle'),
      description: t('settingsDoctorPermissionsDescription'),
      accent: 'linear-gradient(135deg, rgba(8,145,178,0.18), rgba(59,130,246,0.12))',
    },
  }), [t]);

  const [activeTab, setActiveTab] = useState('admins');
  const [draft, setDraft] = useState(getEmptyDraft('admin'));
  const [editorError, setEditorError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const editorRef = useRef(null);

  const meta = activeTab === 'admins' ? entityMeta.admins : entityMeta.doctors;
  const managedUsers = activeTab === 'admins' ? admins : doctors;
  const isBulkDoctorSelection = activeTab === 'doctors' && draft.id === ALL_DOCTORS_OPTION;
  useEffect(() => {
    setDraft(getEmptyDraft(meta.role));
    setEditorError('');
  }, [meta.role]);

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setEditorError('');
  };

  const handlePermissionToggle = (permissionKey) => {
    setDraft((current) => {
      const hasSelectedPermission = current.permissions.includes(permissionKey);
      const nextSelectedPermissions = hasSelectedPermission
        ? current.permissions.filter((permission) => permission !== permissionKey)
        : [...current.permissions, permissionKey];

      const nextPermissions = mergePermissionState(current.userRole, current.accessScope, nextSelectedPermissions);
      const shouldResetColleges = !nextPermissions.includes(PERMISSIONS.VIEW_STUDENTS)
        && !nextPermissions.includes(PERMISSIONS.EDIT_STUDENTS)
        && !nextPermissions.includes(PERMISSIONS.DELETE_STUDENTS);

      return {
        ...current,
        permissions: nextPermissions,
        allowedColleges: shouldResetColleges ? [] : current.allowedColleges,
      };
    });
  };

  const handleAccessScopeChange = (event) => {
    const nextScope = event.target.value;
    setDraft((current) => ({
      ...current,
      accessScope: nextScope,
      permissions: mergePermissionState(current.userRole, nextScope, current.permissions),
    }));
  };

  const handleFlexibleAssignmentsOnlyToggle = () => {
    setDraft((current) => ({
      ...current,
      restrictFlexibleAttendanceToAssignments: !current.restrictFlexibleAttendanceToAssignments,
    }));
    setEditorError('');
  };

  const handleFlexibleStudentRegistrationToggle = () => {
    setDraft((current) => ({
      ...current,
      requireFlexibleStudentRegistration: !current.requireFlexibleStudentRegistration,
    }));
    setEditorError('');
  };

  const scrollToEditor = () => {
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDoctorSelectChange = (event, filteredDoctors = doctors) => {
    if (event.target.value === ALL_DOCTORS_OPTION) {
      setDraft({
        ...getEmptyDraft('staff'),
        id: ALL_DOCTORS_OPTION,
        userRole: 'staff',
        permissions: getCommonPermissions(filteredDoctors),
        restrictFlexibleAttendanceToAssignments: filteredDoctors.length > 0
          && filteredDoctors.every((doctor) => Boolean(doctor.restrictFlexibleAttendanceToAssignments)),
        requireFlexibleStudentRegistration: filteredDoctors.length > 0
          && filteredDoctors.every((doctor) => Boolean(doctor.requireFlexibleStudentRegistration)),
      });
      setEditorError('');
      scrollToEditor();
      return;
    }

    const selectedDoctor = doctors.find((doctor) => doctor.id === event.target.value);
    if (selectedDoctor) {
      handleEditRequest(selectedDoctor);
    } else {
      resetEditor();
    }
  };

  const handleCollegeToggle = (collegeName) => {
    setDraft((current) => ({
      ...current,
      allowedColleges: current.allowedColleges.includes(collegeName)
        ? current.allowedColleges.filter((college) => college !== collegeName)
        : [...current.allowedColleges, collegeName],
    }));
  };

  const handleEditRequest = (record) => {
    setDraft({
      ...getEmptyDraft(record.userRole),
      ...record,
      password: '',
      accessScope: record.permissions?.includes(PERMISSIONS.FULL_DASHBOARD_ACCESS) ? 'full' : 'limited',
    });
    setEditorError('');
    scrollToEditor();
  };

  const resetEditor = () => {
    setDraft(getEmptyDraft(meta.role));
    setEditorError('');
  };

  const handleSave = async (filteredDoctors = doctors) => {
    const nextPermissions = mergePermissionState(draft.userRole, draft.accessScope, draft.permissions);
    const nextDraft = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      specialty: draft.specialty.trim(),
      permissions: nextPermissions,
    };

    const validationError = validateDraft(nextDraft, managedUsers, activeTab);
    if (validationError) {
      setEditorError(t(validationError));
      return;
    }

    setIsSaving(true);
    setEditorError('');
    await wait();

    try {
      if (meta.role === 'admin') {
        const payload = {
          ...nextDraft,
          password: draft.password.trim() || managedUsers.find((record) => record.id === draft.id)?.password || '',
          allowedColleges: nextDraft.allowedColleges,
        };

        if (payload.id) await updateAdmin(payload.id, payload);
        else await addAdmin({ ...payload, id: createEntityId('admin') });
        showToast({
          tone: 'success',
          title: t('settingsUpdateSuccessTitle'),
          message: t(payload.id ? 'settingsAdminUpdatedSuccessMessage' : 'settingsAdminCreatedSuccessMessage'),
        });
      } else if (isBulkDoctorSelection) {
        await Promise.all(
          filteredDoctors.map((doctor) => updateDoctor(doctor.id, {
            permissions: nextPermissions,
            restrictFlexibleAttendanceToAssignments: Boolean(
              nextDraft.restrictFlexibleAttendanceToAssignments
            ),
            requireFlexibleStudentRegistration: Boolean(
              nextDraft.requireFlexibleStudentRegistration
            ),
          })),
        );
        showToast({
          tone: 'success',
          title: t('settingsUpdateSuccessTitle'),
          message: t('settingsAllDoctorsUpdatedSuccessMessage').replace('{count}', filteredDoctors.length),
        });
      } else if (nextDraft.id) {
        const payload = {
          ...nextDraft,
          password: draft.password.trim() || managedUsers.find((record) => record.id === draft.id)?.password || '',
          allowedColleges: nextDraft.allowedColleges,
        };

        await updateDoctor(payload.id, payload);
        showToast({
          tone: 'success',
          title: t('settingsUpdateSuccessTitle'),
          message: t('settingsDoctorUpdatedSuccessMessage'),
        });
      }

      setIsSaving(false);
      resetEditor();
    } catch (error) {
      setIsSaving(false);
      setEditorError(error?.message || t('adminImportFailed'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    await wait();

    if (pendingDelete.userRole === 'admin') await deleteAdmin(pendingDelete.id);

    setIsDeleting(false);
    setPendingDelete(null);

    if (draft.id === pendingDelete.id) {
      resetEditor();
    }
  };

  const studentsPermissionEnabled = draft.permissions.includes(PERMISSIONS.VIEW_STUDENTS)
    || draft.permissions.includes(PERMISSIONS.EDIT_STUDENTS)
    || draft.permissions.includes(PERMISSIONS.DELETE_STUDENTS);

  return (
    <div className="dashboard-responsive-page settings-page" style={{ padding: 24, boxSizing: 'border-box', display: 'grid', gap: 22 }}>
      {/* <SettingsHeroSection user={user} t={t} cardStyle={cardStyle} />  */}
      {/* <SettingsMetricsSection stats={stats} t={t} cardStyle={cardStyle} /> */}

      <div className="settings-tabs" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tabOptions.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      {activeTab === 'attendanceRoster' ? <AttendanceRosterSettings /> : activeTab === 'permissions' ? (
        <SettingsPermissionOverview permissionGroups={permissionGroups} t={t} cardStyle={cardStyle} />
      ) : activeTab === 'students' ? (
        <StudentLoginSettings cardStyle={cardStyle} t={t} showToast={showToast} />
      ) : (
        <SettingsManagementSection
          activeTab={activeTab}
          draft={draft}
          meta={meta}
          accessScopeOptions={accessScopeOptions}
          permissionGroups={permissionGroups}
          studentsPermissionEnabled={studentsPermissionEnabled}
          editorError={editorError}
          isSaving={isSaving}
          isDeleting={isDeleting}
          managedUsers={managedUsers}
          cardStyle={cardStyle}
          t={t}
          showToast={showToast}
          onDraftChange={handleDraftChange}
          onAccessScopeChange={handleAccessScopeChange}
          onDoctorSelectChange={handleDoctorSelectChange}
          onCollegeToggle={handleCollegeToggle}
          onSave={handleSave}
          onReset={resetEditor}
          onPermissionToggle={handlePermissionToggle}
          onFlexibleAssignmentsOnlyToggle={handleFlexibleAssignmentsOnlyToggle}
          onFlexibleStudentRegistrationToggle={handleFlexibleStudentRegistrationToggle}
          onEditRequest={handleEditRequest}
          onDeleteRequest={setPendingDelete}
          allDoctorsOptionValue={ALL_DOCTORS_OPTION}
          isBulkDoctorSelection={isBulkDoctorSelection}
          editorRef={editorRef}
        />
      )}

      <ConfirmationDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={t('settingsDeleteDialogTitle').replace(
          '{role}',
          pendingDelete?.userRole === 'admin' ? t('settingsEntityAdminSingular') : t('settingsEntityDoctorSingular'),
        )}
        message={pendingDelete ? t('settingsDeleteDialogMessage').replace('{name}', pendingDelete.name) : ''}
        confirmText={t('settingsDeleteUser')}
        cancelText={t('settingsKeepUser')}
        tone="danger"
      />
    </div>
  );
};

export default SettingsPage;
