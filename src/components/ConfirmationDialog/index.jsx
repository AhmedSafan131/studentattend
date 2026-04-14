import React from "react";
import { LogOut } from "../../assets/icons";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 12, 0.68)",
  backdropFilter: "blur(6px)",
  zIndex: 50,
};

const dialogStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(92vw, 460px)",
  borderRadius: 24,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  padding: 28,
  zIndex: 51,
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
  textAlign: "center",
};

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <button type="button" aria-label="Close dialog" onClick={onClose} style={overlayStyle} />
      <div role="dialog" aria-modal="true" style={dialogStyle}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 16px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            background: "rgba(239, 68, 68, 0.12)",
            boxShadow: "0 0 0 8px rgba(239, 68, 68, 0.05)",
          }}
        >
          <LogOut size={30} />
        </div>

        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 26, fontWeight: 800 }}>
          {title || "Confirm Logout"}
        </h2>
        <p style={{ margin: "12px 0 24px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
          {message || "Are you sure you want to logout?"}
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg-dark)",
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {cancelText || "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <LogOut size={16} />
            {confirmText || "Logout"}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmationDialog;
