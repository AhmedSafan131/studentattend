import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const LanguageContext = createContext(null);

const dictionaries = { en, ar };

const AR_TRANSLATION_OVERRIDES = {
  appName: '\u064a\u0648\u0646\u064a \u0623\u062a\u064a\u0646\u062f',
  appSubtitle: '\u0646\u0638\u0627\u0645 \u0627\u0644\u062d\u0636\u0648\u0631 \u0627\u0644\u0630\u0643\u064a \u0627\u0644\u062c\u0627\u0645\u0639\u064a',
  universityName: '\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0645\u0646\u0648\u0641\u064a\u0629 \u0627\u0644\u0623\u0647\u0644\u064a\u0629',
  footerUniversitySystem: '\u062a\u062c\u0631\u0628\u0629 \u062d\u0636\u0648\u0631 \u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629 \u0630\u0643\u064a\u0629 \u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0645\u0646\u0648\u0641\u064a\u0629 \u0627\u0644\u0623\u0647\u0644\u064a\u0629.',
  footerRights: '\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629 \u00a9 {year} \u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0645\u0646\u0648\u0641\u064a\u0629 \u0627\u0644\u0623\u0647\u0644\u064a\u0629.',
};

const CP1252_REVERSE_MAP = {
  0x20AC: 0x80,
  0x201A: 0x82,
  0x0192: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02C6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8A,
  0x2039: 0x8B,
  0x0152: 0x8C,
  0x017D: 0x8E,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02DC: 0x98,
  0x2122: 0x99,
  0x0161: 0x9A,
  0x203A: 0x9B,
  0x0153: 0x9C,
  0x017E: 0x9E,
  0x0178: 0x9F,
};

const looksLikeMojibake = (value) => typeof value === 'string' && /[ÃÂØÙ]|Ãƒ|Ëœ|â€|Å/.test(value);

const decodeEscapedUnicode = (value) => (
  typeof value === 'string'
    ? value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    : value
);

const toWindows1252Bytes = (value) => {
  const bytes = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    if (CP1252_REVERSE_MAP[codePoint] != null) {
      bytes.push(CP1252_REVERSE_MAP[codePoint]);
      continue;
    }

    return null;
  }

  return Uint8Array.from(bytes);
};

const recoverMojibake = (value) => {
  if (typeof value !== 'string') return value;

  let current = decodeEscapedUnicode(value);

  if (!looksLikeMojibake(current)) return current;

  for (let i = 0; i < 6; i += 1) {
    const bytes = toWindows1252Bytes(current);
    if (!bytes) break;

    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (!decoded || decoded === current) break;

    current = decodeEscapedUnicode(decoded);
    if (!looksLikeMojibake(current)) break;
  }

  return current;
};

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
    const t = (key) => {
      if (lang === 'ar' && AR_TRANSLATION_OVERRIDES[key]) {
        return AR_TRANSLATION_OVERRIDES[key];
      }

      const rawValue = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
      return lang === 'ar' ? recoverMojibake(rawValue) : rawValue;
    };

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
