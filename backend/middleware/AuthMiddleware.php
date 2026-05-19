<?php

require_once __DIR__ . '/../services/AuthService.php';

class AuthMiddleware {
    private $authService;

    public function __construct($pdo) {
        $this->authService = new AuthService($pdo);
    }

    // Vérifier si l'utilisateur est authentifié
    public function checkAuth() {
        $token = $this->getAuthToken();

        if (!$token) {
            return false;
        }

        // Recupérer l'utilisateur frais de la BD pour les mises à jour de rôle
        $result = $this->authService->getUserFromToken($token);
        if (!$result['success'] || empty($result['user'])) {
            return false;
        }

        $user = $result['user'];
        $userId = (int)($user['id'] ?? 0);
        if ($userId <= 0) {
            return false;
        }

        // Forme retrocompatible: garder id et userId
        return array_merge($user, [
            'id' => $userId,
            'userId' => $userId,
        ]);
    }

    // Requérir une authentification, envoyer 401 si non authentifié
    public function requireAuth() {
        $user = $this->checkAuth();

        if (!$user) {
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'message' => 'Unauthorized: Valid token required'
            ]);
            exit();
        }

        return $user;
    }

    /**
     * Récupérer le token Authorization depuis les en-têtes
     */
    private function getAuthToken() {
        // Tester plusieurs méthodes pour obtenir l'en-tête Authorization
        $authHeader = null;
        
        // Méthode 1 : HTTP_AUTHORIZATION depuis $_SERVER (fonctionne avec le serveur de dev PHP)
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        // Méthode 2 : getallheaders() si disponible (Apache)
        elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
        }

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     */
    public function checkRole($requiredRole) {
        $user = $this->checkAuth();

        if (!$user || $user['role'] !== $requiredRole) {
            http_response_code(403);
            echo json_encode([
                'status' => 'error',
                'message' => 'Forbidden: Insufficient permissions'
            ]);
            exit();
        }

        return $user;
    }
    
    /**
     * Méthode statique pour authentifier l'utilisateur sans instanciation
     * Utilisée par les contrôleurs qui ont besoin d'une vérification rapide
     */
    public static function authenticate() {
        // Récupérer le token Authorization depuis plusieurs sources
        $token = null;
        $authHeader = '';

        // Essayer $_SERVER['HTTP_AUTHORIZATION'] en premier lieu
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        // Essayer getallheaders() si dispo (fonctionne avec le serveur PHP integre)
        elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            // Recherche insensible à la casse de l'en-tête Authorization
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $authHeader = $value;
                    break;
                }
            }
        }

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (!$token) {
            return false;
        }

        // Récupérer l'utilisateur le plus récent depuis la BDD (ne pas se fier au rôle dans le payload JWT)
        require_once __DIR__ . '/../config/database.php';
        $pdo = getDatabaseConnection();
        $authService = new AuthService($pdo);

        $result = $authService->getUserFromToken($token);
        if (!$result['success'] || empty($result['user'])) {
            return false;
        }

        $user = $result['user'];
        $userId = (int)($user['id'] ?? 0);
        if ($userId <= 0) {
            return false;
        }

        return array_merge($user, [
            'id' => $userId,
            'userId' => $userId,
        ]);
    }
}

