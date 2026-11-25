import React, { useMemo, useState } from "react";
import { Globe2 } from "../../assets/icons";
import { useLanguage } from "../../i18n";
import ConfirmationDialog from "../ConfirmationDialog";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, theme, toggleLang } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const nextLanguageLabel = lang === "ar" ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064a\u0629";
  const currentLabel = lang === "ar" ? "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "English";
  const switchLabel = lang === "ar" ? "Switch to English" : "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064a\u0629";
  const dialogCopy = useMemo(
    () => (lang === "ar"
      ? {
          title: "\u062a\u0623\u0643\u064a\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0644\u063a\u0629",
          message: `\u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0645\u0646 ${currentLabel} \u0625\u0644\u0649 ${nextLanguageLabel}.`,
          confirmText: "\u062a\u0645",
          cancelText: "\u0625\u0644\u063a\u0627\u0621",
          confirmOptionLabel: nextLanguageLabel,
          confirmOptionDescription: "",
          cancelOptionLabel: currentLabel,
          cancelOptionDescription: "",
        }
      : {
          title: "Confirm Language Change",
          message: `Switch the application language from ${currentLabel} to ${nextLanguageLabel}.`,
          confirmText: "Done",
          cancelText: "Cancel",
          confirmOptionLabel: nextLanguageLabel,
          confirmOptionDescription: "",
          cancelOptionLabel: currentLabel,
          cancelOptionDescription: "",
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
          border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(148, 163, 184, 0.28)",
          borderRadius: 14,
          background: theme === "dark" ? "rgba(9, 16, 23, 0.72)" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.94))",
          color: theme === "dark" ? "#fff" : "#0f172a",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          backdropFilter: "blur(14px)",
          boxShadow: theme === "dark" ? "0 10px 35px rgba(0, 0, 0, 0.18)" : "0 10px 28px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
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
