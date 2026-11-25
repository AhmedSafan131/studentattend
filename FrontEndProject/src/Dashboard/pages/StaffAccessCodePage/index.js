import React from 'react';
import { Navigate } from 'react-router-dom';
import { LockKeyhole } from '../../../assets/icons';
import { useAuth } from '../../../hooks';
import { useLanguage } from '../../../i18n';
import StaffAccessCodeCard from '../DoctorDashboard/components/StaffAccessCodeCard';

const StaffAccessCodePage = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();

  if (user?.loginMethod === 'temporary_access_code') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="tw-page-shell min-h-full px-2 py-4 md:px-1 md:py-5">
      <section className="dashboard-accent-hero mb-5 overflow-hidden rounded-3xl border p-5 md:p-7">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent"><LockKeyhole size={23} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">{lang === 'ar' ? '\u0627\u0644\u062f\u062e\u0648\u0644 \u0627\u0644\u0622\u0645\u0646' : 'Secure access'}</p>
            <h1 className="mt-2 text-2xl font-black text-text-primary md:text-3xl">{lang === 'ar' ? '\u0631\u0645\u0632 \u0627\u0644\u062f\u062e\u0648\u0644 \u0627\u0644\u0645\u0624\u0642\u062a' : 'Temporary sign-in code'}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{lang === 'ar' ? '\u0623\u0646\u0634\u0626 \u0631\u0645\u0632\u064b\u0627 \u0642\u0635\u064a\u0631\u064b\u0627 \u0644\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644 \u062c\u062f\u064a\u062f \u0622\u0645\u0646 \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u0643.' : 'Create a short-lived secure code for a new sign-in to your account.'}</p>
          </div>
        </div>
      </section>
      <StaffAccessCodeCard />
    </div>
  );
};

export default StaffAccessCodePage;
