<?php
// Service MongoDB pour la journalisation des activités

// Charger l'autoloader Composer pour la bibliothèque MongoDB
$autoloaderPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloaderPath)) {
    require_once $autoloaderPath;
}

class MongoDBService {
    private $connection;
    private $database;
    private $available = false;
    
    public function __construct() {
        // URI MongoDB depuis env ou defaut local
        $uri = getenv('MONGODB_URI') ?: 'mongodb://127.0.0.1:27017';
        $dbName = 'fantasy_realm_logs';

        if (!class_exists('MongoDB\Client')) {
            throw new RuntimeException('MongoDB PHP library is required (MongoDB\\Client class not found)');
        }

        try {
            $this->connection = new MongoDB\Client($uri);
            $this->database = $this->connection->selectDatabase($dbName);
            $this->database->command(['ping' => 1]);
            $this->available = true;
        } catch (Throwable $e) {
            error_log('MongoDB Connection Error: ' . $e->getMessage());
            throw new RuntimeException('MongoDB is required for this application', 0, $e);
        }
    }
    
    // Enregistrer les actions de l'utilisateur dans MongoDB
    public function logAction($userId, $action, $targetType, $targetId, $details = []) {
        if (!$this->available || !$this->database) {
            return false;
        }

        try {
            $collection = $this->database->selectCollection('activity_logs');
            
            $logEntry = [
                'user_id' => (int)$userId,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => (int)$targetId,
                'timestamp' => new MongoDB\BSON\UTCDateTime(time() * 1000),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
                'ip_address' => $this->getClientIP(),
                'details' => $details
            ];
            
            $result = $collection->insertOne($logEntry);
            
            return $result->getInsertedId() !== null;
            
        } catch (Exception $e) {
            error_log("MongoDB Log Error: " . $e->getMessage());
            return false;
        }
    }
    
    // Charger les journaux d'activité avec filtrage et pagination
    public function getActivityLogs($filters = [], $limit = 50, $skip = 0, $sort = ['timestamp' => -1]) {
        if (!$this->available || !$this->database) {
            return [];
        }

        try {
            $collection = $this->database->selectCollection('activity_logs');
            
            // Construire la requête de filtres MongoDB
            $mongoFilters = [];
            
            if (!empty($filters['user_id'])) {
                $mongoFilters['user_id'] = (int)$filters['user_id'];
            }
            
            if (!empty($filters['action'])) {
                $mongoFilters['action'] = $filters['action'];
            }
            
            if (!empty($filters['target_type'])) {
                $mongoFilters['target_type'] = $filters['target_type'];
            }
            
            // Filtre de plage de dates (from_date à to_date)
            if (!empty($filters['from_date']) || !empty($filters['to_date'])) {
                $dateFilter = [];
                
                if (!empty($filters['from_date'])) {
                    $dateFilter['$gte'] = new MongoDB\BSON\UTCDateTime(strtotime($filters['from_date']) * 1000);
                }
                
                if (!empty($filters['to_date'])) {
                    $dateFilter['$lte'] = new MongoDB\BSON\UTCDateTime((strtotime($filters['to_date']) + 86400) * 1000);
                }
                
                $mongoFilters['timestamp'] = $dateFilter;
            }
            
            $options = [
                'limit' => (int)$limit,
                'skip' => (int)$skip,
                'sort' => $sort
            ];
            
            $cursor = $collection->find($mongoFilters, $options);
            $logs = [];
            
            foreach ($cursor as $document) {
                // Convertir le document BSON en tabl ean PHP
                $logArray = json_decode(json_encode($document->bsonSerialize()), true);
                
                // Convertir ObjectId en chaîne
                if (isset($logArray['_id'])) {
                    $logArray['_id'] = (string)$document['_id'];
                }
                
                // Convertir le timestamp en format lisible humain
                if (isset($document['timestamp'])) {
                    $logArray['timestamp'] = date('Y-m-d H:i:s', $document['timestamp']->toDateTime()->getTimestamp());
                }
                
                $logs[] = $logArray;
            }
            
            return $logs;
            
        } catch (Exception $e) {
            error_log("MongoDB Query Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Obtenir les statistiques d'activité pour le tableau de bord admin
     * 
     * @param string $period Time period ('day', 'week', 'month')
     * @return array Statistics data
     */
    public function getActivityStats($period = 'day') {
        if (!$this->available || !$this->database) {
            return [];
        }

        try {
            $collection = $this->database->selectCollection('activity_logs');
            
            // Calculer la plage de dates pour le filtre
            switch ($period) {
                case 'week':
                    $fromDate = time() - (7 * 86400);
                    break;
                case 'month':
                    $fromDate = time() - (30 * 86400);
                    break;
                case 'day':
                default:
                    $fromDate = time() - 86400;
            }
            
            // Pipeline d'agrégation MongoDB
            $pipeline = [
                [
                    '$match' => [
                        'timestamp' => [
                            '$gte' => new MongoDB\BSON\UTCDateTime($fromDate * 1000)
                        ]
                    ]
                ],
                [
                    '$group' => [
                        '_id' => '$action',
                        'count' => ['$sum' => 1],
                        'users' => ['$addToSet' => '$user_id']
                    ]
                ],
                [
                    '$sort' => ['count' => -1]
                ]
            ];
            
            $stats = [];
            $cursor = $collection->aggregate($pipeline);
            
            foreach ($cursor as $document) {
                $stat = $document->bsonSerialize();
                $stats[] = [
                    'action' => $stat['_id'],
                    'count' => $stat['count'],
                    'unique_users' => count(array_unique($stat['users']))
                ];
            }
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("MongoDB Stats Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Enregistrer la création/modification d'un personnage
     * 
     * @param int $userId User creating the character
     * @param int $characterId Character ID
     * @param string $characterName Character name
     * @param string $action 'create', 'modify', 'share', 'unshare', 'delete'
     */
    public function logCharacterAction($userId, $characterId, $characterName, $action) {
        return $this->logAction(
            $userId,
            'character_' . $action,
            'character',
            $characterId,
            ['character_name' => $characterName]
        );
    }
    
    /**
     * Enregistrer une action de modération de commentaire
     * 
     * @param int $userId Admin/employee performing action
     * @param int $commentId Comment ID
     * @param string $action 'approved', 'rejected', 'deleted'
     */
    public function logCommentModeration($userId, $commentId, $action) {
        return $this->logAction(
            $userId,
            'comment_' . $action,
            'comment',
            $commentId,
            ['authorized_user' => true]
        );
    }
    
    /**
     * Enregistrer une action sur le compte utilisateur
     * 
     * @param int $userId User ID
     * @param string $action 'login', 'logout', 'suspended', 'deleted'
     */
    public function logUserAction($userId, $action) {
        return $this->logAction(
            $userId,
            'user_' . $action,
            'user',
            $userId,
            []
        );
    }
    
    /**
     * Supprimer les anciens logs (politique de conservation des données)
     * Conserver les logs pendant au maximum 1 an
     * 
     * @param int $daysToKeep Number of days to retain
     * @return int Number of deleted documents
     */
    public function deleteOldLogs($daysToKeep = 365) {
        try {
            $collection = $this->database->selectCollection('activity_logs');
            
            $cutoffDate = new MongoDB\BSON\UTCDateTime((time() - ($daysToKeep * 86400)) * 1000);
            
            $result = $collection->deleteMany([
                'timestamp' => ['$lt' => $cutoffDate]
            ]);
            
            return $result->getDeletedCount();
            
        } catch (Exception $e) {
            error_log("MongoDB Delete Error: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Obtenir l'adresse IP du client
     * Gère les scénarios avec proxy
     * 
     * @return string Client IP
     */
    private function getClientIP() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // Gérer plusieurs IPs (chaîne de proxy)
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        } else {
            return $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        }
    }
    
    /**
     * Créer des index pour de meilleures performances de requête
     * À appeler une fois lors de l'installation/configuration
     */
    public function createIndexes() {
        try {
            $collection = $this->database->selectCollection('activity_logs');
            
            // Créer des index pour les champs fréquemment interrogés
            $collection->createIndex(['user_id' => 1, 'timestamp' => -1]);
            $collection->createIndex(['action' => 1]);
            $collection->createIndex(['target_type' => 1, 'target_id' => 1]);
            $collection->createIndex(['timestamp' => 1], ['expireAfterSeconds' => (365 * 86400)]);
            
            return true;
            
        } catch (Exception $e) {
            error_log("MongoDB Index Error: " . $e->getMessage());
            return false;
        }
    }
}
?>

