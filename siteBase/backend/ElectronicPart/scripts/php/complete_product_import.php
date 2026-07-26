<?php
/**
 * 完整的电子元器件产品数据导入脚本
 * 
 * 此脚本将：
 * 1. 运行数据库迁移创建表结构
 * 2. 将MockProduct.json数据插入到数据库中
 * 
 * 使用方法：
 * 在命令行中运行: php complete_product_import.php
 */

// 设置脚本执行时间和内存限制
ini_set('memory_limit', '512M');
set_time_limit(0);

echo "========================================\n";
echo "电子元器件产品数据导入脚本\n";
echo "========================================\n\n";

// 步骤1: 运行数据库迁移
echo "步骤1: 运行数据库迁移...\n";
echo "----------------------------------------\n";

chdir(__DIR__);

// 执行迁移命令
$migrationCommand = 'php run_sk_product_migration.php';
$migrationOutput = [];
$migrationReturnVar = 0;

exec($migrationCommand, $migrationOutput, $migrationReturnVar);

// 显示迁移输出
foreach ($migrationOutput as $line) {
    echo $line . "\n";
}

if ($migrationReturnVar !== 0) {
    echo "\n数据库迁移失败，停止执行。\n";
    exit(1);
}

echo "\n";

// 步骤2: 插入模拟数据
echo "步骤2: 插入模拟数据...\n";
echo "----------------------------------------\n";

$insertCommand = 'php insert_mock_products.php';
$insertOutput = [];
$insertReturnVar = 0;

exec($insertCommand, $insertOutput, $insertReturnVar);

// 显示插入输出
foreach ($insertOutput as $line) {
    echo $line . "\n";
}

if ($insertReturnVar !== 0) {
    echo "\n数据插入失败。\n";
    exit(1);
}

echo "\n========================================\n";
echo "所有步骤完成！电子元器件产品数据已成功导入。\n";
echo "========================================\n";