import { useEffect, useState } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { useLanguage } from "../i18n/language";

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function SettingsPage({ onNavigate, isLoggedIn, onLogout }: SettingsPageProps) {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const languageOptions = [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
  ] as const;
  const languageIndex = Math.max(0, languageOptions.findIndex((option) => option.code === language));
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [requestSignature, setRequestSignature] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const user = authAPI.getUser();
  const isStaff = user?.role === "admin" || user?.role === "employee";

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const cycleLanguage = (direction: -1 | 1) => {
    const nextIndex = (languageIndex + direction + languageOptions.length) % languageOptions.length;
    setLanguage(languageOptions[nextIndex]?.code ?? "en");
  };

  const buildPayload = () => {
    const payload: {
      email?: string;
      currentPassword?: string;
      newPassword?: string;
      confirmNewPassword?: string;
    } = {};

    if (!isStaff && email.trim() && email.trim() !== user?.email) {
      payload.email = email.trim();
    }

    if (newPassword || confirmNewPassword || currentPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
      payload.confirmNewPassword = confirmNewPassword;
    }

    return payload;
  };

  useEffect(() => {
    if (!hasRequestedCode || !requestSignature) return;
    const currentSignature = JSON.stringify(buildPayload());
    if (currentSignature !== requestSignature) {
      setHasRequestedCode(false);
      setVerificationCode("");
      setResendCountdown(0);
      setFeedback({
        type: "error",
        message: t(
          "Settings changed since code request. Please request a new code.",
          "Les paramètres ont changé depuis la demande du code. Merci de demander un nouveau code."
        ),
      });
    }
  }, [email, currentPassword, newPassword, confirmNewPassword, hasRequestedCode, requestSignature]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const handleRequestCode = async () => {
    setFeedback(null);

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setFeedback({ type: "error", message: t("No changes to verify", "Aucun changement à vérifier") });
      return;
    }

    setIsRequestingCode(true);
    const result = await authAPI.requestSettingsCode(payload);
    setIsRequestingCode(false);

    if (result.status !== "success") {
      setFeedback({
        type: "error",
        message: result.message || t("Failed to send verification code", "Échec de l'envoi du code de vérification"),
      });
      return;
    }

    setHasRequestedCode(true);
    setRequestSignature(JSON.stringify(payload));
    setResendCountdown(60);
    setFeedback({ type: "success", message: result.message || t("Verification code sent", "Code de vérification envoyé") });
  };

  const handleSaveSettings = async () => {
    setFeedback(null);

    if (!hasRequestedCode) {
      setFeedback({ type: "error", message: t("Request a verification code first", "Demande d'abord un code de vérification") });
      return;
    }

    if (!verificationCode.trim()) {
      setFeedback({ type: "error", message: "Enter the verification code" });
      return;
    }

    setIsSaving(true);
    const result = await authAPI.confirmSettingsCode(verificationCode.trim());
    setIsSaving(false);

    if (result.status !== "success" || !result.data?.user) {
      setFeedback({ type: "error", message: result.message || "Failed to update settings" });
      return;
    }

    const existing = authAPI.getUser();
    authAPI.setUser({
      ...existing,
      id: result.data.user.id ?? existing?.id,
      email: result.data.user.email,
      username: result.data.user.username,
      role: result.data.user.role,
      avatar_id: result.data.user.avatar_id,
      username_changed_at: result.data.user.username_changed_at,
      created_at: result.data.user.created_at,
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setEmail(result.data.user.email);
    setVerificationCode("");
    setResendCountdown(0);
    setHasRequestedCode(false);
    setRequestSignature(null);
    setFeedback({ type: "success", message: "Settings updated successfully" });
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="settings" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border border-white/20 p-6 bg-[#121212] space-y-4">
          <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
            {t("Settings", "Paramètres")}
          </h2>

          {feedback && (
            <div
              className={`border p-3 text-sm ${
                feedback.type === "success"
                  ? "border-green-500/40 bg-green-500/10 text-green-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs text-white/70">{t("Language", "Langue")}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => cycleLanguage(-1)}
                className="border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/40 transition-all"
                aria-label={t("Previous language", "Langue précédente")}
              >
                &lt;
              </button>
              <div className="flex-1 border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90 text-center">
                {languageOptions[languageIndex]?.label ?? "English"}
              </div>
              <button
                type="button"
                onClick={() => cycleLanguage(1)}
                className="border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/40 transition-all"
                aria-label={t("Next language", "Langue suivante")}
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-white/70">{t("Email", "Email")}</label>
            <input
              type="email"
              value={email}
              disabled={isStaff}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90 disabled:opacity-50"
            />
            {isStaff && (
              <p className="text-xs text-yellow-300/90">
                {t(
                  "Employee/Admin accounts cannot change their identifier for security reasons.",
                  "Les comptes Employé/Admin ne peuvent pas changer leur identifiant pour des raisons de sécurité."
                )}
              </p>
            )}
          </div>

          <div className="border-t border-white/20 pt-4 space-y-3">
            <p className="text-sm text-white/90 font-semibold">{t("Change password", "Changer le mot de passe")}</p>

            <div className="space-y-2">
              <label className="block text-xs text-white/70">{t("Current password", "Mot de passe actuel")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs text-white/70">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-white/70">Confirm new password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  className="w-full border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4 space-y-3">
            <p className="text-sm text-white/90 font-semibold">Verify with email code</p>
            <p className="text-xs text-white/60">
              We will send a 6-digit code to your email to confirm the changes.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRequestCode}
                disabled={isRequestingCode || resendCountdown > 0}
                className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all disabled:opacity-50"
              >
                {isRequestingCode
                  ? "Sending..."
                  : resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : hasRequestedCode
                      ? "Resend code"
                      : "Send code"}
              </button>
            </div>
            {hasRequestedCode && (
              <div className="border border-white/20 bg-[#0a0a0a] p-3 text-xs text-white/70">
                <div className="text-sm text-white/90">Code sent</div>
                <div>Check your inbox or spam folder.</div>
                <div>{resendCountdown > 0 ? `Resend available in ${resendCountdown}s.` : "You can resend the code now."}</div>
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-xs text-white/70">Verification code</label>
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                className="w-full max-w-xs border border-white/20 bg-[#0a0a0a] px-3 py-2 text-sm text-white/90"
                placeholder="123456"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="border border-white/30 px-5 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Confirm changes"}
          </button>
        </div>
      </div>
    </WireframeLayout>
  );
}
