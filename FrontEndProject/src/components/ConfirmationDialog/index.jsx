import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Globe2, LogOut } from "../../assets/icons";
import CustomBottom from "../Bottom";
import { useLanguage } from "../../i18n";

const DIALOG_ANIMATION_MS = 280;

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
  maxWidth: "calc(100vw - 24px)",
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
  loading = false,
  loadingText,
  compactTypography = false,
  content = null,
}) => {
  const { isRTL, theme } = useLanguage();
  const [selectedAction, setSelectedAction] = useState("confirm");
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setSelectedAction("confirm");
      setAnimateIn(false);
      document.body.style.overflow = "hidden";
      const frame = window.requestAnimationFrame(() => {
        setAnimateIn(true);
      });

      return () => window.cancelAnimationFrame(frame);
    }

    setAnimateIn(false);
    document.body.style.overflow = "";

    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, DIALOG_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  if (!shouldRender) return null;

  const toneStyles = tone === "info"
    ? {
        accent: "#34d399",
        iconColor: "#6ee7b7",
        iconBackground: theme === "dark" ? "rgba(52, 211, 153, 0.16)" : "rgba(52, 211, 153, 0.14)",
        iconRing: theme === "dark" ? "0 0 0 8px rgba(52, 211, 153, 0.07)" : "0 0 0 8px rgba(52, 211, 153, 0.06)",
        confirmBackground: "linear-gradient(135deg, #16a34a, #059669)",
        confirmShadow: "0 16px 34px rgba(5,150,105,0.24)",
        confirmTextColor: "#ecfdf5",
        optionBorder: "rgba(52, 211, 153, 0.24)",
        optionBackground: theme === "dark" ? "rgba(52, 211, 153, 0.1)" : "rgba(52, 211, 153, 0.08)",
      }
    : {
        accent: "#f87171",
        iconColor: "#ef4444",
        iconBackground: theme === "dark" ? "rgba(239, 68, 68, 0.14)" : "rgba(239, 68, 68, 0.12)",
        iconRing: theme === "dark" ? "0 0 0 8px rgba(239, 68, 68, 0.06)" : "0 0 0 8px rgba(239, 68, 68, 0.05)",
        confirmBackground: "linear-gradient(135deg, #ef4444, #dc2626)",
        confirmShadow: "0 16px 34px rgba(220,38,38,0.24)",
        confirmTextColor: "#fff",
        optionBorder: "rgba(239, 68, 68, 0.22)",
        optionBackground: theme === "dark" ? "rgba(239, 68, 68, 0.09)" : "rgba(239, 68, 68, 0.07)",
      };

  const panelBackground = theme === "dark"
    ? "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), linear-gradient(180deg, rgba(13, 22, 36, 0.98), rgba(17, 27, 39, 0.98))"
    : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))";
  const panelBorder = theme === "dark"
    ? `1px solid ${tone === "info" ? "rgba(52, 211, 153, 0.16)" : "rgba(239, 68, 68, 0.14)"}`
    : "1px solid var(--border)";
  const panelShadow = theme === "dark"
    ? "0 28px 80px rgba(2, 6, 12, 0.48)"
    : "0 24px 70px rgba(15, 23, 42, 0.18)";
  const neutralButtonBackground = theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15, 23, 42, 0.04)";
  const neutralButtonBorder = theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--border)";
  const optionIdleShadow = theme === "dark" ? "inset 0 1px 0 rgba(255,255,255,0.03)" : "0 1px 0 rgba(255,255,255,0.7)";
  const buttonDirection = typeof window !== "undefined" && window.innerWidth < 560
    ? "column"
    : (isRTL ? "row-reverse" : "row");

  const DialogIcon = icon || (tone === "info" ? Globe2 : LogOut);
  const handlePrimaryAction = async () => {
    if (selectionMode) {
      if (selectedAction === "confirm") await onConfirm?.();
      else onClose();
      return;
    }

    if (!loading) await onConfirm?.();
  };

  const dialogNode = (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        disabled={loading}
        style={{
          ...overlayStyle,
          opacity: animateIn ? 1 : 0,
          transition: `opacity ${DIALOG_ANIMATION_MS - 40}ms ease`,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          ...dialogStyle,
          border: panelBorder,
          background: panelBackground,
          boxShadow: panelShadow,
          textAlign: isRTL ? "right" : "center",
          opacity: animateIn ? 1 : 0,
          transform: animateIn
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, calc(-50% + 18px)) scale(0.96)",
          transition: `opacity ${DIALOG_ANIMATION_MS - 40}ms ease, transform ${DIALOG_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            insetInline: 18,
            top: 0,
            height: 3,
            borderRadius: "0 0 999px 999px",
            background: `linear-gradient(90deg, transparent, ${toneStyles.accent}, transparent)`,
            opacity: theme === "dark" ? 0.95 : 0.7,
          }}
        />
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
            transform: animateIn ? "scale(1)" : "scale(0.88)",
            opacity: animateIn ? 1 : 0,
            transition: `transform ${DIALOG_ANIMATION_MS + 20}ms cubic-bezier(0.22, 1, 0.36, 1) 40ms, opacity ${DIALOG_ANIMATION_MS - 60}ms ease 40ms`,
          }}
        >
          <DialogIcon size={30} />
        </div>

        <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: compactTypography ? 21 : 26, fontWeight: 800, lineHeight: 1.4, textAlign: isRTL ? "right" : "center" }}>
          {title || "Confirm Logout"}
        </h2>
        <p style={{ margin: "12px 0 24px", color: "var(--text-secondary)", fontSize: compactTypography ? 13 : 14, lineHeight: 1.7, textAlign: isRTL ? "right" : "center" }}>
          {message || "Are you sure you want to logout?"}
        </p>

        {content ? <div style={{ margin: "-8px 0 24px" }}>{content}</div> : null}

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
                    border: `1px solid ${active ? toneStyles.optionBorder : "var(--border)"}`,
                    background: active ? toneStyles.optionBackground : neutralButtonBackground,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    cursor: "pointer",
                    textAlign: isRTL ? "right" : "left",
                    transition: "all 0.18s ease",
                    boxShadow: active ? "0 10px 24px rgba(0,0,0,0.12)" : optionIdleShadow,
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

        {selectionMode ? (
          <div style={{ maxWidth: 220, marginInline: isRTL ? "auto 0" : "0 auto" }}>
            <CustomBottom
              type="button"
              onClick={handlePrimaryAction}
              text={confirmText || "Done"}
              rigthIcon={<Check size={16} />}
              background={toneStyles.confirmBackground}
              textColor={toneStyles.confirmTextColor}
              boxShadow={toneStyles.confirmShadow}
              minHeight={48}
            />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12, flexDirection: buttonDirection }}>
            <div style={{ flex: 1 }}>
              <CustomBottom
                type="button"
                onClick={onClose}
                text={cancelText || "Cancel"}
                disabled={loading}
                background={neutralButtonBackground}
                textColor="var(--text-primary)"
                border={neutralButtonBorder}
                boxShadow="none"
                minHeight={48}
              />
            </div>
            <div style={{ flex: 1 }}>
              <CustomBottom
                type="button"
                onClick={handlePrimaryAction}
                text={confirmText || "Logout"}
                rigthIcon={<DialogIcon size={16} />}
                loading={loading}
                loadingText={loadingText}
                background={toneStyles.confirmBackground}
                textColor={toneStyles.confirmTextColor}
                boxShadow={toneStyles.confirmShadow}
                minHeight={48}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(dialogNode, document.body) : dialogNode;
};

export default ConfirmationDialog;
