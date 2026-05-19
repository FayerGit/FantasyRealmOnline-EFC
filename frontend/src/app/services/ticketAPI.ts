import { API_URL } from "../config/api.config";

export interface Ticket {
  id: number;
  user_id?: number;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  user_username?: string;
  user_email?: string;
  is_banned?: boolean;
  assigned_to_username?: string;
  message_count?: number;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  username: string;
  role: string;
  message: string;
  is_staff_response: boolean;
  created_at: string;
}

export interface CreateTicketData {
  subject: string;
  message: string;
}

export interface ReplyToTicketData {
  message: string;
}

/**
 * Créer un nouveau ticket
 */
export async function createTicket(data: CreateTicketData) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to create ticket' };
    }

    return { ticket: result };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { error: 'Failed to create ticket' };
  }
}

/**
 * Récupérer mes tickets
 */
export async function getMyTickets(): Promise<{ tickets?: Ticket[]; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to fetch tickets' };
    }

    return { tickets: result.tickets };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return { error: 'Failed to fetch tickets' };
  }
}

/**
 * Récupérer tous les tickets (personnel seulement)
 */
export async function getAllTickets(status: string = 'all'): Promise<{ tickets?: Ticket[]; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const url = status === 'all' 
      ? `${API_URL}/tickets` 
      : `${API_URL}/tickets?status=${status}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch tickets - Status:', response.status, 'Error:', result);
      return { error: result.error || `Failed to fetch tickets (${response.status})` };
    }

    return { tickets: result.tickets };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return { error: `Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Obtenir les détails d'un ticket
 */
export async function getTicket(id: number): Promise<{ ticket?: Ticket; error?: string }> {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to fetch ticket' };
    }

    return { ticket: result.ticket };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return { error: 'Failed to fetch ticket' };
  }
}

/**
 * Répondre à un ticket
 */
export async function replyToTicket(id: number, data: ReplyToTicketData) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets/${id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result?.error || result?.message || 'Failed to send reply' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error replying to ticket:', error);
    return { error: 'Failed to send reply' };
  }
}

/**
 * Mettre à jour le statut du ticket (personnel seulement)
 */
export async function updateTicketStatus(id: number, status: string) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to update status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { error: 'Failed to update status' };
  }
}

/**
 * Assigner le ticket au personnel (personnel seulement)
 */
export async function assignTicket(id: number, assignedTo?: number) {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/tickets/${id}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ assigned_to: assignedTo })
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || 'Failed to assign ticket' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return { error: 'Failed to assign ticket' };
  }
}

export const ticketAPI = {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  assignTicket
};
