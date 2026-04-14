import React from "react";
import PropTypes from "prop-types";
import Loading from "../Loading";

const CustomBottom = ({
  text,
  title,
  onClick,
  styles,
  buttonStyles,
  rigthIcon,
  loading,
  disabled,
  loadingText,
  textStyle,
  background,
  textColor,
  border,
  boxShadow,
  minHeight,
  disabledBackground,
  disabledTextColor,
  disabledBorder,
  disabledBoxShadow,
  disabledOpacity,
  type = "button",
}) => {
  const isInactive = loading || disabled;

  return (
    <div className={styles} style={{ width: "100%" }}>
      <button
        type={type}
        title={title}
        onClick={!isInactive ? onClick : undefined}
        disabled={isInactive}
        className={buttonStyles}
        style={{
          width: "100%",
          minHeight: minHeight || 52,
          border: isInactive ? (disabledBorder || border || "none") : (border || "none"),
          borderRadius: 14,
          background: isInactive
            ? (disabledBackground || background || "linear-gradient(135deg, var(--primary), var(--primary-light))")
            : (background || "linear-gradient(135deg, var(--primary), var(--primary-light))"),
          color: isInactive ? (disabledTextColor || textColor || "#fff") : (textColor || "#fff"),
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 700,
          cursor: isInactive ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transition: "var(--transition)",
          boxShadow: isInactive
            ? (disabledBoxShadow || boxShadow || "0 14px 30px rgba(26,107,69,0.25)")
            : (boxShadow || "0 14px 30px rgba(26,107,69,0.25)"),
          opacity: isInactive ? (disabledOpacity ?? 0.82) : 1,
        }}
      >
        {loading ? (
          <>
            <Loading />
            <span className={textStyle}>{loadingText || "Loading..."}</span>
          </>
        ) : (
          <>
            <span className={textStyle}>{text}</span>
            {rigthIcon ? <span>{rigthIcon}</span> : null}
          </>
        )}
      </button>
    </div>
  );
};

CustomBottom.propTypes = {
  text: PropTypes.string.isRequired,
  title: PropTypes.string,
  onClick: PropTypes.func,
  styles: PropTypes.string,
  buttonStyles: PropTypes.string,
  textStyle: PropTypes.string,
  rigthIcon: PropTypes.node,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  loadingText: PropTypes.string,
  background: PropTypes.string,
  textColor: PropTypes.string,
  border: PropTypes.string,
  boxShadow: PropTypes.string,
  minHeight: PropTypes.number,
  disabledBackground: PropTypes.string,
  disabledTextColor: PropTypes.string,
  disabledBorder: PropTypes.string,
  disabledBoxShadow: PropTypes.string,
  disabledOpacity: PropTypes.number,
  type: PropTypes.oneOf(["button", "submit"]),
};

CustomBottom.defaultProps = {
  title: "Button",
  onClick: undefined,
  styles: "",
  buttonStyles: "",
  textStyle: "",
  loading: false,
  disabled: false,
  loadingText: "Loading...",
  background: undefined,
  textColor: "#fff",
  border: undefined,
  boxShadow: undefined,
  minHeight: 52,
  disabledBackground: undefined,
  disabledTextColor: undefined,
  disabledBorder: undefined,
  disabledBoxShadow: undefined,
  disabledOpacity: undefined,
  type: "button",
};

export default CustomBottom;
