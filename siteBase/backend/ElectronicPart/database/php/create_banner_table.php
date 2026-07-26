<?php
/**
 * 创建横幅表的迁移脚本
 */

require_once __DIR__ . '/../vendor/autoload.php';

// 创建数据库连接
$config = [
    'default' => 'mysql',
    'connections' => [
        'mysql' => [
            'type' => 'mysql',
            'hostname' => '127.0.0.1',
            'database' => env('database.database', ''),
            'username' => 'root',
            'password' => '123456',
            'hostport' => '3306',
            'charset' => 'utf8mb4',
            'prefix' => '',
        ],
    ],
];

try {
    $pdo = new PDO(
        "mysql:host={$config['connections']['mysql']['hostname']};port={$config['connections']['mysql']['hostport']};dbname={$config['connections']['mysql']['database']};charset={$config['connections']['mysql']['charset']}",
        $config['connections']['mysql']['username'],
        $config['connections']['mysql']['password']
    );
    
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 读取SQL文件
    $sqlFile = __DIR__ . '/migrations/009_create_banners_table.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL file not found: $sqlFile");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // 执行SQL
    $pdo->exec($sql);
    
    echo "Banner table created successfully!\n";
    
} catch (Exception $e) {
    echo "Error creating banner table: " . $e->getMessage() . "\n";
}