import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "../../assets/icons";
import { useLanguage } from "../../i18n";

const CustomDropdown = ({
  label,
  name,
  id,
  options = [],
  value,
  onChange,
  error,
  placeholder = "Select...",
  className = "",
  disabled = false,
  Icon,
  icon,
  menuPlacement = "bottom",
}) => {
  const { isRTL } = useLanguage();
  const inputId = id || name;
  const startIcon = icon || Icon;
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);

  const normalizedOptions = useMemo(
    () => options.map((option) => (typeof option === "object" ? option : { value: option, label: option })),
    [options]
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const emitChange = (nextValue) => {
    if (!onChange) return;
    onChange({
      target: {
        name,
        id: inputId,
        value: nextValue,
      },
    });
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((current) => !current);
    }
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((current) => !current);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", position: "relative" }}>
      {label ? (
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
      ) : null}

      <button
        id={inputId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          minHeight: 56,
          borderRadius: 18,
          border: error ? "1.5px solid rgba(239,68,68,0.55)" : "1.5px solid var(--border)",
          background: error
            ? "linear-gradient(180deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))"
            : "linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 94%, transparent), color-mix(in srgb, var(--bg-dark) 96%, transparent))",
          color: selectedOption ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 14,
          fontWeight: selectedOption ? 600 : 500,
          outline: "none",
          transition: "var(--transition)",
          fontFamily: "inherit",
          boxShadow: isOpen
            ? "0 0 0 4px var(--primary-glow), 0 18px 36px rgba(0,0,0,0.12)"
            : "0 12px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          padding: isRTL ? "0 52px 0 18px" : "0 18px 0 52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          position: "relative",
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {startIcon ? (
          <span
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              [isRTL ? "right" : "left"]: 16,
              color: isOpen ? "var(--primary)" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {typeof startIcon === "function" ? startIcon() : startIcon}
          </span>
        ) : null}

        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption?.label || placeholder}
        </span>

        <span
          style={{
            color: isOpen ? "var(--primary)" : "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease, color 0.2s ease",
            flexShrink: 0,
          }}
        >
          <ChevronDown size={18} />
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: menuPlacement === "top" ? "auto" : "calc(100% + 10px)",
            bottom: menuPlacement === "top" ? "calc(100% + 10px)" : "auto",
            left: 0,
            right: 0,
            zIndex: 30,
            padding: 8,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--bg-card) 96%, transparent)",
            boxShadow: "0 24px 50px rgba(0,0,0,0.18)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
            {normalizedOptions.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    emitChange(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    border: "none",
                    borderRadius: 14,
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(26,107,69,0.18), rgba(52,211,153,0.08))"
                      : "transparent",
                    color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                    padding: isRTL ? "0 14px 0 12px" : "0 12px 0 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: isSelected ? 700 : 600,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  <span>{option.label}</span>
                  <span
                    style={{
                      opacity: isSelected ? 1 : 0,
                      color: "var(--primary)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
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
      ) : null}
    </div>
  );
};

export default CustomDropdown;
