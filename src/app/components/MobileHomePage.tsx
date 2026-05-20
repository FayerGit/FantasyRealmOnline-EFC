import { MobileWireframeLayout } from "./MobileWireframeLayout";
import { Page } from "../types";
import { useLanguage } from "../i18n/language";

interface MobileHomePageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function MobileHomePage({ onNavigate, isLoggedIn, onLogout }: MobileHomePageProps) {
  const { t } = useLanguage();
  return (
    <MobileWireframeLayout onNavigate={onNavigate} currentPage="home" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="space-y-8 py-12 relative z-10">
        <div className="border-2 border-white/30 p-6 bg-gradient-to-b from-[#121212] to-[#0a0a0a] shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
          <h1 className="text-2xl mb-4 text-white font-['Cinzel'] tracking-[0.1em] leading-tight text-center relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">FANTASYREALM</h1>
          <p className="text-sm text-white/70 text-center">{t("Create and customize your fantasy characters", "Créez et personnalisez vos personnages fantastiques")}</p>
        </div>

        <div className="space-y-4">
          <button onClick={() => onNavigate("create")} className="border border-white/30 p-5 text-center text-base w-full cursor-pointer hover:bg-white/5 hover:border-white/60 transition-all duration-300 text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]">{t("Create Character", "Créer un personnage")}</button>
          <button onClick={() => onNavigate("gallery")} className="border border-white/30 p-5 text-center text-base w-full cursor-pointer hover:bg-white/5 hover:border-white/60 transition-all duration-300 text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]">{t("View Gallery", "Voir la galerie")}</button>
        </div>
      </div>
    </MobileWireframeLayout>
  );
}