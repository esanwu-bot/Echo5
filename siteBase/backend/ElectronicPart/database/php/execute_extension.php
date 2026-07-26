<?php
/**
 * 电子元件管理系统数据库扩展执行脚本
 * 直接执行SQL文件来创建所需的表结构
 */

// 数据库配置
define('DB_HOST', '47.119.22.120');
define('DB_NAME', 'semiconductor_db');
define('DB_USER', 'semiconductor_db');
define('DB_PASS', 'mLWHWwREKJRZmX2Y');
define('DB_PORT', '3306');
define('DB_CHARSET', 'utf8mb4');

try {
    // 连接数据库
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
    ]);
    
    echo "数据库连接成功！\n";
    
    // 读取SQL文件内容
    $sqlFile = __DIR__ . '/electronic_components_extension.sql';
    if (!file_exists($sqlFile)) {
        die("SQL文件不存在: " . $sqlFile . "\n");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // 分割SQL语句
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    // 执行每个SQL语句
    $successCount = 0;
    $errorCount = 0;
    
    foreach ($statements as $statement) {
        if (empty($statement)) continue;
        
        try {
            $pdo->exec($statement);
            echo "执行成功: " . substr($statement, 0, 50) . "...\n";
            $successCount++;
        } catch (PDOException $e) {
            echo "执行失败: " . $e->getMessage() . "\n";
            echo "SQL语句: " . $statement . "\n";
            $errorCount++;
        }
    }
    
    echo "\n执行完成！\n";
    echo "成功执行: {$successCount} 条语句\n";
    echo "执行失败: {$errorCount} 条语句\n";
    
} catch (PDOException $e) {
    die("数据库连接失败: " . $e->getMessage() . "\n");
}
?>