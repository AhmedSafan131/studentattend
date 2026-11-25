import React from "react";
import { ConfirmationDialog } from "../../../components";
import { useLanguage } from "../../../i18n";
import BulkImportSection from "./components/BulkImportSection";
import ManualDoctorSection from "./components/ManualDoctorSection";
import DoctorsDirectory from "./components/DoctorsDirectory";
import { useAdminPanelController } from "./hooks/useAdminPanelController";

const AdminPanelPage = () => {
  const controller = useAdminPanelController();
  const { t } = useLanguage();

  return (
    <div
      className="dashboard-responsive-page admin-panel-page"
      style={{
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <BulkImportSection
          selectedFacultyId={controller.selectedImportFacultyId}
          facultyOptions={controller.importFacultyOptions}
          selectedFileName={controller.selectedFileName}
          importError={controller.importError}
          importSummary={controller.importSummary}
          importPreview={controller.importPreview}
          isImporting={controller.isImporting}
          onFacultyChange={controller.handleImportFacultyChange}
          onFilePicked={controller.handleImportFilePicked}
          onImport={controller.handleImportSubmit}
          onDownloadTemplate={controller.handleDownloadTemplate}
        />

        <div
          className="admin-panel-main-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: 22,
            alignItems: "start",
          }}
        >
          <ManualDoctorSection
            students={controller.students}
            form={controller.manualForm}
            draft={controller.manualDraft}
            assignments={controller.manualAssignments}
            error={controller.manualError}
            isEditing={controller.isEditingManualDoctor}
            onFormChange={controller.handleManualFormChange}
            onToggleFaculty={controller.handleManualFacultyToggle}
            onDraftChange={controller.handleManualDraftChange}
            onAddAssignment={controller.handleManualAssignmentAdd}
            onRemoveAssignment={controller.handleManualAssignmentRemove}
            onSubmit={controller.handleManualDoctorSubmit}
            onCancelEdit={controller.resetManualDoctorEditor}
            isSubmitting={controller.actionLoading === "saveDoctor"}
          />

          <DoctorsDirectory
            doctors={controller.doctors}
            isLoading={controller.usersStatus === 'loading'}
            onEditDoctor={controller.handleManualDoctorEditStart}
            onRemoveDoctor={controller.handleDoctorDeleteRequest}
            onRemoveAssignment={controller.handleAssignmentDeleteRequest}
          />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(controller.pendingDeleteDoctor)}
        onClose={controller.handleDeleteDialogClose}
        onConfirm={controller.handleDoctorDeleteConfirm}
        title={t("adminRemoveDoctorDialogTitle")}
        message={
          controller.pendingDeleteDoctor
            ? `${t("adminRemoveDoctorDialogMessagePrefix")} ${controller.pendingDeleteDoctor.name} ${t("adminRemoveDoctorDialogMessageSuffix")}`
            : ""
        }
        confirmText={t("adminRemoveConfirm")}
        cancelText={t("adminKeepConfirm")}
        tone="danger"
        loading={controller.actionLoading === "deleteDoctor"}
        loadingText={t("adminRemoveConfirm")}
      />

      <ConfirmationDialog
        isOpen={Boolean(controller.pendingDeleteAssignment)}
        onClose={controller.handleDeleteAssignmentDialogClose}
        onConfirm={controller.handleDeleteAssignmentConfirm}
        title={t("adminRemoveAssignmentDialogTitle")}
        message={
          controller.pendingDeleteAssignment
            ? `${t("adminRemoveAssignmentDialogMessagePrefix")} ${controller.pendingDeleteAssignment.subjectCode} - ${controller.pendingDeleteAssignment.subjectName} ${t("adminRemoveAssignmentDialogMessageMiddle")} ${controller.pendingDeleteAssignment.doctorName}?`
            : ""
        }
        confirmText={t("adminRemoveConfirm")}
        cancelText={t("adminKeepConfirm")}
        tone="danger"
        loading={controller.actionLoading === "deleteAssignment"}
        loadingText={t("adminRemoveConfirm")}
      />
    </div>
  );
};

export default AdminPanelPage;
