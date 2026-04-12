import React from 'react';
import { Helmet } from 'react-helmet';
import { useLanguage } from '../../i18n';

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

  const pageTitle = resolveByLang(lang, titleEn, titleAr, APP_NAME[lang]);
  const description = resolveByLang(
    lang,
    descriptionEn,
    descriptionAr,
    DEFAULT_DESCRIPTION[lang]
  );
  const fullTitle = `${pageTitle} | ${APP_NAME[lang]}`;

  return (
    <Helmet
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
