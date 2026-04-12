import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const LanguageContext = createContext(null);

const dictionaries = { en, ar };

const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) || fallback;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => getStoredValue('uniattend_lang', 'en'));
  const [theme, setTheme] = useState(() => getStoredValue('uniattend_theme', 'dark'));

  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.fontFamily = isRTL
      ? "'Cairo', 'Segoe UI', sans-serif"
      : "'Inter', 'Outfit', sans-serif";

    window.localStorage.setItem('uniattend_lang', lang);
    window.localStorage.setItem('uniattend_theme', theme);
  }, [isRTL, lang, theme]);

  const value = useMemo(() => {
    const t = (key) => dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;

    return {
      lang,
      setLang,
      toggleLang: () => setLang((current) => (current === 'en' ? 'ar' : 'en')),
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      isRTL,
      t,
    };
  }, [isRTL, lang, theme]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
};
