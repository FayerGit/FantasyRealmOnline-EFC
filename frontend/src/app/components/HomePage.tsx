import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { useLanguage } from "../i18n/language";

interface HomePageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function HomePage({ onNavigate, isLoggedIn, onLogout }: HomePageProps) {
  const { t } = useLanguage();
  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="home" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="max-w-5xl mx-auto text-center space-y-12 py-20 relative z-10">
        {/* Hero Section */}
        <div className="border-2 border-white/30 p-16 bg-gradient-to-b from-[#121212] to-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.8)] relative group hover:border-white/50 transition-all duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <h1 className="text-6xl mb-6 text-white font-['Cinzel'] tracking-[0.15em] relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            FANTASYREALM
          </h1>
          
          <div className="text-lg border-t-2 border-white/30 pt-6 mt-6 text-white/70 relative z-10">
            {t(
              "Create and customize your fantasy characters",
              "Créez et personnalisez vos personnages fantastiques"
            )}
          </div>
          
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#8b0000] opacity-60"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#8b0000] opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#8b0000] opacity-60"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#8b0000] opacity-60"></div>
          
          <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/20"></div>
          <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/20"></div>
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/20"></div>
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/20"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-8 justify-center">
          {/* Create Character Button */}
          <button
            onClick={() => onNavigate("create")}
            className="relative border-2 border-white/40 px-16 py-8 text-xl cursor-pointer transition-all duration-300 text-white group overflow-hidden hover:border-white/70 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            
            {/* Border glow effect */}
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0)] group-hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"></div>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            
            <span className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300">
              {t("Create Character", "Créer un personnage")}
            </span>
          </button>
          
          {/* View Gallery Button */}
          <button
            onClick={() => onNavigate("gallery")}
            className="relative border-2 border-white/40 px-16 py-8 text-xl cursor-pointer transition-all duration-300 text-white group overflow-hidden hover:border-white/70 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            
            {/* Border glow effect */}
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0)] group-hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"></div>
            
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 group-hover:border-white/80 transition-colors duration-300"></div>
            
            <span className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300">
              {t("View Gallery", "Voir la galerie")}
            </span>
          </button>
        </div>
      </div>
    </WireframeLayout>
  );
}