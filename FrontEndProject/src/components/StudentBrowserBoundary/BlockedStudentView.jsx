import React from 'react';
import { FaChrome, FaSafari } from 'react-icons/fa';
import { ArrowLeft, ArrowUpLeft, BookOpen, Check, Download, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { withAppBasePath } from '../../utils/appBasePath';
import { STUDENT_BROWSER_MESSAGE } from '../../utils/studentBrowserPolicy';

export default function BlockedStudentView({ onRetry, onExit }) {
  return <main className="student-browser-screen student-access-screen" dir="rtl">
    <header className="student-access-brand">
      <div className="student-access-university">
        <img src={withAppBasePath('/mnu-attend-192.png')} alt="شعار جامعة المنوفية الأهلية" width="58" height="58" />
        <div><strong>جامعة المنوفية الأهلية</strong><span>نظام الحضور والغياب الإلكتروني</span></div>
      </div>
      <span className="student-access-portal"><BookOpen size={15} aria-hidden="true" />بوابة الطالب</span>
    </header>
    <section className="student-access-card" role="alert" aria-labelledby="student-access-title">
      <div className="student-access-content">
        <span className="student-access-status"><span aria-hidden="true" />الدخول مقيّد من هذا المتصفح</span>
        <h1 id="student-access-title">تم حظر هذا المتصفح<span className="student-access-title-dot" aria-hidden="true">.</span></h1>
        <p className="student-access-description">{STUDENT_BROWSER_MESSAGE}</p>
        <div className="student-access-options-heading"><span>يمكنك المتابعة بإحدى الطرق التالية</span><span aria-hidden="true" /></div>
        <ul className="student-access-options" aria-label="طرق الدخول البديلة">
          <li><span className="student-access-option-icon student-access-shortcut"><Download size={23} aria-hidden="true" /></span><strong>Shortcut</strong><span>اختصار التطبيق</span></li>
          <li><span className="student-access-option-icon student-access-chrome"><FaChrome size={25} aria-hidden="true" /></span><strong><bdi>Google Chrome</bdi></strong><span>متصفح كروم</span></li>
          <li><span className="student-access-option-icon student-access-safari"><FaSafari size={25} aria-hidden="true" /></span><strong><bdi>Safari</bdi></strong><span>متصفح سفاري</span></li>
        </ul>
        <div className="student-access-actions">
          <button className="student-access-primary" type="button" onClick={onExit} aria-label="تسجيل الخروج والعودة للدخول">العودة لتسجيل الدخول<ArrowLeft size={17} aria-hidden="true" /></button>
          <button className="student-access-secondary" type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" />إعادة التحقق</button>
        </div>
        <p className="student-access-saved"><ShieldCheck size={17} aria-hidden="true" /><span>بيانات الحضور المحفوظة لا تُحذف. التسجيلات غير المتزامنة تبقى في هذا المتصفح.</span></p>
      </div>
      <aside className="student-access-visual" aria-hidden="true">
        <span className="student-access-visual-label"><span />STUDENT PORTAL</span>
        <div className="student-access-illustration">
          <div className="student-access-orbit student-access-orbit-outer" /><div className="student-access-orbit student-access-orbit-inner" />
          <div className="student-access-browser-window">
            <div className="student-access-window-bar"><i /><i /><i /><span /></div>
            <div className="student-access-window-body"><LockKeyhole size={34} strokeWidth={1.5} /><span /><span /></div>
          </div>
          <span className="student-access-lock-badge"><ShieldCheck size={24} strokeWidth={1.6} /></span>
          <span className="student-access-spark student-access-spark-one">+</span><span className="student-access-spark student-access-spark-two">+</span>
        </div>
        <div className="student-access-visual-copy"><span>خطوة بسيطة للمتابعة</span><strong>افتح البوابة من<br />متصفح آخر.</strong><p>اختر طريقة الدخول المناسبة لك<br />وأكمل استخدام بوابة الطالب.</p></div>
        <div className="student-access-visual-bottom"><span>جامعة المنوفية الأهلية</span><ArrowUpLeft size={18} /></div>
      </aside>
      <footer className="student-access-footer">
        <div className="student-access-issuer"><span className="student-access-issuer-icon"><Check size={19} aria-hidden="true" /></span><div><strong>إدارة تكنولوجيا المعلومات</strong><span>جامعة المنوفية الأهلية</span></div></div>
        <span className="student-access-thanks">شكرًا لتفهمكم.</span>
      </footer>
    </section>
    <p className="student-access-page-footer">بوابة الطالب<span aria-hidden="true"> / </span>إدارة تكنولوجيا المعلومات</p>
  </main>;
}
