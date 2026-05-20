import { useState } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { useLanguage } from "../i18n/language";
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from "../services/validationService";

interface LoginRegisterPageProps {
  onNavigate: (page: Page) => void;
  onLogin: () => void;
}

export function LoginRegisterPage({ onNavigate, onLogin }: LoginRegisterPageProps) {
  const { t } = useLanguage();
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Validation states for register form
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordChecks, setPasswordChecks] = useState("");

  const handleLogin = async () => {
    setError("");
    setSuccessMessage("");

    if (!loginEmail || !loginPassword) {
      setError(t("Email and password are required", "Email et mot de passe requis"));
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: loginEmail,
        password: loginPassword,
      });

      if (response.status === "success" && response.data?.token) {
        authAPI.setToken(response.data.token);
        if (response.data.user) {
          authAPI.setUser({
              id: response.data.user.id,
            email: response.data.user.email,
            username: response.data.user.username,
            role: response.data.user.role,
            avatar_id: response.data.user.avatar_id,
            username_changed_at: response.data.user.username_changed_at,
            created_at: response.data.user.created_at,
              is_banned: response.data.user.is_banned,
              is_suspended: response.data.user.is_suspended,
              ban_reason: response.data.user.ban_reason,
              banned_at: response.data.user.banned_at,
              ban_expires_at: response.data.user.ban_expires_at,
              suspend_reason: response.data.user.suspend_reason,
          });
        }
        setSuccessMessage(t("Login successful!", "Connexion réussie !"));
        setTimeout(() => {
          onLogin();
        }, 1000);
      } else {
        setError(response.message || t("Login failed", "Échec de la connexion"));
      }
    } catch (err) {
      setError(t("An error occurred during login", "Une erreur est survenue pendant la connexion"));
    } finally {
      setLoading(false);
    }
  };

  // Real-time validation handlers for register form
  const handleUsernameChange = (value: string) => {
    setRegisterUsername(value);
    const validation = validateUsername(value);
    setUsernameError(validation.valid ? "" : validation.message);
  };

  const handleEmailChange = (value: string) => {
    setRegisterEmail(value);
    const validation = validateEmail(value);
    setEmailError(validation.valid ? "" : validation.message);
  };

  const handlePasswordChange = (value: string) => {
    setRegisterPassword(value);
    const validation = validatePassword(value);
    setPasswordError(validation.valid ? "" : "");
    setPasswordChecks(validation.message);
    
    // Check password match
    if (registerConfirmPassword) {
      const matchValidation = validatePasswordMatch(value, registerConfirmPassword);
      setPasswordMatchError(matchValidation.valid ? "" : matchValidation.message);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setRegisterConfirmPassword(value);
    const matchValidation = validatePasswordMatch(registerPassword, value);
    setPasswordMatchError(matchValidation.valid ? "" : matchValidation.message);
  };

  const handleRegister = async () => {
    setError("");
    setSuccessMessage("");

    // Validate all fields before submission
    const emailValidation = validateEmail(registerEmail);
    const usernameValidation = validateUsername(registerUsername);
    const passwordValidation = validatePassword(registerPassword);
    const matchValidation = validatePasswordMatch(registerPassword, registerConfirmPassword);

    setEmailError(emailValidation.valid ? "" : emailValidation.message);
    setUsernameError(usernameValidation.valid ? "" : usernameValidation.message);
    setPasswordError(passwordValidation.valid ? "" : t("Password does not meet requirements", "Le mot de passe ne respecte pas les exigences"));
    setPasswordMatchError(matchValidation.valid ? "" : matchValidation.message);

    if (!emailValidation.valid || !usernameValidation.valid || !passwordValidation.valid || !matchValidation.valid) {
      setError(t("Please fix the errors above before registering", "Merci de corriger les erreurs ci-dessus avant l'inscription"));
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        confirmPassword: registerConfirmPassword,
      });

      if (response.status === "success") {
        setSuccessMessage(t("Registration successful! You can now login.", "Inscription réussie ! Vous pouvez maintenant vous connecter."));
        setTimeout(() => {
          setShowRegister(false);
          setRegisterEmail("");
          setRegisterUsername("");
          setRegisterPassword("");
          setRegisterConfirmPassword("");
          setUsernameError("");
          setEmailError("");
          setPasswordError("");
          setPasswordMatchError("");
          setPasswordChecks("");
          setLoginEmail(registerEmail);
          setSuccessMessage("");
        }, 2000);
      } else {
        setError(response.message || t("Registration failed", "Échec de l'inscription"));
      }
    } catch (err) {
      setError(t("An error occurred during registration", "Une erreur est survenue pendant l'inscription"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="login">
      <div className="max-w-lg mx-auto py-16">
        {!showRegister ? (
          <div className="border-2 border-white/30 p-10 space-y-6 bg-gradient-to-b from-[#121212] to-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#8b0000] opacity-60"></div>
            
            <h2 className="border-b-2 border-white/20 pb-4 text-2xl text-white font-['Cinzel'] tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {t("Login", "Connexion")}
            </h2>
            
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900/50 border border-green-500/50 p-3 text-green-200 text-sm">
                {successMessage}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Email", "Email")}</div>
              <input 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
                className="border border-white/20 p-2 bg-[#1a1a1a] w-full text-white/80 focus:border-white/40 focus:outline-none transition-colors disabled:opacity-50" 
                placeholder={t("Enter email", "Entrez votre email")} 
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Password", "Mot de passe")}</div>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
                className="border border-white/20 p-2 bg-[#1a1a1a] w-full text-white/80 focus:border-white/40 focus:outline-none transition-colors disabled:opacity-50" 
                placeholder={t("Enter password", "Entrez votre mot de passe")} 
              />
            </div>

            <button 
              onClick={handleLogin}
              disabled={loading}
              className="border border-white/30 p-3 text-center mt-4 w-full text-white hover:bg-white/5 hover:border-white/60 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t("Logging in...", "Connexion...") : t("Login", "Connexion")}
            </button>

            <div className="text-center pt-4 border-t border-white/20 mt-4">
              <div className="text-xs mb-2 text-white/60">{t("Don't have an account?", "Vous n'avez pas de compte ?")}</div>
              <button
                onClick={() => {
                  setShowRegister(true);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={loading}
                className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("Create an account", "Créer un compte")}
              </button>
            </div>
          </div>
        ) : (
          /* Register Section */
          <div className="border-2 border-white/30 p-10 space-y-6 bg-gradient-to-b from-[#121212] to-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#8b0000] opacity-60"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#8b0000] opacity-60"></div>
            
            <h2 className="border-b-2 border-white/20 pb-4 text-2xl text-white font-['Cinzel'] tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {t("Register", "Inscription")}
            </h2>
            
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900/50 border border-green-500/50 p-3 text-green-200 text-sm">
                {successMessage}
              </div>
            )}
            
            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Email", "Email")}</div>
              <input 
                value={registerEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={loading}
                className={`border p-2 bg-[#1a1a1a] w-full text-white/80 focus:outline-none transition-colors disabled:opacity-50 ${
                  emailError ? "border-red-500" : "border-white/20 focus:border-white/40"
                }`}
                placeholder={t("Enter email", "Entrez votre email")} 
              />
              {emailError && <div className="text-red-400 text-xs">{emailError}</div>}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Username", "Nom d'utilisateur")}</div>
              <input 
                value={registerUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                disabled={loading}
                className={`border p-2 bg-[#1a1a1a] w-full text-white/80 focus:outline-none transition-colors disabled:opacity-50 ${
                  usernameError ? "border-red-500" : "border-white/20 focus:border-white/40"
                }`}
                placeholder={t(
                  "Enter username (3-20 chars, letters/numbers/_-)",
                  "Nom d'utilisateur (3-20 caractères, lettres/chiffres/_-)"
                )} 
              />
              {usernameError && <div className="text-red-400 text-xs">{usernameError}</div>}
              {!usernameError && registerUsername && (
                <div className="text-green-400 text-xs">{t("Username is valid", "Nom d'utilisateur valide")}</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Password (CNIL Compliant)", "Mot de passe (CNIL)")}</div>
              <input 
                type="password" 
                value={registerPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={loading}
                className={`border p-2 bg-[#1a1a1a] w-full text-white/80 focus:outline-none transition-colors disabled:opacity-50 ${
                  passwordError ? "border-red-500" : "border-white/20 focus:border-white/40"
                }`}
                placeholder={t("Enter password", "Entrez votre mot de passe")} 
              />
              {passwordChecks && (
                <div className="text-xs text-white/70 space-y-1 mt-2 bg-[#1a1a1a] p-2 border border-white/10 rounded">
                  {passwordChecks.split('\n').map((check, idx) => (
                    <div key={idx}>{check}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-white/90">{t("Confirm Password", "Confirmer le mot de passe")}</div>
              <input 
                type="password" 
                value={registerConfirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                disabled={loading}
                className={`border p-2 bg-[#1a1a1a] w-full text-white/80 focus:outline-none transition-colors disabled:opacity-50 ${
                  passwordMatchError ? "border-red-500" : "border-white/20 focus:border-white/40"
                }`}
                placeholder={t("Confirm password", "Confirmez le mot de passe")} 
              />
              {passwordMatchError && <div className="text-red-400 text-xs">{passwordMatchError}</div>}
              {!passwordMatchError && registerConfirmPassword && (
                <div className="text-green-400 text-xs">{t("Passwords match", "Les mots de passe correspondent")}</div>
              )}
            </div>

            <button 
              onClick={handleRegister}
              disabled={loading}
              className="border border-white/30 p-3 text-center mt-4 w-full text-white hover:bg-white/5 hover:border-white/60 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t("Registering...", "Inscription...") : t("Register", "Inscription")}
            </button>

            <div className="text-center pt-4 border-t border-white/20 mt-4">
              <div className="text-xs mb-2 text-white/60">{t("Already have an account?", "Vous avez déjà un compte ?")}</div>
              <button
                onClick={() => {
                  setShowRegister(false);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={loading}
                className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("Back to Login", "Retour à la connexion")}
              </button>
            </div>
          </div>
        )}
      </div>
    </WireframeLayout>
  );
}