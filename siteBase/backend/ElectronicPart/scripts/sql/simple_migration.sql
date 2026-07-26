-- 简化版迁移脚本，兼容MySQL 5.7

-- 1) 确保sk_product表有必要的列
ALTER TABLE `sk_product` ADD COLUMN `model_id` INT UNSIGNED DEFAULT 0 COMMENT '型号ID' AFTER `brand_id`;
ALTER TABLE `sk_product` ADD COLUMN `product_code` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '产品编码' AFTER `id`;
ALTER TABLE `sk_product` ADD COLUMN `model_number` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '型号' AFTER `product_code`;
ALTER TABLE `sk_product` ADD COLUMN `sub_category` VARCHAR(50) DEFAULT NULL COMMENT '子分类' AFTER `category_id`;
ALTER TABLE `sk_product` ADD COLUMN `technical_type` VARCHAR(50) DEFAULT NULL COMMENT '技术类型' AFTER `sub_category`;
ALTER TABLE `sk_product` ADD COLUMN `value_range` VARCHAR(100) DEFAULT NULL COMMENT '参数范围(如阻值范围)' AFTER `technical_type`;
ALTER TABLE `sk_product` ADD COLUMN `operating_voltage` VARCHAR(50) DEFAULT NULL COMMENT '工作电压' AFTER `value_range`;
ALTER TABLE `sk_product` ADD COLUMN `operating_temperature` VARCHAR(50) DEFAULT NULL COMMENT '工作温度范围' AFTER `operating_voltage`;
ALTER TABLE `sk_product` ADD COLUMN `temperature_coefficient` VARCHAR(50) DEFAULT NULL COMMENT '温度系数' AFTER `operating_temperature`;
ALTER TABLE `sk_product` ADD COLUMN `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `brand_id`;
ALTER TABLE `sk_product` ADD COLUMN `in_transit_stock` INT DEFAULT 0 COMMENT '在途库存' AFTER `safety_stock`;

-- 2) 确保sk_inventory表有必要的列
ALTER TABLE `sk_inventory` ADD COLUMN `supplier_id` INT UNSIGNED DEFAULT 0 COMMENT '供应商ID' AFTER `id`;
ALTER TABLE `sk_inventory` ADD COLUMN `in_transit_quantity` INT DEFAULT 0 COMMENT '在途数量' AFTER `quantity`;
ALTER TABLE `sk_inventory` ADD COLUMN `available_quantity` INT DEFAULT 0 COMMENT '可用数量' AFTER `in_transit_quantity`;
ALTER TABLE `sk_inventory` ADD COLUMN `safety_stock` INT DEFAULT 0 COMMENT '安全库存' AFTER `available_quantity`;

