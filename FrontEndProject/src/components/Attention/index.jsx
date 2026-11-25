import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import styles from "./Attention.module.css";

export default function AttentionBox({
  message = "من فضلك قم بإرفاق صورة جديدة",
  onAction,
  actionLabel = "إرفاق",
  showAction = false,
  className = "",
}) {
  return (
    <div
      className={`relative w-full max-w-xl mx-auto p-5 sm:p-6
        rounded-2xl border shadow-xl
        bg-[#FFF4B7]
        border-[#000B58]/20 text-[#003161]
        backdrop-blur ${className}`}
    >
      {/* Circles with breathing animation */}
      <div
        className={`absolute -top-6 -left-6 w-20 h-20 rounded-full 
        bg-[#006A67]/20 ${styles.heartbeat} pointer-events-none`}
      />
      <div
        className={`absolute -bottom-6 -right-6 w-16 h-16 rounded-full 
        bg-[#000B58]/15 ${styles.heartbeat} pointer-events-none`}
      />

      <div className="flex items-start gap-4">
        {/* Icon with heartbeat */}
        <div
          className={`${styles.heartbeat} inline-flex items-center justify-center
            w-12 h-12 rounded-full bg-[#003161]
            text-white shadow-lg`}
          aria-hidden="true"
        >
          <FaExclamationTriangle size={22} />
        </div>

        {/* Message + Button */}
        <div className="flex-1">
          <h3 className="font-bold text-[#000B58] text-xl">تنبيه</h3>
          <p className="mt-1 text-sm sm:text-base leading-relaxed">{message}</p>

          {showAction && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center gap-2
                  px-5 py-2.5 rounded-xl font-semibold
                  bg-[#006A67]
                  text-white shadow-md hover:shadow-lg
                  hover:bg-[#00514f]
                  hover:scale-105 active:scale-95
                  transition-all duration-200"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
