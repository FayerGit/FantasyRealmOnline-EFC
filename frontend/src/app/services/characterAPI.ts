import { API_URL } from "../config/api.config";

interface CharacterAppearance {
  bodyType: string;
  bodyColor: string;
  hairStyle: string;
  hairColor: string;
  eyeType: string;
  eyeColor: string;
  mouthType: string;
  clothing: {
    head: string;
    top: string;
    legs: string;
    shoes: string;
  };
  armor: {
    helmet: string;
    chestplate: string;
    leggings: string;
    boots: string;
    leftGlove: string;
    rightGlove: string;
  };
  hands: {
    left: string;
    right: string;
  };
  accessories: {
    slot1: string;
    slot2: string;
    slot3: string;
    slot4: string;
  };
}

interface CreateCharacterRequest {
  name: string;
  gender: string;
  appearance: CharacterAppearance;
}

export interface AppearanceOptions {
  bodyTypes: string[];
  hairStyles: string[];
  eyeTypes: string[];
  mouthTypes: string[];
  clothing: {
    head: string[];
    top: string[];
    legs: string[];
    shoes: string[];
  };
  gloves: {
    left: string[];
    right: string[];
  };
  armor: {
    helmet: string[];
    chestplate: string[];
    leggings: string[];
    boots: string[];
    leftGlove: string[];
    rightGlove: string[];
  };
  hands: {
    left: string[];
    right: string[];
  };
  accessories: {
    neck: string[];
    finger: string[];
    wrist: string[];
    waist: string[];
  };
}

interface CharacterResponse {
  success?: boolean;
  error?: string;
  message?: string;
  character?: {
    id: number;
    name: string;
    status: string;
  };
}

interface MyCharactersResponse {
  characters?: Array<{
    id: number;
    name: string;
    gender: string;
    status: string;
    rejection_reason?: string;
    is_shared: number;
    created_at: string;
    [key: string]: any;
  }>;
  error?: string;
}

export const characterAPI = {
  async getAppearanceOptions(): Promise<{ data?: AppearanceOptions; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/appearance/options`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok || result?.status !== "success") {
        return { error: result?.message || "Failed to load appearance options" };
      }

      return { data: result?.data as AppearanceOptions };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to load appearance options" };
    }
  },

  /**
   * Créer un nouveau personnage
   */
  async create(data: CreateCharacterRequest): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Character creation failed",
      };
    }
  },

  /**
   * Mettre à jour un personnage existant
   */
  async updateCharacter(id: number, data: CreateCharacterRequest): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Character update failed",
      };
    }
  },

  /**
   * Récupérer mes personnages
   */
  async getMyCharacters(): Promise<MyCharactersResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/my`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch characters",
      };
    }
  },

  /**
   * Obtenir les personnages approuvés (galerie publique)
   */
  async getApprovedCharacters(): Promise<MyCharactersResponse> {
    try {
      const response = await fetch(`${API_URL}/characters/approved`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch characters",
      };
    }
  },

  /**
   * Obtenir les personnages en attente (admin/employé)
   */
  async getPendingCharacters(): Promise<MyCharactersResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/pending`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch characters",
      };
    }
  },

  /**
   * Approuver un personnage
   */
  async approveCharacter(id: number): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to approve character",
      };
    }
  },

  /**
   * Rejeter un personnage avec motif
   */
  async rejectCharacter(id: number, reason: string): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to reject character",
      };
    }
  },

  /**
   * Publier un personnage approuvé dans la galerie
   */
  async publishCharacter(id: number): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}/publish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to publish character",
      };
    }
  },

  /**
   * Dépublier un personnage de la galerie
   */
  async unpublishCharacter(id: number): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}/unpublish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to unpublish character",
      };
    }
  },

  /**
   * Supprimer un personnage
   */
  async deleteCharacter(id: number): Promise<CharacterResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/characters/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to delete character",
      };
    }
  },

  /**
   * Obtenir tous les personnages publiés pour la galerie
   */
  async getPublishedCharacters(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/characters/published`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('API Error:', error);
        return {
          error: `API Error: ${response.status} ${response.statusText}`,
          characters: [],
        };
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      return {
        error: error instanceof Error ? error.message : "Failed to fetch published characters",
        characters: [],
      };
    }
  },
};
