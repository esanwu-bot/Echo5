<?php
/**
 * 产品表结构更新脚本
 * 根据产品管理修改方案添加缺失字段
 */

require __DIR__ . '/../vendor/autoload.php';

$config = [
    'hostname' => '47.119.22.120',
    'database' => 'semiconductor_db',
    'username' => 'semiconductor_db',
    'password' => 'mLWHWwREKJRZmX2Y',
    'hostport' => '3306'
];

try {
    $pdo = new PDO(
        "mysql:host={$config['hostname']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "开始更新产品表结构...\n\n";
    
    // 检查表是否存在
    $tableExists = $pdo->query("SHOW TABLES LIKE 'sk_product'")->fetch();
    if (!$tableExists) {
        echo "错误：sk_product 表不存在\n";
        exit(1);
    }
    
    // 获取现有字段
    $existingColumns = [];
    $columns = $pdo->query("SHOW COLUMNS FROM sk_product")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        $existingColumns[] = $col['Field'];
    }
    
    echo "当前表字段：" . implode(', ', $existingColumns) . "\n\n";
    
    // 定义需要添加的字段
    $fieldsToAdd = [
        ['name' => 'is_new', 'sql' => "ADD COLUMN `is_new` TINYINT DEFAULT 0 COMMENT '是否新品：0=否，1=是' AFTER `status`"],
        ['name' => 'html_url', 'sql' => "ADD COLUMN `html_url` VARCHAR(255) DEFAULT NULL COMMENT 'HTML链接' AFTER `datasheet_url`"],
        ['name' => 'subcategory', 'sql' => "ADD COLUMN `subcategory` VARCHAR(100) DEFAULT NULL COMMENT '子分类' AFTER `category_id`"],
        ['name' => 'rating', 'sql' => "ADD COLUMN `rating` VARCHAR(50) DEFAULT 'Catalog' COMMENT '等级：Automotive/Catalog等' AFTER `subcategory`"],
        ['name' => 'temperature_range', 'sql' => "ADD COLUMN `temperature_range` VARCHAR(50) DEFAULT NULL COMMENT '工作温度范围（摄氏度）' AFTER `rating`"],
        ['name' => 'safety_category', 'sql' => "ADD COLUMN `safety_category` VARCHAR(50) DEFAULT '/' COMMENT '功能安全类别' AFTER `temperature_range`"],
        ['name' => 'pin_count', 'sql' => "ADD COLUMN `pin_count` INT DEFAULT 0 COMMENT '引脚数量' AFTER `package_type`"],
        ['name' => 'stock', 'sql' => "ADD COLUMN `stock` INT DEFAULT 0 COMMENT '库存数量' AFTER `pin_count`"],
        ['name' => 'normally_stocked', 'sql' => "ADD COLUMN `normally_stocked` TINYINT DEFAULT 0 COMMENT '常备库存：0=否，1=是' AFTER `stock`"],
        ['name' => 'rohs_compliant', 'sql' => "ADD COLUMN `rohs_compliant` TINYINT DEFAULT 0 COMMENT 'RoHS合规：0=否，1=是' AFTER `normally_stocked`"]
    ];
    
    // 添加缺失字段
    $addedCount = 0;
    $skippedCount = 0;
    
    foreach ($fieldsToAdd as $field) {
        if (in_array($field['name'], $existingColumns)) {
            echo "跳过：字段 {$field['name']} 已存在\n";
            $skippedCount++;
            continue;
        }
        
        try {
            $pdo->exec("ALTER TABLE `sk_product` {$field['sql']}");
            echo "✓ 添加字段：{$field['name']}\n";
            $addedCount++;
        } catch (PDOException $e) {
            echo "✗ 添加字段 {$field['name']} 失败：{$e->getMessage()}\n";
        }
    }
    
    echo "\n";
    
    // 添加索引
    echo "添加索引...\n";
    $indexes = [
        ['name' => 'idx_subcategory', 'sql' => "ADD INDEX `idx_subcategory` (`subcategory`)"],
        ['name' => 'idx_rating', 'sql' => "ADD INDEX `idx_rating` (`rating`)"],
        ['name' => 'idx_is_new', 'sql' => "ADD INDEX `idx_is_new` (`is_new`)"],
        ['name' => 'idx_stock', 'sql' => "ADD INDEX `idx_stock` (`stock`)"],
        ['name' => 'idx_normally_stocked', 'sql' => "ADD INDEX `idx_normally_stocked` (`normally_stocked`)"],
        ['name' => 'idx_rohs_compliant', 'sql' => "ADD INDEX `idx_rohs_compliant` (`rohs_compliant`)"]
    ];
    
    // 检查现有索引
    $existingIndexes = [];
    $indexResult = $pdo->query("SHOW INDEX FROM sk_product")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($indexResult as $idx) {
        $existingIndexes[] = $idx['Key_name'];
    }
    
    $indexAddedCount = 0;
    foreach ($indexes as $index) {
        if (in_array($index['name'], $existingIndexes)) {
            echo "跳过：索引 {$index['name']} 已存在\n";
            continue;
        }
        
        try {
            $pdo->exec("ALTER TABLE `sk_product` {$index['sql']}");
            echo "✓ 添加索引：{$index['name']}\n";
            $indexAddedCount++;
        } catch (PDOException $e) {
            echo "✗ 添加索引 {$index['name']} 失败：{$e->getMessage()}\n";
        }
    }
    
    echo "\n";
    echo "========================================\n";
    echo "更新完成！\n";
    echo "添加字段：{$addedCount} 个\n";
    echo "跳过字段：{$skippedCount} 个\n";
    echo "添加索引：{$indexAddedCount} 个\n";
    echo "========================================\n";
    
} catch (PDOException $e) {
    echo "错误：" . $e->getMessage() . "\n";
    exit(1);
}
