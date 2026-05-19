<?php

class AuthService {
    private $pdo;
    private $jwtSecret;
    private $mailConfig;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->jwtSecret = getenv('JWT_SECRET') ?: 'your-secret-key-change-in-production';
        $this->ensureProfileColumns();
        $this->ensureModerationColumns();
        $this->ensureSettingsVerificationTable();
        $this->mailConfig = $this->loadMailConfig();
    }

    private function ensureProfileColumns() {
        $requiredColumns = [
            'avatar_id' => "ALTER TABLE users ADD COLUMN avatar_id INT NOT NULL DEFAULT 1",
            'username_changed_at' => "ALTER TABLE users ADD COLUMN username_changed_at DATETIME NULL"
        ];

        foreach ($requiredColumns as $columnName => $alterSql) {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?");
            $stmt->execute([$columnName]);
            $exists = (int)$stmt->fetchColumn() > 0;

            if (!$exists) {
                $this->pdo->exec($alterSql);
            }
        }
    }

    private function ensureSettingsVerificationTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS settings_verification_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                target_email VARCHAR(255) NULL,
                new_password_hash VARCHAR(255) NULL,
                code_hash VARCHAR(255) NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                expires_at DATETIME NOT NULL,
                consumed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_settings_verification_user (user_id),
                INDEX idx_settings_verification_expires (expires_at),
                CONSTRAINT fk_settings_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";

        $this->pdo->exec($sql);
    }

    private function ensureModerationColumns() {
        $requiredColumns = [
            'is_suspended' => "ALTER TABLE users ADD COLUMN is_suspended TINYINT(1) NOT NULL DEFAULT 0",
            'is_banned' => "ALTER TABLE users ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0",
            'banned_at' => "ALTER TABLE users ADD COLUMN banned_at DATETIME NULL",
            'ban_expires_at' => "ALTER TABLE users ADD COLUMN ban_expires_at DATETIME NULL",
            'ban_reason' => "ALTER TABLE users ADD COLUMN ban_reason TEXT NULL",
            'suspend_reason' => "ALTER TABLE users ADD COLUMN suspend_reason TEXT NULL",
        ];

        foreach ($requiredColumns as $columnName => $alterSql) {
            $stmt = $this->pdo->prepare(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?"
            );
            $stmt->execute([$columnName]);
            $exists = (int)$stmt->fetchColumn() > 0;

            if (!$exists) {
                $this->pdo->exec($alterSql);
            }
        }
    }

    private function loadMailConfig() {
        $configPath = __DIR__ . '/../config/mail.php';
        if (file_exists($configPath)) {
            $config = require $configPath;
            if (is_array($config)) {
                return $config;
            }
        }

        return [];
    }

    /**
     * Register a new user
     */
    public function register($email, $username, $password) {
        // Validation
        if (empty($email) || empty($username) || empty($password)) {
            return ['success' => false, 'message' => 'Email, username, and password are required'];
        }

        // Vérifier le format de l'email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid email format'];
        }

        // Vérifier le format du pseudo et la sécurité
        $usernameValidation = $this->validateUsername($username);
        if (!$usernameValidation['valid']) {
            return ['success' => false, 'message' => $usernameValidation['message']];
        }

        // Vérifier la sécurité du mot de passe (exigences CNIL)
        $passwordValidation = $this->validatePassword($password);
        if (!$passwordValidation['valid']) {
            return ['success' => false, 'message' => $passwordValidation['message']];
        }

        // Vérifier si l'utilisateur exist déjà
        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
        $stmt->execute([$email, $username]);
        
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'Email or username already exists'];
        }

        // Hacher le mot de passe
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

        // Inserer l'utilisateur
        try {
            $stmt = $this->pdo->prepare('INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$email, $username, $hashedPassword, 'player']);
            
            $userId = $this->pdo->lastInsertId();

            $userStmt = $this->pdo->prepare('SELECT id, email, username, role, created_at FROM users WHERE id = ?');
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();

            return [
                'success' => true,
                'message' => 'User registered successfully',
                'userId' => $userId,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'created_at' => $user['created_at']
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()];
        }
    }

    /**
     * Validate username format and security
     * Rules:
     * - 3-20 characters
     * - Only alphanumeric, hyphens, underscores
     * - No spaces, special characters
     * - Cannot start or end with hyphen/underscore
     */
    private function validateUsername($username) {
        $username = trim($username);

        if (strlen($username) < 3) {
            return ['valid' => false, 'message' => 'Username must be at least 3 characters'];
        }

        if (strlen($username) > 20) {
            return ['valid' => false, 'message' => 'Username must be at most 20 characters'];
        }

        // Vérifier les caractères valides (alphanumérique, tiret, underscore)
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
            return ['valid' => false, 'message' => 'Username can only contain letters, numbers, hyphens, and underscores'];
        }

        // Cannot start or end with hyphen/underscore
        if (in_array($username[0], ['-', '_']) || in_array($username[-1], ['-', '_'])) {
            return ['valid' => false, 'message' => 'Username cannot start or end with hyphen or underscore'];
        }

        // Vérifier les espaces (déjà attrapé par regex, mais soyons explicites)
        if (strpos($username, ' ') !== false) {
            return ['valid' => false, 'message' => 'Username cannot contain spaces'];
        }

        return ['valid' => true, 'message' => ''];
    }

    /**
     * Validate password according to CNIL recommendations
     * Requirements:
     * - At least 8 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     */
    private function validatePassword($password) {
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

        if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/', $password)) {
            return ['valid' => false, 'message' => 'Password must contain at least one special character (!@#$%^&*...)'];
        }

        return ['valid' => true, 'message' => ''];
    }

    /**
     * Login user and return JWT token
     */
    public function login($email, $password) {
        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Email and password are required'];
        }

        // Récupérer l'utilisateur de la base de donnees avec les champs de ban/suspension
        $stmt = $this->pdo->prepare('
            SELECT id, email, username, password, role, is_suspended, is_banned, 
                   banned_at, ban_expires_at, ban_reason, suspend_reason, avatar_id, username_changed_at, created_at 
            FROM users 
            WHERE email = ?
        ');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }

        // Vérifier si le ban a expiré
        if ($user['is_banned'] && $user['ban_expires_at']) {
            $banExpires = strtotime($user['ban_expires_at']);
            if (time() > $banExpires) {
                // Ban expired, remove ban
                $updateStmt = $this->pdo->prepare('
                    UPDATE users 
                    SET is_banned = 0, banned_at = NULL, ban_expires_at = NULL, ban_reason = NULL 
                    WHERE id = ?
                ');
                $updateStmt->execute([$user['id']]);
                $user['is_banned'] = 0;
                $user['ban_reason'] = null;
            }
        }

        // Vérifier si l'utilisateur est banni (permettre la connexion mais affichera le modal de ban)
        // L'utilisateur ne peut acceder aux tickets que s'il est banni
        
        // Verifier le mot de passe
        if (!password_verify($password, $user['password'])) {
            return ['success' => false, 'message' => 'Invalid email or password'];
        }

        // Generer un token JWT
        $token = $this->generateJWT([
            'userId' => $user['id'],
            'email' => $user['email'],
            'username' => $user['username'],
            'role' => $user['role']
        ]);

        return [
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'],
                'avatar_id' => (int)($user['avatar_id'] ?? 1),
                'is_suspended' => (bool)$user['is_suspended'],
                'is_banned' => (bool)$user['is_banned'],
                'ban_reason' => $user['ban_reason'],
                'banned_at' => $user['banned_at'] ?? null,
                'ban_expires_at' => $user['ban_expires_at'] ?? null,
                'suspend_reason' => $user['suspend_reason'],
                'created_at' => $user['created_at']
            ]
        ];
    }

    /**
     * Generate JWT token
     */
    private function generateJWT($payload) {
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        
        $payload['iat'] = time();
        $payload['exp'] = time() + (24 * 60 * 60); // 24 hours
        
        $payload = base64_encode(json_encode($payload));
        
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $this->jwtSecret, true));
        
        return "$header.$payload.$signature";
    }

    /**
     * Verify JWT token
     */
    public function verifyToken($token) {
        if (empty($token)) {
            return ['success' => false, 'message' => 'Token is required'];
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return ['success' => false, 'message' => 'Invalid token format'];
        }

        list($header, $payload, $signature) = $parts;

        // Vérifier la signature
        $expectedSignature = base64_encode(hash_hmac('sha256', "$header.$payload", $this->jwtSecret, true));
        
        if (!hash_equals($signature, $expectedSignature)) {
            return ['success' => false, 'message' => 'Invalid token signature'];
        }

        // Decoder le payload
        $decodedPayload = json_decode(base64_decode($payload), true);

        // Vérifier l'expiration
        if ($decodedPayload['exp'] < time()) {
            return ['success' => false, 'message' => 'Token has expired'];
        }

        return ['success' => true, 'payload' => $decodedPayload];
    }

    /**
     * Get user by token
     */
    public function getUserFromToken($token) {
        $verifyResult = $this->verifyToken($token);
        
        if (!$verifyResult['success']) {
            return $verifyResult;
        }

        $userId = $verifyResult['payload']['userId'];
        
        $stmt = $this->pdo->prepare('
            SELECT id, email, username, role, is_suspended, is_banned, 
                   ban_reason, suspend_reason, banned_at, ban_expires_at, avatar_id, username_changed_at, created_at 
            FROM users 
            WHERE id = ?
        ');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }

        // Vérifier si le ban a expiré
        if ($user['is_banned'] && $user['ban_expires_at']) {
            $banExpires = strtotime($user['ban_expires_at']);
            if (time() > $banExpires) {
                // Ban expired, remove ban
                $updateStmt = $this->pdo->prepare('
                    UPDATE users 
                    SET is_banned = 0, banned_at = NULL, ban_expires_at = NULL, ban_reason = NULL 
                    WHERE id = ?
                ');
                $updateStmt->execute([$user['id']]);
                $user['is_banned'] = 0;
                $user['ban_reason'] = null;
            }
        }

        // Retourner l'utilisateur avec le statut complet (ne pas bloquer les utilis suspendus/bannis ici)
        // The frontend will show appropriate modals and block actions
        return [
            'success' => true, 
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role' => $user['role'],
                'avatar_id' => (int)($user['avatar_id'] ?? 1),
                'username_changed_at' => $user['username_changed_at'] ?? null,
                'is_suspended' => (bool)$user['is_suspended'],
                'is_banned' => (bool)$user['is_banned'],
                'ban_reason' => $user['ban_reason'],
                'banned_at' => $user['banned_at'] ?? null,
                'ban_expires_at' => $user['ban_expires_at'] ?? null,
                'suspend_reason' => $user['suspend_reason'],
                'created_at' => $user['created_at']
            ]
        ];
    }

    /**
     * Update profile (username + avatar)
     * Username can be changed max once every 30 days.
     */
    public function updateProfile($userId, $username = null, $avatarId = null) {
        try {
            $this->ensureProfileColumns();

            $allowedAvatarIds = [1, 2, 3, 4, 5, 6];

            $stmt = $this->pdo->prepare('SELECT id, email, username, role, avatar_id, username_changed_at, created_at FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $currentUser = $stmt->fetch();

            if (!$currentUser) {
                return ['success' => false, 'statusCode' => 404, 'message' => 'User not found'];
            }

            $newUsername = $currentUser['username'];
            $newAvatarId = (int)($currentUser['avatar_id'] ?? 1);
            $usernameChangedAt = $currentUser['username_changed_at'];
            $isStaff = in_array($currentUser['role'] ?? '', ['admin', 'employee'], true);

            if ($username !== null && $username !== '' && $username !== $currentUser['username']) {
                if ($isStaff) {
                    return [
                        'success' => false,
                        'statusCode' => 403,
                        'message' => 'Staff accounts cannot change their identifier'
                    ];
                }

                $usernameValidation = $this->validateUsername($username);
                if (!$usernameValidation['valid']) {
                    return ['success' => false, 'statusCode' => 400, 'message' => $usernameValidation['message']];
                }

                if (!empty($usernameChangedAt)) {
                    $lastChangeTs = strtotime($usernameChangedAt);
                    $nextAllowedTs = strtotime('+30 days', $lastChangeTs);
                    if (time() < $nextAllowedTs) {
                        return [
                            'success' => false,
                            'statusCode' => 429,
                            'message' => 'Username can only be changed once every 30 days'
                        ];
                    }
                }

                $checkStmt = $this->pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ?');
                $checkStmt->execute([$username, $userId]);
                if ($checkStmt->fetch()) {
                    return ['success' => false, 'statusCode' => 409, 'message' => 'Username already exists'];
                }

                $newUsername = $username;
                $usernameChangedAt = date('Y-m-d H:i:s');
            }

            if ($avatarId !== null) {
                if (!in_array($avatarId, $allowedAvatarIds, true)) {
                    return ['success' => false, 'statusCode' => 400, 'message' => 'Invalid avatar selection'];
                }
                $newAvatarId = $avatarId;
            }

            $updateStmt = $this->pdo->prepare('UPDATE users SET username = ?, avatar_id = ?, username_changed_at = ? WHERE id = ?');
            $updateStmt->execute([$newUsername, $newAvatarId, $usernameChangedAt, $userId]);

            return [
                'success' => true,
                'message' => 'Profile updated successfully',
                'user' => [
                    'id' => (int)$currentUser['id'],
                    'email' => $currentUser['email'],
                    'username' => $newUsername,
                    'role' => $currentUser['role'],
                    'avatar_id' => $newAvatarId,
                    'username_changed_at' => $usernameChangedAt,
                    'created_at' => $currentUser['created_at']
                ]
            ];
        } catch (PDOException $e) {
            return ['success' => false, 'statusCode' => 500, 'message' => 'Profile update failed: ' . $e->getMessage()];
        }
    }

    /**
     * Update account settings (email/password)
     * - Everyone can change password (with current password check)
     * - Players can change email
     * - Admin/Employee cannot change identifier (email)
     */
    public function updateSettings($userId, $email = null, $currentPassword = null, $newPassword = null, $confirmNewPassword = null) {
        return [
            'success' => false,
            'statusCode' => 400,
            'message' => 'Use verification code flow: request code, then confirm code'
        ];
    }

    public function requestSettingsVerificationCode($userId, $email = null, $currentPassword = null, $newPassword = null, $confirmNewPassword = null) {
        try {
            $stmt = $this->pdo->prepare('SELECT id, email, username, password, role FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $currentUser = $stmt->fetch();

            if (!$currentUser) {
                return ['success' => false, 'statusCode' => 404, 'message' => 'User not found'];
            }

            $isStaff = in_array($currentUser['role'] ?? '', ['admin', 'employee'], true);
            $targetEmail = $currentUser['email'];
            $newPasswordHash = null;

            $emailRequested = $email !== null && $email !== '' && $email !== $currentUser['email'];
            $passwordRequested = $newPassword !== null && $newPassword !== '';

            if (!$emailRequested && !$passwordRequested) {
                return ['success' => false, 'statusCode' => 400, 'message' => 'No settings changes provided'];
            }

            if ($emailRequested) {
                if ($isStaff) {
                    return ['success' => false, 'statusCode' => 403, 'message' => 'Staff accounts cannot change their identifier'];
                }

                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return ['success' => false, 'statusCode' => 400, 'message' => 'Invalid email format'];
                }

                $checkStmt = $this->pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
                $checkStmt->execute([$email, $userId]);
                if ($checkStmt->fetch()) {
                    return ['success' => false, 'statusCode' => 409, 'message' => 'Email already exists'];
                }

                $targetEmail = $email;
            }

            if ($passwordRequested) {
                if (empty($currentPassword)) {
                    return ['success' => false, 'statusCode' => 400, 'message' => 'Current password is required'];
                }

                if (!password_verify($currentPassword, $currentUser['password'])) {
                    return ['success' => false, 'statusCode' => 401, 'message' => 'Current password is incorrect'];
                }

                if ($newPassword !== $confirmNewPassword) {
                    return ['success' => false, 'statusCode' => 400, 'message' => 'New passwords do not match'];
                }

                $passwordValidation = $this->validatePassword($newPassword);
                if (!$passwordValidation['valid']) {
                    return ['success' => false, 'statusCode' => 400, 'message' => $passwordValidation['message']];
                }

                $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            }

            $verificationCode = (string)random_int(100000, 999999);
            $codeHash = password_hash($verificationCode, PASSWORD_BCRYPT, ['cost' => 10]);
            $expiresAt = date('Y-m-d H:i:s', time() + (10 * 60));

            $invalidateStmt = $this->pdo->prepare('UPDATE settings_verification_codes SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL');
            $invalidateStmt->execute([$userId]);

            $insertStmt = $this->pdo->prepare('INSERT INTO settings_verification_codes (user_id, target_email, new_password_hash, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)');
            $insertStmt->execute([$userId, $targetEmail, $newPasswordHash, $codeHash, $expiresAt]);

            $emailSendResult = $this->sendSettingsVerificationCodeEmail($currentUser['email'], $verificationCode, $currentUser['username']);
            if (!$emailSendResult['success']) {
                return ['success' => false, 'statusCode' => 500, 'message' => $emailSendResult['message']];
            }

            return [
                'success' => true,
                'message' => 'Verification code sent to your email'
            ];
        } catch (Exception $e) {
            return ['success' => false, 'statusCode' => 500, 'message' => 'Failed to request verification code: ' . $e->getMessage()];
        }
    }

    public function confirmSettingsVerificationCode($userId, $code) {
        try {
            if (empty($code)) {
                return ['success' => false, 'statusCode' => 400, 'message' => 'Verification code is required'];
            }

            $userStmt = $this->pdo->prepare('SELECT id, email, username, role, avatar_id, username_changed_at, created_at FROM users WHERE id = ?');
            $userStmt->execute([$userId]);
            $currentUser = $userStmt->fetch();

            if (!$currentUser) {
                return ['success' => false, 'statusCode' => 404, 'message' => 'User not found'];
            }

            $codeStmt = $this->pdo->prepare('SELECT id, target_email, new_password_hash, code_hash, attempts, expires_at FROM settings_verification_codes WHERE user_id = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1');
            $codeStmt->execute([$userId]);
            $pending = $codeStmt->fetch();

            if (!$pending) {
                return ['success' => false, 'statusCode' => 404, 'message' => 'No pending verification found'];
            }

            if ((int)$pending['attempts'] >= 5) {
                return ['success' => false, 'statusCode' => 429, 'message' => 'Too many invalid attempts. Request a new code'];
            }

            if (strtotime($pending['expires_at']) < time()) {
                return ['success' => false, 'statusCode' => 410, 'message' => 'Verification code has expired'];
            }

            if (!password_verify($code, $pending['code_hash'])) {
                $attemptStmt = $this->pdo->prepare('UPDATE settings_verification_codes SET attempts = attempts + 1 WHERE id = ?');
                $attemptStmt->execute([$pending['id']]);
                return ['success' => false, 'statusCode' => 401, 'message' => 'Invalid verification code'];
            }

            $targetEmail = $pending['target_email'] ?: $currentUser['email'];
            $newPasswordHash = $pending['new_password_hash'];

            if (!empty($newPasswordHash)) {
                $updateStmt = $this->pdo->prepare('UPDATE users SET email = ?, password = ? WHERE id = ?');
                $updateStmt->execute([$targetEmail, $newPasswordHash, $userId]);
            } else {
                $updateStmt = $this->pdo->prepare('UPDATE users SET email = ? WHERE id = ?');
                $updateStmt->execute([$targetEmail, $userId]);
            }

            $consumeStmt = $this->pdo->prepare('UPDATE settings_verification_codes SET consumed_at = NOW() WHERE id = ?');
            $consumeStmt->execute([$pending['id']]);

            return [
                'success' => true,
                'message' => 'Settings updated successfully',
                'user' => [
                    'id' => (int)$currentUser['id'],
                    'email' => $targetEmail,
                    'username' => $currentUser['username'],
                    'role' => $currentUser['role'],
                    'avatar_id' => (int)($currentUser['avatar_id'] ?? 1),
                    'username_changed_at' => $currentUser['username_changed_at'] ?? null,
                    'created_at' => $currentUser['created_at'],
                ]
            ];
        } catch (Exception $e) {
            return ['success' => false, 'statusCode' => 500, 'message' => 'Failed to confirm verification code: ' . $e->getMessage()];
        }
    }

    private function sendSettingsVerificationCodeEmail($email, $code, $username) {
        $autoloadPath = __DIR__ . '/../vendor/autoload.php';
        if (file_exists($autoloadPath)) {
            require_once $autoloadPath;
        }

        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            return ['success' => false, 'message' => 'PHPMailer is not installed. Run composer install.'];
        }

        $config = $this->mailConfig ?? [];
        $host = $config['host'] ?? (getenv('SMTP_HOST') ?: 'smtp.example.com');
        $port = (int)($config['port'] ?? (getenv('SMTP_PORT') ?: 587));
        $usernameConfig = $config['username'] ?? (getenv('SMTP_USER') ?: '');
        $passwordConfig = $config['password'] ?? (getenv('SMTP_PASS') ?: '');
        $secure = $config['secure'] ?? (getenv('SMTP_SECURE') ?: 'tls');
        $fromEmail = $config['from_email'] ?? (getenv('SMTP_FROM_EMAIL') ?: ($usernameConfig ?: 'no-reply@example.com'));
        $fromName = $config['from_name'] ?? (getenv('SMTP_FROM_NAME') ?: 'Fantasy Realm');

        $subject = 'Fantasy Realm - Verification code';
        $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
        $safeUsername = htmlspecialchars($username, ENT_QUOTES, 'UTF-8');

        $message = "\n        <html>\n        <body style='font-family: Arial, sans-serif; background:#0f0f0f; color:#f3f3f3; padding:24px;'>\n            <div style='max-width:560px; margin:0 auto; border:1px solid #3b3b3b; background:#1a1a1a; padding:24px;'>\n                <h2 style='margin-top:0; color:#ffffff;'>Security verification</h2>\n                <p>Hello {$safeUsername},</p>\n                <p>You requested a sensitive change on your account (email and/or password).</p>\n                <p>Your verification code is:</p>\n                <p style='font-size:28px; letter-spacing:4px; font-weight:bold; color:#ffffff;'>{$safeCode}</p>\n                <p>This code expires in 10 minutes.</p>\n                <p>If this was not you, ignore this message and secure your account.</p>\n            </div>\n        </body>\n        </html>\n        ";

        try {
            $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mailer->isSMTP();
            $mailer->Host = $host;
            $mailer->Port = $port;
            $mailer->SMTPAuth = !empty($usernameConfig);
            $debugLevel = (int)(getenv('SMTP_DEBUG') ?: 0);
            if ($debugLevel > 0) {
                $mailer->SMTPDebug = $debugLevel;
                $mailer->Debugoutput = function ($str, $level) {
                    error_log("[SMTP DEBUG][$level] $str");
                };
                error_log('[SMTP CONFIG] host=' . $host . ' port=' . $port . ' secure=' . $secure . ' user=' . $usernameConfig . ' from=' . $fromEmail);
            }
            if (!empty($secure)) {
                $mailer->SMTPSecure = $secure;
            }
            if (!empty($usernameConfig)) {
                $mailer->Username = $usernameConfig;
                $mailer->Password = $passwordConfig;
            }

            $mailer->setFrom($fromEmail, $fromName);
            $mailer->addAddress($email);
            $mailer->isHTML(true);
            $mailer->Subject = $subject;
            $mailer->Body = $message;
            $mailer->AltBody = "Your verification code is {$code}. It expires in 10 minutes.";

            $mailer->send();
            return ['success' => true];
        } catch (\PHPMailer\PHPMailer\Exception $e) {
            return ['success' => false, 'message' => 'SMTP send failed: ' . $e->getMessage()];
        }
    }

    /**
     * Logout user (client-side token deletion)
     */
    public function logout() {
        return ['success' => true, 'message' => 'Logout successful'];
    }
}

