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

export type AdminEmployee = {
  id: number;
  email: string;
  username: string;
  role: "employee" | "admin" | "player" | string;
  is_suspended: boolean;
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

export const adminAPI = {
  async listEmployees(): Promise<ApiResponse<{ employees: AdminEmployee[] }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/admin/employees`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return await readJsonSafely<ApiResponse<{ employees: AdminEmployee[] }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load employees",
      };
    }
  },

  async createEmployee(payload: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ employee: AdminEmployee }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/admin/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      return await readJsonSafely<ApiResponse<{ employee: AdminEmployee }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create employee",
      };
    }
  },

  async updateEmployee(
    id: number,
    payload: {
      email: string;
      username: string;
      password?: string;
      confirmPassword?: string;
    }
  ): Promise<ApiResponse<{ employee: AdminEmployee }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/admin/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      return await readJsonSafely<ApiResponse<{ employee: AdminEmployee }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update employee",
      };
    }
  },

  async setEmployeeSuspended(
    id: number,
    isSuspended: boolean,
    reason?: string
  ): Promise<ApiResponse<{ id: number; is_suspended: boolean; suspend_reason?: string | null }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/admin/employees/${id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_suspended: isSuspended, reason }),
      });

      return await readJsonSafely<ApiResponse<{ id: number; is_suspended: boolean; suspend_reason?: string | null }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to update employee status",
      };
    }
  },

  async deleteEmployee(id: number): Promise<ApiResponse<{ id: number }>> {
    try {
      const token = getTokenOrThrow();
      const response = await fetch(`${API_URL}/admin/employees/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return await readJsonSafely<ApiResponse<{ id: number }>>(response);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to delete employee",
      };
    }
  },
};
