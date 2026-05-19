<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=fantasy_realm;charset=utf8mb4', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== CHECKING PUBLISHED CHARACTERS ===\n";
    $stmt = $pdo->query('SELECT id, name, is_published, published_at, status, user_id FROM characters ORDER BY id DESC LIMIT 10');
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($results as $row) {
        echo "ID: " . $row['id'] . " | Name: " . $row['name'] . " | Published: " . $row['is_published'] . " | Date: " . ($row['published_at'] ?? 'NULL') . " | Status: " . $row['status'] . "\n";
    }
    
    echo "\n=== COUNT BY STATUS ===\n";
    $stmt = $pdo->query('SELECT COUNT(*) as count, is_published FROM characters GROUP BY is_published');
    $counts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($counts as $row) {
        echo "Published: " . $row['is_published'] . " | Count: " . $row['count'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>

