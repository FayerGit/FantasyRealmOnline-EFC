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
import { MobileHomePage } from "./components/MobileHomePage";
import { MobileLoginRegisterPage } from "./components/MobileLoginRegisterPage";
import { MobileCharacterGalleryPage } from "./components/MobileCharacterGalleryPage";
import { MobileCharacterCreationPage } from "./components/MobileCharacterCreationPage";
import { MobileUserProfilePage } from "./components/MobileUserProfilePage";
import { MobileSettingsPage } from "./components/MobileSettingsPage";
import { MobileManagementPage } from "./components/MobileManagementPage";
import { MobileAdminDashboardPage } from "./components/MobileAdminDashboardPage";
import { AshEffect } from "./components/AshEffect";
import { BanModal } from "./components/BanModal";
import { useIsMobile } from "./components/ui/use-mobile";
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
  const isMobile = useIsMobile();
  
  // Pages that require authentication
  const protectedPages: Page[] = ["gallery", "create", "profile", "settings", "management", "admin"];
  
  // Check if user is already authenticated on mount
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
              
              // Check ban/suspend status
              setUsername(user.username);
              setIsBanned(user.is_banned || false);
              setIsSuspended(user.is_suspended || false);
              setBanReason(user.ban_reason);
              setSuspendReason(user.suspend_reason);
              setBannedAt(user.banned_at);
            }
          } else {
            // Token is invalid or expired
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
    // If the page is protected and the user is not logged in, redirect to login
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

  const renderMobilePage = () => {
    switch (currentPage) {
      case "home":
        return <MobileHomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "login":
        return <MobileLoginRegisterPage onNavigate={handleNavigate} onLogin={handleLogin} />;
      case "gallery":
        return <MobileCharacterGalleryPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "create":
        return <MobileCharacterCreationPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "profile":
        return <MobileUserProfilePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "settings":
        return <MobileSettingsPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "management":
        return <MobileManagementPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      case "admin":
        return <MobileAdminDashboardPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
      default:
        return <MobileHomePage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="max-w-7xl mx-auto">
        {isMobile ? renderMobilePage() : renderDesktopPage()}
        <AshEffect />
        
        {/* Ban Modal - Non-closable */}
        {isLoggedIn && isBanned && (
          <BanModal banReason={banReason} username={username} bannedAt={bannedAt} />
        )}
        
        {/* Suspend Notification */}
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