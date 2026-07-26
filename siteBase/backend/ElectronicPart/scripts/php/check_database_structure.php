<?php
/**
 * 检查数据库表结构的脚本
 */

// 加载ThinkPHP框架
require __DIR__ . '/../vendor/autoload.php';

// 初始化应用
$app = new think\App();
$app->initialize();

// 获取数据库连接
$db = think\facade\Db::connect();

// 获取所有表名
$tables = $db->getTables();

echo "数据库中的表：\n";
foreach ($tables as $table) {
    echo "- $table\n";
}

// 检查sk_product表的结构
echo "\nsk_product表结构：\n";
$productColumns = $db->getColumns('sk_product');
foreach ($productColumns as $column) {
    echo "- {$column['name']} ({$column['type']})\n";
}

// 检查sk_product_models表的结构
echo "\nsk_product_models表结构：\n";
if (in_array('sk_product_models', $tables)) {
    $modelColumns = $db->getColumns('sk_product_models');
    foreach ($modelColumns as $column) {
        echo "- {$column['name']} ({$column['type']})\n";
    }
}

// 检查sk_suppliers表的结构
echo "\nsk_suppliers表结构：\n";
if (in_array('sk_suppliers', $tables)) {
    $supplierColumns = $db->getColumns('sk_suppliers');
    foreach ($supplierColumns as $column) {
        echo "- {$column['name']} ({$column['type']})\n";
    }
}

// 检查sk_product_suppliers表的结构
echo "\nsk_product_suppliers表结构：\n";
if (in_array('sk_product_suppliers', $tables)) {
    $productSupplierColumns = $db->getColumns('sk_product_suppliers');
    foreach ($productSupplierColumns as $column) {
        echo "- {$column['name']} ({$column['type']})\n";
    }
}

// 检查库存相关表
echo "\n库存相关表：\n";
$inventoryTables = array_filter($tables, function($table) {
    return strpos($table, 'inventory') !== false || strpos($table, 'stock') !== false;
});
foreach ($inventoryTables as $table) {
    echo "\n$table表结构：\n";
    $columns = $db->getColumns($table);
    foreach ($columns as $column) {
        echo "- {$column['name']} ({$column['type']})\n";
    }
}
