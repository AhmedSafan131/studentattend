import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="theme-overlay absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="theme-modal-surface relative w-full max-w-md overflow-hidden rounded-3xl border p-8 text-center shadow-2xl"
          >
            <div className="absolute left-0 top-0 h-1 w-full bg-red-500"></div>

            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 ring-4 ring-red-500/5">
              <LogOut size={32} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">{title || "Confirm Logout"}</h2>
            <p className="mb-8 text-sm text-gray-400">{message || "Are you sure you want to logout?"}</p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="theme-outline-button flex-1 rounded-xl py-3.5 font-semibold transition-all duration-200"
              >
                {cancelText || "Cancel"}
              </button>
              <button
                onClick={onConfirm}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all duration-200 ${
                  isLight
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/15 hover:shadow-red-500/30"
                    : "bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:shadow-red-500/40"
                }`}
              >
                <LogOut size={18} />
                {confirmText || "Logout"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;
