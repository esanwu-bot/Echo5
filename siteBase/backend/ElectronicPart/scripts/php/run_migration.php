<?php

// 加载ThinkPHP框架
require_once dirname(__DIR__) . '/vendor/autoload.php';

// 使用ThinkPHP的命名空间
use think\App;
use think\facade\Db;

// 初始化应用
$app = new App();

// 执行数据库迁移
try {
    // 开始事务
    Db::startTrans();
    
    echo "开始执行数据库迁移...\n";
    
    // 1) 确保sk_product表有必要的列
    echo "1. 扩展sk_product表...\n";
    Db::execute("ALTER TABLE `sk_product`
ADD COLUMN `model_id` INT UNSIGNED DEFAULT 0 COMMENT '型号ID' AFTER `brand_id`,
ADD COLUMN `product_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '产品编码' AFTER `id`,
ADD COLUMN `model_number` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '型号' AFTER `product_code`,
ADD COLUMN `sub_category` VARCHAR(50) DEFAULT NULL COMMENT '子分类' AFTER `category_id`,
ADD COLUMN `technical_type` VARCHAR(50) DEFAULT NULL COMMENT '技术类型' AFTER `sub_category`,
ADD COLUMN `value_range` VARCHAR(100) DEFAULT NULL COMMENT '参数范围(如阻值范围)' AFTER `technical_type`,
ADD COLUMN `operating_voltage` VARCHAR(50) DEFAULT NULL COMMENT '工作电压' AFTER `value_range`,
ADD COLUMN `operating_temperature` VARCHAR(50) DEFAULT NULL COMMENT '工作温度范围' AFTER `operating_voltage`,
ADD COLUMN `temperature_coefficient` VARCHAR(50) DEFAULT NULL COMMENT '温度系数' AFTER `operating_temperature`,
ADD COLUMN `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `min_stock`,
ADD COLUMN `in_transit_stock` INT DEFAULT 0 COMMENT '在途库存' AFTER `safety_stock`;");
    
    echo "sk_product表扩展完成\n";
    
    // 2) 确保sk_inventory表有必要的列
    echo "2. 扩展sk_inventory表...\n";
    Db::execute("ALTER TABLE `sk_inventory`
ADD COLUMN `supplier_id` INT UNSIGNED DEFAULT 0 COMMENT '供应商ID' AFTER `location_id`,
ADD COLUMN `in_transit_quantity` INT DEFAULT 0 COMMENT '在途数量' AFTER `quantity`,
ADD COLUMN `available_quantity` INT DEFAULT 0 COMMENT '可用数量' AFTER `in_transit_quantity`,
ADD COLUMN `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `available_quantity`;");
    
    echo "sk_inventory表扩展完成\n";
    
    // 3) 创建sk_suppliers表
    echo "3. 创建sk_suppliers表...\n";
    Db::execute("CREATE TABLE IF NOT EXISTS `sk_suppliers` (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
        `supplier_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '供应商编码',
        `name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '供应商名称',
        `contact_person` VARCHAR(50) DEFAULT NULL COMMENT '联系人',
        `contact_phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
        `contact_email` VARCHAR(100) DEFAULT NULL COMMENT '联系邮箱',
        `address` VARCHAR(255) DEFAULT NULL COMMENT '地址',
        `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_supplier_code` (`supplier_code`),
        KEY `idx_name` (`name`),
        KEY `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商表';");
    
    echo "sk_suppliers表创建完成\n";
    
    // 4) 创建sk_product_suppliers表
    echo "4. 创建sk_product_suppliers表...\n";
    Db::execute("CREATE TABLE IF NOT EXISTS `sk_product_suppliers` (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
        `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '产品ID',
        `supplier_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '供应商ID',
        `supplier_product_code` VARCHAR(100) DEFAULT NULL COMMENT '供应商产品编码',
        `min_order_quantity` INT DEFAULT 1 COMMENT '最小订购量',
        `lead_time` INT DEFAULT 0 COMMENT '交货周期(天)',
        `price_breaks` JSON DEFAULT NULL COMMENT '价格阶梯(JSON格式)',
        `is_primary` TINYINT DEFAULT 0 COMMENT '是否主要供应商：0-否，1-是',
        `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_product_supplier` (`product_id`, `supplier_id`),
        KEY `idx_product_id` (`product_id`),
        KEY `idx_supplier_id` (`supplier_id`),
        KEY `idx_is_primary` (`is_primary`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品供应商关联表';");
    
    echo "sk_product_suppliers表创建完成\n";
    
    // 5) 创建sk_product_models表
    echo "5. 创建sk_product_models表...\n";
    Db::execute("CREATE TABLE IF NOT EXISTS `sk_product_models` (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '型号ID',
        `model_code` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '型号编码',
        `model_name` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '型号名称',
        `category_id` INT UNSIGNED DEFAULT 0 COMMENT '分类ID',
        `brand_id` INT UNSIGNED DEFAULT 0 COMMENT '品牌ID',
        `series` VARCHAR(100) DEFAULT NULL COMMENT '系列',
        `package_type` VARCHAR(50) DEFAULT NULL COMMENT '封装类型',
        `technical_specs` JSON DEFAULT NULL COMMENT '技术规格(JSON格式)',
        `datasheet_url` VARCHAR(500) DEFAULT NULL COMMENT '数据手册链接',
        `description` TEXT DEFAULT NULL COMMENT '描述',
        `status` TINYINT DEFAULT 1 COMMENT '状态：0-停用，1-启用',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_model_code` (`model_code`),
        KEY `idx_category_id` (`category_id`),
        KEY `idx_brand_id` (`brand_id`),
        KEY `idx_series` (`series`),
        KEY `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品型号表';");
    
    echo "sk_product_models表创建完成\n";
    
    // 提交事务
    Db::commit();
    
    echo "数据库迁移执行成功！\n";
    
} catch (\Exception $e) {
    // 回滚事务
    Db::rollback();
    
    echo "数据库迁移执行失败：" . $e->getMessage() . "\n";
    exit(1);
}
