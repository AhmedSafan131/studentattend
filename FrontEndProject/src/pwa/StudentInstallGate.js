import React, { useState } from 'react';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { useLanguage } from '../i18n';
import { useStudentPwa } from './StudentPwaContext';

const StudentInstallGate = ({ compact = false }) => {
  const { lang, isRTL } = useLanguage();
  const { install, installStatus, isInstallAvailable, isIos } = useStudentPwa();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const ar = lang === 'ar';

  const handleInstall = async () => {
    if (!isInstallAvailable) {
      setShowInstallHelp(true);
      return;
    }

    try {
      const result = await install();
      if (result?.outcome !== 'accepted') setShowInstallHelp(true);
    } catch (_) {
      setShowInstallHelp(true);
    }
  };

  const showManualSteps = installStatus !== 'checking'
    && installStatus !== 'installed'
    && (!isInstallAvailable || showInstallHelp);
  const manualSteps = isIos
    ? (ar
      ? [
        'افتح الرابط في متصفح Safari.',
        'اضغط زر المشاركة أسفل الشاشة.',
        'اختر «إضافة إلى الشاشة الرئيسية».',
        'اضغط «إضافة»، ثم افتح mnu-attend من الأيقونة الجديدة.',
      ]
      : [
        'Open the link in Safari.',
        'Tap the Share button at the bottom of the screen.',
        'Choose “Add to Home Screen”.',
        'Tap “Add”, then open mnu-attend from its new icon.',
      ])
    : (ar
      ? [
        'افتح الرابط في تطبيق Google Chrome العادي، وليس التصفح الخفي أو متصفحًا آخر.',
        'اضغط علامة الثلاث نقاط ⋮ أعلى شاشة Chrome.',
        'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
        'إذا ظهرت نافذة Install and create shortcut فاختر Install ثم اضغط «تثبيت».',
        'بعد اكتمال التثبيت افتح mnu-attend من الأيقونة الجديدة على الهاتف.',
      ]
      : [
        'Open the link in the regular Google Chrome app, not Incognito or another browser.',
        'Tap the three-dot menu ⋮ at the top of Chrome.',
        'Choose “Install app” or “Add to Home screen”.',
        'If “Install and create shortcut” appears, choose Install and confirm.',
        'When installation finishes, open mnu-attend from its new phone icon.',
      ]);

  return (
    <section
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-live="polite"
      style={{
        border: '1px solid color-mix(in srgb, var(--border) 70%, #10b981 30%)',
        borderRadius: 22,
        padding: compact ? 18 : 24,
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--bg-card) 94%, #10b981 6%), var(--bg-card2))',
        color: 'var(--text-primary)',
        boxShadow: '0 18px 45px rgba(2, 44, 34, .12)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 46, height: 46, flex: '0 0 46px', display: 'grid', placeItems: 'center', borderRadius: 15, background: 'rgba(16,185,129,.14)', color: '#10b981' }}>
          <Smartphone size={25} />
        </div>
        <div>
          <h3 style={{ margin: '1px 0 7px', fontSize: compact ? 18 : 21 }}>
            {ar ? 'ثبّت تطبيق mnu-attend للطلاب' : 'Install the mnu-attend student app'}
          </h3>
        </div>
      </div>

      {isInstallAvailable ? (
        <div style={{ marginTop: 17, padding: '12px 14px', borderRadius: 14, background: 'rgba(245,158,11,.09)', border: '1px solid rgba(245,158,11,.22)', fontSize: 13, lineHeight: 1.75 }}>
          {isIos
            ? (ar ? 'في Safari اضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية»، وبعدها افتح التطبيق من الأيقونة.' : 'In Safari, tap Share, choose “Add to Home Screen”, then open the app from its icon.')
            : (ar ? 'افتح الرابط في Chrome العادي وليس وضع التصفح الخفي، ثم اضغط زر التثبيت بالأسفل.' : 'Open this link in regular Chrome, not Incognito mode, then use the install button below.')}
        </div>
      ) : null}

      {isInstallAvailable ? (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={handleInstall}
            style={{ width: '100%', minHeight: 48, border: 0, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', font: 'inherit', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
          >
            <Download size={19} />
            {installStatus === 'installing' ? (ar ? 'جارٍ التثبيت...' : 'Installing...') : (ar ? 'تثبيت التطبيق' : 'Install app')}
          </button>
        </div>
      ) : null}

      {showManualSteps ? (
        <div style={{ marginTop: 14, padding: '15px 16px', borderRadius: 15, border: '1px solid color-mix(in srgb, var(--border) 78%, #10b981 22%)', background: 'color-mix(in srgb, var(--bg-card) 94%, #10b981 6%)' }}>
          <strong style={{ display: 'block', marginBottom: 10, fontSize: 14 }}>
            {ar ? 'خطوات تثبيت التطبيق على الهاتف' : 'How to install the app on your phone'}
          </strong>
          <div style={{ display: 'grid', gap: 10 }}>
            {manualSteps.map((step, index) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.75 }}>
                <span style={{ width: 25, height: 25, flex: '0 0 25px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(16,185,129,.14)', color: '#10b981', fontWeight: 800, lineHeight: 1 }}>
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {installStatus === 'installed' ? (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: '11px 13px',
            borderRadius: 13,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            color: 'var(--text-secondary)',
            background: 'rgba(16,185,129,.08)',
            border: '1px solid rgba(16,185,129,.2)',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <CheckCircle2 size={18} style={{ flex: '0 0 18px', marginTop: 2 }} />
          <span>
            {ar
              ? 'تم تثبيت التطبيق. افتح mnu-attend من الأيقونة الجديدة، وليس من تبويب المتصفح.'
              : 'The app is installed. Open mnu-attend from its new icon, not from this browser tab.'}
          </span>
        </div>
      ) : null}
    </section>
  );
};

export default StudentInstallGate;
