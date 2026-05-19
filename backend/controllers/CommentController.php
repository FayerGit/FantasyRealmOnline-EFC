<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class CommentController {
    private $db;

    public function __construct() {
        $this->db = getDatabaseConnection();
    }

    /**
     * Handle comment moderation routes
     */
    public function handleRoute($method, $path, $token) {
        $action = trim($path, '/');

        if ($method === 'POST' && $action === 'comments') {
            $this->submitComment();
            return true;
        } elseif ($method === 'GET' && preg_match('#^characters/(\d+)/comments$#', $action, $matches)) {
            $this->getCharacterComments((int)$matches[1]);
            return true;
        } elseif ($method === 'GET' && $action === 'comments/pending') {
            $this->getPendingComments();
            return true;
        } elseif ($method === 'PUT' && preg_match('#^comments/(\d+)/approve$#', $action, $matches)) {
            $this->approveComment((int)$matches[1]);
            return true;
        } elseif ($method === 'PUT' && preg_match('#^comments/(\d+)/reject$#', $action, $matches)) {
            $this->rejectComment((int)$matches[1]);
            return true;
        } elseif ($method === 'DELETE' && preg_match('#^comments/(\d+)$#', $action, $matches)) {
            $this->deleteComment((int)$matches[1]);
            return true;
        }

        return null;
    }

    /**
     * POST /api/comments - Submit a new comment with rating
     */
    private function submitComment() {
        header('Content-Type: application/json');

        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $characterId = $input['character_id'] ?? null;
        $rating = $input['rating'] ?? null;
        $comment = trim($input['comment'] ?? '');

        if (!$characterId) {
            http_response_code(400);
            echo json_encode(['error' => 'Character ID is required']);
            return;
        }

        if (!$rating || !is_numeric($rating) || $rating < 1 || $rating > 5) {
            http_response_code(400);
            echo json_encode(['error' => 'Rating must be between 1 and 5']);
            return;
        }

        if (empty($comment)) {
            http_response_code(400);
            echo json_encode(['error' => 'Comment cannot be empty']);
            return;
        }

        if (strlen($comment) > 1000) {
            http_response_code(400);
            echo json_encode(['error' => 'Comment is too long (max 1000 characters)']);
            return;
        }

        try {
            // Vérifier que le personnage existe et est publié
            $stmt = $this->db->prepare("SELECT id FROM characters WHERE id = ? AND is_published = 1");
            $stmt->execute([$characterId]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found or not published']);
                return;
            }

            $userId = $user['id'] ?? $user['userId'];

            // Vérifier que l'utilisateur n'a pas deja commenté
            $stmt = $this->db->prepare("
                SELECT id FROM comments WHERE character_id = ? AND user_id = ?
            ");
            $stmt->execute([$characterId, $userId]);
            if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                http_response_code(400);
                echo json_encode(['error' => 'You have already commented on this character']);
                return;
            }

            // Inserer le commentaire
            $stmt = $this->db->prepare("
                INSERT INTO comments (character_id, user_id, rating, comment, status, created_at)
                VALUES (?, ?, ?, ?, 'pending', NOW())
            ");
            $stmt->execute([$characterId, $userId, $rating, $comment]);
            $commentId = $this->db->lastInsertId();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Comment submitted for approval',
                'comment_id' => $commentId
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/characters/:id/comments - Get approved comments for a character
     */
    private function getCharacterComments($characterId) {
        header('Content-Type: application/json');

        try {
            // Charger les commentaires
            $stmt = $this->db->prepare("
                SELECT 
                    c.id,
                    c.rating,
                    c.comment,
                    c.created_at,
                    u.username
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.character_id = ? AND c.status = 'approved'
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$characterId]);
            $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculer les stats en PHP
            $result = $comments;
            $avgRating = 0;
            $totalComments = count($comments);
            
            if ($totalComments > 0) {
                $totalRating = array_sum(array_column($comments, 'rating'));
                $avgRating = round($totalRating / $totalComments, 1);
            }
            
            foreach ($result as &$comment) {
            }

            echo json_encode([
                'comments' => $result,
                'average_rating' => $avgRating,
                'total_comments' => $totalComments
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/comments/:id - Delete a comment (author or staff only)
     */
    private function deleteComment($commentId) {
        header('Content-Type: application/json');

        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $userId = $user['id'] ?? $user['userId'];
        $isStaff = in_array($user['role'] ?? '', ['admin', 'employee'], true);
        $canModerate = $isStaff && empty($user['is_suspended']) && empty($user['is_banned']);

        try {
            // Vérifier que le commentaire existe
            $stmt = $this->db->prepare("SELECT id, user_id FROM comments WHERE id = ?");
            $stmt->execute([$commentId]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment) {
                http_response_code(404);
                echo json_encode(['error' => 'Comment not found']);
                return;
            }

            // Vérifier que l'utilisateur est l'auteur ou le staff (actif)
            if ($comment['user_id'] != $userId && !$canModerate) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }

            // Supprimer le commentaire
            $stmt = $this->db->prepare("DELETE FROM comments WHERE id = ?");
            $stmt->execute([$commentId]);

            echo json_encode(['success' => true, 'message' => 'Comment deleted']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/comments/pending
     */
    private function getPendingComments() {
        header('Content-Type: application/json');

        $user = $this->requireStaff();
        if (!$user) {
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT c.id, c.rating, c.comment, c.status, c.created_at, c.user_id, c.character_id,
                       u.username AS author, ch.name AS character_name
                FROM comments c
                JOIN users u ON c.user_id = u.id
                JOIN characters ch ON c.character_id = ch.id
                WHERE c.status = 'pending'
                ORDER BY c.created_at DESC
            ");
            $stmt->execute();
            $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['comments' => $comments]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/comments/:id/approve
     */
    private function approveComment($commentId) {
        header('Content-Type: application/json');

        $user = $this->requireStaff(true);
        if (!$user) {
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT c.id, c.user_id, ch.name AS character_name
                FROM comments c
                JOIN characters ch ON c.character_id = ch.id
                WHERE c.id = ?
            ");
            $stmt->execute([$commentId]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment) {
                http_response_code(404);
                echo json_encode(['error' => 'Comment not found']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE comments SET status = 'approved' WHERE id = ?");
            $stmt->execute([$commentId]);

            $this->createNotificationForUser(
                $comment['user_id'],
                'comment_approved',
                'Comment Approved',
                "Your comment on '{$comment['character_name']}' has been approved.",
                'comment',
                $commentId
            );

            $this->logAction($user['userId'] ?? $user['id'], 'comment_approved', 'comment', $commentId);

            echo json_encode(['success' => true, 'message' => 'Comment approved']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/comments/:id/reject
     */
    private function rejectComment($commentId) {
        header('Content-Type: application/json');

        $user = $this->requireStaff(true);
        if (!$user) {
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['reason'] ?? '');

        if ($reason === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Rejection reason is required']);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT c.id, c.user_id, ch.name AS character_name
                FROM comments c
                JOIN characters ch ON c.character_id = ch.id
                WHERE c.id = ?
            ");
            $stmt->execute([$commentId]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment) {
                http_response_code(404);
                echo json_encode(['error' => 'Comment not found']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE comments SET status = 'rejected' WHERE id = ?");
            $stmt->execute([$commentId]);

            $this->createNotificationForUser(
                $comment['user_id'],
                'comment_rejected',
                'Comment Rejected',
                "Your comment on '{$comment['character_name']}' was rejected. Reason: {$reason}",
                'comment',
                $commentId
            );

            $this->logAction($user['userId'] ?? $user['id'], 'comment_rejected', 'comment', $commentId);

            echo json_encode(['success' => true, 'message' => 'Comment rejected']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * Create a notification for a user
     */
    private function createNotificationForUser($userId, $type, $title, $message, $relatedType, $relatedId) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO notifications (user_id, type, title, message, related_type, related_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$userId, $type, $title, $message, $relatedType, $relatedId]);
        } catch (PDOException $e) {
            error_log("Failed to create user notification: " . $e->getMessage());
        }
    }

    /**
     * Log an action
     */
    private function logAction($userId, $action, $targetType, $targetId) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO logs (user_id, action, target_type, target_id, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$userId, $action, $targetType, $targetId]);
        } catch (PDOException $e) {
            error_log("Failed to log action: " . $e->getMessage());
        }
    }

    /**
     * Ensure the user is admin/employee
     */
    private function requireStaff(bool $requireActiveForActions = false) {
        $user = AuthMiddleware::authenticate();
        if (!$user || !in_array($user['role'] ?? '', ['admin', 'employee'], true)) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            return null;
        }

        if ($requireActiveForActions && (!empty($user['is_banned']) || !empty($user['is_suspended']))) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Suspended/banned staff cannot perform actions']);
            return null;
        }

        return $user;
    }
}

