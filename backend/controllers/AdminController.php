<?php
/**
 * Contrôleur Admin
 * Gère les opérations réservées aux admins : visualisation des logs, gestion des utilisateurs, modération
 * Exigence ECF : Tableau de bord admin avec surveillance des activités
 */

require_once __DIR__ . '/../services/MongoDBService.php';

class AdminController {
    private $mongoService;
    private $pdo;
    private $currentAdminUser;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->currentAdminUser = null;
        $this->mongoService = new MongoDBService();
    }

    private function isReadOnlyStaff(): bool {
        return !empty($this->currentAdminUser)
            && (!empty($this->currentAdminUser['is_banned']) || !empty($this->currentAdminUser['is_suspended']));
    }

    /**
     * Handle admin routes
     */
    public function handleRoute($method, $path, $authToken = null) {
        $action = trim($path, '/');

        // ---- Gestion des employés (admin uniquement) ----
        // GET    /admin/employés
        // POST   /admin/employees
        // PUT    /admin/employees/:id
        // POST   /admin/employees/:id/suspend
        // DELETE /admin/employés/:id
        if (strpos($action, 'admin/employees') === 0) {
            if (!$this->verifyAdminToken($authToken)) {
                return $this->response(401, 'error', 'Unauthorized - Admin access required');
            }

            if ($method === 'GET' && $action === 'admin/employees') {
                return $this->listEmployees();
            }

            if ($method === 'POST' && $action === 'admin/employees') {
                return $this->createEmployee();
            }

            if (preg_match('#^admin/employees/(\d+)$#', $action, $m)) {
                $employeeId = (int)$m[1];
                if ($method === 'PUT') {
                    return $this->updateEmployee($employeeId);
                }
                if ($method === 'DELETE') {
                    return $this->deleteEmployee($employeeId);
                }
            }

            if ($method === 'POST' && preg_match('#^admin/employees/(\d+)/suspend$#', $action, $m)) {
                $employeeId = (int)$m[1];
                return $this->setEmployeeSuspended($employeeId);
            }

            return $this->response(404, 'error', 'Endpoint not found');
        }

        // Vérifier si c'est une route admin
        if ($method === 'GET' && strpos($action, 'admin/logs') === 0) {
            // Vérifier l'authentification admin
            if (!$this->verifyAdminToken($authToken)) {
                return $this->response(401, 'error', 'Unauthorized - Admin access required');
            }
            return $this->getLogs();
        } elseif ($method === 'GET' && $action === 'admin/stats') {
            if (!$this->verifyAdminToken($authToken)) {
                return $this->response(401, 'error', 'Unauthorized - Admin access required');
            }
            return $this->getStats();
        } elseif ($method === 'POST' && $action === 'admin/logs/cleanup') {
            if (!$this->verifyAdminToken($authToken)) {
                return $this->response(401, 'error', 'Unauthorized - Admin access required');
            }
            return $this->cleanupOldLogs();
        }

        // Pas une route admin, retourner null pour laisser les autres contoleurs gérer
        return null;
    }

    /**
     * Récupérer les logs d'activité avec filtrage
     * GET /admin/logs?action=character_create&user_id=1&from_date=2026-02-01&to_date=2026-02-28
     */
    private function getLogs() {
        try {
            // Analyser les paramètres de requête
            $filters = [];
            if (!empty($_GET['user_id'])) $filters['user_id'] = $_GET['user_id'];
            if (!empty($_GET['action'])) $filters['action'] = $_GET['action'];
            if (!empty($_GET['target_type'])) $filters['target_type'] = $_GET['target_type'];
            if (!empty($_GET['from_date'])) $filters['from_date'] = $_GET['from_date'];
            if (!empty($_GET['to_date'])) $filters['to_date'] = $_GET['to_date'];

            $limit = min((int)($_GET['limit'] ?? 50), 1000);
            $skip = (int)($_GET['skip'] ?? 0);

            if (!$this->mongoService) {
                return $this->response(503, 'error', 'MongoDB service is unavailable');
            }

            $logs = $this->mongoService->getActivityLogs($filters, $limit, $skip);

            return $this->response(200, 'success', 'Activity logs retrieved', ['logs' => $logs]);

        } catch (Exception $e) {
            error_log("Get logs error: " . $e->getMessage());
            return $this->response(500, 'error', 'Failed to retrieve logs');
        }
    }

    private function listEmployees() {
        try {
            $stmt = $this->pdo->prepare(
                "SELECT id, email, username, role, is_suspended, suspend_reason, created_at FROM users WHERE role = 'employee' ORDER BY id DESC"
            );
            $stmt->execute();
            $rows = $stmt->fetchAll();

            $employees = array_map(function ($row) {
                return [
                    'id' => (int)$row['id'],
                    'email' => $row['email'],
                    'username' => $row['username'],
                    'role' => $row['role'],
                    'is_suspended' => (bool)($row['is_suspended'] ?? 0),
                    'suspend_reason' => $row['suspend_reason'] ?? null,
                    'created_at' => $row['created_at'] ?? null,
                ];
            }, $rows);

            return $this->response(200, 'success', 'Employees retrieved', ['employees' => $employees]);
        } catch (Throwable $e) {
            error_log('List employees error: ' . $e->getMessage());
            return $this->response(500, 'error', 'Failed to retrieve employees');
        }
    }

    private function createEmployee() {
        try {
            if ($this->isReadOnlyStaff()) {
                return $this->response(403, 'error', 'Forbidden: Suspended/banned staff cannot perform actions');
            }

            require_once __DIR__ . '/../services/AuthService.php';
            $authService = new AuthService($this->pdo);

            $input = $this->getJsonInput();
            $email = trim((string)($input['email'] ?? ''));
            $username = trim((string)($input['username'] ?? ''));
            $password = (string)($input['password'] ?? '');
            $confirmPassword = (string)($input['confirmPassword'] ?? '');

            if ($email === '' || $username === '' || $password === '') {
                return $this->response(400, 'error', 'Email, username, and password are required');
            }
            if ($confirmPassword === '' || $password !== $confirmPassword) {
                return $this->response(400, 'error', 'Passwords do not match');
            }

            $result = $authService->register($email, $username, $password);
            if (!$result['success']) {
                return $this->response(400, 'error', $result['message'] ?? 'Failed to create employee');
            }

            $userId = (int)$result['userId'];
            $update = $this->pdo->prepare("UPDATE users SET role = 'employee' WHERE id = ?");
            $update->execute([$userId]);

            $stmt = $this->pdo->prepare("SELECT id, email, username, role, is_suspended, suspend_reason, created_at FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $employee = $stmt->fetch();

            return $this->response(201, 'success', 'Employee created', [
                'employee' => [
                    'id' => (int)$employee['id'],
                    'email' => $employee['email'],
                    'username' => $employee['username'],
                    'role' => $employee['role'],
                    'is_suspended' => (bool)($employee['is_suspended'] ?? 0),
                    'suspend_reason' => $employee['suspend_reason'] ?? null,
                    'created_at' => $employee['created_at'] ?? null,
                ]
            ]);
        } catch (Throwable $e) {
            error_log('Create employee error: ' . $e->getMessage());
            return $this->response(500, 'error', 'Failed to create employee');
        }
    }

    private function updateEmployee(int $employeeId) {
        try {
            if ($this->isReadOnlyStaff()) {
                return $this->response(403, 'error', 'Forbidden: Suspended/banned staff cannot perform actions');
            }

            $stmt = $this->pdo->prepare("SELECT id, role FROM users WHERE id = ?");
            $stmt->execute([$employeeId]);
            $existing = $stmt->fetch();
            if (!$existing || ($existing['role'] ?? '') !== 'employee') {
                return $this->response(404, 'error', 'Employee not found');
            }

            $input = $this->getJsonInput();
            $email = trim((string)($input['email'] ?? ''));
            $username = trim((string)($input['username'] ?? ''));
            $password = (string)($input['password'] ?? '');
            $confirmPassword = (string)($input['confirmPassword'] ?? '');

            if ($email === '' || $username === '') {
                return $this->response(400, 'error', 'Username and email are required');
            }

            $emailValidation = $this->validateEmail($email);
            if (!$emailValidation['valid']) {
                return $this->response(400, 'error', $emailValidation['message']);
            }

            $usernameValidation = $this->validateUsername($username);
            if (!$usernameValidation['valid']) {
                return $this->response(400, 'error', $usernameValidation['message']);
            }

            // Contraintes uniques
            $check = $this->pdo->prepare('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?');
            $check->execute([$email, $username, $employeeId]);
            if ($check->fetch()) {
                return $this->response(409, 'error', 'Email or username already exists');
            }

            $fields = ['email' => $email, 'username' => $username];
            $setParts = ['email = :email', 'username = :username'];

            if ($password !== '' || $confirmPassword !== '') {
                if ($password !== $confirmPassword) {
                    return $this->response(400, 'error', 'Passwords do not match');
                }
                $pwdValidation = $this->validatePassword($password);
                if (!$pwdValidation['valid']) {
                    return $this->response(400, 'error', $pwdValidation['message']);
                }
                $fields['password'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                $setParts[] = 'password = :password';
            }

            $fields['id'] = $employeeId;
            $sql = 'UPDATE users SET ' . implode(', ', $setParts) . ' WHERE id = :id';
            $upd = $this->pdo->prepare($sql);
            $upd->execute($fields);

            $out = $this->pdo->prepare("SELECT id, email, username, role, is_suspended, suspend_reason, created_at FROM users WHERE id = ?");
            $out->execute([$employeeId]);
            $employee = $out->fetch();

            return $this->response(200, 'success', 'Employee updated', [
                'employee' => [
                    'id' => (int)$employee['id'],
                    'email' => $employee['email'],
                    'username' => $employee['username'],
                    'role' => $employee['role'],
                    'is_suspended' => (bool)($employee['is_suspended'] ?? 0),
                    'suspend_reason' => $employee['suspend_reason'] ?? null,
                    'created_at' => $employee['created_at'] ?? null,
                ]
            ]);
        } catch (Throwable $e) {
            error_log('Update employee error: ' . $e->getMessage());
            return $this->response(500, 'error', 'Failed to update employee');
        }
    }

    private function setEmployeeSuspended(int $employeeId) {
        try {
            if ($this->isReadOnlyStaff()) {
                return $this->response(403, 'error', 'Forbidden: Suspended/banned staff cannot perform actions');
            }

            $stmt = $this->pdo->prepare("SELECT id, username, role, is_suspended FROM users WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch();
            if (!$employee || ($employee['role'] ?? '') !== 'employee') {
                return $this->response(404, 'error', 'Employee not found');
            }

            $input = $this->getJsonInput();
            $isSuspended = (bool)($input['is_suspended'] ?? (!$employee['is_suspended']));
            $reason = trim((string)($input['reason'] ?? ''));
            if ($isSuspended && $reason === '') {
                return $this->response(400, 'error', 'Suspension reason is required');
            }

            $upd = $this->pdo->prepare('UPDATE users SET is_suspended = ?, suspend_reason = ? WHERE id = ?');
            $upd->execute([$isSuspended ? 1 : 0, $isSuspended ? $reason : null, $employeeId]);

            return $this->response(200, 'success', $isSuspended ? 'Employee suspended' : 'Employee reactivated', [
                'id' => $employeeId,
                'is_suspended' => $isSuspended,
                'suspend_reason' => $isSuspended ? $reason : null,
            ]);
        } catch (Throwable $e) {
            error_log('Suspend employee error: ' . $e->getMessage());
            return $this->response(500, 'error', 'Failed to update employee status');
        }
    }

    private function deleteEmployee(int $employeeId) {
        try {
            if ($this->isReadOnlyStaff()) {
                return $this->response(403, 'error', 'Forbidden: Suspended/banned staff cannot perform actions');
            }

            $stmt = $this->pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
            $stmt->execute([$employeeId]);
            $employee = $stmt->fetch();
            if (!$employee || ($employee['role'] ?? '') !== 'employee') {
                return $this->response(404, 'error', 'Employee not found');
            }

            $del = $this->pdo->prepare('DELETE FROM users WHERE id = ?');
            $del->execute([$employeeId]);

            return $this->response(200, 'success', 'Employee deleted', ['id' => $employeeId]);
        } catch (PDOException $e) {
            error_log('Delete employee error: ' . $e->getMessage());
            return $this->response(409, 'error', 'Failed to delete employee (account may be referenced by other records)');
        } catch (Throwable $e) {
            error_log('Delete employee error: ' . $e->getMessage());
            return $this->response(500, 'error', 'Failed to delete employee');
        }
    }

    /**
     * Obtenir les statistiques d'activité
     * GET /admin/stats?period=day (day|week|month)
     */
    private function getStats() {
        try {
            $period = $_GET['period'] ?? 'day';

            if (!in_array($period, ['day', 'week', 'month'])) {
                return $this->response(400, 'error', 'Invalid period. Use: day, week, month');
            }

            if (!$this->mongoService) {
                return $this->response(503, 'error', 'MongoDB service is unavailable');
            }

            $stats = $this->mongoService->getActivityStats($period);

            return $this->response(200, 'success', 'Activity statistics', ['stats' => $stats]);

        } catch (Exception $e) {
            error_log("Get stats error: " . $e->getMessage());
            return $this->response(500, 'error', 'Failed to retrieve statistics');
        }
    }

    /**
     * Nettoyer les anciens logs (conservation des données RGPD)
     * POST /admin/logs/cleanup
     */
    private function cleanupOldLogs() {
        try {
            if ($this->isReadOnlyStaff()) {
                return $this->response(403, 'error', 'Forbidden: Suspended/banned staff cannot perform actions');
            }

            if (!$this->mongoService) {
                return $this->response(503, 'error', 'MongoDB service is unavailable');
            }

            $daysToKeep = (int)($_POST['days'] ?? 365);

            if ($daysToKeep < 30) {
                return $this->response(400, 'error', 'Minimum retention period is 30 days');
            }

            $deletedCount = $this->mongoService->deleteOldLogs($daysToKeep);

            return $this->response(200, 'success', 'Old logs deleted', ['deleted' => $deletedCount]);

        } catch (Exception $e) {
            error_log("Cleanup logs error: " . $e->getMessage());
            return $this->response(500, 'error', 'Failed to cleanup logs');
        }
    }

    /**
     * Vérifier l'authentification admin
     * Extrait le token depuis l'en-tête Authorization et vérifie le rôle
     */
    private function verifyAdminToken($token = null) {
        $this->currentAdminUser = null;
        if (!$token) {
            // Essayer d'obtenir le token depuis l'en-tête Authorization
            $authHeader = null;
            
            if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            } elseif (function_exists('getallheaders')) {
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';
            }
            
            if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            return false;
        }

        try {
            // Inclure AuthService pour verifier le token
            require_once __DIR__ . '/../services/AuthService.php';
            $authService = new AuthService($this->pdo);
            $result = $authService->getUserFromToken($token);

            if (!$result['success']) {
                return false;
            }
            
            $user = $result['user'];

            // Vérifier si l'utilisateur est admin
            if ($user['role'] !== 'admin') {
                return false;
            }

            $this->currentAdminUser = $user;

            return true;

        } catch (Exception $e) {
            error_log("Token verification error: " . $e->getMessage());
            return false;
        }
    }

    private function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (!$raw) {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function validateEmail(string $email): array {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'message' => 'Invalid email format'];
        }
        return ['valid' => true, 'message' => ''];
    }

    private function validateUsername(string $username): array {
        $username = trim($username);

        if (strlen($username) < 3) {
            return ['valid' => false, 'message' => 'Username must be at least 3 characters'];
        }

        if (strlen($username) > 20) {
            return ['valid' => false, 'message' => 'Username must be at most 20 characters'];
        }

        if (strpos($username, ' ') !== false) {
            return ['valid' => false, 'message' => 'Username cannot contain spaces'];
        }

        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
            return ['valid' => false, 'message' => 'Username can only contain letters, numbers, hyphens, and underscores'];
        }

        if (in_array($username[0], ['-', '_'], true) || in_array($username[-1], ['-', '_'], true)) {
            return ['valid' => false, 'message' => 'Username cannot start or end with hyphen or underscore'];
        }

        return ['valid' => true, 'message' => ''];
    }

    private function validatePassword(string $password): array {
        if (strlen($password) < 8) {
            return ['valid' => false, 'message' => 'Password must be at least 8 characters'];
        }

        if (!preg_match('/[A-Z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one uppercase letter'];
        }

        if (!preg_match('/[a-z]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one lowercase letter'];
        }

        if (!preg_match('/[0-9]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one number'];
        }

        if (!preg_match('/[!@#$%^&*()_+\-\=\[\]{};\':"\\|,.<>\/?]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one special character (!@#$%^&*...)'];
        }

        return ['valid' => true, 'message' => ''];
    }

    /**
     * Envoyer une réponse JSON
     */
    private function response($code, $status, $message, $data = null) {
        http_response_code($code);
        $response = [
            'status' => $status,
            'message' => $message
        ];
        if ($data !== null) {
            $response['data'] = $data;
        }
        echo json_encode($response);
        exit();
    }
}
?>

