import { useState } from "react";
import { AshEffect } from "./AshEffect";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "../i18n/language";

interface MobileWireframeLayoutProps {
  children: React.ReactNode;
  onNavigate: (page: Page) => void;
  currentPage?: Page;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function MobileWireframeLayout({ children, onNavigate, currentPage, isLoggedIn, onLogout }: MobileWireframeLayoutProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = authAPI.getUser();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role === "employee";

  const handleNavigate = (page: Page) => {
    setMenuOpen(false);
    onNavigate(page);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col max-w-sm mx-auto relative border-l-2 border-r-2 border-white/10 overflow-hidden">
      <AshEffect />
      <div className="border-b border-white/20 p-3 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] to-[#121212] relative z-50">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

        <button
          onClick={() => onNavigate("home")}
          className="relative border-2 border-white/40 px-4 py-2 text-sm cursor-pointer transition-all duration-300 text-white font-['Cinzel'] tracking-[0.15em] group overflow-hidden"
        >
          <span className="relative z-10 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">FR</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/60 transition-colors duration-300"></div>
        </button>

        <div className="flex items-center gap-2">
          <NotificationBell isLoggedIn={!!isLoggedIn} />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="relative border-2 border-white/40 p-2 flex flex-col gap-1 cursor-pointer transition-all duration-300 group overflow-hidden hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <div className="border-t-2 border-white/90 w-6 group-hover:border-white transition-colors relative z-10"></div>
            <div className="border-t-2 border-white/90 w-6 group-hover:border-white transition-colors relative z-10"></div>
            <div className="border-t-2 border-white/90 w-6 group-hover:border-white transition-colors relative z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {menuOpen && (
        <div className="absolute top-[61px] left-0 right-0 bg-gradient-to-b from-[#121212] to-[#0a0a0a] border-b-2 border-white/30 z-50 shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
          <div className="p-2 space-y-1">
            <button onClick={() => handleNavigate("home")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "home" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
              <span className="relative z-10">{t("Home", "Accueil")}</span>
            </button>
            <button onClick={() => handleNavigate("gallery")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "gallery" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
              <span className="relative z-10">{t("Gallery", "Galerie")}</span>
            </button>
            <button onClick={() => handleNavigate("create")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "create" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
              <span className="relative z-10">{t("Create Character", "Créer un personnage")}</span>
            </button>
            <button onClick={() => handleNavigate("profile")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "profile" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
              <span className="relative z-10">{t("Profile", "Profil")}</span>
            </button>
            <button onClick={() => handleNavigate("settings")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "settings" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
              <span className="relative z-10">{t("Settings", "Paramètres")}</span>
            </button>
            {isLoggedIn && isStaff && (
              <button onClick={() => handleNavigate("management")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "management" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
                <span className="relative z-10">{t("Management", "Gestion")}</span>
              </button>
            )}
            {isLoggedIn && isAdmin && (
              <button onClick={() => handleNavigate("admin")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "admin" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
                <span className="relative z-10">Admin</span>
              </button>
            )}
            {isLoggedIn ? (
              <button onClick={() => { onLogout?.(); setMenuOpen(false); }} className="w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden border border-white/20 text-white/80 hover:border-white/40 hover:text-white">
                <span className="relative z-10">{t("Logout", "Déconnexion")}</span>
              </button>
            ) : (
              <button onClick={() => handleNavigate("login")} className={`w-full p-3 text-left text-sm transition-all duration-300 relative group overflow-hidden ${currentPage === "login" ? "border-2 border-[#8b0000] bg-[#8b0000]/10 text-white shadow-[inset_0_0_20px_rgba(139,0,0,0.3)]" : "border border-white/20 text-white/80 hover:border-white/40 hover:text-white"}`}>
                <span className="relative z-10">{t("Login/Register", "Connexion/Inscription")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 bg-gradient-to-b from-[#0a0a0a] via-[#050505] to-[#0a0a0a] relative z-10">
        {children}
      </div>

      <div className="border-t border-white/20 p-3 space-y-2 text-xs bg-gradient-to-t from-[#0a0a0a] to-[#121212] relative z-10">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <button className="relative w-full border border-white/20 px-2 py-1 text-center text-white/60 hover:text-white/90 transition-all duration-300 cursor-pointer group overflow-hidden">
          <span className="relative z-10">{t("Legal", "Mentions légales")}</span>
        </button>
        <button className="relative w-full border border-white/20 px-2 py-1 text-center text-white/60 hover:text-white/90 transition-all duration-300 cursor-pointer group overflow-hidden">
          <span className="relative z-10">{t("Contact", "Contact")}</span>
        </button>
      </div>
    </div>
  );
}