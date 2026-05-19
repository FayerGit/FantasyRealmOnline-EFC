<?php
function loadLocalEnv(): array {
    static $loaded = null;

    if ($loaded !== null) {
        return $loaded;
    }

    $loaded = [];
    $envPath = __DIR__ . '/../.env';

    if (is_file($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = array_map('trim', explode('=', $line, 2));
            if ($key !== '') {
                $loaded[$key] = $value;
            }
        }
    }

    return $loaded;
}

function envOrLocal(string $key, ?string $default = null): ?string {
    $localEnv = loadLocalEnv();

    if (array_key_exists($key, $localEnv) && $localEnv[$key] !== '') {
        return $localEnv[$key];
    }

    $systemValue = getenv($key);
    if ($systemValue !== false && $systemValue !== '') {
        return $systemValue;
    }

    return $default;
}

function envFlag(string $key, bool $default = false): bool {
    $raw = envOrLocal($key, $default ? '1' : '0');
    if ($raw === null) {
        return $default;
    }

    $value = strtolower(trim($raw));
    return in_array($value, ['1', 'true', 'yes', 'on'], true);
}

function getDatabaseConnection() {
    $host = envOrLocal('DB_HOST', '127.0.0.1');
    $port = envOrLocal('DB_PORT', '3307');
    $db = envOrLocal('DB_NAME', 'fantasyrealm');
    $user = envOrLocal('DB_USER', 'root');
    $pass = envOrLocal('DB_PASS', '') ?? '';
    $charset = envOrLocal('DB_CHARSET', 'utf8mb4');
    $connectTimeout = (int) (envOrLocal('DB_CONNECT_TIMEOUT', '3') ?: 3);

    if ($connectTimeout < 1) {
        $connectTimeout = 1;
    }

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset;connect_timeout=$connectTimeout";

    try {
        $pdoOptions = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => $connectTimeout,
        ];
        if (defined('PDO::MYSQL_ATTR_CONNECT_TIMEOUT')) {
            $pdoOptions[PDO::MYSQL_ATTR_CONNECT_TIMEOUT] = $connectTimeout;
        }

        $pdo = new PDO($dsn, $user, $pass, $pdoOptions);

        // L'alignement de schema au mieux devrait etre DEV-only.
        // Activer via APP_DEBUG ou DB_AUTO_SCHEMA en utilisant des valeurs comme: 1/true/yes/on.
        $autoSchema = envFlag('APP_DEBUG', false) || envFlag('DB_AUTO_SCHEMA', false);
        if ($autoSchema) {
            ensureDatabaseSchema($pdo);
        }

        return $pdo;
    } catch (PDOException $e) {
        error_log("Database Connection Error: " . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

function ensureDatabaseSchema(PDO $pdo): void {
    try {
        $safeStep = function (callable $operation, string $label): void {
            try {
                $operation();
            } catch (Throwable $e) {
                error_log('ensureDatabaseSchema step failed (' . $label . '): ' . $e->getMessage());
            }
        };

                // ---- missing tables (best-effort) ----
                $safeStep(function () use ($pdo) {
                ensureTableExists($pdo, 'notifications', "
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
                }, 'notifications table');

                $safeStep(function () use ($pdo) {
                ensureTableExists($pdo, 'tickets', "
                        CREATE TABLE IF NOT EXISTS `tickets` (
                            `id` int(11) NOT NULL AUTO_INCREMENT,
                            `user_id` int(11) NOT NULL,
                            `subject` varchar(255) NOT NULL,
                            `message` text NOT NULL,
                            `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
                            `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
                            `assigned_to` int(11) DEFAULT NULL,
                            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                            `updated_at` timestamp NULL DEFAULT NULL,
                            `closed_at` timestamp NULL DEFAULT NULL,
                            PRIMARY KEY (`id`),
                            KEY `idx_tickets_user_id` (`user_id`),
                            KEY `idx_tickets_status` (`status`),
                            KEY `idx_tickets_assigned_to` (`assigned_to`),
                            CONSTRAINT `fk_tickets_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
                            CONSTRAINT `fk_tickets_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ");
                }, 'tickets table');

                $safeStep(function () use ($pdo) {
                ensureTableExists($pdo, 'ticket_messages', "
                        CREATE TABLE IF NOT EXISTS `ticket_messages` (
                            `id` int(11) NOT NULL AUTO_INCREMENT,
                            `ticket_id` int(11) NOT NULL,
                            `user_id` int(11) NOT NULL,
                            `message` text NOT NULL,
                            `is_staff_response` tinyint(1) NOT NULL DEFAULT 0,
                            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
                            PRIMARY KEY (`id`),
                            KEY `idx_ticket_messages_ticket_id` (`ticket_id`),
                            KEY `idx_ticket_messages_user_id` (`user_id`),
                            CONSTRAINT `fk_ticket_messages_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
                            CONSTRAINT `fk_ticket_messages_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                ");
                }, 'ticket_messages table');

        // ---- users table ----
        $userColumns = [
            'avatar_id' => "ALTER TABLE users ADD COLUMN avatar_id INT NOT NULL DEFAULT 1",
            'username_changed_at' => "ALTER TABLE users ADD COLUMN username_changed_at DATETIME NULL",
            'is_suspended' => "ALTER TABLE users ADD COLUMN is_suspended TINYINT(1) NOT NULL DEFAULT 0",
            'is_banned' => "ALTER TABLE users ADD COLUMN is_banned TINYINT(1) NOT NULL DEFAULT 0",
            'banned_at' => "ALTER TABLE users ADD COLUMN banned_at DATETIME NULL",
            'ban_expires_at' => "ALTER TABLE users ADD COLUMN ban_expires_at DATETIME NULL",
            'ban_reason' => "ALTER TABLE users ADD COLUMN ban_reason TEXT NULL",
            'suspend_reason' => "ALTER TABLE users ADD COLUMN suspend_reason TEXT NULL",
        ];

        foreach ($userColumns as $column => $alterSql) {
            $safeStep(function () use ($pdo, $column, $alterSql) {
                ensureColumnExists($pdo, 'users', $column, $alterSql);
            }, 'users.' . $column);
        }

        // ---- characters table ----
        $characterColumns = [
            // publication
            'is_published' => "ALTER TABLE characters ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0",
            'published_at' => "ALTER TABLE characters ADD COLUMN published_at DATETIME NULL",

            // appearance (keys)
            'body_type' => "ALTER TABLE characters ADD COLUMN body_type VARCHAR(50) NULL",
            'body_color' => "ALTER TABLE characters ADD COLUMN body_color VARCHAR(50) NULL",
            'hair_style' => "ALTER TABLE characters ADD COLUMN hair_style VARCHAR(50) NULL",
            'hair_color' => "ALTER TABLE characters ADD COLUMN hair_color VARCHAR(50) NULL",
            'eye_type' => "ALTER TABLE characters ADD COLUMN eye_type VARCHAR(50) NULL",
            'eye_color' => "ALTER TABLE characters ADD COLUMN eye_color VARCHAR(50) NULL",
            'mouth_type' => "ALTER TABLE characters ADD COLUMN mouth_type VARCHAR(50) NULL",

            // clothing
            'head_clothing' => "ALTER TABLE characters ADD COLUMN head_clothing VARCHAR(50) NULL",
            'top_clothing' => "ALTER TABLE characters ADD COLUMN top_clothing VARCHAR(50) NULL",
            'legs_clothing' => "ALTER TABLE characters ADD COLUMN legs_clothing VARCHAR(50) NULL",
            'shoes_clothing' => "ALTER TABLE characters ADD COLUMN shoes_clothing VARCHAR(50) NULL",

            // armor
            'helmet' => "ALTER TABLE characters ADD COLUMN helmet VARCHAR(50) NULL",
            'chestplate' => "ALTER TABLE characters ADD COLUMN chestplate VARCHAR(50) NULL",
            'leggings' => "ALTER TABLE characters ADD COLUMN leggings VARCHAR(50) NULL",
            'boots' => "ALTER TABLE characters ADD COLUMN boots VARCHAR(50) NULL",
            'left_glove' => "ALTER TABLE characters ADD COLUMN left_glove VARCHAR(50) NULL",
            'right_glove' => "ALTER TABLE characters ADD COLUMN right_glove VARCHAR(50) NULL",

            // hands
            'left_hand' => "ALTER TABLE characters ADD COLUMN left_hand VARCHAR(50) NULL",
            'right_hand' => "ALTER TABLE characters ADD COLUMN right_hand VARCHAR(50) NULL",

            // accessories
            'accessory_neck' => "ALTER TABLE characters ADD COLUMN accessory_neck VARCHAR(50) NULL",
            'accessory_finger' => "ALTER TABLE characters ADD COLUMN accessory_finger VARCHAR(50) NULL",
            'accessory_wrist' => "ALTER TABLE characters ADD COLUMN accessory_wrist VARCHAR(50) NULL",
            'accessory_waist' => "ALTER TABLE characters ADD COLUMN accessory_waist VARCHAR(50) NULL",
        ];

        foreach ($characterColumns as $column => $alterSql) {
            $safeStep(function () use ($pdo, $column, $alterSql) {
                ensureColumnExists($pdo, 'characters', $column, $alterSql);
            }, 'characters.' . $column);
        }
    } catch (Throwable $e) {
        // Ne jamais interrompre la requête en raison d'une tentative d'alignement de schema
        error_log('ensureDatabaseSchema failed: ' . $e->getMessage());
    }
}

function ensureColumnExists(PDO $pdo, string $table, string $column, string $alterSql): void {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );
    $stmt->execute([$table, $column]);
    $exists = (int)$stmt->fetchColumn() > 0;

    if (!$exists) {
        $pdo->exec($alterSql);
    }
}

function ensureTableExists(PDO $pdo, string $table, string $createSql): void {
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?"
    );
    $stmt->execute([$table]);
    $exists = (int)$stmt->fetchColumn() > 0;

    if (!$exists) {
        $pdo->exec($createSql);
    }
}
