<?php

class TicketController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Handle ticket routes
     */
    public function handleRoute($method, $route) {
        // Analyser la route
        $parts = explode('/', trim($route, '/'));
        
        // POST /tickets - Create ticket
        if ($method === 'POST' && $parts[0] === 'tickets' && count($parts) === 1) {
            return $this->createTicket();
        }
        
        // GET /tickets/mon - Obtenir mes tickets
        if ($method === 'GET' && $parts[0] === 'tickets' && isset($parts[1]) && $parts[1] === 'my' && count($parts) === 2) {
            return $this->getMyTickets();
        }
        
        // GET /tickets - Obtenir tous les tickets (staff seulement)
        if ($method === 'GET' && $parts[0] === 'tickets' && count($parts) === 1) {
            return $this->getAllTickets();
        }
        
        // GET /tickets/:id - Obtenir les details du ticket
        if ($method === 'GET' && $parts[0] === 'tickets' && count($parts) === 2 && is_numeric($parts[1])) {
            return $this->getTicket($parts[1]);
        }
        
        // POST /tickets/:id/reply - Reply to ticket
        if ($method === 'POST' && $parts[0] === 'tickets' && $parts[2] === 'reply' && count($parts) === 3) {
            return $this->replyToTicket($parts[1]);
        }
        
        // PUT /tickets/:id/status - Update ticket status (staff only)
        if ($method === 'PUT' && $parts[0] === 'tickets' && $parts[2] === 'status' && count($parts) === 3) {
            return $this->updateTicketStatus($parts[1]);
        }
        
        // PUT /tickets/:id/assign - Assign ticket (staff only)
        if ($method === 'PUT' && $parts[0] === 'tickets' && $parts[2] === 'assign' && count($parts) === 3) {
            return $this->assignTicket($parts[1]);
        }
        
        return null;
    }

    /**
     * Create a new ticket (banned users can only create 1)
     */
    public function createTicket() {
        $currentUser = AuthMiddleware::authenticate();
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return true;
        }

        $userId = $currentUser['userId'];

        // Vérifier si l'utilisateur a deja un ticket ouvert (utilisateurs bannis limités à 1)
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count 
            FROM tickets 
            WHERE user_id = ? AND status IN ('open', 'in_progress')
        ");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // Les utilisateurs bannis ne peuvent avoir que 1 ticket ouvert
        $stmt2 = $this->pdo->prepare("SELECT is_banned FROM users WHERE id = ?");
        $stmt2->execute([$userId]);
        $user = $stmt2->fetch(PDO::FETCH_ASSOC);

        if ($user['is_banned'] && $result['count'] > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'You already have an open ticket. Please wait for a response.']);
            return;
        }

        // Obtenir le corps de la demande
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['subject']) || !isset($data['message'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Subject and message are required']);
            return;
        }

        $subject = trim($data['subject']);
        $message = trim($data['message']);

        if (empty($subject) || empty($message)) {
            http_response_code(400);
            echo json_encode(['error' => 'Subject and message cannot be empty']);
            return true;
        }

        // Creer le ticket
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                INSERT INTO tickets (user_id, subject, message, status, priority, created_at)
                VALUES (?, ?, ?, 'open', 'medium', NOW())
            ");
            $stmt->execute([$userId, $subject, $message]);
            $ticketId = $this->pdo->lastInsertId();

            // Creer le message initial
            $stmt = $this->pdo->prepare("
                INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_response, created_at)
                VALUES (?, ?, ?, 0, NOW())
            ");
            $stmt->execute([$ticketId, $userId, $message]);

            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'ticket_id' => $ticketId,
                'message' => 'Ticket created successfully'
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create ticket']);
        }
        
        return true;
    }

    /**
     * Get user's tickets
     */
    public function getMyTickets() {
        $currentUser = AuthMiddleware::authenticate();
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return true;
        }

        $userId = $currentUser['userId'];

        $stmt = $this->pdo->prepare("
            SELECT 
                t.id,
                t.subject,
                t.message,
                t.status,
                t.priority,
                t.created_at,
                t.updated_at,
                t.closed_at,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
            FROM tickets t
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$userId]);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['tickets' => $tickets]);
        return true;
    }

    /**
     * Get ticket details with messages
     */
    public function getTicket($ticketId) {
        $currentUser = AuthMiddleware::authenticate();
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return true;
        }

        $userId = $currentUser['userId'];
        $isStaff = in_array($currentUser['role'], ['admin', 'employee']);

        // Obtenir le ticket
        $stmt = $this->pdo->prepare("
            SELECT 
                t.*,
                u.username as user_username,
                u.email as user_email,
                u.is_banned,
                staff.username as assigned_to_username
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN users staff ON t.assigned_to = staff.id
            WHERE t.id = ?
        ");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket not found']);
            return;
        }

        // Verifier la permission (utilisateur ne peut voir que ses propres tickets, staff peut voir tous)
        if ($ticket['user_id'] != $userId && !$isStaff) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        // Obtenir les messages
        $stmt = $this->pdo->prepare("
            SELECT 
                tm.*,
                u.username,
                u.role
            FROM ticket_messages tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        ");
        $stmt->execute([$ticketId]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ticket['messages'] = $messages;

        echo json_encode(['ticket' => $ticket]);
        return true;
    }

    /**
     * Reply to a ticket
     */
    public function replyToTicket($ticketId) {
        $currentUser = AuthMiddleware::authenticate();
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return true;
        }

        $userId = $currentUser['userId'];
        $isStaff = in_array($currentUser['role'], ['admin', 'employee']);
        $canActAsStaff = $isStaff && empty($currentUser['is_suspended']) && empty($currentUser['is_banned']);

        // Obtenir le ticket
        $stmt = $this->pdo->prepare("SELECT * FROM tickets WHERE id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket not found']);
            return;
        }

        // Verifier la permission (staff suspendu/banni ne peut agir que comme utilisateur normal)
        if ($ticket['user_id'] != $userId && !$canActAsStaff) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        $isStaffResponse = ($ticket['user_id'] != $userId) ? ($canActAsStaff ? 1 : 0) : 0;

        // Vérifier si le ticket est fermé
        if ($ticket['status'] === 'closed') {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot reply to closed ticket']);
            return;
        }

        // Obtenir le message
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['message']) || empty(trim($data['message']))) {
            http_response_code(400);
            echo json_encode(['error' => 'Message is required']);
            return;
        }

        $message = trim($data['message']);

        // Creer le message
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_response, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$ticketId, $userId, $message, $isStaffResponse]);

            // Mettre à jour le ticket updated_at
            $stmt = $this->pdo->prepare("UPDATE tickets SET updated_at = NOW() WHERE id = ?");
            $stmt->execute([$ticketId]);

            // Si c'est une réponse de l'utilisateur, remettre le statut à 'ouvert' s'il etait 'en cours'
            if (!$isStaffResponse && $ticket['status'] === 'in_progress') {
                $stmt = $this->pdo->prepare("UPDATE tickets SET status = 'open' WHERE id = ?");
                $stmt->execute([$ticketId]);
            }

            // Si c'est une réponse du staff, remettre le statut à 'en cours' s'il etait 'ouvert'
            if ($isStaffResponse && $ticket['status'] === 'open') {
                $stmt = $this->pdo->prepare("UPDATE tickets SET status = 'in_progress', assigned_to = ? WHERE id = ?");
                $stmt->execute([$userId, $ticketId]);
            }

            // Creer une notification pour l'autre partie
            try {
                if ($isStaffResponse) {
                    // Notifier l'utilisateur
                    $this->createNotification(
                        $ticket['user_id'],
                        'ticket_response',
                        'Staff Response',
                        'A staff member has responded to your ticket',
                        'ticket',
                        $ticketId
                    );
                } else {
                    // Notifier le staff (si assigné)
                    if ($ticket['assigned_to']) {
                        $this->createNotification(
                            $ticket['assigned_to'],
                            'ticket_response',
                            'User Response',
                            'User has responded to ticket #' . $ticketId,
                            'ticket',
                            $ticketId
                        );
                    }
                }
            } catch (Throwable $e) {
                error_log('Ticket notification failed: ' . $e->getMessage());
            }

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Reply sent']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to send reply']);
        }
        
        return true;
    }

    /**
     * Get all tickets (staff only)
     */
    public function getAllTickets() {
        try {
            $this->requireStaff();

            $status = $_GET['status'] ?? 'all';

            $sql = "
                SELECT 
                    t.id,
                    t.subject,
                    t.message,
                    t.status,
                    t.priority,
                    t.created_at,
                    t.updated_at,
                    u.username as user_username,
                    u.email as user_email,
                    u.is_banned,
                    staff.username as assigned_to_username,
                    (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
                FROM tickets t
                JOIN users u ON t.user_id = u.id
                LEFT JOIN users staff ON t.assigned_to = staff.id
            ";

            if ($status !== 'all') {
                $sql .= " WHERE t.status = ?";
            }

            $sql .= " ORDER BY 
                CASE t.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                t.created_at DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            
            if ($status !== 'all') {
                $stmt->execute([$status]);
            } else {
                $stmt->execute();
            }

            $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['tickets' => $tickets]);
        } catch (Exception $e) {
            error_log("TicketController getAllTickets error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch tickets: ' . $e->getMessage()]);
        }
        
        return true;
    }

    /**
     * Update ticket status (staff only)
     */
    public function updateTicketStatus($ticketId) {
        $this->requireStaff(true);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Status is required']);
            return;
        }

        $allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!in_array($data['status'], $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
        }

        $closedAt = $data['status'] === 'closed' || $data['status'] === 'resolved' ? 'NOW()' : 'NULL';

        $stmt = $this->pdo->prepare("
            UPDATE tickets 
            SET status = ?, closed_at = $closedAt, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$data['status'], $ticketId]);

        echo json_encode(['success' => true, 'message' => 'Ticket status updated']);
        return true;
    }

    /**
     * Assign ticket to staff (staff only)
     */
    public function assignTicket($ticketId) {
        $currentUser = $this->requireStaff(true);

        $data = json_decode(file_get_contents('php://input'), true);
        $assignedTo = $data['assigned_to'] ?? $currentUser['userId'];

        $stmt = $this->pdo->prepare("
            UPDATE tickets 
            SET assigned_to = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$assignedTo, $ticketId]);

        echo json_encode(['success' => true, 'message' => 'Ticket assigned']);
        return true;
    }

    /**
     * Helper: Require staff role
     */
    private function requireStaff(bool $requireActiveForActions = false) {
        $currentUser = AuthMiddleware::authenticate();
        if (!$currentUser || !in_array($currentUser['role'], ['admin', 'employee'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Staff access required']);
            exit;
        }

        if ($requireActiveForActions && (!empty($currentUser['is_banned']) || !empty($currentUser['is_suspended']))) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Suspended/banned staff cannot perform actions']);
            exit;
        }
        return $currentUser;
    }

    /**
     * Helper: Create notification
     */
    private function createNotification($userId, $type, $title, $message, $relatedType = null, $relatedId = null) {
        $stmt = $this->pdo->prepare("
            INSERT INTO notifications (user_id, type, title, message, related_type, related_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $type, $title, $message, $relatedType, $relatedId]);
    }
}

