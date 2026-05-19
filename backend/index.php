<?php
// Point d'entree de l'API Fantasy Realm

// S'assurer qu'on peut toujours retourner du JSON même en cas d'erreur fatale
ob_start();

$__appDebug = (getenv('APP_DEBUG') === '1');

$__sendJson = function (int $statusCode, array $payload) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }
    http_response_code($statusCode);
    echo json_encode($payload);
};

set_exception_handler(function (Throwable $e) use ($__sendJson, $__appDebug) {
    error_log('Unhandled exception: ' . $e->getMessage());
    if (ob_get_length()) {
        ob_clean();
    }
    $payload = ['status' => 'error', 'message' => 'Internal server error'];
    if ($__appDebug) {
        $payload['debug'] = [
            'type' => get_class($e),
            'message' => $e->getMessage(),
        ];
    }
    $__sendJson(500, $payload);
    exit;
});

set_error_handler(function (int $severity, string $message, string $file, int $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function () use ($__sendJson, $__appDebug) {
    $error = error_get_last();
    if (!$error) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'] ?? 0, $fatalTypes, true)) {
        return;
    }

    error_log('Fatal error: ' . ($error['message'] ?? 'unknown'));
    if (ob_get_length()) {
        ob_clean();
    }

    $payload = ['status' => 'error', 'message' => 'Internal server error'];
    if ($__appDebug) {
        $payload['debug'] = [
            'type' => $error['type'] ?? null,
            'message' => $error['message'] ?? null,
        ];
    }
    $__sendJson(500, $payload);
});

// Desactiver l'affichage des erreurs en production pour ne pas casser les reponses JSON
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config/database.php";
require_once __DIR__ . "/controllers/AuthController.php";
require_once __DIR__ . "/controllers/AdminController.php";
require_once __DIR__ . "/controllers/CharacterController.php";
require_once __DIR__ . "/controllers/CommentController.php";
require_once __DIR__ . "/controllers/NotificationController.php";
require_once __DIR__ . "/controllers/TicketController.php";
require_once __DIR__ . "/middleware/AuthMiddleware.php";
require_once __DIR__ . "/services/AppearanceOptionsService.php";

$pdo = getDatabaseConnection();

if (!$pdo) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit();
}

$requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Détecter dynamiquement le chemin de base (trouver le répertoire 'backend' dans le chemin)
$pathParts = explode('/', $requestPath);
$backendIndex = array_search('backend', $pathParts);
if ($backendIndex !== false) {
    $basePath = implode('/', array_slice($pathParts, 0, $backendIndex + 1));
} else {
    $basePath = '/backend';
}

$method = $_SERVER['REQUEST_METHOD'];

// Enlever le chemin de base de la demande
$route = str_replace($basePath, '', $requestPath);
$route = trim($route, '/');

if ($method === 'GET' && $route === 'appearance/options') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => AppearanceOptionsService::getOptions(),
    ]);
    exit();
}

if ($method === 'GET' && $route === 'appearance/items') {
    $items = AppearanceOptionsService::getItems();

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

    $withUrls = array_map(function ($item) use ($scheme, $host, $scriptDir) {
        $publicPath = ($scriptDir ? $scriptDir : '') . $item['image_path'];
        return [
            'category' => $item['category'],
            'key' => $item['key'],
            'image_url' => $scheme . '://' . $host . $publicPath,
        ];
    }, $items);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'items' => $withUrls,
        ],
    ]);
    exit();
}

if ($method === 'GET' && $route === 'appearance/layer-order') {
    $cfg = @include __DIR__ . '/config/appearance.php';
    $layerOrder = is_array($cfg) && isset($cfg['layer_order']) && is_array($cfg['layer_order']) ? $cfg['layer_order'] : [];

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'layer_order' => $layerOrder,
        ],
    ]);
    exit();
}

if ($method === 'GET' && $route === 'appearance/upload-categories') {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'categories' => AppearanceOptionsService::getAllowedSubDirs(),
        ],
    ]);
    exit();
}

if ($method === 'GET' && $route === 'management/appearance/items') {
    $user = AuthMiddleware::authenticate();
    if (!$user || !in_array($user['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }

    $items = AppearanceOptionsService::getItems();

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');

    $withUrls = array_map(function ($item) use ($scheme, $host, $scriptDir) {
        $publicPath = ($scriptDir ? $scriptDir : '') . $item['image_path'];
        return [
            'category' => $item['category'],
            'key' => $item['key'],
            'file_name' => $item['file_name'],
            'image_url' => $scheme . '://' . $host . $publicPath,
            'image_path' => $publicPath,
        ];
    }, $items);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'items' => $withUrls,
        ],
    ]);
    exit();
}

if ($method === 'GET' && $route === 'management/users') {
    $user = AuthMiddleware::authenticate();
    if (!$user || !in_array($user['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }

    // Par defaut, Gestion -> Utilisateurs est destiné à gérer les joueurs.
    // Les comptes staff (admin/employee) sont gérés ailleurs.
    $includeStaff = filter_var($_GET['include_staff'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $limit = (int)($_GET['limit'] ?? 200);
    if ($limit < 1) $limit = 1;
    if ($limit > 500) $limit = 500;

    try {
        $sql = 'SELECT id, email, username, role, is_suspended, is_banned, ban_reason, suspend_reason, created_at '
            . 'FROM users ';

        if (!$includeStaff) {
            $sql .= "WHERE role = 'player' ";
        }

        $sql .= 'ORDER BY id DESC LIMIT :limit';

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $users = array_map(function ($row) {
            $isBanned = (bool)($row['is_banned'] ?? 0);
            $isSuspended = (bool)($row['is_suspended'] ?? 0);
            $status = $isBanned ? 'banned' : ($isSuspended ? 'suspended' : 'active');

            return [
                'id' => (int)$row['id'],
                'email' => $row['email'],
                'username' => $row['username'],
                'role' => $row['role'],
                'status' => $status,
                'is_banned' => $isBanned,
                'is_suspended' => $isSuspended,
                'ban_reason' => $row['ban_reason'] ?? null,
                'suspend_reason' => $row['suspend_reason'] ?? null,
                'created_at' => $row['created_at'] ?? null,
            ];
        }, $rows);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Users retrieved',
            'data' => ['users' => $users],
        ]);
        exit();
    } catch (Throwable $e) {
        error_log('management/users error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to retrieve users']);
        exit();
    }
}

if ($method === 'PUT' && preg_match('#^management/users/(\d+)/suspend$#', $route, $m)) {
    $actor = AuthMiddleware::authenticate();
    if (!$actor || !in_array($actor['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }
    if (!empty($actor['is_banned']) || !empty($actor['is_suspended'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Suspended/banned staff cannot perform actions']);
        exit();
    }

    $targetId = (int)$m[1];
    $actorId = (int)($actor['id'] ?? $actor['userId'] ?? 0);
    if ($targetId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid user id']);
        exit();
    }
    if ($actorId > 0 && $targetId === $actorId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'You cannot suspend your own account']);
        exit();
    }

    $stmt = $pdo->prepare('SELECT id, username, role, is_suspended FROM users WHERE id = ?');
    $stmt->execute([$targetId]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$target) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }
    if (in_array(($target['role'] ?? ''), ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: You cannot manage staff accounts here']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }
    $requested = $input['is_suspended'] ?? null;
    $isSuspended = filter_var($requested, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($isSuspended === null) {
        $isSuspended = !((bool)($target['is_suspended'] ?? 0));
    }

    $reason = trim((string)($input['reason'] ?? $input['suspend_reason'] ?? ''));
    if ($isSuspended && $reason === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Suspension reason is required']);
        exit();
    }

    $suspendReason = $isSuspended ? $reason : null;

    $upd = $pdo->prepare('UPDATE users SET is_suspended = ?, suspend_reason = ? WHERE id = ?');
    $upd->execute([$isSuspended ? 1 : 0, $suspendReason, $targetId]);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $isSuspended ? 'User suspended' : 'User reactivated',
        'data' => [
            'user' => [
                'id' => $targetId,
                'username' => $target['username'] ?? null,
                'role' => $target['role'] ?? null,
                'is_suspended' => $isSuspended,
                'suspend_reason' => $suspendReason,
            ],
        ],
    ]);
    exit();
}

if ($method === 'PUT' && preg_match('#^management/users/(\d+)/ban$#', $route, $m)) {
    $actor = AuthMiddleware::authenticate();
    if (!$actor || !in_array($actor['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }
    if (!empty($actor['is_banned']) || !empty($actor['is_suspended'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Suspended/banned staff cannot perform actions']);
        exit();
    }

    $targetId = (int)$m[1];
    $actorId = (int)($actor['id'] ?? $actor['userId'] ?? 0);
    if ($targetId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid user id']);
        exit();
    }
    if ($actorId > 0 && $targetId === $actorId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'You cannot ban your own account']);
        exit();
    }

    $stmt = $pdo->prepare('SELECT id, username, role, is_banned FROM users WHERE id = ?');
    $stmt->execute([$targetId]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$target) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }
    if (in_array(($target['role'] ?? ''), ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: You cannot manage staff accounts here']);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }
    $requested = $input['is_banned'] ?? null;
    $isBanned = filter_var($requested, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($isBanned === null) {
        $isBanned = true;
    }

    if ($isBanned) {
        $reason = trim((string)($input['reason'] ?? $input['ban_reason'] ?? ''));
        if ($reason === '') {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Ban reason is required']);
            exit();
        }

        $banReason = $reason;
        $upd = $pdo->prepare('UPDATE users SET is_banned = 1, ban_reason = ?, banned_at = NOW(), ban_expires_at = NULL WHERE id = ?');
        $upd->execute([$banReason, $targetId]);

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'User banned',
            'data' => [
                'user' => [
                    'id' => $targetId,
                    'username' => $target['username'] ?? null,
                    'role' => $target['role'] ?? null,
                    'is_banned' => true,
                    'ban_reason' => $banReason,
                ],
            ],
        ]);
        exit();
    }

    $upd = $pdo->prepare('UPDATE users SET is_banned = 0, ban_reason = NULL, banned_at = NULL, ban_expires_at = NULL WHERE id = ?');
    $upd->execute([$targetId]);
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'User unbanned',
        'data' => [
            'user' => [
                'id' => $targetId,
                'username' => $target['username'] ?? null,
                'role' => $target['role'] ?? null,
                'is_banned' => false,
                'ban_reason' => null,
            ],
        ],
    ]);
    exit();
}

if ($method === 'DELETE' && preg_match('#^management/users/(\d+)$#', $route, $m)) {
    $actor = AuthMiddleware::authenticate();
    if (!$actor || !in_array($actor['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }
    if (!empty($actor['is_banned']) || !empty($actor['is_suspended'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Suspended/banned staff cannot perform actions']);
        exit();
    }

    $targetId = (int)$m[1];
    $actorId = (int)($actor['id'] ?? $actor['userId'] ?? 0);
    if ($targetId <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid user id']);
        exit();
    }
    if ($actorId > 0 && $targetId === $actorId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'You cannot delete your own account']);
        exit();
    }

    $stmt = $pdo->prepare('SELECT id, username, role FROM users WHERE id = ?');
    $stmt->execute([$targetId]);
    $target = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$target) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }
    if (in_array(($target['role'] ?? ''), ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: You cannot manage staff accounts here']);
        exit();
    }

    $del = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $del->execute([$targetId]);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'User deleted',
        'data' => [
            'user' => [
                'id' => $targetId,
                'username' => $target['username'] ?? null,
                'role' => $target['role'] ?? null,
            ],
        ],
    ]);
    exit();
}

if ($method === 'DELETE' && $route === 'management/appearance/item') {
    $user = AuthMiddleware::authenticate();
    if (!$user || !in_array($user['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }

    if (!empty($user['is_banned']) || !empty($user['is_suspended'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Suspended/banned staff cannot perform actions']);
        exit();
    }

    $payload = json_decode(file_get_contents('php://input'), true);
    $rawCategory = strtolower(trim((string)($payload['category'] ?? '')));
    $rawKey = strtolower(trim((string)($payload['key'] ?? '')));

    if ($rawKey === '' || $rawKey === 'none') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid key']);
        exit();
    }

    // Accepter soit un sou-rep répertoire connu ou un alias vague.
    $categoryMap = [
        'body_type' => 'body-types',
        'bodytype' => 'body-types',
        'body-types' => 'body-types',

        'hair_style' => 'hair-styles',
        'hairstyle' => 'hair-styles',
        'hair-styles' => 'hair-styles',

        'eye_type' => 'eye-types',
        'eyetype' => 'eye-types',
        'eye-types' => 'eye-types',

        'mouth_type' => 'mouth-types',
        'mouthtype' => 'mouth-types',
        'mouth-types' => 'mouth-types',

        'clothing_head' => 'clothing-head',
        'clothing-top' => 'clothing-top',
        'clothing_legs' => 'clothing-legs',
        'clothing_shoes' => 'clothing-shoes',

        'armor_helmet' => 'armor-helmet',
        'armor_chestplate' => 'armor-chestplate',
        'armor_leggings' => 'armor-leggings',
        'armor_boots' => 'armor-boots',

        'left_glove' => 'gloves-left',
        'glove-left' => 'gloves-left',
        'gloves-left' => 'gloves-left',

        'right_glove' => 'gloves-right',
        'glove-right' => 'gloves-right',
        'gloves-right' => 'gloves-right',

        'hand_left' => 'hands-left',
        'hands-left' => 'hands-left',

        'hand_right' => 'hands-right',
        'hands-right' => 'hands-right',

        'neck' => 'accessories-neck',
        'accessory_neck' => 'accessories-neck',
        'accessories-neck' => 'accessories-neck',
        'slot1' => 'accessories-neck',

        'finger' => 'accessories-finger',
        'accessory_finger' => 'accessories-finger',
        'accessories-finger' => 'accessories-finger',
        'slot2' => 'accessories-finger',

        'wrist' => 'accessories-wrist',
        'accessory_wrist' => 'accessories-wrist',
        'accessories-wrist' => 'accessories-wrist',
        'slot3' => 'accessories-wrist',

        'waist' => 'accessories-waist',
        'accessory_waist' => 'accessories-waist',
        'accessories-waist' => 'accessories-waist',
        'slot4' => 'accessories-waist',
    ];

    $subDir = $categoryMap[$rawCategory] ?? $rawCategory;
    if (!in_array($subDir, AppearanceOptionsService::getAllowedSubDirs(), true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid category']);
        exit();
    }

    $baseDir = __DIR__ . '/public/uploads/appearance/' . $subDir;
    $deleted = false;
    foreach (['png', 'jpg', 'jpeg', 'webp', 'gif'] as $ext) {
        $path = $baseDir . '/' . $rawKey . '.' . $ext;
        if (is_file($path)) {
            @unlink($path);
            $deleted = true;
        }
    }

    if (!$deleted) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Item not found']);
        exit();
    }

    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Item deleted']);
    exit();
}

if ($method === 'POST' && $route === 'files/accessory-image') {
    $user = AuthMiddleware::authenticate();
    if (!$user || !in_array($user['role'] ?? '', ['admin', 'employee'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden']);
        exit();
    }

    if (!empty($user['is_banned']) || !empty($user['is_suspended'])) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Suspended/banned staff cannot perform actions']);
        exit();
    }

    if (!isset($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No image file uploaded']);
        exit();
    }

    $file = $_FILES['image'];
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Upload failed']);
        exit();
    }

    if (($file['size'] ?? 0) > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Image too large (max 5MB)']);
        exit();
    }

    $tmpPath = $file['tmp_name'];
    $mime = mime_content_type($tmpPath);
    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif'
    ];

    if (!isset($allowedTypes[$mime])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid image format (jpg, png, webp, gif)']);
        exit();
    }

    $extension = $allowedTypes[$mime];

    $size = @getimagesize($tmpPath);
    if ($size === false) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid image file']);
        exit();
    }

    $width = (int)($size[0] ?? 0);
    $height = (int)($size[1] ?? 0);
    if ($width !== 1000 || $height !== 1800) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid image size (must be 1000x1800)',
            'data' => ['width' => $width, 'height' => $height],
        ]);
        exit();
    }

    // Champs optionnels pour categóriser et nommer les ressources.
    $rawCategory = $_POST['category'] ?? '';
    $rawName = $_POST['name'] ?? '';

    // Mapper les alias de categórie courants aux dossiers sous /public/uploads/appearance
    $category = strtolower(trim((string)$rawCategory));
    $categoryMap = [
        'body_type' => 'body-types',
        'bodytype' => 'body-types',
        'body-types' => 'body-types',

        'hair_style' => 'hair-styles',
        'hairstyle' => 'hair-styles',
        'hair-styles' => 'hair-styles',

        'eye_type' => 'eye-types',
        'eyetype' => 'eye-types',
        'eye-types' => 'eye-types',

        'mouth_type' => 'mouth-types',
        'mouthtype' => 'mouth-types',
        'mouth-types' => 'mouth-types',

        'clothing_head' => 'clothing-head',
        'head_clothing' => 'clothing-head',
        'clothing-head' => 'clothing-head',
        'clothing_top' => 'clothing-top',
        'top_clothing' => 'clothing-top',
        'clothing-top' => 'clothing-top',
        'clothing_legs' => 'clothing-legs',
        'legs_clothing' => 'clothing-legs',
        'clothing-legs' => 'clothing-legs',
        'clothing_shoes' => 'clothing-shoes',
        'shoes_clothing' => 'clothing-shoes',
        'clothing-shoes' => 'clothing-shoes',

        'armor_helmet' => 'armor-helmet',
        'helmet' => 'armor-helmet',
        'armor-helmet' => 'armor-helmet',
        'armor_chestplate' => 'armor-chestplate',
        'chestplate' => 'armor-chestplate',
        'armor-chestplate' => 'armor-chestplate',
        'armor_leggings' => 'armor-leggings',
        'leggings' => 'armor-leggings',
        'armor-leggings' => 'armor-leggings',
        'armor_boots' => 'armor-boots',
        'boots' => 'armor-boots',
        'armor-boots' => 'armor-boots',

        'hand_left' => 'hands-left',
        'left_hand' => 'hands-left',
        'hands-left' => 'hands-left',
        'hand_right' => 'hands-right',
        'right_hand' => 'hands-right',
        'hands-right' => 'hands-right',

        'neck' => 'accessories-neck',
        'accessory_neck' => 'accessories-neck',
        'slot1' => 'accessories-neck',

        'finger' => 'accessories-finger',
        'accessory_finger' => 'accessories-finger',
        'slot2' => 'accessories-finger',

        'wrist' => 'accessories-wrist',
        'accessory_wrist' => 'accessories-wrist',
        'slot3' => 'accessories-wrist',

        'waist' => 'accessories-waist',
        'accessory_waist' => 'accessories-waist',
        'slot4' => 'accessories-waist',

        'left_glove' => 'gloves-left',
        'leftglove' => 'gloves-left',
        'glove-left' => 'gloves-left',
        'gloves-left' => 'gloves-left',

        'right_glove' => 'gloves-right',
        'rightglove' => 'gloves-right',
        'glove-right' => 'gloves-right',
        'gloves-right' => 'gloves-right',
    ];

    $subDir = $categoryMap[$category] ?? null;

    if ($subDir === null || !in_array($subDir, AppearanceOptionsService::getAllowedSubDirs(), true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid or missing category']);
        exit();
    }

    $slug = AppearanceOptionsService::slugify((string)$rawName);
    if ($slug === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing name']);
        exit();
    }

    $uploadDir = __DIR__ . '/public/uploads/appearance/' . $subDir;
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0775, true);
    }

    $fileName = $slug . '.' . $extension;
    $destination = $uploadDir . '/' . $fileName;

    if (file_exists($destination)) {
        $fileName = $slug . '_' . bin2hex(random_bytes(3)) . '.' . $extension;
        $destination = $uploadDir . '/' . $fileName;
    }

    $publicSubPath = 'public/uploads/appearance/' . $subDir . '/' . $fileName;

    if (!move_uploaded_file($tmpPath, $destination)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to store image']);
        exit();
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    $publicImagePath = ($scriptDir ? $scriptDir : '') . '/' . $publicSubPath;

    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'message' => 'Image uploaded successfully',
        'data' => [
            'image_url' => $scheme . '://' . $host . $publicImagePath,
            'image_path' => $publicImagePath,
            'file_name' => $fileName
        ]
    ]);
    exit();
}

if (empty($route)) {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Fantasy Realm API v1.0',
        'endpoints' => [
            'POST /auth/register' => 'Register new user',
            'POST /auth/login' => 'Login user',
            'GET /auth/me' => 'Get current user (requires token)',
            'PUT /auth/profile' => 'Update profile (username/avatar, requires token)',
            'POST /auth/settings/request-code' => 'Send verification code for settings (requires token)',
            'POST /auth/settings/confirm-code' => 'Confirm settings with verification code (requires token)',
            'PUT /auth/settings' => 'Update settings (deprecated, use request/confirm flow)',
            'POST /auth/logout' => 'Logout user',
            'GET /characters' => 'List all characters',
            'POST /characters/create' => 'Create a new character (requires token)',
            'GET /characters/my' => 'Get my characters (requires token)',
            'GET /characters/approved' => 'Get approved characters (public)',
            'GET /characters/published' => 'Get published characters for gallery (public)',
            'GET /characters/pending' => 'Get pending characters (admin/employee only)',
            'PUT /characters/:id/approve' => 'Approve character (admin/employee only)',
            'PUT /characters/:id/reject' => 'Reject character with reason (admin/employee only)',
            'PUT /characters/:id/publish' => 'Publish approved character (requires token, author only)',
            'PUT /characters/:id/unpublish' => 'Unpublish character from gallery (requires token, author only)',
            'POST /comments' => 'Submit comment with rating (requires token, published character)',
            'GET /characters/:id/comments' => 'Get approved comments for character (public)',
            'GET /comments/pending' => 'Get pending comments (admin/employee only)',
            'PUT /comments/:id/approve' => 'Approve comment (admin/employee only)',
            'PUT /comments/:id/reject' => 'Reject comment with reason (admin/employee only)',
            'DELETE /comments/:id' => 'Delete comment (author or staff only)',
            'GET /notifications' => 'Get notifications (requires token)',
            'GET /notifications/unread-count' => 'Get unread count (requires token)',
            'PUT /notifications/:id/read' => 'Mark notification as read (requires token)',
            'PUT /notifications/read-all' => 'Mark all as read (requires token)',
            'DELETE /notifications/:id' => 'Delete notification (requires token)',
            'POST /notifications/send' => 'Send notification (admin/employee only)',
            'POST /tickets' => 'Create ticket (requires token, banned users limited to 1)',
            'GET /tickets/my' => 'Get my tickets (requires token)',
            'GET /tickets' => 'Get all tickets (staff only)',
            'GET /tickets/:id' => 'Get ticket details (requires token)',
            'POST /tickets/:id/reply' => 'Reply to ticket (requires token)',
            'PUT /tickets/:id/status' => 'Update ticket status (staff only)',
            'PUT /tickets/:id/assign' => 'Assign ticket to staff (staff only)',
            'GET /admin/logs' => 'Get activity logs (admin only)',
            'GET /admin/stats' => 'Get activity statistics (admin only)',
            'POST /admin/logs/cleanup' => 'Cleanup old logs (admin only)'
        ]
    ]);
    exit();
}

// Routage vers AuthController
$authController = new AuthController($pdo);
$result = $authController->handleRoute($method, $route, $pdo);

if ($result !== null) {
    exit();
}

// Routage vers AdminController (nécessite une authentification admin)
$adminController = new AdminController($pdo);
$token = null;
if (preg_match('/Bearer\s+(.+)/', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $matches)) {
    $token = $matches[1];
}
$result = $adminController->handleRoute($method, $route, $token);

if ($result !== null) {
    exit();
}

// Routage vers CharacterController
$characterController = new CharacterController();
$result = $characterController->handleRoute($method, $route, $token);

if ($result !== null) {
    exit();
}

// Routage vers CommentController
$commentController = new CommentController();
$result = $commentController->handleRoute($method, $route, $token);

if ($result !== null) {
    exit();
}

// Routage vers NotificationController
$notificationController = new NotificationController();
$result = $notificationController->handleRoute($method, $route, $token);

if ($result !== null) {
    exit();
}

// Routage vers TicketController
$ticketController = new TicketController($pdo);
$result = $ticketController->handleRoute($method, $route);

if ($result !== null) {
    exit();
}

// Les routes seraient traitées ici
http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);
