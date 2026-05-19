<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/AppearanceOptionsService.php';

class CharacterController {
    private $db;
    
    public function __construct() {
        $this->db = getDatabaseConnection();
    }

    private function validateAppearanceOptions(array $appearance): ?array {
        $bodyType = $appearance['bodyType'] ?? null;
        if ($bodyType !== null && !AppearanceOptionsService::isAllowed('bodyType', (string)$bodyType)) {
            return ['error' => 'Invalid bodyType'];
        }

        $clothing = is_array($appearance['clothing'] ?? null) ? $appearance['clothing'] : [];
        $armor = is_array($appearance['armor'] ?? null) ? $appearance['armor'] : [];
        $hands = is_array($appearance['hands'] ?? null) ? $appearance['hands'] : [];
        $accessories = is_array($appearance['accessories'] ?? null) ? $appearance['accessories'] : [];

        $hairStyle = $appearance['hairStyle'] ?? null;
        if ($hairStyle !== null && !AppearanceOptionsService::isAllowed('hairStyle', (string)$hairStyle)) {
            return ['error' => 'Invalid hairStyle'];
        }

        $eyeType = $appearance['eyeType'] ?? null;
        if ($eyeType !== null && !AppearanceOptionsService::isAllowed('eyeType', (string)$eyeType)) {
            return ['error' => 'Invalid eyeType'];
        }

        $mouthType = $appearance['mouthType'] ?? null;
        if ($mouthType !== null && !AppearanceOptionsService::isAllowed('mouthType', (string)$mouthType)) {
            return ['error' => 'Invalid mouthType'];
        }

        $clothingHead = $clothing['head'] ?? null;
        if ($clothingHead !== null && !AppearanceOptionsService::isAllowed('clothingHead', (string)$clothingHead)) {
            return ['error' => 'Invalid clothing head'];
        }

        $clothingTop = $clothing['top'] ?? null;
        if ($clothingTop !== null && !AppearanceOptionsService::isAllowed('clothingTop', (string)$clothingTop)) {
            return ['error' => 'Invalid clothing top'];
        }

        $clothingLegs = $clothing['legs'] ?? null;
        if ($clothingLegs !== null && !AppearanceOptionsService::isAllowed('clothingLegs', (string)$clothingLegs)) {
            return ['error' => 'Invalid clothing legs'];
        }

        $clothingShoes = $clothing['shoes'] ?? null;
        if ($clothingShoes !== null && !AppearanceOptionsService::isAllowed('clothingShoes', (string)$clothingShoes)) {
            return ['error' => 'Invalid clothing shoes'];
        }

        $armorHelmet = $armor['helmet'] ?? null;
        if ($armorHelmet !== null && !AppearanceOptionsService::isAllowed('armorHelmet', (string)$armorHelmet)) {
            return ['error' => 'Invalid helmet'];
        }

        $armorChestplate = $armor['chestplate'] ?? null;
        if ($armorChestplate !== null && !AppearanceOptionsService::isAllowed('armorChestplate', (string)$armorChestplate)) {
            return ['error' => 'Invalid chestplate'];
        }

        $armorLeggings = $armor['leggings'] ?? null;
        if ($armorLeggings !== null && !AppearanceOptionsService::isAllowed('armorLeggings', (string)$armorLeggings)) {
            return ['error' => 'Invalid leggings'];
        }

        $armorBoots = $armor['boots'] ?? null;
        if ($armorBoots !== null && !AppearanceOptionsService::isAllowed('armorBoots', (string)$armorBoots)) {
            return ['error' => 'Invalid boots'];
        }

        $leftGlove = $armor['leftGlove'] ?? null;
        if ($leftGlove !== null && !AppearanceOptionsService::isAllowed('leftGlove', (string)$leftGlove)) {
            return ['error' => 'Invalid leftGlove'];
        }

        $rightGlove = $armor['rightGlove'] ?? null;
        if ($rightGlove !== null && !AppearanceOptionsService::isAllowed('rightGlove', (string)$rightGlove)) {
            return ['error' => 'Invalid rightGlove'];
        }

        $handLeft = $hands['left'] ?? null;
        if ($handLeft !== null && !AppearanceOptionsService::isAllowed('handLeft', (string)$handLeft)) {
            return ['error' => 'Invalid left hand'];
        }

        $handRight = $hands['right'] ?? null;
        if ($handRight !== null && !AppearanceOptionsService::isAllowed('handRight', (string)$handRight)) {
            return ['error' => 'Invalid right hand'];
        }

        $slot1 = $accessories['slot1'] ?? null;
        if ($slot1 !== null && !AppearanceOptionsService::isAllowed('accessoryNeck', (string)$slot1)) {
            return ['error' => 'Invalid accessory slot1'];
        }

        $slot2 = $accessories['slot2'] ?? null;
        if ($slot2 !== null && !AppearanceOptionsService::isAllowed('accessoryFinger', (string)$slot2)) {
            return ['error' => 'Invalid accessory slot2'];
        }

        $slot3 = $accessories['slot3'] ?? null;
        if ($slot3 !== null && !AppearanceOptionsService::isAllowed('accessoryWrist', (string)$slot3)) {
            return ['error' => 'Invalid accessory slot3'];
        }

        $slot4 = $accessories['slot4'] ?? null;
        if ($slot4 !== null && !AppearanceOptionsService::isAllowed('accessoryWaist', (string)$slot4)) {
            return ['error' => 'Invalid accessory slot4'];
        }

        return null;
    }
    
    /**
     * Handle character routes
     */
    public function handleRoute($method, $path, $token) {
        $action = trim($path, '/');
        
        if ($method === 'POST' && $action === 'characters/create') {
            $this->create();
            return true; // Indiquer que la route etait geree
        } elseif ($method === 'GET' && $action === 'characters/my') {
            $this->getMyCharacters();
            return true;
        } elseif ($method === 'GET' && $action === 'characters/approved') {
            $this->getApprovedCharacters();
            return true;
        } elseif ($method === 'GET' && $action === 'characters/pending') {
            $this->getPendingCharacters();
            return true;
        } elseif ($method === 'PUT' && preg_match('#^characters/(\d+)/approve$#', $action, $matches)) {
            $this->approveCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'PUT' && preg_match('#^characters/(\d+)/reject$#', $action, $matches)) {
            $this->rejectCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'PUT' && preg_match('#^characters/(\d+)/publish$#', $action, $matches)) {
            $this->publishCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'PUT' && preg_match('#^characters/(\d+)/unpublish$#', $action, $matches)) {
            $this->unpublishCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'PUT' && preg_match('#^characters/(\d+)/update$#', $action, $matches)) {
            $this->updateCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'DELETE' && preg_match('#^characters/(\d+)$#', $action, $matches)) {
            $this->deleteCharacter((int)$matches[1]);
            return true;
        } elseif ($method === 'GET' && $action === 'characters/published') {
            $this->getPublishedCharacters();
            return true;
        }
        
        return null;
    }

    /**
        * Update an existing character
     * PUT /api/characters/:id/update
     *
        * Important: Saving sets the character back to pending and resets comments/ratings
     */
    public function updateCharacter($characterId) {
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

        $data = json_decode(file_get_contents('php://input'), true);

        $name = trim((string)($data['name'] ?? ''));

        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Character name is required']);
            return;
        }

        $nameLength = function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name);

        if ($nameLength < 3) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be at least 3 characters']);
            return;
        }

        if ($nameLength > 20) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be at most 20 characters']);
            return;
        }

        try {
            $stmt = $this->db->prepare("SELECT id, user_id FROM characters WHERE id = ?");
            $stmt->execute([$characterId]);
            $existingCharacter = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingCharacter) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }

            if ((int)$existingCharacter['user_id'] !== (int)$userId) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }

            $stmt = $this->db->prepare("SELECT id FROM characters WHERE name = ? AND id != ?");
            $stmt->execute([$name, $characterId]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Character name already exists']);
                return;
            }

            $appearance = $data['appearance'] ?? [];

            $validationError = $this->validateAppearanceOptions($appearance);
            if ($validationError) {
                http_response_code(400);
                echo json_encode($validationError);
                return;
            }

            $genderInput = $data['gender'] ?? 'O';
            $genderMap = ['M' => 'male', 'F' => 'female', 'O' => 'other', 'male' => 'male', 'female' => 'female', 'other' => 'other'];
            $gender = $genderMap[$genderInput] ?? 'other';

            $this->db->beginTransaction();

            $sql = "UPDATE characters SET
                name = ?,
                gender = ?,
                body_type = ?,
                body_color = ?,
                hair_style = ?,
                hair_color = ?,
                eye_type = ?,
                eye_color = ?,
                mouth_type = ?,
                head_clothing = ?,
                top_clothing = ?,
                legs_clothing = ?,
                shoes_clothing = ?,
                helmet = ?,
                chestplate = ?,
                leggings = ?,
                boots = ?,
                left_glove = ?,
                right_glove = ?,
                left_hand = ?,
                right_hand = ?,
                accessory_neck = ?,
                accessory_finger = ?,
                accessory_wrist = ?,
                accessory_waist = ?,
                status = 'pending',
                rejection_reason = NULL,
                is_published = 0,
                published_at = NULL
                WHERE id = ? AND user_id = ?";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $name,
                $gender,
                $appearance['bodyType'] ?? 'human',
                $appearance['bodyColor'] ?? '#d4a574',
                $appearance['hairStyle'] ?? 'none',
                $appearance['hairColor'] ?? '#4a3728',
                $appearance['eyeType'] ?? 'none',
                $appearance['eyeColor'] ?? '#1e90ff',
                $appearance['mouthType'] ?? 'none',
                $appearance['clothing']['head'] ?? 'none',
                $appearance['clothing']['top'] ?? 'none',
                $appearance['clothing']['legs'] ?? 'none',
                $appearance['clothing']['shoes'] ?? 'none',
                $appearance['armor']['helmet'] ?? 'none',
                $appearance['armor']['chestplate'] ?? 'none',
                $appearance['armor']['leggings'] ?? 'none',
                $appearance['armor']['boots'] ?? 'none',
                $appearance['armor']['leftGlove'] ?? 'none',
                $appearance['armor']['rightGlove'] ?? 'none',
                $appearance['hands']['left'] ?? 'none',
                $appearance['hands']['right'] ?? 'none',
                $appearance['accessories']['slot1'] ?? 'none',
                $appearance['accessories']['slot2'] ?? 'none',
                $appearance['accessories']['slot3'] ?? 'none',
                $appearance['accessories']['slot4'] ?? 'none',
                $characterId,
                $userId,
            ]);

            $stmt = $this->db->prepare("DELETE FROM comments WHERE character_id = ?");
            $stmt->execute([$characterId]);

            $this->db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Character updated. Reviews and ratings have been reset, and the character is pending approval again.',
            ]);
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
        * Delete a character belonging to the authenticated user
     * DELETE /api/characters/:id
     */
    public function deleteCharacter($characterId) {
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

        $role = $user['role'] ?? '';
        $isStaff = in_array($role, ['admin', 'employee'], true);
        $canModerate = $isStaff && empty($user['is_suspended']) && empty($user['is_banned']);

        try {
            $stmt = $this->db->prepare("SELECT id, user_id FROM characters WHERE id = ?");
            $stmt->execute([$characterId]);
            $character = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$character) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }

            if ((int)$character['user_id'] !== (int)$userId && !$canModerate) {
                http_response_code(403);
                echo json_encode(['error' => 'Forbidden']);
                return;
            }

            $this->db->beginTransaction();

            $stmt = $this->db->prepare("DELETE FROM comments WHERE character_id = ?");
            $stmt->execute([$characterId]);

            if ($canModerate) {
                $stmt = $this->db->prepare("DELETE FROM characters WHERE id = ?");
                $stmt->execute([$characterId]);
            } else {
                $stmt = $this->db->prepare("DELETE FROM characters WHERE id = ? AND user_id = ?");
                $stmt->execute([$characterId, $userId]);
            }

            $this->db->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Character deleted successfully'
            ]);
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Create a new character (status: pending)
     * POST /api/characters/create
     */
    public function create() {
        header('Content-Type: application/json');
        
        // Verifier l'authentification
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $userId = $user['id'] ?? $user['userId'] ?? null;
        $username = $user['username'] ?? '';
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        // Lire les donnees de la requête
        $data = json_decode(file_get_contents('php://input'), true);
        
        $name = trim((string)($data['name'] ?? ''));

        // Validation
        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Character name is required']);
            return;
        }

        $nameLength = function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name);

        if ($nameLength < 3) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be at least 3 characters']);
            return;
        }

        if ($nameLength > 20) {
            http_response_code(400);
            echo json_encode(['error' => 'Name must be at most 20 characters']);
            return;
        }
        
        try {
            // Verifier si le nom existe deja
            $stmt = $this->db->prepare("SELECT id FROM characters WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Character name already exists']);
                return;
            }
            
            // Preparer les donnees du personnage
            $appearance = $data['appearance'] ?? [];

            $validationError = $this->validateAppearanceOptions($appearance);
            if ($validationError) {
                http_response_code(400);
                echo json_encode($validationError);
                return;
            }
            
            // Convertir le genre du frontend (M/F/O) au format BDD (male/female/other)
            $genderMap = ['M' => 'male', 'F' => 'female', 'O' => 'other'];
            $gender = isset($data['gender']) && isset($genderMap[$data['gender']]) 
                ? $genderMap[$data['gender']] 
                : 'other';
            
            // Inserer le personnage
            $sql = "INSERT INTO characters (
                user_id, name, gender, 
                body_type, body_color, hair_style, hair_color, eye_type, eye_color, mouth_type,
                head_clothing, top_clothing, legs_clothing, shoes_clothing,
                helmet, chestplate, leggings, boots, left_glove, right_glove,
                left_hand, right_hand,
                accessory_neck, accessory_finger, accessory_wrist, accessory_waist,
                status, created_at
            ) VALUES (
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                'pending', NOW()
            )";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $userId,
                $name,
                $gender,
                // Caracteristiques du corps
                $appearance['bodyType'] ?? 'human',
                $appearance['bodyColor'] ?? '#d4a574',
                $appearance['hairStyle'] ?? 'none',
                $appearance['hairColor'] ?? '#4a3728',
                $appearance['eyeType'] ?? 'none',
                $appearance['eyeColor'] ?? '#1e90ff',
                $appearance['mouthType'] ?? 'none',
                // Clothing
                $appearance['clothing']['head'] ?? 'none',
                $appearance['clothing']['top'] ?? 'none',
                $appearance['clothing']['legs'] ?? 'none',
                $appearance['clothing']['shoes'] ?? 'none',
                // Armor
                $appearance['armor']['helmet'] ?? 'none',
                $appearance['armor']['chestplate'] ?? 'none',
                $appearance['armor']['leggings'] ?? 'none',
                $appearance['armor']['boots'] ?? 'none',
                $appearance['armor']['leftGlove'] ?? 'none',
                $appearance['armor']['rightGlove'] ?? 'none',
                // Hands
                $appearance['hands']['left'] ?? 'none',
                $appearance['hands']['right'] ?? 'none',
                // Accessories
                $appearance['accessories']['slot1'] ?? 'none',
                $appearance['accessories']['slot2'] ?? 'none',
                $appearance['accessories']['slot3'] ?? 'none',
                $appearance['accessories']['slot4'] ?? 'none',
            ]);
            
            $characterId = $this->db->lastInsertId();
            
            // Creer une notification pour les admins/employés
            $this->createNotificationForModerators($characterId, $name, $username);
            
            // Enregistrer l'action
            $this->logAction($userId, 'character_created', 'character', $characterId);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Character created successfully! Pending approval.',
                'character' => [
                    'id' => $characterId,
                    'name' => $name,
                    'status' => 'pending'
                ]
            ]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Get characters for the authenticated user
     * GET /api/characters/my
     */
    public function getMyCharacters() {
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
                SELECT id, name, gender, status, rejection_reason, is_shared, is_published, published_at, created_at,
                       body_type, body_color, hair_style, hair_color, eye_type, eye_color, mouth_type,
                       head_clothing, top_clothing, legs_clothing, shoes_clothing,
                       helmet, chestplate, leggings, boots, left_glove, right_glove,
                       left_hand, right_hand,
                       accessory_neck, accessory_finger, accessory_wrist, accessory_waist
                FROM characters 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            ");
            $stmt->execute([$userId]);
            $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['characters' => $characters]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
        * Get all approved characters (public gallery)
     * GET /api/characters/approved
     */
    public function getApprovedCharacters() {
        header('Content-Type: application/json');
        
        try {
            $stmt = $this->db->prepare("
                SELECT c.id, c.name, c.gender, c.created_at, c.is_shared,
                       c.body_type, c.body_color, c.hair_style, c.hair_color,
                       u.username as creator
                FROM characters c
                JOIN users u ON c.user_id = u.id
                WHERE c.status = 'approved' AND c.is_shared = 1
                ORDER BY c.created_at DESC
            ");
            $stmt->execute();
            $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['characters' => $characters]);
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
        * Get all pending characters (admin/employee)
     * GET /api/characters/pending
     */
    public function getPendingCharacters() {
        header('Content-Type: application/json');

        $user = $this->requireStaff();
        if (!$user) {
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT c.id, c.name, c.gender, c.status, c.created_at, c.user_id, u.username AS creator,
                       c.body_type, c.body_color, c.hair_style, c.hair_color, c.eye_type, c.eye_color, c.mouth_type,
                       c.head_clothing, c.top_clothing, c.legs_clothing, c.shoes_clothing,
                       c.helmet, c.chestplate, c.leggings, c.boots, c.left_glove, c.right_glove,
                       c.left_hand, c.right_hand,
                       c.accessory_neck, c.accessory_finger, c.accessory_wrist, c.accessory_waist
                FROM characters c
                JOIN users u ON c.user_id = u.id
                WHERE c.status = 'pending'
                ORDER BY c.created_at DESC
            ");
            $stmt->execute();
            $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['characters' => $characters]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * Approve a character (admin/employee)
     * PUT /api/characters/:id/approve
     */
    public function approveCharacter($characterId) {
        header('Content-Type: application/json');

        $user = $this->requireStaff(true);
        if (!$user) {
            return;
        }

        try {
            $stmt = $this->db->prepare("SELECT id, user_id, name FROM characters WHERE id = ?");
            $stmt->execute([$characterId]);
            $character = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$character) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE characters SET status = 'approved', rejection_reason = NULL WHERE id = ?");
            $stmt->execute([$characterId]);

            $this->createNotificationForUser(
                $character['user_id'],
                'character_approved',
                'Character Approved',
                "Your character '{$character['name']}' has been approved.",
                'character',
                $characterId
            );

            $this->logAction($user['userId'] ?? $user['id'], 'character_approved', 'character', $characterId);

            echo json_encode(['success' => true, 'message' => 'Character approved']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * Reject a character with reason (admin/employee)
     * PUT /api/characters/:id/reject
     */
    public function rejectCharacter($characterId) {
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
            $stmt = $this->db->prepare("SELECT id, user_id, name FROM characters WHERE id = ?");
            $stmt->execute([$characterId]);
            $character = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$character) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }

            $stmt = $this->db->prepare("UPDATE characters SET status = 'rejected', rejection_reason = ? WHERE id = ?");
            $stmt->execute([$reason, $characterId]);

            $this->createNotificationForUser(
                $character['user_id'],
                'character_rejected',
                'Character Rejected',
                "Your character '{$character['name']}' was rejected. Reason: {$reason}",
                'character',
                $characterId
            );

            $this->logAction($user['userId'] ?? $user['id'], 'character_rejected', 'character', $characterId);

            echo json_encode(['success' => true, 'message' => 'Character rejected']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Create notifications for moderators
     */
    private function createNotificationForModerators($characterId, $characterName, $creatorUsername) {
        try {
            // Charger tous les admins et employés
            $stmt = $this->db->prepare("SELECT id FROM users WHERE role IN ('admin', 'employee')");
            $stmt->execute();
            $moderators = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $message = "New character '$characterName' created by $creatorUsername is waiting for approval.";
            
            $stmt = $this->db->prepare("
                INSERT INTO notifications (user_id, type, title, message, related_type, related_id, created_at)
                VALUES (?, 'system_message', 'New Character Pending Approval', ?, 'character', ?, NOW())
            ");
            
            foreach ($moderators as $mod) {
                $stmt->execute([$mod['id'], $message, $characterId]);
            }
            
        } catch (PDOException $e) {
            // Echec silencieux; les notifications ne sont pas critiques
            error_log("Failed to create notifications: " . $e->getMessage());
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
        * Publish an approved character
     * PUT /characters/:id/publish
     */
    public function publishCharacter($characterId) {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        $userId = $user['id'] ?? $user['userId'];
        
        try {
            // Vérifier que le personnage existe et appartient à l'utilisateur
            $stmt = $this->db->prepare("SELECT id, status, is_published FROM characters WHERE id = ? AND user_id = ?");
            $stmt->execute([$characterId, $userId]);
            $character = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$character) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }
            
            // Le personnage doit etre approuvé
            if ($character['status'] !== 'approved') {
                http_response_code(400);
                echo json_encode(['error' => 'Character must be approved before publishing']);
                return;
            }
            
            if ($character['is_published']) {
                http_response_code(400);
                echo json_encode(['error' => 'Character is already published']);
                return;
            }
            
            // Publish
            $stmt = $this->db->prepare("UPDATE characters SET is_published = 1, published_at = NOW() WHERE id = ?");
            $stmt->execute([$characterId]);
            
            http_response_code(200);
            echo json_encode(['message' => 'Character published successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
        * Remove a character from the gallery
     * PUT /characters/:id/unpublish
     */
    public function unpublishCharacter($characterId) {
        header('Content-Type: application/json');
        
        $user = AuthMiddleware::authenticate();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        $userId = $user['id'] ?? $user['userId'];
        
        try {
            // Vérifier que le personnage existe et appartient à l'utilisateur
            $stmt = $this->db->prepare("SELECT id, is_published FROM characters WHERE id = ? AND user_id = ?");
            $stmt->execute([$characterId, $userId]);
            $character = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$character) {
                http_response_code(404);
                echo json_encode(['error' => 'Character not found']);
                return;
            }
            
            if (!$character['is_published']) {
                http_response_code(400);
                echo json_encode(['error' => 'Character is not published']);
                return;
            }
            
            // Unpublish
            $stmt = $this->db->prepare("UPDATE characters SET is_published = 0, published_at = NULL WHERE id = ?");
            $stmt->execute([$characterId]);
            
            http_response_code(200);
            echo json_encode(['message' => 'Character unpublished successfully']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
        * Get published characters (public gallery)
     * GET /characters/published
     */
    public function getPublishedCharacters() {
        header('Content-Type: application/json');
        
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    c.id,
                    c.name,
                    c.gender,
                    c.body_type,
                    c.body_color,
                    c.hair_style,
                    c.hair_color,
                    c.eye_type,
                    c.eye_color,
                    c.mouth_type,
                    c.head_clothing,
                    c.top_clothing,
                    c.legs_clothing,
                    c.shoes_clothing,
                    c.helmet,
                    c.chestplate,
                    c.leggings,
                    c.boots,
                    c.left_glove,
                    c.right_glove,
                    c.left_hand,
                    c.right_hand,
                    c.accessory_neck,
                    c.accessory_finger,
                    c.accessory_wrist,
                    c.accessory_waist,
                    c.published_at,
                    c.created_at,
                    u.username as creator,
                    COALESCE(AVG(com.rating), 0) as average_rating,
                    COUNT(DISTINCT com.id) as comment_count
                FROM characters c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN comments com ON c.id = com.character_id AND com.status = 'approved'
                WHERE c.is_published = 1 AND c.status = 'approved'
                GROUP BY c.id
                ORDER BY c.published_at DESC
            ");
            $stmt->execute();
            $characters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['characters' => $characters]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
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
}

