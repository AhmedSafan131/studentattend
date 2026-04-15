import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../../i18n';

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

const decodeEscapedUnicode = (value) => (
  typeof value === 'string'
    ? value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    : value
);

const looksLikeMojibake = (value) => (
  typeof value === 'string' && /[ÃÂØÙ]|Ãƒ|Ëœ|â€|Å/.test(value)
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

const normalizeMetadataText = (value) => {
  if (typeof value !== 'string') return value;

  let current = decodeEscapedUnicode(value);

  if (!looksLikeMojibake(current)) {
    return current;
  }

  for (let index = 0; index < 6; index += 1) {
    const bytes = toWindows1252Bytes(current);
    if (!bytes) break;

    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (!decoded || decoded === current) break;

    current = decodeEscapedUnicode(decoded);

    if (!looksLikeMojibake(current)) {
      break;
    }
  }

  return current;
};

const SAFE_APP_NAME = {
  en: 'UniAttend',
  ar: 'يوني أتيند',
};

const SAFE_DEFAULT_DESCRIPTION = {
  en: 'Smart attendance management for Menoufia National University.',
  ar: 'نظام ذكي لإدارة الحضور في جامعة المنوفية الأهلية.',
};

const APP_NAME = {
  en: 'UniAttend',
  ar: 'يوني أتند',
};

const DEFAULT_DESCRIPTION = {
  en: 'Smart attendance management for Menoufia National University.',
  ar: 'نظام ذكي لإدارة الحضور في جامعة المنوفية الأهلية.',
};

const resolveByLang = (lang, enValue, arValue, fallback) => (
  lang === 'ar' ? (arValue || enValue || fallback) : (enValue || arValue || fallback)
);

const AppHelmet = ({
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
}) => {
  const { lang, isRTL } = useLanguage();
  const location = useLocation();

  const appName = normalizeMetadataText(SAFE_APP_NAME[lang] || APP_NAME[lang]);
  const pageTitle = normalizeMetadataText(resolveByLang(lang, titleEn, titleAr, appName));
  const description = normalizeMetadataText(resolveByLang(
    lang,
    descriptionEn,
    descriptionAr,
    SAFE_DEFAULT_DESCRIPTION[lang] || DEFAULT_DESCRIPTION[lang]
  ));
  const fullTitle = `${pageTitle} | ${appName}`;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.title = fullTitle;

    const ensureMeta = (selector, attributes) => {
      let metaTag = document.head.querySelector(selector);

      if (!metaTag) {
        metaTag = document.createElement('meta');
        Object.entries(attributes).forEach(([key, value]) => {
          metaTag.setAttribute(key, value);
        });
        document.head.appendChild(metaTag);
      }

      return metaTag;
    };

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', fullTitle);
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
  }, [description, fullTitle, isRTL, lang, location.pathname]);

  return (
    <Helmet
      key={`${lang}-${location.pathname}`}
      htmlAttributes={{ lang, dir: isRTL ? 'rtl' : 'ltr' }}
      title={fullTitle}
      meta={[
        { name: 'description', content: description },
        { property: 'og:title', content: fullTitle },
        { property: 'og:description', content: description },
      ]}
    />
  );
};

export default AppHelmet;
