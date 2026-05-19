<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class NotificationController {
    private $db;
    
    public function __construct() {
        $this->db = getDatabaseConnection();
        $this->ensureNotificationsTableExists();
    }

    private function ensureNotificationsTableExists(): void {
        if (!function_exists('ensureTableExists')) {
            return;
        }

        try {
            ensureTableExists($this->db, 'notifications', "
                CREATE TABLE IF NOT EXISTS `notifications` (
                    `id` int(11) NOT NULL AUTO_INCREMENT,
                    `user_id` int(11) NOT NULL,
                    `type` varchar(50) NOT NULL,
                    `title` varchar(255) NOT NULL,
                    `message` text NOT NULL,
                    `related_type` varchar(50) DEFAULT NULL,
                    `related_id` int(11) DEFAULT NULL,
                    `is_read` tinyint(1) NOT NULL DEFAULT 0,
                    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                    PRIMARY KEY (`id`),
                    KEY `idx_notifications_user_id` (`user_id`),
                    KEY `idx_notifications_user_unread` (`user_id`, `is_read`),
                    CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        } catch (Throwable $e) {
            error_log('Notification table initialization failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Handle notification routes
     */
    public function handleRoute($method, $path, $token) {
        $action = trim($path, '/');
        
        if ($method === 'GET' && $action === 'notifications') {
            $this->getNotifications();
            return true;
        } elseif ($method === 'GET' && $action === 'notifications/unread-count') {
            $this->getUnreadCount();
            return true;
        } elseif ($method === 'PUT' && $action === 'notifications/read-all') {
            $this->markAllAsRead();
            return true;
        } elseif ($method === 'PUT' && preg_match('#^notifications/(\d+)/read$#', $action, $matches)) {
            $this->markAsRead($matches[1]);
            return true;
        } elseif ($method === 'DELETE' && preg_match('#^notifications/(\d+)$#', $action, $matches)) {
            $this->deleteNotification($matches[1]);
            return true;
        } elseif ($method === 'POST' && $action === 'notifications/send') {
            $this->sendNotification();
            return true;
        }
        
        return null;
    }
    
    /**
        * Get notifications for the authenticated user
     * GET /api/notifications
     */
    public function getNotifications() {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                SELECT id, type, title, message, related_type, related_id, is_read, created_at
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            ");
            $stmt->execute([$userId]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['notifications' => $notifications]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Get unread notifications count
     * GET /api/notifications/unread-count
     */
    public function getUnreadCount() {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = ? AND is_read = 0
            ");
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['count' => (int)$result['count']]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Mark a notification as read
     * PUT /api/notifications/:id/read
     */
    public function markAsRead($notificationId) {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                UPDATE notifications
                SET is_read = 1
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$notificationId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Notification marked as read']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Notification not found']);
            }
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Mark all notifications as read
     * PUT /api/notifications/read-all
     */
    public function markAllAsRead() {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                UPDATE notifications
                SET is_read = 1
                WHERE user_id = ? AND is_read = 0
            ");
            $stmt->execute([$userId]);
            
            echo json_encode([
                'success' => true, 
                'message' => 'All notifications marked as read',
                'count' => $stmt->rowCount()
            ]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Delete a notification
     * DELETE /api/notifications/:id
     */
    public function deleteNotification($notificationId) {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                DELETE FROM notifications
                WHERE id = ? AND user_id = ?
            ");
            $stmt->execute([$notificationId, $userId]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Notification deleted']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Notification not found']);
            }
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Create a notification (admin/employee only)
     * POST /api/notifications/send
     */
    public function sendNotification() {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user || !in_array($user['role'], ['admin', 'employee'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return;
        }

        if (!empty($user['is_banned']) || !empty($user['is_suspended'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Suspended/banned staff cannot perform actions']);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validation
        if (!isset($data['user_id']) || !isset($data['title']) || !isset($data['message'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        
        try {
            $stmt = $this->db->prepare("
                INSERT INTO notifications (user_id, type, title, message, related_type, related_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $data['user_id'],
                $data['type'] ?? 'admin_message',
                $data['title'],
                $data['message'],
                $data['related_type'] ?? null,
                $data['related_id'] ?? null
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Notification sent',
                'id' => $this->db->lastInsertId()
            ]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
}

