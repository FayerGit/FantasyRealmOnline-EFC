import { WireframeLayout } from "./WireframeLayout";
import { CharacterGallery } from "./CharacterGallery";
import { Page } from "../types";

interface CharacterGalleryPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function CharacterGalleryPage({ onNavigate, isLoggedIn, onLogout }: CharacterGalleryPageProps) {
  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="gallery" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <CharacterGallery />
    </WireframeLayout>
  );
}