-- 电子元件管理系统数据库扩展脚本
-- 创建时间: 2025-01-04

-- 1. 创建型号管理表
CREATE TABLE IF NOT EXISTS `sk_product_models` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `model_code` varchar(100) NOT NULL COMMENT '型号编码',
  `model_name` varchar(200) NOT NULL COMMENT '型号名称',
  `category_id` int(11) DEFAULT NULL COMMENT '分类ID',
  `brand_id` int(11) DEFAULT NULL COMMENT '品牌ID',
  `series` varchar(100) DEFAULT NULL COMMENT '系列',
  `package_type` varchar(50) DEFAULT NULL COMMENT '封装类型',
  `datasheet_url` varchar(500) DEFAULT NULL COMMENT '数据手册链接',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_code` (`model_code`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='型号管理表';

-- 2. 扩展sk_product表，添加model_id字段
ALTER TABLE `sk_product` ADD COLUMN `model_id` int(11) DEFAULT NULL COMMENT '型号ID' AFTER `product_id`;
ALTER TABLE `sk_product` ADD INDEX `idx_model_id` (`model_id`);

-- 3. 创建供应商表
CREATE TABLE IF NOT EXISTS `sk_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `supplier_code` varchar(50) NOT NULL COMMENT '供应商编码',
  `supplier_name` varchar(200) NOT NULL COMMENT '供应商名称',
  `contact_person` varchar(100) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(100) DEFAULT NULL COMMENT '联系邮箱',
  `address` varchar(500) DEFAULT NULL COMMENT '地址',
  `website` varchar(200) DEFAULT NULL COMMENT '网站',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_code` (`supplier_code`),
  KEY `idx_supplier_name` (`supplier_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

-- 4. 创建产品供应商关联表
CREATE TABLE IF NOT EXISTS `sk_product_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `product_id` varchar(100) NOT NULL COMMENT '产品ID',
  `supplier_id` int(11) NOT NULL COMMENT '供应商ID',
  `is_primary` tinyint(1) DEFAULT 0 COMMENT '是否主要供应商',
  `supplier_product_code` varchar(100) DEFAULT NULL COMMENT '供应商产品编码',
  `min_order_quantity` int(11) DEFAULT 1 COMMENT '最小起订量',
  `lead_time` varchar(50) DEFAULT NULL COMMENT '供货周期',
  `price` decimal(10,2) DEFAULT NULL COMMENT '价格',
  `currency` varchar(10) DEFAULT 'USD' COMMENT '货币',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_is_primary` (`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品供应商关联表';

-- 5. 创建库位表
CREATE TABLE IF NOT EXISTS `sk_storage_locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `location_code` varchar(50) NOT NULL COMMENT '库位编码',
  `location_name` varchar(200) NOT NULL COMMENT '库位名称',
  `warehouse_area` varchar(100) DEFAULT NULL COMMENT '仓库区域',
  `shelf` varchar(50) DEFAULT NULL COMMENT '货架',
  `position` varchar(50) DEFAULT NULL COMMENT '位置',
  `capacity` int(11) DEFAULT NULL COMMENT '容量',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`),
  KEY `idx_warehouse_area` (`warehouse_area`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库位表';

-- 6. 扩展inventory表，添加库位ID字段
ALTER TABLE `sk_inventory` ADD COLUMN `storage_location_id` int(11) DEFAULT NULL COMMENT '库位ID' AFTER `product_id`;
ALTER TABLE `sk_inventory` ADD INDEX `idx_storage_location_id` (`storage_location_id`);

-- 7. 扩展inventory表，添加安全库存和在途库存字段
ALTER TABLE `sk_inventory` ADD COLUMN `safety_stock` int(11) DEFAULT 0 COMMENT '安全库存' AFTER `quantity`;
ALTER TABLE `sk_inventory` ADD COLUMN `in_transit_stock` int(11) DEFAULT 0 COMMENT '在途库存' AFTER `safety_stock`;

-- 8. 创建品牌表
CREATE TABLE IF NOT EXISTS `sk_brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `brand_code` varchar(50) NOT NULL COMMENT '品牌编码',
  `brand_name` varchar(200) NOT NULL COMMENT '品牌名称',
  `brand_logo` varchar(500) DEFAULT NULL COMMENT '品牌Logo',
  `website` varchar(200) DEFAULT NULL COMMENT '官方网站',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_code` (`brand_code`),
  KEY `idx_brand_name` (`brand_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';

-- 9. 创建分类表
CREATE TABLE IF NOT EXISTS `sk_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category_code` varchar(50) NOT NULL COMMENT '分类编码',
  `category_name` varchar(200) NOT NULL COMMENT '分类名称',
  `parent_id` int(11) DEFAULT 0 COMMENT '父分类ID',
  `level` int(11) DEFAULT 1 COMMENT '层级',
  `sort_order` int(11) DEFAULT 0 COMMENT '排序',
  `description` text COMMENT '描述',
  `status` varchar(20) DEFAULT 'Active' COMMENT '状态',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

-- 10. 创建型号技术规格表
CREATE TABLE IF NOT EXISTS `sk_model_specifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `model_id` int(11) NOT NULL COMMENT '型号ID',
  `spec_name` varchar(100) NOT NULL COMMENT '规格名称',
  `spec_value` varchar(200) DEFAULT NULL COMMENT '规格值',
  `spec_unit` varchar(20) DEFAULT NULL COMMENT '规格单位',
  `sort_order` int(11) DEFAULT 0 COMMENT '排序',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_model_id` (`model_id`),
  KEY `idx_spec_name` (`spec_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='型号技术规格表';

-- 添加外键约束
ALTER TABLE `sk_product` ADD CONSTRAINT `fk_product_model` FOREIGN KEY (`model_id`) REFERENCES `sk_product_models` (`id`) ON DELETE SET NULL;
ALTER TABLE `sk_product_suppliers` ADD CONSTRAINT `fk_product_supplier_product` FOREIGN KEY (`product_id`) REFERENCES `sk_product` (`product_id`) ON DELETE CASCADE;
ALTER TABLE `sk_product_suppliers` ADD CONSTRAINT `fk_product_supplier_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `sk_suppliers` (`id`) ON DELETE CASCADE;
ALTER TABLE `sk_inventory` ADD CONSTRAINT `fk_inventory_storage_location` FOREIGN KEY (`storage_location_id`) REFERENCES `sk_storage_locations` (`id`) ON DELETE SET NULL;
ALTER TABLE `sk_product_models` ADD CONSTRAINT `fk_model_category` FOREIGN KEY (`category_id`) REFERENCES `sk_categories` (`id`) ON DELETE SET NULL;
ALTER TABLE `sk_product_models` ADD CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brands` (`id`) ON DELETE SET NULL;
ALTER TABLE `sk_model_specifications` ADD CONSTRAINT `fk_spec_model` FOREIGN KEY (`model_id`) REFERENCES `sk_product_models` (`id`) ON DELETE CASCADE;