<?php
// Routeur de dev pour le serveur PHP integre.
// Assure que les en-tetes CORS sont presents pour les ressources statiques (notamment les images) donc
// canvas-based operations (recolor) work when frontend runs on another origin.

$uriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uriPath = $uriPath === null ? '/' : $uriPath;
$uriPath = rawurldecode($uriPath);

// Gerer les preflight rapidement.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit;
}

$publicRoot = realpath(__DIR__ . '/public');

$serveStatic = false;
$staticFile = null;

if ($publicRoot !== false && ($uriPath === '/public' || str_starts_with($uriPath, '/public/'))) {
    $relative = substr($uriPath, strlen('/public'));
    if ($relative === '') {
        $relative = '/';
    }

    $candidate = realpath($publicRoot . $relative);
    if ($candidate !== false && str_starts_with($candidate, $publicRoot) && is_file($candidate)) {
        $ext = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));
        if ($ext !== 'php') {
            $serveStatic = true;
            $staticFile = $candidate;
        }
    }
}

if ($serveStatic && $staticFile !== null) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    $mime = null;
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $mime = finfo_file($finfo, $staticFile);
            finfo_close($finfo);
        }
    }

    if (!is_string($mime) || $mime === '') {
        $mime = 'application/octet-stream';
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($staticFile));

    readfile($staticFile);
    exit;
}

// Fallback vers le routeur API.
require __DIR__ . '/index.php';

