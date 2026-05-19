import { AshEffect } from "./AshEffect";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "../i18n/language";

interface WireframeLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: Page) => void;
  currentPage?: Page;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function WireframeLayout({ children, onNavigate, currentPage, isLoggedIn, onLogout }: WireframeLayoutProps) {
  const { t } = useLanguage();
  const user = authAPI.getUser();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role === "employee";

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col border-2 border-white/10 relative overflow-hidden">
      <AshEffect />
      
      {/* Header */}
      <div className="border-b border-white/20 p-4 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] to-[#121212] relative z-50">
        {/* Decorative line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        
        <button 
          onClick={() => onNavigate("home")}
          className="relative border-2 border-white/40 px-6 py-3 cursor-pointer transition-all duration-300 text-white font-['Cinzel'] tracking-[0.2em] group overflow-hidden"
        >
          <span className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">FANTASYREALM</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/60 transition-colors duration-300"></div>
          <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0)] group-hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"></div>
        </button>
        
        <div className="flex gap-6">
          <button 
            onClick={() => onNavigate("home")}
            className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
              currentPage === "home" 
                ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
          >
            <span className="relative z-10">{t("Home", "Accueil")}</span>
            {currentPage === "home" && (
              <>
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
              </>
            )}
            {currentPage !== "home" && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
          
          <button 
            onClick={() => onNavigate("gallery")}
            className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
              currentPage === "gallery" 
                ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
          >
            <span className="relative z-10">{t("Characters", "Personnages")}</span>
            {currentPage === "gallery" && (
              <>
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
              </>
            )}
            {currentPage !== "gallery" && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
          
          <button 
            onClick={() => onNavigate("create")}
            className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
              currentPage === "create" 
                ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
          >
            <span className="relative z-10">{t("Create", "Créer")}</span>
            {currentPage === "create" && (
              <>
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
              </>
            )}
            {currentPage !== "create" && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>
          
          <button 
            onClick={() => onNavigate("profile")}
            className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
              currentPage === "profile" 
                ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
          >
            <span className="relative z-10">{t("Profile", "Profil")}</span>
            {currentPage === "profile" && (
              <>
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
              </>
            )}
            {currentPage !== "profile" && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>

          <button 
            onClick={() => onNavigate("settings")}
            className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
              currentPage === "settings" 
                ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            }`}
          >
            <span className="relative z-10">{t("Settings", "Paramètres")}</span>
            {currentPage === "settings" && (
              <>
                <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
              </>
            )}
            {currentPage !== "settings" && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            )}
          </button>

          {isLoggedIn && isStaff && (
            <button
              onClick={() => onNavigate("management")}
              className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
                currentPage === "management"
                  ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              }`}
            >
              <span className="relative z-10">{t("Management", "Gestion")}</span>
              {currentPage === "management" && (
                <>
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
                </>
              )}
              {currentPage !== "management" && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </button>
          )}

          {isLoggedIn && isAdmin && (
            <button
              onClick={() => onNavigate("admin")}
              className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
                currentPage === "admin"
                  ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              }`}
            >
              <span className="relative z-10">Admin</span>
              {currentPage === "admin" && (
                <>
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
                </>
              )}
              {currentPage !== "admin" && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </button>
          )}
          
          {/* Notification Bell */}
          <NotificationBell isLoggedIn={!!isLoggedIn} />
          
          {isLoggedIn ? (
            <button 
              onClick={() => onLogout?.()}
              className="relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              <span className="relative z-10">{t("Logout", "Déconnexion")}</span>
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          ) : (
            <button 
              onClick={() => onNavigate("login")}
              className={`relative px-5 py-2 text-sm cursor-pointer transition-all duration-300 group overflow-hidden ${
                currentPage === "login" 
                  ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.4)]" 
                  : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              }`}
            >
              <span className="relative z-10">{t("Login", "Connexion")}</span>
              {currentPage === "login" && (
                <>
                  <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8b0000] to-transparent"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(139,0,0,0.2)]"></div>
                </>
              )}
              {currentPage !== "login" && (
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </button>
          )}
        </div>
        
        {/* Decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gradient-to-b from-[#0a0a0a] via-[#050505] to-[#0a0a0a] relative z-10">
        {children}
      </div>

      {/* Footer */}
      <div className="border-t border-white/20 p-4 flex justify-between text-xs bg-gradient-to-t from-[#0a0a0a] to-[#121212] relative z-10">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        
        <button className="relative border border-white/20 px-4 py-2 text-white/60 hover:text-white/90 transition-all duration-300 cursor-pointer group overflow-hidden">
          <span className="relative z-10">{t("Legal", "Mentions légales")}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 transition-colors duration-300"></div>
        </button>
        
        <button className="relative border border-white/20 px-4 py-2 text-white/60 hover:text-white/90 transition-all duration-300 cursor-pointer group overflow-hidden">
          <span className="relative z-10">{t("Contact", "Contact")}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 transition-colors duration-300"></div>
        </button>
      </div>
    </div>
  );
}
