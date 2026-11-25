import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";

const ScrollTopBottom = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = () => {
    const scrollPosition = window.pageYOffset;
    setIsVisible(scrollPosition > 300); // Show button after 300px scroll
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Smooth scrolling effect
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll); // Cleanup listener
    };
  }, []);

  return (
    <>
      {isVisible && (
        <div className="z-50">
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-blue text-white p-3 rounded-full shadow-lg border-2 border-light-pink hover:bg-mint-blue focus:outline-none focus:ring-2 focus:ring-mint-green transition duration-300 ease-in-out"
          >
            <FaArrowUp size={24} className="text-light-pink" />
          </button>
        </div>
      )}
    </>
  );
};

export default ScrollTopBottom;
