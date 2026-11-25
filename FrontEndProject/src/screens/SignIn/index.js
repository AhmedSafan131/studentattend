import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n";
import AppHelmet from "../../components/AppHelmet";
import { mnuLogo } from "../../assets";
import {
  ArrowUpRight,
  Building2,
  LockKeyhole,
  LoginActionIcon,
  UserCircle2,
} from "../../assets/icons";
import { useAuth, useToast } from "../../hooks";
import { CustomBottom, CustomDropdown, CustomInput } from "../../components";
import { StudentInstallGate, useStudentPwa } from "../../pwa";
import { assessStudentStorageSafety } from "../../StudentApp/studentStorage";

const SignIn = () => {
  const { t, lang, isRTL } = useLanguage();
  const { signInWithCredentials } = useAuth();
  const { showToast } = useToast();
  const { isStandalone, studentLoginOptions } = useStudentPwa();
  const { pwaEnabled, webLoginEnabled, privateBrowsingProtectionEnabled } = studentLoginOptions;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState("student");
  const [studentLoginMode, setStudentLoginMode] = useState(() => (isStandalone ? "web" : "install"));
  const [staffLoginMode, setStaffLoginMode] = useState("password");
  const [staffOtp, setStaffOtp] = useState("");
  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;

    // Keep scrolling owned by the sign-in surface instead of the document.
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  useEffect(() => {
    setStudentLoginMode((current) => {
      if (isStandalone) return "web";
      if (current === "install" && !pwaEnabled) return "web";
      if (current === "web" && !webLoginEnabled) return "install";
      return current;
    });
  }, [isStandalone, pwaEnabled, webLoginEnabled]);

  const ticketSystemLabel =
    lang === "ar"
      ? "\u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u064a \u0648\u0646\u0638\u0627\u0645 \u0627\u0644\u062a\u0630\u0627\u0643\u0631"
      : "Support Ticket System";
  const roleOptions = useMemo(
    () => [
      { value: "staff", label: t("staffRole") },
      { value: "admin", label: t("adminRole") },
      { value: "student", label: t("studentRole") },
    ],
    [t],
  );

  const identifierLabel = lang === "ar" ? "اسم المستخدم" : "USERNAME";
  const identifierPlaceholder =
    loginRole === "student"
      ? lang === "ar"
        ? "305012191600401"
        : "30712210700127"
      : loginRole === "staff"
        ? lang === "ar"
          ? "الرقم القومي أو اسم المستخدم"
          : "National ID or username"
        : lang === "ar"
          ? "admin@mnu.edu.eg"
          : "dmin@mnu.edu.eg";

  const studentStorageErrorMessage = () => {
    if (pwaEnabled && webLoginEnabled) {
      return lang === "ar"
        ? "لا يمكن حفظ بيانات هذا الجهاز بشكل دائم. أغلق وضع التصفح الخاص وافتح الرابط في Chrome أو Safari العادي، أو افتح التطبيق المثبت من الشاشة الرئيسية."
        : "This device cannot keep the required data permanently. Leave private browsing and open the link in regular Chrome or Safari, or use the installed app from your home screen.";
    }

    if (pwaEnabled) {
      return lang === "ar"
        ? "لا يمكن تسجيل دخول الطالب من تخزين مؤقت. أغلق وضع التصفح الخاص وافتح التطبيق المثبت من الشاشة الرئيسية."
        : "Student sign-in is unavailable with temporary storage. Leave private browsing and open the installed app from your home screen.";
    }

    return lang === "ar"
      ? "لا يمكن تسجيل دخول الطالب من وضع التصفح الخاص. افتح الرابط في Chrome أو Safari العادي ثم حاول مرة أخرى."
      : "Student sign-in is unavailable in private browsing. Open the link in regular Chrome or Safari and try again.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!loginRole) {
      setError(t("wrongRole"));
      return;
    }

    const isStaffOtpLogin = loginRole === "staff" && staffLoginMode === "otp";
    const normalizedOtp = staffOtp.replace(/\D/g, "").slice(0, 4);

    if (isStaffOtpLogin) {
      if (!/^\d{4}$/.test(normalizedOtp)) {
        setError(lang === "ar" ? "أدخل رمز الدخول المؤقت المكوّن من 4 أرقام." : "Enter the 4-digit temporary access code.");
        return;
      }
    } else if (!email || !password) {
      setError(t("enterEmailPass"));
      return;
    }

    setLoading(true);

    try {
      if (loginRole === "student" && privateBrowsingProtectionEnabled) {
        const storageSafety = await assessStudentStorageSafety();
        if (!storageSafety.safe) {
          setError(studentStorageErrorMessage());
          setLoading(false);
          return;
        }
      }

      const { message } = await signInWithCredentials({
        email: isStaffOtpLogin ? normalizedOtp : email,
        password: isStaffOtpLogin ? normalizedOtp : password,
        role: loginRole,
        language: lang,
      });
      if (message) {
        showToast({
          tone: "success",
          title: t("signIn"),
          message,
        });
      }
    } catch (loginError) {
      const isNetworkError = !loginError?.response
        && (loginError?.code === "ERR_NETWORK" || loginError?.message === "Network Error");
      const serverMessage = loginError?.response?.data?.message
        || Object.values(loginError?.response?.data?.errors || {}).flat().find(Boolean);
      setError(
        isNetworkError
          ? lang === "ar"
            ? "تعذر الاتصال بالسيرفر. افتح رابط التطبيق في Chrome أولًا وتأكد من قبول شهادة HTTPS، ثم افتح mnu-attend وحاول مرة أخرى."
            : "Could not reach the server. Open the app link in Chrome first, accept the HTTPS certificate, then reopen mnu-attend and try again."
          : typeof loginError === "string"
          ? loginError
          : serverMessage || loginError.message || t("invalidCredentials"),
      );
      setLoading(false);
    }
  };

  const handleOpenTicketSystem = () => {
    window.open(
      "https://mnulms.menofia.education/ticketing/login.php",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div
      className="signin-page signin-page-scrollable"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHelmet
        titleEn="Sign In"
        titleAr="\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"
        descriptionEn="Sign in to UniAttend as an admin, staff member, or student."
        descriptionAr="\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u064a\u0648\u0646\u064a \u0623\u062a\u064a\u0646\u062f \u0643\u0645\u062f\u064a\u0631 \u0646\u0638\u0627\u0645 \u0623\u0648 \u062f\u0643\u062a\u0648\u0631 \u0623\u0648 \u0637\u0627\u0644\u0628."
      />

      <div className="signin-blob signin-blob-1" />
      <div className="signin-blob signin-blob-2" />
      <div className="signin-blob signin-blob-3" />

      <div className="signin-card signin-card-professional">
        <div className="signin-brand" style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            className="signin-brand-logo"
            src={mnuLogo}
            alt="Menoufia National University"
            style={{
              width: 82,
              height: 82,
              objectFit: "contain",
              margin: "0 auto 14px",
              display: "block",
              borderRadius: 22,
              boxShadow: "0 16px 30px rgba(26,107,69,0.18)",
              background: "rgba(255,255,255,0.06)",
              padding: 10,
            }}
          />
          <h2
            className="signin-heading"
            style={{ textAlign: "center", marginBottom: 8 }}
          >
            {t("loginPageTitle")}
          </h2>
          <p
            className="signin-subheading"
            style={{ textAlign: "center", marginBottom: 0 }}
          >
            {t("loginPageSubtitle")}
          </p>
        </div>

        <form className="signin-pro-form" onSubmit={handleSubmit} noValidate>
          <CustomDropdown
            id="signin-role"
            name="signin-role"
            label={t("loginRoleLabel")}
            value={loginRole}
            onChange={(event) => {
              const nextRole = event.target.value;
              setLoginRole(nextRole);
              setStudentLoginMode(
                nextRole === "student" && !isStandalone && pwaEnabled ? "install" : "web",
              );
              setStaffLoginMode("password");
              setStaffOtp("");
              setError("");
            }}
            options={roleOptions}
            placeholder={t("loginRolePlaceholder")}
            disabled={loading}
            icon={() => <Building2 size={16} />}
          />

          {loginRole === "student" && !isStandalone && pwaEnabled && webLoginEnabled ? (
            <div
              role="tablist"
              aria-label={lang === "ar" ? "طريقة دخول الطالب" : "Student access method"}
              className="signin-login-tabs"
            >
              {[
                { value: "install", label: lang === "ar" ? "التثبيت والتعليمات" : "Install & instructions" },
                { value: "web", label: lang === "ar" ? "تسجيل من الويب" : "Sign in on web" },
              ].map((option) => {
                const active = studentLoginMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`signin-login-tab${active ? " is-active" : ""}`}
                    onClick={() => {
                      setStudentLoginMode(option.value);
                      setError("");
                    }}
                    disabled={loading}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {loginRole === "staff" ? (
            <div role="tablist" aria-label={lang === "ar" ? "طريقة تسجيل دخول عضو هيئة التدريس" : "Staff sign-in method"} className="signin-login-tabs">
              {[
                { value: "password", label: lang === "ar" ? "الدخول العادي" : "Password" },
                { value: "otp", label: lang === "ar" ? "رمز OTP" : "OTP code" },
              ].map((option) => {
                const active = staffLoginMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`signin-login-tab${active ? " is-active" : ""}`}
                    onClick={() => {
                      setStaffLoginMode(option.value);
                      setError("");
                    }}
                    disabled={loading}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {loginRole === "student" && !isStandalone && pwaEnabled
            && (!webLoginEnabled || studentLoginMode === "install") ? (
            <StudentInstallGate compact />
          ) : <>
          {loginRole === "staff" && staffLoginMode === "otp" ? (
            <CustomInput
              id="signin-staff-otp"
              name="staffOtp"
              type="text"
              label={lang === "ar" ? "رمز الدخول المؤقت" : "Temporary access code"}
              placeholder="0000"
              value={staffOtp}
              onChange={(event) => {
                setStaffOtp(event.target.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              autoComplete="one-time-code"
              disabled={loading}
              dir="ltr"
              className="signin-staff-otp-input"
              icon={() => <LockKeyhole size={16} />}
            />
          ) : <>
          <CustomInput
            id="signin-email"
            name="email"
            type={
              loginRole === "admin"
                  ? "email"
                  : loginRole === "staff"
                    ? "password"
                    : "text"
            }
            label={identifierLabel}
            placeholder={identifierPlaceholder}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoComplete={loginRole === "staff" ? "off" : "username"}
            disabled={loading}
            dir={isRTL && loginRole !== "admin" ? "rtl" : "ltr"}
            icon={() => <UserCircle2 size={16} />}
            showPasswordLabel={t("loginShowPassword")}
            hidePasswordLabel={t("loginHidePassword")}
          />

          <CustomInput
            id="signin-password"
            name="password"
            type="password"
            label={t("passwordLabel")}
            placeholder={
              loginRole === "staff"
                ? lang === "ar"
                  ? "كلمة المرور"
                  : "Password"
                : t("passPlaceholder")
            }
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete="current-password"
            disabled={loading}
            dir={isRTL ? "rtl" : "ltr"}
            icon={() => <LockKeyhole size={16} />}
            showPasswordLabel={t("loginShowPassword")}
            hidePasswordLabel={t("loginHidePassword")}
          />
          </>}

          {error ? <div className="signin-pro-error">{error}</div> : null}

          <CustomBottom
            type="submit"
            text={t("signIn")}
            loading={loading}
            disabled={loading || (loginRole === "staff" && staffLoginMode === "otp" && staffOtp.length !== 4)}
            loadingText={
              lang === "ar"
                ? "\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644..."
                : "Signing in..."
            }
            rigthIcon={<LoginActionIcon />}
          />
          </>}

          <div className="signin-ticket-action">
            <div className="signin-ticket-copy">
              <strong>{ticketSystemLabel}</strong>
            </div>
            <CustomBottom
              type="button"
              text={
                lang === "ar"
                  ? "\u0641\u062a\u062d \u0646\u0638\u0627\u0645 \u0627\u0644\u062a\u0630\u0627\u0643\u0631"
                  : "Open Ticket Portal"
              }
              onClick={handleOpenTicketSystem}
              background="linear-gradient(135deg, color-mix(in srgb, var(--bg-card2) 92%, rgba(52, 211, 153, 0.12)), color-mix(in srgb, var(--bg-card) 96%, rgba(52, 211, 153, 0.04)))"
              textColor="var(--text-primary)"
              border="1px solid color-mix(in srgb, var(--border) 78%, rgba(52, 211, 153, 0.28))"
              boxShadow="0 14px 28px rgba(15, 23, 42, 0.12)"
              minHeight={50}
              rigthIcon={<ArrowUpRight size={18} />}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;
