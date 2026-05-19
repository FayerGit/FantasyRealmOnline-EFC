<?php

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../services/MongoDBService.php';

class AuthController {
    private $authService;
    private $mongoService;

    public function __construct($pdo) {
        try {
            $this->authService = new AuthService($pdo);
        } catch (Throwable $e) {
            error_log('AuthService initialization failed: ' . $e->getMessage());
            $this->authService = null;
        }
        $this->mongoService = new MongoDBService();
    }

    /**
     * Handle auth routes
     */
    public function handleRoute($method, $path, $pdo) {
        $action = trim($path, '/');

        if ($method === 'POST' && $action === 'auth/register') {
            return $this->register();
        } elseif ($method === 'POST' && $action === 'auth/login') {
            return $this->login();
        } elseif ($method === 'GET' && $action === 'auth/me') {
            return $this->getCurrentUser();
        } elseif ($method === 'PUT' && $action === 'auth/profile') {
            return $this->updateProfile();
        } elseif ($method === 'POST' && $action === 'auth/settings/request-code') {
            return $this->requestSettingsCode();
        } elseif ($method === 'POST' && $action === 'auth/settings/confirm-code') {
            return $this->confirmSettingsCode();
        } elseif ($method === 'PUT' && $action === 'auth/settings') {
            return $this->updateSettings();
        } elseif ($method === 'POST' && $action === 'auth/logout') {
            return $this->logout();
        }

        return null;
    }

    /**
     * Register endpoint
     */
    private function register() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $input = $this->getJsonInput();

        if (empty($input['email']) || empty($input['username']) || empty($input['password'])) {
            return $this->response(400, 'error', 'Email, username, and password are required');
        }

        if (empty($input['confirmPassword']) || $input['password'] !== $input['confirmPassword']) {
            return $this->response(400, 'error', 'Passwords do not match');
        }

        $result = $this->authService->register($input['email'], $input['username'], $input['password']);

        if ($result['success']) {
            // Enregistrer l'inscription de l'utilisateur dans MongoDB
            if ($this->mongoService) {
                $this->mongoService->logAction(
                    $result['userId'],
                    'user_registered',
                    'user',
                    $result['userId'],
                    ['email' => $input['email'], 'username' => $input['username']]
                );
            }
            return $this->response(201, 'success', $result['message'], [
                'userId' => $result['userId'],
                'user' => $result['user']
            ]);
        } else {
            return $this->response(400, 'error', $result['message']);
        }
    }

    /**
     * Login endpoint
     */
    private function login() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $input = $this->getJsonInput();

        if (empty($input['email']) || empty($input['password'])) {
            return $this->response(400, 'error', 'Email and password are required');
        }

        $result = $this->authService->login($input['email'], $input['password']);

        if ($result['success']) {
            // Enregistrer la connexion reussie dans MongoDB
            if ($this->mongoService) {
                $this->mongoService->logUserAction($result['user']['id'], 'login');
            }
            return $this->response(200, 'success', $result['message'], [
                'token' => $result['token'],
                'user' => $result['user']
            ]);
        } else {
            return $this->response(401, 'error', $result['message']);
        }
    }

    /**
     * Get current user endpoint
     */
    private function getCurrentUser() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $token = $this->getAuthToken();

        if (!$token) {
            return $this->response(401, 'error', 'Token is required');
        }

        $result = $this->authService->getUserFromToken($token);

        if ($result['success']) {
            return $this->response(200, 'success', 'User retrieved', ['user' => $result['user']]);
        } else {
            return $this->response(401, 'error', $result['message']);
        }
    }

    /**
     * Logout endpoint
     */
    private function logout() {
        return $this->response(200, 'success', 'Logout successful');
    }

    /**
     * Update profile endpoint
     */
    private function updateProfile() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $token = $this->getAuthToken();

        if (!$token) {
            return $this->response(401, 'error', 'Token is required');
        }

        $verifyResult = $this->authService->verifyToken($token);
        if (!$verifyResult['success']) {
            return $this->response(401, 'error', $verifyResult['message']);
        }

        $userId = $verifyResult['payload']['userId'] ?? null;
        if (!$userId) {
            return $this->response(401, 'error', 'Invalid token payload');
        }

        $input = $this->getJsonInput();
        $username = isset($input['username']) ? trim($input['username']) : null;
        $avatarId = isset($input['avatar_id']) ? (int)$input['avatar_id'] : null;

        $result = $this->authService->updateProfile($userId, $username, $avatarId);

        if ($result['success']) {
            return $this->response(200, 'success', $result['message'], [
                'user' => $result['user']
            ]);
        }

        return $this->response($result['statusCode'] ?? 400, 'error', $result['message']);
    }

    /**
     * Update account settings endpoint (email/password)
     */
    private function updateSettings() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $token = $this->getAuthToken();

        if (!$token) {
            return $this->response(401, 'error', 'Token is required');
        }

        $verifyResult = $this->authService->verifyToken($token);
        if (!$verifyResult['success']) {
            return $this->response(401, 'error', $verifyResult['message']);
        }

        $userId = $verifyResult['payload']['userId'] ?? null;
        if (!$userId) {
            return $this->response(401, 'error', 'Invalid token payload');
        }

        $input = $this->getJsonInput();
        $email = isset($input['email']) ? trim($input['email']) : null;
        $currentPassword = isset($input['currentPassword']) ? (string)$input['currentPassword'] : null;
        $newPassword = isset($input['newPassword']) ? (string)$input['newPassword'] : null;
        $confirmNewPassword = isset($input['confirmNewPassword']) ? (string)$input['confirmNewPassword'] : null;

        $result = $this->authService->updateSettings($userId, $email, $currentPassword, $newPassword, $confirmNewPassword);

        if ($result['success']) {
            return $this->response(200, 'success', $result['message'], [
                'user' => $result['user']
            ]);
        }

        return $this->response($result['statusCode'] ?? 400, 'error', $result['message']);
    }

    /**
     * Start settings verification flow by sending code by email
     */
    private function requestSettingsCode() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $token = $this->getAuthToken();

        if (!$token) {
            return $this->response(401, 'error', 'Token is required');
        }

        $verifyResult = $this->authService->verifyToken($token);
        if (!$verifyResult['success']) {
            return $this->response(401, 'error', $verifyResult['message']);
        }

        $userId = $verifyResult['payload']['userId'] ?? null;
        if (!$userId) {
            return $this->response(401, 'error', 'Invalid token payload');
        }

        $input = $this->getJsonInput();
        $email = isset($input['email']) ? trim($input['email']) : null;
        $currentPassword = isset($input['currentPassword']) ? (string)$input['currentPassword'] : null;
        $newPassword = isset($input['newPassword']) ? (string)$input['newPassword'] : null;
        $confirmNewPassword = isset($input['confirmNewPassword']) ? (string)$input['confirmNewPassword'] : null;

        $result = $this->authService->requestSettingsVerificationCode($userId, $email, $currentPassword, $newPassword, $confirmNewPassword);

        if ($result['success']) {
            return $this->response(200, 'success', $result['message']);
        }

        return $this->response($result['statusCode'] ?? 400, 'error', $result['message']);
    }

    /**
     * Confirm settings update with email verification code
     */
    private function confirmSettingsCode() {
        if (!$this->authService) {
            return $this->response(500, 'error', 'Auth service unavailable');
        }
        $token = $this->getAuthToken();

        if (!$token) {
            return $this->response(401, 'error', 'Token is required');
        }

        $verifyResult = $this->authService->verifyToken($token);
        if (!$verifyResult['success']) {
            return $this->response(401, 'error', $verifyResult['message']);
        }

        $userId = $verifyResult['payload']['userId'] ?? null;
        if (!$userId) {
            return $this->response(401, 'error', 'Invalid token payload');
        }

        $input = $this->getJsonInput();
        $code = isset($input['code']) ? trim((string)$input['code']) : '';

        $result = $this->authService->confirmSettingsVerificationCode($userId, $code);

        if ($result['success']) {
            return $this->response(200, 'success', $result['message'], [
                'user' => $result['user']
            ]);
        }

        return $this->response($result['statusCode'] ?? 400, 'error', $result['message']);
    }

    /**
     * Get JSON input
     */
    private function getJsonInput() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }

    /**
     * Get Authorization token from headers
     */
    private function getAuthToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Return JSON response
     */
    private function response($statusCode, $status, $message, $data = null) {
        http_response_code($statusCode);
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        
        $response = [
            'status' => $status,
            'message' => $message
        ];

        if ($data) {
            $response['data'] = $data;
        }

        echo json_encode($response);
        return true;
    }
}

