import { API_URL } from "../config/api.config";

const readJsonSafely = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    throw new Error(`Empty response (HTTP ${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 200);
    throw new Error(`Invalid JSON (HTTP ${response.status}): ${preview}`);
  }
};

const extractMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const normalizeLoginError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Login failed";
  }

  const lowerMessage = error.message.toLowerCase();
  if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("networkerror") || lowerMessage.includes("empty response")) {
    return "Impossible de joindre le backend. Vérifie que MySQL/XAMPP et le site local sont lancés.";
  }

  return error.message;
};

export type StoredUser = {
  id?: number;
  email: string;
  username: string;
  role?: string;
  avatar_id?: number;
  username_changed_at?: string;
  created_at?: string;
  is_suspended?: boolean;
  is_banned?: boolean;
  ban_reason?: string;
  banned_at?: string | null;
  ban_expires_at?: string | null;
  suspend_reason?: string;
};

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface AuthResponse {
  status: string;
  message: string;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
      username: string;
      role: string;
      avatar_id?: number;
      username_changed_at?: string;
      is_suspended?: boolean;
      is_banned?: boolean;
      ban_reason?: string;
      banned_at?: string | null;
      ban_expires_at?: string | null;
      suspend_reason?: string;
      created_at?: string;
    };
  };
}

interface UserResponse {
  status: string;
  message: string;
  data?: {
    user: {
      id: number;
      email: string;
      username: string;
      role: string;
      avatar_id?: number;
      username_changed_at?: string;
      is_suspended?: boolean;
      is_banned?: boolean;
      ban_reason?: string;
      banned_at?: string | null;
      ban_expires_at?: string | null;
      suspend_reason?: string;
      created_at?: string;
    };
  };
}

interface BasicResponse {
  status: string;
  message: string;
}

export const authAPI = {
  /**
   * Enregistrer un nouvel utilisateur
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      return await readJsonSafely<AuthResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Registration failed",
      };
    }
  },

  /**
   * Connexion utilisateur
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const payload = await readJsonSafely<AuthResponse & { error?: string }>(response);
      const message = extractMessage(payload, response.ok ? "Login successful" : `Login failed (HTTP ${response.status})`);

      return {
        ...payload,
        status: response.ok ? payload.status || "success" : "error",
        message,
      };
    } catch (error) {
      return {
        status: "error",
        message: normalizeLoginError(error),
      };
    }
  },

  /**
   * Obtenir l'utilisateur courant
   */
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return await readJsonSafely<UserResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch user",
      };
    }
  },

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return await readJsonSafely<{ status: string; message: string }>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Logout failed",
      };
    }
  },

  /**
   * Mettre à jour le profil de l'utilisateur courant
   */
  async updateProfile(data: { username?: string; avatar_id?: number }): Promise<UserResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await readJsonSafely<UserResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  },

  /**
   * Mettre à jour les paramètres du compte (email/mot de passe)
   */
  async updateSettings(data: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }): Promise<UserResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/auth/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await readJsonSafely<UserResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update settings",
      };
    }
  },

  /**
   * Demander un code de vérification pour la mise à jour des paramètres
   */
  async requestSettingsCode(data: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }): Promise<BasicResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/auth/settings/request-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return await readJsonSafely<BasicResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to request verification code",
      };
    }
  },

  /**
   * Confirmer la mise à jour des paramètres avec un code de vérification
   */
  async confirmSettingsCode(code: string): Promise<UserResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          status: "error",
          message: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/auth/settings/confirm-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      return await readJsonSafely<UserResponse>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to confirm verification code",
      };
    }
  },

  /**
   * Stocker le token d'authentification
   */
  setToken(token: string): void {
    localStorage.setItem("authToken", token);
  },

  /**
   * Récupérer le token d'authentification stocké
   */
  getToken(): string | null {
    return localStorage.getItem("authToken");
  },

  /**
   * Supprimer le token d'authentification
   */
  removeToken(): void {
    localStorage.removeItem("authToken");
  },

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem("authToken");
  },

  /**
   * Stocker les données utilisateur
   */
  setUser(user: StoredUser): void {
    localStorage.setItem("userData", JSON.stringify(user));
  },

  /**
   * Récupérer les données utilisateur stockées
   */
  getUser(): StoredUser | null {
    const data = localStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  },

  /**
   * Supprimer les données utilisateur
   */
  removeUser(): void {
    localStorage.removeItem("userData");
  },
};
