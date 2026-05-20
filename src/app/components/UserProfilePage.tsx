import { useState, useEffect } from "react";
import { WireframeLayout } from "./WireframeLayout";
import { Page } from "../types";
import { authAPI } from "../services/authAPI";
import { characterAPI } from "../services/characterAPI";
import PublishButton from "./PublishButton";
import { ConfirmModal } from "./ConfirmModal";
import { CharacterPreview } from "./CharacterPreview";

const PREDEFINED_AVATARS = [
  { id: 1, label: "Knight", icon: "K" },
  { id: 2, label: "Mage", icon: "M" },
  { id: 3, label: "Rogue", icon: "R" },
  { id: 4, label: "Ranger", icon: "G" },
  { id: 5, label: "Paladin", icon: "P" },
  { id: 6, label: "Summoner", icon: "S" },
];

interface UserProfilePageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function UserProfilePage({ onNavigate, isLoggedIn, onLogout }: UserProfilePageProps) {
  const [user, setUser] = useState<{ email: string; username: string; role?: string; created_at?: string; avatar_id?: number; username_changed_at?: string } | null>(null);
  const [characters, setCharacters] = useState<Array<{ id: number; name: string; status?: string; is_published?: boolean; [key: string]: any }>>([]);
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState(1);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<{ id: number; name: string } | null>(null);
  const isStaff = user?.role === "admin" || user?.role === "employee";

  useEffect(() => {
    const userData = authAPI.getUser();
    setUser(userData);
    setNewUsername(userData?.username ?? "");
    setSelectedAvatarId(userData?.avatar_id ?? 1);
  }, []);

  const loadCharacters = async () => {
    const result = await characterAPI.getMyCharacters();
    if (result.error) {
      setCharacterError(result.error);
      return;
    }
    setCharacterError(null);
    setCharacters(result.characters ?? []);
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  const handleEditCharacter = (character: { id: number; name: string; [key: string]: any }) => {
    localStorage.setItem("editingCharacter", JSON.stringify(character));
    onNavigate("create");
  };

  const handleDeleteCharacter = async (character: { id: number; name: string }) => {
    setCharacterToDelete(character);
  };

  const confirmDeleteCharacter = async () => {
    if (!characterToDelete) return;

    const result = await characterAPI.deleteCharacter(characterToDelete.id);
    if (result.error) {
      setCharacterError(result.error);
      return;
    }

    setCharacterToDelete(null);
    await loadCharacters();
  };

  const usernameChangeLocked = (() => {
    if (!user?.username_changed_at) return false;
    const last = new Date(user.username_changed_at).getTime();
    if (Number.isNaN(last)) return false;
    const now = Date.now();
    return now - last < 30 * 24 * 60 * 60 * 1000;
  })();

  const handleSaveProfile = async () => {
    setProfileFeedback(null);
    setIsSavingProfile(true);

    const payload: { username?: string; avatar_id?: number } = {
      avatar_id: selectedAvatarId,
    };

    if (!isStaff && newUsername.trim() && newUsername.trim() !== user?.username) {
      payload.username = newUsername.trim();
    }

    const result = await authAPI.updateProfile(payload);

    if (result.status !== "success" || !result.data?.user) {
      setProfileFeedback(result.message || "Failed to update profile");
      setIsSavingProfile(false);
      return;
    }

    const existing = authAPI.getUser();
    const updatedUser = {
      ...existing,
      id: result.data.user.id ?? existing?.id,
      email: result.data.user.email,
      username: result.data.user.username,
      role: result.data.user.role,
      avatar_id: result.data.user.avatar_id,
      username_changed_at: result.data.user.username_changed_at,
      created_at: result.data.user.created_at,
    };

    authAPI.setUser(updatedUser);
    setUser(updatedUser);
    setNewUsername(updatedUser.username);
    setSelectedAvatarId(updatedUser.avatar_id ?? 1);
    setProfileFeedback("Profile updated successfully");
    setIsSavingProfile(false);
    setIsEditingProfile(false);
  };

  return (
    <WireframeLayout onNavigate={onNavigate} currentPage="profile" isLoggedIn={isLoggedIn} onLogout={onLogout}>
      <div className="max-w-4xl mx-auto space-y-6">
        <ConfirmModal
          isOpen={!!characterToDelete}
          title="Supprimer le personnage"
          message={characterToDelete ? `Es-tu sûr de vouloir supprimer "${characterToDelete.name}" ? Cette action est irréversible.` : ""}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          onConfirm={confirmDeleteCharacter}
          onCancel={() => setCharacterToDelete(null)}
        />

        {/* User Info Section */}
        <div className="border border-white/20 p-6 bg-[#121212]">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="border border-white/30 w-24 h-24 flex items-center justify-center text-3xl bg-[#0a0a0a]">
                {PREDEFINED_AVATARS.find((a) => a.id === (user?.avatar_id ?? 1))?.icon ?? "K"}
              </div>
              {/* User Details */}
              <div className="space-y-2">
                <div className="text-lg border-b border-white/20 pb-1 text-white font-['Cinzel'] tracking-wider">{user?.username || "Player"}</div>
                <div className="text-sm text-white/70">Email: {user?.email || "Loading..."}</div>
                {(user?.role === "employee" || user?.role === "admin") && (
                  <div className="text-sm text-white/70">Role: {user.role === "admin" ? "Admin" : "Employee"}</div>
                )}
                <div className="text-sm text-white/70">Member since: {formatDate(user?.created_at)}</div>
              </div>
            </div>
            {/* Edit Button */}
            <button
              onClick={() => {
                setIsEditingProfile((prev) => !prev);
                setProfileFeedback(null);
                setNewUsername(user?.username ?? "");
                setSelectedAvatarId(user?.avatar_id ?? 1);
              }}
              className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all duration-300 cursor-pointer"
            >
              {isEditingProfile ? "Close" : "Edit Profile"}
            </button>
          </div>

          {isEditingProfile && (
            <div className="mt-5 border border-white/20 p-4 bg-[#0a0a0a] space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-white/70">Username (change max once every 30 days)</label>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={usernameChangeLocked || isStaff}
                  className="w-full border border-white/20 bg-[#121212] px-3 py-2 text-sm text-white/90 disabled:opacity-50"
                />
                {isStaff && (
                  <p className="text-xs text-yellow-300/90">Employee/Admin accounts cannot change identifier.</p>
                )}
                {usernameChangeLocked && (
                  <p className="text-xs text-yellow-300/90">Username change is temporarily locked (30 days rule).</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/70">Choose your avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {PREDEFINED_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`border p-2 text-center transition-all ${
                        selectedAvatarId === avatar.id
                          ? "border-white/60 bg-white/10"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="text-xl">{avatar.icon}</div>
                      <div className="text-[10px] text-white/70 mt-1">{avatar.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {profileFeedback && (
                <p className="text-xs text-white/80 border border-white/20 bg-[#121212] p-2">{profileFeedback}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="border border-white/30 px-4 py-2 text-sm text-white/90 hover:bg-white/5 hover:border-white/50 transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Characters Section */}
        <div className="border border-white/20 p-6 space-y-4 bg-[#121212]">
          <h2 className="border-b border-white/20 pb-3 text-lg text-white font-['Cinzel'] tracking-wider">
            My Characters
          </h2>

          {characters.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {characters.map((character) => (
                <div key={character.id} className="border border-white/20 p-3 space-y-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:border-white/40 transition-all duration-300">
                  <div className="border border-white/20 aspect-square bg-[#121212] overflow-hidden">
                    <CharacterPreview character={character} recolorScale={0.2} className="w-full h-full" />
                  </div>
                  <div className="border-t border-white/20 pt-2 text-sm text-center text-white/90">
                    {character.name}
                  </div>
                  <div className="text-xs text-center text-white/60">Status: {character.status ?? "pending"}</div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEditCharacter(character)}
                      className="border border-white/20 px-2 py-1 text-xs flex-1 text-center text-white/80 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCharacter(character)}
                      className="border border-white/20 px-2 py-1 text-xs flex-1 text-center text-white/80 hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                  {character.status === 'approved' && (
                    <div className="pt-2">
                      <PublishButton character={character} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : characterError ? (
            <div className="border border-red-500/30 p-4 text-sm text-center text-red-400/90 bg-red-500/5">
              {characterError}
            </div>
          ) : (
            <div className="border border-white/20 p-6 text-sm text-center text-white/60 bg-[#0a0a0a]">
              No characters yet.
            </div>
          )}
        </div>
      </div>
    </WireframeLayout>
  );
}