import React from "react";
import PropTypes from "prop-types";

const Loading = ({ size = 18, color = "#fff", trackColor = "rgba(255,255,255,0.35)" }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `2px solid ${trackColor}`,
      borderTopColor: color,
      display: "inline-block",
      animation: "spin360 0.7s linear infinite",
      flexShrink: 0,
    }}
  />
);

Loading.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  trackColor: PropTypes.string,
};

export default Loading;
