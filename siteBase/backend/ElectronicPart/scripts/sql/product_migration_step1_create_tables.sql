-- step1: create dictionary tables and add nullable FK columns (no foreign key constraints)
-- 执行顺序: 在执行本步骤前请先备份数据库
-- 目的: 创建品牌/类别/子类/规格定义表、产品-规格关联表, 并在 sk_product/sk_product_price_break 上新增必要列（但不添加外键约束）

START TRANSACTION;

-- 创建品牌表
CREATE TABLE IF NOT EXISTS `sk_brand` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';

-- 创建类别表
CREATE TABLE IF NOT EXISTS `sk_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品大类';

-- 创建子类表（先不加外键）
CREATE TABLE IF NOT EXISTS `sk_subcategory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subcategory_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品子类';

-- 创建规范化规格定义表
CREATE TABLE IF NOT EXISTS `sk_specification_definition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spec_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格定义（规范化的规格名称与单位）';

-- 创建产品-规格关联表
CREATE TABLE IF NOT EXISTS `sk_product_spec` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL,
  `spec_id` int NOT NULL,
  `value` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sk_product_spec_product` (`product_id`),
  KEY `idx_sk_product_spec_spec` (`spec_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品与规格值关联表（引用规范化的规格定义）';

-- 在 sk_product_price_break 上新增 currency 与 price_unit（如果不存在）
ALTER TABLE `sk_product_price_break`
  ADD COLUMN IF NOT EXISTS `currency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT '货币',
  ADD COLUMN IF NOT EXISTS `price_unit` varchar(50) DEFAULT 'Each' COMMENT '价格单位（例如 Each, per 1000）';

-- 在 sk_product 上新增 brand_id, category_fk_id, subcategory_fk_id（仅列，不添加 FK 约束）
ALTER TABLE `sk_product`
  ADD COLUMN IF NOT EXISTS `brand_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `category_fk_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `subcategory_fk_id` int DEFAULT NULL;

COMMIT;
-- End of step1