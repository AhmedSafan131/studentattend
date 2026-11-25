import React from 'react';
import { ConfirmationDialog } from '../../../components';
import { useLanguage } from '../../../i18n';
import StudentsBulkUploadSection from './components/StudentsBulkUploadSection';
import StudentFormSection from './components/StudentFormSection';
import StudentsListSection from './components/StudentsListSection';
import { useStudentsPageController } from './hooks/useStudentsPageController';

const StudentsPage = () => {
  const { t } = useLanguage();
  const controller = useStudentsPageController();

  if (!controller.canViewStudents) {
    return (
      <div className="dashboard-responsive-page students-page" style={{ padding: 24, boxSizing: 'border-box' }}>
        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(239,68,68,0.22)',
            background: 'rgba(127,29,29,0.12)',
            padding: 24,
            color: 'var(--text-primary)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Students Access Restricted</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Your account does not include permission to view student records. Update this user in Settings to grant access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-responsive-page students-page" style={{ padding: 24, boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gap: 22 }}>
        {controller.studentsError ? (
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
            {controller.studentsError}
          </div>
        ) : null}

        <StudentsBulkUploadSection
          uploadPreview={controller.uploadPreview}
          uploadError={controller.uploadError}
          selectedFacultyId={controller.selectedImportFacultyId}
          facultyOptions={controller.importFacultyOptions}
          isParsingUpload={controller.isParsingUpload}
          isApplyingUpload={controller.isApplyingUpload}
          onFacultyChange={controller.handleImportFacultyChange}
          onFilePicked={controller.handleUploadFilePicked}
          onConfirmUpload={controller.handleUploadConfirm}
          onClearUpload={controller.handleUploadClear}
          onDownloadTemplate={controller.handleDownloadTemplate}
        />

        <div
          className="students-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)',
            gap: 22,
            alignItems: 'start',
          }}
        >
        <StudentFormSection
          form={controller.form}
            students={controller.students}
            catalogSubjects={controller.formCatalogSubjects}
            isLoadingSubjects={controller.isLoadingFormSubjects}
            registrationDraft={controller.registrationDraft}
            registrations={controller.formRegistrations}
            editingRegistrationIndex={controller.editingRegistrationIndex}
          formError={controller.formError}
          isEditing={controller.isEditing}
          isSaving={controller.isSavingStudent}
          canEditStudents={controller.canEditStudents}
          allowedColleges={controller.allowedColleges}
          onFormChange={controller.handleFormChange}
            onRegistrationDraftChange={controller.handleRegistrationDraftChange}
            onAddRegistration={controller.handleRegistrationAdd}
            onRemoveRegistration={controller.handleRegistrationRemove}
            onEditRegistration={controller.handleRegistrationEditStart}
            onCancelRegistrationEdit={controller.handleRegistrationEditCancel}
            onSubmit={controller.handleFormSubmit}
            onCancelEdit={controller.handleEditCancel}
          />

        <StudentsListSection
          currentTermOnly={controller.currentTermOnly}
          onCurrentTermOnlyChange={controller.handleCurrentTermOnlyChange}
          students={controller.paginatedStudents}
          totalStudents={controller.totalStudents}
          allStudentsCount={controller.allStudentsTotal}
          isLoading={controller.isLoadingStudents}
          search={controller.search}
            currentPage={controller.currentPage}
            totalPages={controller.totalPages}
            pageSize={controller.pageSize}
            onSearchChange={controller.handleSearchChange}
            onPageChange={controller.handlePageChange}
          onPageSizeChange={controller.handlePageSizeChange}
          onEditStudent={controller.handleEditStart}
          onDeleteStudent={controller.handleDeleteRequest}
          canEditStudents={controller.canEditStudents}
          canDeleteStudents={controller.canDeleteStudents}
        />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(controller.pendingDeleteStudent)}
        onClose={controller.handleDeleteCancel}
        onConfirm={controller.handleDeleteConfirm}
        loading={controller.isDeletingStudent}
        loadingText={t('studentsDeleting')}
        title={t('studentsDeleteDialogTitle')}
        message={
          controller.pendingDeleteStudent
            ? `${t('studentsDeleteDialogMessagePrefix')} ${controller.pendingDeleteStudent.name} ${t('studentsDeleteDialogMessageSuffix')}`
            : ''
        }
        confirmText={t('studentsDeleteButton')}
        cancelText={t('adminKeepConfirm')}
        tone="danger"
      />
    </div>
  );
};

export default StudentsPage;
