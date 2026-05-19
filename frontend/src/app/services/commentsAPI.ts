import { API_URL } from "../config/api.config";

interface CommentRequest {
  characterId: number;
  rating: number; // 1 à 5
  comment: string;
}

interface CommentResponse {
  id: number;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface PendingCommentResponse {
  id: number;
  author: string;
  character_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: string;
}

interface CommentListResponse {
  success?: boolean;
  error?: string;
  comments?: CommentResponse[];
  average_rating?: number;
  total_comments?: number;
}

interface PendingCommentListResponse {
  success?: boolean;
  error?: string;
  comments?: PendingCommentResponse[];
}

export const commentsAPI = {
  /**
   * Soumettre un nouveau commentaire avec notation (le statut sera 'pending')
   */
  async submitComment(data: CommentRequest): Promise<any> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      if (!data.comment || data.comment.trim().length === 0) {
        return {
          error: "Comment cannot be empty",
        };
      }

      if (!data.rating || data.rating < 1 || data.rating > 5) {
        return {
          error: "Rating must be between 1 and 5",
        };
      }

      const response = await fetch(`${API_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          character_id: data.characterId,
          rating: data.rating,
          comment: data.comment,
        }),
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to submit comment",
      };
    }
  },

  /**
   * Récupérer les commentaires approuvés pour un personnage
   */
  async getCharacterComments(characterId: number): Promise<CommentListResponse> {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/comments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch comments",
        comments: [],
      };
    }
  },

  /**
   * Récupérer les commentaires en attente (personnel seulement)
   */
  async getPendingComments(): Promise<PendingCommentListResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
          comments: [],
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
        error: error instanceof Error ? error.message : "Failed to fetch pending comments",
        comments: [],
      };
    }
  },

  /**
   * Approuver un commentaire (personnel seulement)
   */
  async approveComment(commentId: number): Promise<any> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/${commentId}/approve`, {
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
   * Rejeter un commentaire (personnel seulement)
   */
  async rejectComment(commentId: number, reason?: string): Promise<any> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/${commentId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason || "" }),
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to reject comment",
      };
    }
  },

  /**
  * Supprimer un commentaire (personnel ou auteur seulement)
   */
  async deleteComment(commentId: number): Promise<any> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to delete comment",
      };
    }
  },
};
