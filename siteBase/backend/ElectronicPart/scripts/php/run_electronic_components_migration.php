<?php
/**
 * 电子元件管理系统数据库迁移脚本
 * 使用ThinkPHP的数据库连接来执行SQL脚本
 */

// 加载ThinkPHP框架
require __DIR__ . '/../vendor/autoload.php';

// 初始化应用
$app = new think\App();
$app->initialize();

// 获取数据库连接
$db = think\facade\Db::connect();

echo "开始执行电子元件管理系统数据库迁移...\n";

// 读取SQL脚本内容
$sqlFile = __DIR__ . '/simple_migration.sql';
if (!file_exists($sqlFile)) {
    echo "错误：找不到SQL脚本文件 $sqlFile\n";
    exit(1);
}

$sqlContent = file_get_contents($sqlFile);

// 分割SQL语句，处理多个语句的情况
$sqlStatements = preg_split('/;\s*$/m', $sqlContent, -1, PREG_SPLIT_NO_EMPTY);

// 执行SQL语句
$successCount = 0;
$errorCount = 0;
$errors = [];

foreach ($sqlStatements as $statement) {
    $statement = trim($statement);
    if (empty($statement) || strtoupper(substr($statement, 0, 2)) == '--') {
        // 跳过空语句和注释
        continue;
    }

    try {
        $db->execute($statement);
        $successCount++;
        echo ".";
    } catch (Exception $e) {
        $errorCount++;
        $errors[] = [
            'statement' => $statement,
            'error' => $e->getMessage()
        ];
        echo "E";
    }
}

echo "\n\n迁移完成！\n";
echo "成功执行：$successCount 条语句\n";
echo "执行失败：$errorCount 条语句\n";

if (!empty($errors)) {
    echo "\n错误详情：\n";
    foreach ($errors as $index => $error) {
        echo "\n错误 " . ($index + 1) . ":\n";
        echo "语句：" . substr($error['statement'], 0, 100) . "...\n";
        echo "错误信息：" . $error['error'] . "\n";
    }
    exit(1);
} else {
    echo "\n数据库迁移成功！\n";
    exit(0);
}
