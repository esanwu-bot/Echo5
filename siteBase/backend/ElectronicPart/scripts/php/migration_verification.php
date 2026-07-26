<?php
// migration_verification.php
// Usage (PowerShell):
// $env:DB_DSN = 'mysql:host=127.0.0.1;dbname=your_db;charset=utf8mb4';
// $env:DB_USER = 'dbuser'; $env:DB_PASS = 'dbpass';
// php migration_verification.php

$dsn = getenv('DB_DSN');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

if (!$dsn || !$user) {
    echo "Please set environment variables DB_DSN, DB_USER and DB_PASS (if needed).\n";
    echo "Example (PowerShell):\n";
    echo "  $env:DB_DSN = 'mysql:host=127.0.0.1;dbname=semiconductor_db;charset=utf8mb4'\n";
    echo "  $env:DB_USER = 'root'\n";
    echo "  $env:DB_PASS = 'secret'\n";
    exit(1);
}

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Exception $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n";
    exit(2);
}

$queries = file_get_contents(__DIR__ . '/migration_verification.sql');

// Split on semicolon followed by newline to run individual statements when possible
$stmts = preg_split('/;\s*\n/', $queries);

foreach ($stmts as $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '' || strpos($stmt, '--') === 0) continue;
    echo "\n--- Running: " . substr($stmt,0,80) . (strlen($stmt)>80? '...': '') . "\n";
    try {
        $res = $pdo->query($stmt);
        if ($res === false) {
            echo "(no result)\n";
            continue;
        }
        $rows = $res->fetchAll(PDO::FETCH_ASSOC);
        if ($rows === false) {
            echo "(no rows)\n";
            continue;
        }
        // Print up to 50 rows
        $count = count($rows);
        echo "Rows: $count\n";
        $max = min(50, $count);
        for ($i=0;$i<$max;$i++) {
            print_r($rows[$i]);
        }
        if ($count > $max) echo "... (showing $max of $count)\n";
    } catch (Exception $e) {
        echo "Query failed: " . $e->getMessage() . "\n";
    }
}

echo "\nVerification script finished. Review outputs above for missing references or type mismatches.\n";
