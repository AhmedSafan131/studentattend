import React, { useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import lottie from "lottie-web";
import booksStackAnimation from "../../assets/Lottie/Books stack.json";
import { useLanguage } from "../../i18n";

const Loading = ({
  size = 34,
  color = "#fff",
  label = "Loading...",
  showLabel = false,
  filter,
}) => {
  const { theme } = useLanguage();
  const containerRef = useRef(null);
  const resolvedFilter = useMemo(() => {
    if (typeof filter === "string") {
      return filter;
    }

    return theme === "light" ? "brightness(0)" : "brightness(0) invert(1)";
  }, [filter, theme]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: booksStackAnimation,
    });

    return () => animation.destroy();
  }, []);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: showLabel ? 8 : 0,
        color,
        lineHeight: 1,
      }}
    >
      <span
        ref={containerRef}
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          overflow: "hidden",
          flexShrink: 0,
          filter: resolvedFilter,
        }}
      />
      {showLabel ? (
        <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
          {label}
        </span>
      ) : null}
    </span>
  );
};

Loading.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  filter: PropTypes.string,
};

export default Loading;
