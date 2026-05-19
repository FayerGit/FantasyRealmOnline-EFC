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

export type ManagementUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "banned";
  is_banned?: boolean;
  is_suspended?: boolean;
  ban_reason?: string | null;
  suspend_reason?: string | null;
  created_at?: string | null;
};

type ApiResponse<TData> = {
  status: "success" | "error" | string;
  message: string;
  data?: TData;
};

const getTokenOrThrow = (): string => {
  const token = localStorage.getItem("authToken");
  if (!token) throw new Error("No authentication token found");
  return token;
};

export const managementAPI = {
  async listUsers(limit: number = 200): Promise<ApiResponse<{ users: ManagementUser[] }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/management/users?limit=${encodeURIComponent(String(limit))}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return await readJsonSafely<ApiResponse<{ users: ManagementUser[] }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load users",
      };
    }
  },

  async setUserSuspended(
    userId: number,
    isSuspended: boolean,
    reason?: string
  ): Promise<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_suspended" | "suspend_reason"> }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/management/users/${encodeURIComponent(String(userId))}/suspend`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_suspended: isSuspended, reason }),
      });

      return await readJsonSafely<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_suspended" | "suspend_reason"> }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  },

  async banUser(
    userId: number,
    reason?: string
  ): Promise<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_banned" | "ban_reason"> }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/management/users/${encodeURIComponent(String(userId))}/ban`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_banned: true, reason }),
      });

      return await readJsonSafely<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_banned" | "ban_reason"> }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to ban user",
      };
    }
  },

  async setUserBanned(
    userId: number,
    isBanned: boolean,
    reason?: string
  ): Promise<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_banned" | "ban_reason"> }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/management/users/${encodeURIComponent(String(userId))}/ban`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_banned: isBanned, reason }),
      });

      return await readJsonSafely<
        ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username" | "is_banned" | "ban_reason"> }>
      >(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  },

  async deleteUser(userId: number): Promise<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username"> }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/management/users/${encodeURIComponent(String(userId))}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return await readJsonSafely<ApiResponse<{ user: Pick<ManagementUser, "id" | "role" | "username"> }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to delete user",
      };
    }
  },
};
