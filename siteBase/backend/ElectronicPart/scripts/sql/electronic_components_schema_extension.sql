-- electronic_components_schema_extension.sql
-- 说明: 本脚本根据电子元件管理系统分析报告.md中的调整计划，
-- 扩展现有数据库结构，添加型号管理、供应商、产品供应商关联、库位等表
-- 以及扩展现有表结构

START TRANSACTION;

-- 1) 创建型号管理表
CREATE TABLE IF NOT EXISTS `sk_product_models` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品型号表';

-- 2) 创建供应商表
CREATE TABLE IF NOT EXISTS `sk_suppliers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供应商表';

-- 3) 创建产品供应商关联表
CREATE TABLE IF NOT EXISTS `sk_product_suppliers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品供应商关联表';

-- 4) 创建库位表
CREATE TABLE IF NOT EXISTS `sk_storage_locations` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '库位ID',
    `location_code` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '库位编码',
    `warehouse_id` INT UNSIGNED DEFAULT 0 COMMENT '仓库ID',
    `area` VARCHAR(50) DEFAULT NULL COMMENT '区域',
    `rack` VARCHAR(50) DEFAULT NULL COMMENT '货架',
    `level` VARCHAR(10) DEFAULT NULL COMMENT '层级',
    `position` VARCHAR(10) DEFAULT NULL COMMENT '位置',
    `capacity` INT DEFAULT 0 COMMENT '容量',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '描述',
    `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_location_code` (`location_code`),
    KEY `idx_warehouse_id` (`warehouse_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库位表';

-- 5) 扩展sk_product表
ALTER TABLE `sk_product`
ADD COLUMN IF NOT EXISTS `model_id` INT UNSIGNED DEFAULT 0 COMMENT '型号ID' AFTER `brand_id`,
ADD COLUMN IF NOT EXISTS `product_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '产品编码' AFTER `id`,
ADD COLUMN IF NOT EXISTS `model_number` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '型号' AFTER `product_code`,
ADD COLUMN IF NOT EXISTS `sub_category` VARCHAR(50) DEFAULT NULL COMMENT '子分类' AFTER `category_id`,
ADD COLUMN IF NOT EXISTS `technical_type` VARCHAR(50) DEFAULT NULL COMMENT '技术类型' AFTER `sub_category`,
ADD COLUMN IF NOT EXISTS `value_range` VARCHAR(100) DEFAULT NULL COMMENT '参数范围(如阻值范围)' AFTER `technical_type`,
ADD COLUMN IF NOT EXISTS `operating_voltage` VARCHAR(50) DEFAULT NULL COMMENT '工作电压' AFTER `value_range`,
ADD COLUMN IF NOT EXISTS `operating_temperature` VARCHAR(50) DEFAULT NULL COMMENT '工作温度范围' AFTER `operating_voltage`,
ADD COLUMN IF NOT EXISTS `temperature_coefficient` VARCHAR(50) DEFAULT NULL COMMENT '温度系数' AFTER `operating_temperature`,
ADD COLUMN IF NOT EXISTS `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `min_stock`,
ADD COLUMN IF NOT EXISTS `in_transit_stock` INT DEFAULT 0 COMMENT '在途库存' AFTER `safety_stock`,
ADD COLUMN IF NOT EXISTS `storage_location` VARCHAR(20) DEFAULT NULL COMMENT '库位' AFTER `in_transit_stock`,
ADD INDEX IF NOT EXISTS `idx_model_id` (`model_id`);

-- 6) 扩展inventory表
ALTER TABLE `inventory`
ADD COLUMN IF NOT EXISTS `supplier_id` INT UNSIGNED DEFAULT 0 COMMENT '供应商ID' AFTER `location_id`,
ADD COLUMN IF NOT EXISTS `in_transit_quantity` INT DEFAULT 0 COMMENT '在途数量' AFTER `quantity`,
ADD COLUMN IF NOT EXISTS `available_quantity` INT DEFAULT 0 COMMENT '可用数量' AFTER `in_transit_quantity`,
ADD COLUMN IF NOT EXISTS `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `available_quantity`,
ADD INDEX IF NOT EXISTS `idx_supplier_id` (`supplier_id`);

-- 添加外键约束
-- 先删除可能存在的外键约束，然后添加新的约束

-- 为sk_product添加外键约束
ALTER TABLE `sk_product` DROP FOREIGN KEY IF EXISTS `fk_product_model`;
ALTER TABLE `sk_product` ADD CONSTRAINT `fk_product_model` FOREIGN KEY (`model_id`) REFERENCES `sk_product_models`(`id`) ON DELETE SET NULL;

-- 为sk_product_suppliers添加外键约束
ALTER TABLE `sk_product_suppliers` DROP FOREIGN KEY IF EXISTS `fk_product_supplier_product`;
ALTER TABLE `sk_product_suppliers` DROP FOREIGN KEY IF EXISTS `fk_product_supplier_supplier`;
ALTER TABLE `sk_product_suppliers` ADD CONSTRAINT `fk_product_supplier_product` FOREIGN KEY (`product_id`) REFERENCES `sk_product`(`id`) ON DELETE CASCADE;
ALTER TABLE `sk_product_suppliers` ADD CONSTRAINT `fk_product_supplier_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `sk_suppliers`(`id`) ON DELETE CASCADE;

-- 为inventory添加外键约束
ALTER TABLE `inventory` DROP FOREIGN KEY IF EXISTS `fk_inventory_supplier`;
ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `sk_suppliers`(`id`) ON DELETE SET NULL;

-- 为sk_product_models添加外键约束
ALTER TABLE `sk_product_models` DROP FOREIGN KEY IF EXISTS `fk_model_category`;
ALTER TABLE `sk_product_models` DROP FOREIGN KEY IF EXISTS `fk_model_brand`;
ALTER TABLE `sk_product_models` ADD CONSTRAINT `fk_model_category` FOREIGN KEY (`category_id`) REFERENCES `sk_category`(`id`) ON DELETE SET NULL;
ALTER TABLE `sk_product_models` ADD CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brand`(`id`) ON DELETE SET NULL;

COMMIT;

-- 索引与性能建议
-- 建议：在sk_product上添加复合索引以加速按型号查询
ALTER TABLE `sk_product` ADD INDEX IF NOT EXISTS `idx_skp_model_code` (`product_code`,`model_number`);

-- 建议：在inventory上添加复合索引以加速按产品和库位查询
ALTER TABLE `inventory` ADD INDEX IF NOT EXISTS `idx_inv_product_location` (`product_id`,`location_id`);
