import { API_URL } from "../config/api.config";

interface PendingCommentsResponse {
  comments?: Array<{
    id: number;
    comment: string | null;
    status: string;
    created_at: string;
    user_id: number;
    character_id: number;
    author?: string;
    character_name?: string;
  }>;
  error?: string;
}

interface ActionResponse {
  success?: boolean;
  error?: string;
  message?: string;
}

export const commentAPI = {
  /**
   * Récupérer les commentaires en attente (admin/employé)
   */
  async getPendingComments(): Promise<PendingCommentsResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/pending`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch comments",
      };
    }
  },

  /**
   * Approuver un commentaire
   */
  async approveComment(id: number): Promise<ActionResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to approve comment",
      };
    }
  },

  /**
   * Rejeter un commentaire avec motif
   */
  async rejectComment(id: number, reason: string): Promise<ActionResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/${id}/reject`, {
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
        error: error instanceof Error ? error.message : "Failed to reject comment",
      };
    }
  },
};
