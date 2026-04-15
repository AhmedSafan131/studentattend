import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Globe2, LogOut } from "../../assets/icons";
import CustomBottom from "../Bottom";
import { useLanguage } from "../../i18n";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 12, 0.68)",
  backdropFilter: "blur(6px)",
  zIndex: 2000,
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
  zIndex: 2001,
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
  icon,
  tone = "danger",
  selectionMode = false,
  confirmOptionLabel,
  confirmOptionDescription,
  cancelOptionLabel,
  cancelOptionDescription,
}) => {
  const { isRTL } = useLanguage();
  const [selectedAction, setSelectedAction] = useState("confirm");

  useEffect(() => {
    if (isOpen) {
      setSelectedAction("confirm");
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toneStyles = tone === "info"
    ? {
        iconColor: "#38bdf8",
        iconBackground: "rgba(56, 189, 248, 0.14)",
        iconRing: "0 0 0 8px rgba(56, 189, 248, 0.06)",
        confirmBackground: "linear-gradient(135deg, #0ea5e9, #2563eb)",
        confirmShadow: "0 14px 30px rgba(37,99,235,0.24)",
        confirmTextColor: "#eff6ff",
        optionBorder: "rgba(56, 189, 248, 0.24)",
        optionBackground: "rgba(56, 189, 248, 0.08)",
      }
    : {
        iconColor: "#ef4444",
        iconBackground: "rgba(239, 68, 68, 0.12)",
        iconRing: "0 0 0 8px rgba(239, 68, 68, 0.05)",
        confirmBackground: "linear-gradient(135deg, #ef4444, #dc2626)",
        confirmShadow: "0 14px 30px rgba(220,38,38,0.24)",
        confirmTextColor: "#fff",
        optionBorder: "rgba(239, 68, 68, 0.22)",
        optionBackground: "rgba(239, 68, 68, 0.07)",
      };

  const DialogIcon = icon || (tone === "info" ? Globe2 : LogOut);
  const handlePrimaryAction = () => {
    if (selectionMode) {
      if (selectedAction === "confirm") onConfirm();
      else onClose();
      return;
    }

    onConfirm();
  };

  const dialogNode = (
    <>
      <button type="button" aria-label="Close dialog" onClick={onClose} style={overlayStyle} />
      <div
        role="dialog"
        aria-modal="true"
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          ...dialogStyle,
          textAlign: isRTL ? "right" : "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 16px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: toneStyles.iconColor,
            background: toneStyles.iconBackground,
            boxShadow: toneStyles.iconRing,
          }}
        >
          <DialogIcon size={30} />
        </div>

        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 26, fontWeight: 800, textAlign: isRTL ? "right" : "center" }}>
          {title || "Confirm Logout"}
        </h2>
        <p style={{ margin: "12px 0 24px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, textAlign: isRTL ? "right" : "center" }}>
          {message || "Are you sure you want to logout?"}
        </p>

        {selectionMode ? (
          <div style={{ display: "grid", gap: 12, marginBottom: 22, textAlign: isRTL ? "right" : "left" }}>
            {[
              {
                key: "confirm",
                label: confirmOptionLabel || confirmText || "Confirm",
                description: confirmOptionDescription,
              },
              {
                key: "cancel",
                label: cancelOptionLabel || cancelText || "Cancel",
                description: cancelOptionDescription,
              },
            ].map((option) => {
              const active = selectedAction === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedAction(option.key)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 18,
                    border: `1px solid ${active ? toneStyles.optionBorder : "rgba(255,255,255,0.08)"}`,
                    background: active ? toneStyles.optionBackground : "rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    cursor: "pointer",
                    textAlign: isRTL ? "right" : "left",
                    transition: "all 0.18s ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: "50%",
                      border: `1.5px solid ${active ? toneStyles.iconColor : "rgba(255,255,255,0.28)"}`,
                      background: active ? toneStyles.iconColor : "transparent",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {active ? <Check size={12} color="#ffffff" /> : null}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{option.label}</span>
                    {option.description ? (
                      <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexDirection: isRTL ? "row-reverse" : "row" }}>
          <div style={{ flex: 1 }}>
            <CustomBottom
              type="button"
              onClick={onClose}
              text={cancelText || "Cancel"}
              background="var(--bg-dark)"
              textColor="var(--text-primary)"
              border="1px solid var(--border)"
              boxShadow="none"
              minHeight={48}
            />
          </div>
          <div style={{ flex: 1 }}>
            <CustomBottom
              type="button"
              onClick={handlePrimaryAction}
              text={selectionMode ? (selectedAction === "confirm" ? (confirmText || "Continue") : (cancelText || "Cancel")) : (confirmText || "Logout")}
              rigthIcon={<DialogIcon size={16} />}
              background={toneStyles.confirmBackground}
              textColor={toneStyles.confirmTextColor}
              boxShadow={toneStyles.confirmShadow}
              minHeight={48}
            />
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(dialogNode, document.body) : dialogNode;
};

export default ConfirmationDialog;
