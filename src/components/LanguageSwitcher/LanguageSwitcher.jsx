import React, { useMemo, useState } from "react";
import { Globe2 } from "../../assets/icons";
import { useLanguage } from "../../i18n";
import ConfirmationDialog from "../ConfirmationDialog";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, toggleLang } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const nextLanguageLabel = lang === "ar" ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064a\u0629";
  const currentLabel = lang === "ar" ? "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "English";
  const switchLabel = lang === "ar" ? "Switch to English" : "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064a\u0629";
  const dialogCopy = useMemo(
    () => (lang === "ar"
      ? {
          title: "\u062a\u0623\u0643\u064a\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0644\u063a\u0629",
          message: `\u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0645\u0646 ${currentLabel} \u0625\u0644\u0649 ${nextLanguageLabel}.`,
          confirmText: "\u0645\u062a\u0627\u0628\u0639\u0629",
          cancelText: "\u0625\u0644\u063a\u0627\u0621",
          confirmOptionLabel: `\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 ${nextLanguageLabel}`,
          confirmOptionDescription: `\u062a\u0637\u0628\u064a\u0642 ${nextLanguageLabel} \u0639\u0644\u0649 \u062c\u0645\u064a\u0639 \u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0641\u0648\u0631\u064b\u0627.`,
          cancelOptionLabel: "\u0627\u0644\u0625\u0628\u0642\u0627\u0621 \u0639\u0644\u0649 \u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
          cancelOptionDescription: "\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u062f\u0648\u0646 \u0623\u064a \u062a\u0639\u062f\u064a\u0644 \u0639\u0644\u0649 \u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629.",
        }
      : {
          title: "Confirm Language Change",
          message: `Switch the application language from ${currentLabel} to ${nextLanguageLabel}.`,
          confirmText: "Continue",
          cancelText: "Cancel",
          confirmOptionLabel: `Switch to ${nextLanguageLabel}`,
          confirmOptionDescription: `Apply ${nextLanguageLabel} across the full interface right now.`,
          cancelOptionLabel: "Keep current language",
          cancelOptionDescription: "Close this dialog and continue using the current interface language.",
        }),
    [currentLabel, lang, nextLanguageLabel],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        aria-label={switchLabel}
        title={switchLabel}
        className={className}
        style={{
          minHeight: 46,
          padding: "0 16px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 14,
          background: "rgba(9, 16, 23, 0.72)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          boxShadow: "0 10px 35px rgba(0, 0, 0, 0.18)",
        }}
      >
        <Globe2 size={16} />
        <span>{currentLabel}</span>
      </button>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          toggleLang();
        }}
        title={dialogCopy.title}
        message={dialogCopy.message}
        confirmText={dialogCopy.confirmText}
        cancelText={dialogCopy.cancelText}
        confirmOptionLabel={dialogCopy.confirmOptionLabel}
        confirmOptionDescription={dialogCopy.confirmOptionDescription}
        cancelOptionLabel={dialogCopy.cancelOptionLabel}
        cancelOptionDescription={dialogCopy.cancelOptionDescription}
        selectionMode
        tone="info"
        icon={Globe2}
      />
    </>
  );
}
