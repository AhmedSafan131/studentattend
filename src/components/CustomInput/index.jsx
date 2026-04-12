import React, { useMemo, useState } from "react";
import { useLanguage } from "../../i18n";

const CustomInput = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  className = "",
  Icon,
  icon,
  id,
  disabled = false,
  dir = "ltr",
  autoComplete,
  showPasswordLabel,
  hidePasswordLabel,
  onKeyDown,
  ...props
}) => {
  const { isRTL, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;
  const isPassword = type === "password";
  const startIcon = icon || Icon;
  const actualType = isPassword && showPassword ? "text" : type;

  const paddingStyle = useMemo(() => {
    const startSide = isRTL ? "Right" : "Left";
    const endSide = isRTL ? "Left" : "Right";

    return {
      [`padding${startSide}`]: startIcon ? 42 : 14,
      [`padding${endSide}`]: isPassword ? 54 : 14,
    };
  }, [isPassword, isRTL, startIcon]);

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
      <div style={{ position: "relative" }}>
        {startIcon && (
          <span
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isRTL ? "right" : "left"]: 14,
              color: "var(--text-muted)",
              fontSize: 15,
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            {typeof startIcon === "function" ? startIcon() : startIcon}
          </span>
        )}

        <input
          id={inputId}
          type={actualType}
          name={name}
          placeholder={placeholder}
          {...props}
          value={value}
          onChange={onChange}
          disabled={disabled}
          dir={dir}
          autoComplete={autoComplete}
          onKeyDown={onKeyDown}
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
            boxShadow: error ? "none" : "0 10px 25px rgba(0,0,0,0.08) inset",
            ...paddingStyle,
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = "var(--primary)";
            event.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-glow)";
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = error
              ? "rgba(239,68,68,0.55)"
              : "var(--border)";
            event.currentTarget.style.boxShadow = error
              ? "none"
              : "0 10px 25px rgba(0,0,0,0.08) inset";
          }}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? (hidePasswordLabel || t("loginHidePassword")) : (showPasswordLabel || t("loginShowPassword"))}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isRTL ? "left" : "right"]: 12,
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 8px",
              borderRadius: 8,
            }}
          >
            {showPassword
              ? (hidePasswordLabel || t("loginHidePassword"))
              : (showPasswordLabel || t("loginShowPassword"))}
          </button>
        )}
      </div>

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

export default CustomInput;
