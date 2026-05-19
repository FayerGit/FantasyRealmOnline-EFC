import { API_URL } from "../config/api.config";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_type?: string;
  related_id?: number;
  is_read: number;
  created_at: string;
}

interface NotificationsResponse {
  notifications?: Notification[];
  error?: string;
}

interface UnreadCountResponse {
  count?: number;
  error?: string;
}

interface NotificationActionResponse {
  success?: boolean;
  message?: string;
  count?: number;
  error?: string;
}

export const notificationAPI = {
  /**
   * Get notifications for current user
   */
  async getNotifications(): Promise<NotificationsResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/notifications`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch notifications",
      };
    }
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch unread count",
      };
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<NotificationActionResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to mark notification as read",
      };
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationActionResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to mark all as read",
      };
    }
  },

  /**
   * Delete notification
   */
  async deleteNotification(id: number): Promise<NotificationActionResponse> {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        return {
          error: "No authentication token found",
        };
      }

      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      return await response.json();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to delete notification",
      };
    }
  },
};
