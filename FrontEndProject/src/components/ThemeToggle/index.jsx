import React from "react";
import { Moon, SunMedium } from "../../assets/icons";
import { useLanguage } from "../../i18n";

const ThemeToggle = ({ className = "" }) => {
  const { lang, theme, toggleTheme } = useLanguage();
  const isDark = theme === "dark";
  const modeLabel = isDark ? (lang === "ar" ? "\u0641\u0627\u062a\u062d" : "Light") : lang === "ar" ? "\u062f\u0627\u0643\u0646" : "Dark";
  const switchLabel = isDark
    ? lang === "ar"
      ? "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0641\u0627\u062a\u062d"
      : "Switch to light mode"
    : lang === "ar"
      ? "\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062f\u0627\u0643\u0646"
      : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={switchLabel}
      title={switchLabel}
      className={className}
      style={{
        minHeight: 46,
        padding: "0 16px",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(148, 163, 184, 0.28)",
        borderRadius: 14,
        background: isDark ? "rgba(9, 16, 23, 0.72)" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.94))",
        color: isDark ? "#fff" : "#0f172a",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        backdropFilter: "blur(14px)",
        boxShadow: isDark ? "0 10px 35px rgba(0, 0, 0, 0.18)" : "0 10px 28px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {isDark ? <SunMedium size={17} /> : <Moon size={17} />}
      </span>
      <span>{modeLabel}</span>
    </button>
  );
};

export default ThemeToggle;
