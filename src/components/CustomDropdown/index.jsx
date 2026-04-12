import React from "react";
import { useLanguage } from "../../i18n";

const CustomDropdown = ({
  label,
  name,
  id,
  options,
  value,
  onChange,
  error,
  placeholder = "Select...",
  className = "",
  disabled = false,
}) => {
  const { isRTL } = useLanguage();
  const inputId = id || name;

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: "var(--text-muted)",
          }}
        >
          {label}
        </label>
      )}

      <select
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 14,
          border: error ? "1.5px solid rgba(239,68,68,0.55)" : "1.5px solid var(--border)",
          background: error ? "rgba(239,68,68,0.08)" : "var(--bg-dark)",
          color: "var(--text-primary)",
          fontSize: 14,
          fontWeight: 500,
          outline: "none",
          transition: "var(--transition)",
          fontFamily: "inherit",
          padding: "0 14px",
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "var(--primary)";
          event.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)";
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = error
            ? "rgba(239,68,68,0.55)"
            : "var(--border)";
          event.currentTarget.style.boxShadow = "none";
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div
          style={{
            marginTop: 8,
            color: "#f87171",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
