import { useState, useEffect } from "react";
import { Page } from "./types";
import { HomePage } from "./components/HomePage";
import { LoginRegisterPage } from "./components/LoginRegisterPage";
import { CharacterGalleryPage } from "./components/CharacterGalleryPage";
import { CharacterCreationPage } from "./components/CharacterCreationPage";
import { UserProfilePage } from "./components/UserProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { ManagementPage } from "./components/ManagementPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
// Composants UI mobiles supprimés (build uniquement desktop)
import { AshEffect } from "./components/AshEffect";
import { BanModal } from "./components/BanModal";
// Hook de détection mobile supprimé
import { authAPI } from "./services/authAPI";
import { useLanguage } from "./i18n/language";

function App() {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [banReason, setBanReason] = useState<string | undefined>();
  const [suspendReason, setSuspendReason] = useState<string | undefined>();
  const [bannedAt, setBannedAt] = useState<string | null | undefined>();
  const [username, setUsername] = useState("");
  // Détection mobile supprimée — rendre toujours les pages desktop
  
  // Pages nécessitant authentification
  const protectedPages: Page[] = ["gallery", "create", "profile", "settings", "management", "admin"];
  
  // Vérifier si l'utilisateur est déjà authentifié au montage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authAPI.isAuthenticated()) {
          const response = await authAPI.getCurrentUser();
          if (response.status === "success") {
            setIsLoggedIn(true);
            if (response.data?.user) {
              const user = response.data.user;
              authAPI.setUser({
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                avatar_id: user.avatar_id,
                username_changed_at: user.username_changed_at,
                created_at: user.created_at,
                is_banned: user.is_banned,
                is_suspended: user.is_suspended,
                ban_reason: user.ban_reason,
                banned_at: user.banned_at,
                ban_expires_at: user.ban_expires_at,
                suspend_reason: user.suspend_reason,
              });
              
              // Vérifier l'état de ban/suspension
              setUsername(user.username);
              setIsBanned(user.is_banned || false);
              setIsSuspended(user.is_suspended || false);
              setBanReason(user.ban_reason);
              setSuspendReason(user.suspend_reason);
              setBannedAt(user.banned_at);
            }
          } else {
            // Le token est invalide ou a expiré
            authAPI.removeToken();
            authAPI.removeUser();
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);
  
  const handleNavigate = (page: Page) => {
    // Si la page est protégée et que l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    if (protectedPages.includes(page) && !isLoggedIn) {
      setCurrentPage("login");
      return;
    }
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    const stored = authAPI.getUser();
    if (stored) {
      setUsername(stored.username);
      setIsBanned(Boolean(stored.is_banned));
      setIsSuspended(Boolean(stored.is_suspended));
      setBanReason(stored.ban_reason);
      setSuspendReason(stored.suspend_reason);
      setBannedAt(stored.banned_at);
    }
    setCurrentPage("gallery");
  };

  const handleLogout = () => {
    authAPI.removeToken();
    authAPI.removeUser();
    setIsLoggedIn(false);
    setIsBanned(false);
    setIsSuspended(false);
    setBanReason(undefined);
    setSuspendReason(undefined);
    setBannedAt(undefined);
    setUsername("");
    setCurrentPage("home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl">{t("Loading...", "Chargement...")}</div>
      </div>
    );
  }

  const renderDesktopPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "login":
        return <LoginRegisterPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      case "gallery":
        return <CharacterGalleryPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "create":
        return <CharacterCreationPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "profile":
        return <UserProfilePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "settings":
        return <SettingsPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "management":
        return <ManagementPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "admin":
        return <AdminDashboardPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      default:
        return <HomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
    }
  };

  // Fonction de rendu mobile supprimée

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="max-w-7xl mx-auto">
        {renderDesktopPage()}
        <AshEffect />
        
        {/* Modal de ban - Non fermable */}
        {isLoggedIn && isBanned && (
          <BanModal banReason={banReason} username={username} bannedAt={bannedAt} />
        )}
        
        {/* Notification de suspension */}
        {isLoggedIn && isSuspended && !isBanned && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl px-4">
            <div className="border border-yellow-600/40 bg-yellow-950/30 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">!</span>
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-semibold text-yellow-400/90">
                    {t("Account Suspended", "Compte suspendu")}
                  </div>
                  <div className="text-xs text-white/70">
                    {suspendReason ||
                      t(
                        "Your account is temporarily suspended. You can browse but cannot create content or interact.",
                        "Votre compte est temporairement suspendu. Vous pouvez naviguer mais vous ne pouvez pas créer de contenu ni interagir."
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;