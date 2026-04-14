import React, { useMemo, useState } from "react";
import { authenticate } from "../../utils/auth";
import { useLanguage } from "../../i18n";
import AppHelmet from "../../components/AppHelmet";
import { mnuLogo } from "../../assets";
import { Building2, LockKeyhole, LoginActionIcon, UserCircle2 } from "../../assets/icons";
import {
  CustomBottom,
  CustomDropdown,
  CustomInput,
  LanguageSwitcher,
  ThemeToggle,
} from "../../components";

const SignIn = ({ onSignIn }) => {
  const { t, lang, isRTL } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginRole, setLoginRole] = useState("");

  const roleOptions = useMemo(
    () => [
      { value: "doctor", label: t("doctorRole") },
      { value: "admin", label: t("adminRole") },
      { value: "student", label: t("studentRole") },
    ],
    [t],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!loginRole) {
      setError(t("wrongRole"));
      return;
    }

    if (!email || !password) {
      setError(t("enterEmailPass"));
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      const account = authenticate(email, password);

      if (!account) {
        setError(t("invalidCredentials"));
        setLoading(false);
        return;
      }

      if (account.userRole !== loginRole) {
        setError(
          `${t("wrongRole")} (${roleOptions.find((role) => role.value === loginRole)?.label || loginRole})`,
        );
        setLoading(false);
        return;
      }

      onSignIn(account);
    }, 650);
  };

  return (
    <div className="signin-page" dir={isRTL ? "rtl" : "ltr"}>
      <AppHelmet
        titleEn="Sign In"
        titleAr="\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"
        descriptionEn="Sign in to UniAttend as an admin, doctor, or student."
        descriptionAr="\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u064a\u0648\u0646\u064a \u0623\u062a\u064a\u0646\u062f \u0643\u0645\u062f\u064a\u0631 \u0646\u0638\u0627\u0645 \u0623\u0648 \u062f\u0643\u062a\u0648\u0631 \u0623\u0648 \u0637\u0627\u0644\u0628."
      />

      <div className="signin-blob signin-blob-1" />
      <div className="signin-blob signin-blob-2" />
      <div className="signin-blob signin-blob-3" />

      <div className="signin-pro-toolbar">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="signin-card" style={{ maxWidth: 460, paddingTop: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
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
            {t("signIn")}
          </h2>
          <p
            className="signin-subheading"
            style={{ textAlign: "center", marginBottom: 0 }}
          >
            {t("accessDashboard")}
          </p>
        </div>

        <form className="signin-pro-form" onSubmit={handleSubmit} noValidate>
          <CustomDropdown
            id="signin-role"
            name="signin-role"
            label={t("loginRoleLabel")}
            value={loginRole}
            onChange={(event) => {
              setLoginRole(event.target.value);
              setError("");
            }}
            options={roleOptions}
            placeholder={t("loginRolePlaceholder")}
            disabled={loading}
            icon={() => <Building2 size={16} />}
          />

          <CustomInput
            id="signin-email"
            name="email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoComplete="email"
            disabled={loading}
            dir="ltr"
            icon={() => <UserCircle2 size={16} />}
          />

          <CustomInput
            id="signin-password"
            name="password"
            type="password"
            label={t("passwordLabel")}
            placeholder={t("passPlaceholder")}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete="current-password"
            disabled={loading}
            dir="ltr"
            icon={() => <LockKeyhole size={16} />}
            showPasswordLabel={t("loginShowPassword")}
            hidePasswordLabel={t("loginHidePassword")}
          />

          {error ? <div className="signin-pro-error">{error}</div> : null}

          <CustomBottom
            type="submit"
            text={t("signIn")}
            loading={loading}
            loadingText={
              lang === "ar"
                ? "\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644..."
                : "Signing in..."
            }
            rigthIcon={<LoginActionIcon />}
          />
        </form>
      </div>
    </div>
  );
};

export default SignIn;
