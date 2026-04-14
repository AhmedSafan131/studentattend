import React from "react";
import { Globe2 } from "../../assets/icons";
import { useLanguage } from "../../i18n";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, toggleLang } = useLanguage();
  const currentLabel = lang === "ar" ? "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "English";
  const switchLabel = lang === "ar" ? "Switch to English" : "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064a\u0629";

  return (
    <button
      type="button"
      onClick={toggleLang}
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
  );
}
