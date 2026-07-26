<?php
/**
 * 产品模块数据迁移脚本 - Step 2
 * 
 * 功能:
 * 1. 将 sk_product.model_id 的关系反转为 sk_product_models.series_id
 * 2. 将 sk_product_attribute (product级) 的数据迁移到 sk_model_param_val (model级)
 * 
 * 执行: php scripts/sql/product_migration_step2_migrate_data.php
 * 安全: 可重复执行 (幂等)
 */

define('APP_PATH', dirname(__DIR__, 2) . '/');
require_once APP_PATH . 'vendor/autoload.php';

use think\facade\Db;
use think\facade\Log;

echo "=== 产品模块数据迁移 Step 2 ===\n\n";

try {
    // 初始化 ThinkPHP
    $app = new think\App();
    $app->initialize();
    $app->boot();

    Db::startTrans();

    // ================================================================
    // Step 2.1: SPU-SKU 层级修正 (series_id)
    // ================================================================
    echo "--- Step 2.1: SPU-SKU 层级修正 ---\n";

    // 检查 series_id 列是否存在
    $columns = Db::query("SHOW COLUMNS FROM `sk_product_models`");
    $columnNames = array_column($columns, 'Field');

    if (!in_array('series_id', $columnNames)) {
        echo "添加 series_id 列...\n";
        Db::execute("ALTER TABLE `sk_product_models` ADD COLUMN `series_id` INT(11) DEFAULT NULL COMMENT 'SPU/产品系列ID' AFTER `brand_id`");
        Db::execute("ALTER TABLE `sk_product_models` ADD INDEX `idx_series_id` (`series_id`)");
        echo "series_id 列添加成功\n";
    } else {
        echo "series_id 列已存在，跳过\n";
    }

    // 数据迁移: 将 product.model_id 反转为 model.series_id
    $updated = Db::execute("
        UPDATE `sk_product_models` m
        INNER JOIN `sk_product` p ON p.model_id = m.id
        SET m.series_id = p.id
        WHERE m.series_id IS NULL AND p.model_id IS NOT NULL
    ");
    echo "已更新 {$updated} 条型号的 series_id\n";

    // 处理没有关联 product 的型号 (自增 series_id 使用 id)
    $orphans = Db::execute("
        UPDATE `sk_product_models`
        SET series_id = id
        WHERE series_id IS NULL
    ");
    if ($orphans > 0) {
        echo "已为 {$orphans} 条无关联型号设置 series_id = id\n";
    }

    // ================================================================
    // Step 2.2: 迁移 sk_product_attribute -> sk_model_param_val
    // ================================================================
    echo "\n--- Step 2.2: 迁移产品属性到型号参数 ---\n";

    // 检查 sk_model_param_val 表是否存在
    $tables = Db::query("SHOW TABLES LIKE 'sk_model_param_val'");
    if (empty($tables)) {
        echo "sk_model_param_val 表不存在，请先执行 Step 1 SQL\n";
        Db::rollback();
        exit(1);
    }

    // 获取 product 到 model 的映射
    $productModelMap = Db::query("
        SELECT p.id as product_id, m.id as model_id
        FROM sk_product p
        INNER JOIN sk_product_models m ON p.model_id = m.id
        WHERE p.model_id IS NOT NULL
    ");

    if (!empty($productModelMap)) {
        $migrated = 0;
        $skipped = 0;

        foreach ($productModelMap as $map) {
            $productId = $map['product_id'];
            $modelId = $map['model_id'];

            // 检查是否已迁移
            $existing = Db::query(
                "SELECT COUNT(*) as cnt FROM sk_model_param_val WHERE model_id = ?",
                [$modelId]
            );
            if ($existing[0]['cnt'] > 0) {
                $skipped++;
                continue;
            }

            // 获取 product 级属性
            $attributes = Db::query("
                SELECT pa.attribute_id as param_id, pa.attribute_value as `value`, pa.numeric_value as value_numeric
                FROM sk_product_attribute pa
                WHERE pa.product_id = ?
            ", [$productId]);

            if (empty($attributes)) {
                continue;
            }

            $rows = [];
            foreach ($attributes as $attr) {
                if (empty($attr['param_id']) || empty($attr['value'])) {
                    continue;
                }
                $rows[] = [
                    'model_id' => $modelId,
                    'param_id' => $attr['param_id'],
                    'value' => $attr['value'],
                    'value_numeric' => $attr['value_numeric'] ?? null,
                ];
            }

            if (!empty($rows)) {
                Db::table('sk_model_param_val')->insertAll($rows);
                $migrated += count($rows);
            }
        }

        echo "已迁移 {$migrated} 条属性到型号参数 (跳过 {$skipped} 个已迁移型号)\n";
    } else {
        echo "没有找到 product-model 关联数据\n";
    }

    Db::commit();

    echo "\n=== 数据迁移完成 ===\n";

} catch (\Exception $e) {
    Db::rollback();
    echo "错误: " . $e->getMessage() . "\n";
    echo "位置: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}
