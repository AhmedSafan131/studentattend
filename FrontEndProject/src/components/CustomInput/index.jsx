import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Lock } from "../../assets/icons";
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
  dir,
  autoComplete,
  showPasswordLabel,
  hidePasswordLabel,
  onKeyDown,
  showLockIfDisabled = true,
  ...props
}) => {
  const { isRTL, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;
  const isPassword = type === "password";
  const startIcon = icon || Icon;
  const actualType = isPassword && showPassword ? "text" : type;

  // If dir is not explicitly passed, automatically default based on isRTL
  const effectiveDir = dir || (isRTL ? "rtl" : "ltr");
  const isEffectiveRTL = effectiveDir === "rtl";
  const showLockIcon = disabled && showLockIfDisabled;

  const paddingStyle = useMemo(() => {
    const startSide = isEffectiveRTL ? "Right" : "Left";
    const endSide = isEffectiveRTL ? "Left" : "Right";
    const hasEndElement = isPassword || showLockIcon;

    return {
      [`padding${startSide}`]: startIcon ? 42 : 14,
      [`padding${endSide}`]: hasEndElement ? 42 : 14,
    };
  }, [isEffectiveRTL, startIcon, isPassword, showLockIcon]);

  return (
    <div className={className} style={{ width: "100%" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 700,
            color: disabled ? "var(--text-muted, #64748b)" : "var(--text-secondary, #94a3b8)",
            textAlign: isEffectiveRTL ? "right" : "left",
          }}
        >
          <span>{label}</span>
          {showLockIcon && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted, #64748b)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Lock size={12} />
              {isRTL ? "غير قابل للتعديل" : "Read-only"}
            </span>
          )}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {startIcon && (
          <span
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isEffectiveRTL ? "right" : "left"]: 14,
              color: "var(--text-muted)",
              fontSize: 15,
              lineHeight: 1,
              pointerEvents: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
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
          dir={effectiveDir}
          autoComplete={autoComplete}
          onKeyDown={onKeyDown}
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 14,
            border: disabled
              ? "1.5px dashed rgba(255, 255, 255, 0.16)"
              : error
              ? "1.5px solid rgba(239, 68, 68, 0.55)"
              : "1.5px solid var(--border, rgba(255,255,255,0.1))",
            background: disabled
              ? "rgba(15, 23, 42, 0.55)"
              : error
              ? "rgba(239, 68, 68, 0.08)"
              : "var(--bg-dark, #0b1329)",
            color: disabled ? "var(--text-muted, #94a3b8)" : "var(--text-primary, #f8fafc)",
            fontSize: 14,
            fontWeight: 500,
            outline: "none",
            transition: "all 0.2s ease",
            fontFamily: "inherit",
            textAlign: isEffectiveRTL ? "right" : "left",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.85 : 1,
            boxShadow: error ? "none" : "0 10px 25px rgba(0,0,0,0.08) inset",
            ...paddingStyle,
          }}
          onFocus={(event) => {
            if (!disabled) {
              event.currentTarget.style.borderColor = "var(--primary, #10b981)";
              event.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.2)";
            }
          }}
          onBlur={(event) => {
            if (!disabled) {
              event.currentTarget.style.borderColor = error
                ? "rgba(239,68,68,0.55)"
                : "var(--border, rgba(255,255,255,0.1))";
              event.currentTarget.style.boxShadow = error
                ? "none"
                : "0 10px 25px rgba(0,0,0,0.08) inset";
            }
          }}
        />

        {showLockIcon && !isPassword && (
          <span
            title={isRTL ? "هذا الحقل غير قابل للتعديل" : "This field is locked"}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isEffectiveRTL ? "left" : "right"]: 14,
              color: "var(--text-muted, #64748b)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              opacity: 0.85,
            }}
          >
            <Lock size={16} />
          </span>
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? (hidePasswordLabel || t("loginHidePassword")) : (showPasswordLabel || t("loginShowPassword"))}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isEffectiveRTL ? "left" : "right"]: 12,
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: 8,
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
            textAlign: isEffectiveRTL ? "right" : "left",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default CustomInput;

