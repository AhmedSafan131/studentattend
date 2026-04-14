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
  loadingText,
  textStyle,
  type = "button",
}) => {
  return (
    <div className={styles} style={{ width: "100%" }}>
      <button
        type={type}
        title={title}
        onClick={!loading ? onClick : undefined}
        disabled={loading}
        className={buttonStyles}
        style={{
          width: "100%",
          minHeight: 52,
          border: "none",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-light))",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          transition: "var(--transition)",
          boxShadow: "0 14px 30px rgba(26,107,69,0.25)",
          opacity: loading ? 0.75 : 1,
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
  loadingText: PropTypes.string,
  type: PropTypes.oneOf(["button", "submit"]),
};

CustomBottom.defaultProps = {
  title: "Button",
  onClick: undefined,
  styles: "",
  buttonStyles: "",
  textStyle: "",
  loading: false,
  loadingText: "Loading...",
  type: "button",
};

export default CustomBottom;
