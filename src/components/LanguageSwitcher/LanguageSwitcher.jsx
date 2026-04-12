import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Languages, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme/ThemeProvider";

const LANGUAGES = [
  { value: "ar", flag: "\uD83C\uDDF8\uD83C\uDDE6", labelKey: "language.arabic" },
  { value: "en", flag: "\uD83C\uDDFA\uD83C\uDDF8", labelKey: "language.english" },
];

export default function LanguageSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = i18n.resolvedLanguage || i18n.language || "ar";
  const isLight = theme === "light";

  const handleChange = (language) => {
    localStorage.setItem("i18nextLng", language);
    i18n.changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("language.label")}
        onClick={() => setIsOpen(true)}
        className={`theme-field flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm backdrop-blur-md transition-all duration-300 hover:border-cyan-300/30 ${className}`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-100">
          <Languages className="h-4 w-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-start">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            {t("language.label")}
          </span>
          <span className="mt-0.5 text-sm font-semibold text-white">
            {t(currentLanguage === "ar" ? "language.arabic" : "language.english")}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="theme-overlay absolute inset-0 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.24 }}
              className="theme-modal-surface relative w-full max-w-md rounded-[28px] border p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {t("language.label")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {t("language.modal_title")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="theme-outline-button rounded-full border p-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {LANGUAGES.map((language) => {
                  const isSelected = currentLanguage === language.value;
                  return (
                    <button
                      key={language.value}
                      type="button"
                      onClick={() => handleChange(language.value)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-start transition-all duration-200 ${
                        isSelected
                          ? "border-cyan-300/40 bg-cyan-400/12 shadow-sm"
                          : isLight
                            ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50"
                            : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{language.flag}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {t(language.labelKey)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {language.value === "ar" ? "RTL" : "LTR"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-cyan-400 text-slate-950"
                            : isLight
                              ? "border border-slate-200 text-slate-500"
                              : "border border-white/10 text-slate-500"
                        }`}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
