import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import lottie from 'lottie-web';
import booksStackAnimation from '../../../../assets/Lottie/Books stack.json';

const LottieLoading = ({
  label = 'Loading...',
  size = 38,
  showLabel = true,
  color = 'currentColor',
  filter,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
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
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          display: 'inline-flex',
          overflow: 'hidden',
          flexShrink: 0,
          filter,
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

LottieLoading.propTypes = {
  label: PropTypes.string,
  size: PropTypes.number,
  showLabel: PropTypes.bool,
  color: PropTypes.string,
  filter: PropTypes.string,
};

export default LottieLoading;
