<?php
/**
 * Générer des hashes Bcrypt pour les fixtures
 * Utiliser ce script pour générer des hashes sécurisés
 *
 * Exécution : php backend/scripts/generate_password_hashes.php
 */

echo "=== Générateur de hashes Bcrypt ===\n\n";

// Mots de passe de test
$testUsers = [
    ['email' => 'user1@example.com', 'username' => 'PlayerOne', 'password' => 'password123', 'role' => 'player'],
    ['email' => 'user2@example.com', 'username' => 'PlayerTwo', 'password' => 'password456', 'role' => 'player'],
    ['email' => 'employee1@example.com', 'username' => 'EmployeeOne', 'password' => 'employee789', 'role' => 'employee'],
    ['email' => 'admin1@example.com', 'username' => 'AdminOne', 'password' => 'admin999', 'role' => 'admin'],
];

$hashes = [];

foreach ($testUsers as $user) {
    $hash = password_hash($user['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    $hashes[] = [
        'email' => $user['email'],
        'username' => $user['username'],
        'password_plain' => $user['password'],
        'password_hash' => $hash,
        'role' => $user['role']
    ];
    
    printf("User: %s\n", $user['email']);
    printf("  Username: %s\n", $user['username']);
    printf("  Password (plain): %s\n", $user['password']);
    printf("  Password (hash): %s\n", $hash);
    printf("  Role: %s\n\n", $user['role']);
}

echo "\n=== SQL INSERT Statement ===\n\n";
echo "INSERT INTO `users` (`id`,`email`,`username`,`password`,`role`,`is_suspended`) VALUES\n";

foreach ($hashes as $i => $user) {
    $id = $i + 1;
    printf("(%d,'%s','%s','%s','%s',0)%s\n", 
        $id,
        $user['email'],
        $user['username'],
        $user['password_hash'],
        $user['role'],
        $i < count($hashes) - 1 ? ',' : ';'
    );
}

echo "\n=== Test Credentials ===\n\n";
echo "Pour te connecter, utilise l'un de ces comptes:\n\n";
foreach ($hashes as $user) {
    printf("Email: %s\nPassword: %s\n\n", $user['email'], $user['password_plain']);
}

