-- product_schema_migration_2025-11-12.sql
-- 说明: 本脚本在 MySQL (InnoDB, utf8mb4) 下运行，用于把现有的简单表结构
-- (sk_product, sk_product_specification, sk_product_price_break) 迁移到更规范的 ER 结构：
-- brand, category, subcategory, specification_definition, sk_product_spec (linking table), pricing enhancements
--
-- 使用步骤 (建议在开发/测试库先跑):
-- 1) 备份当前数据库
-- 2) 在事务中执行或按分步执行（我在脚本中尽量分步写明）
-- 3) 验证数据一致性
-- 4) 如无问题，可在生产数据库执行
--
-- 注意: 本脚本不会强制删除原始数据表；最后会提供 DROP/RENAME 建议（注释）以便手动确认。

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `sk_brand` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';

-- 2) 创建 category 和 subcategory
CREATE TABLE IF NOT EXISTS `sk_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL, -- 例如: MCU, Resistor
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品大类';

CREATE TABLE IF NOT EXISTS `sk_subcategory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subcategory_category` (`category_id`),
  CONSTRAINT `fk_sk_subcategory_sk_category` FOREIGN KEY (`category_id`) REFERENCES `sk_category`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品子类';

-- 3) 规范化规格定义（规格名称统一到此表）
CREATE TABLE IF NOT EXISTS `sk_specification_definition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spec_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='规格定义（规范化的规格名称与单位）';

-- 4) 新的产品-规格关联表（替代旧的 sk_product_specification）
CREATE TABLE IF NOT EXISTS `sk_product_spec` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL,
  `spec_id` int NOT NULL,
  `value` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sk_product_spec_product` (`product_id`),
  KEY `idx_sk_product_spec_spec` (`spec_id`),
  CONSTRAINT `fk_sk_product_spec_specdef` FOREIGN KEY (`spec_id`) REFERENCES `sk_specification_definition`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品与规格值关联表（引用规范化的规格定义）';

-- 5) 为价格区间补充货币/单位字段并添加外键到 sk_product
ALTER TABLE `sk_product_price_break`
  ADD COLUMN IF NOT EXISTS `currency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT '货币',
  ADD COLUMN IF NOT EXISTS `price_unit` varchar(50) DEFAULT 'Each' COMMENT '价格单位（例如 Each, per 1000）';

-- 为价格区间添加外键指向 sk_product(product_id)
ALTER TABLE `sk_product_price_break`
  ADD CONSTRAINT IF NOT EXISTS `fk_pricebreak_product` FOREIGN KEY (`product_id`) REFERENCES `sk_product`(`product_id`) ON DELETE CASCADE;

-- 6) 为 sk_product 添加 brand_id, category_id_fk, subcategory_id_fk 引用（保留原字段做兼容）
ALTER TABLE `sk_product`
  ADD COLUMN IF NOT EXISTS `brand_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `category_fk_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `subcategory_fk_id` int DEFAULT NULL;

ALTER TABLE `sk_product`
  ADD CONSTRAINT IF NOT EXISTS `fk_product_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brand`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_product_category` FOREIGN KEY (`category_fk_id`) REFERENCES `sk_category`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_product_subcategory` FOREIGN KEY (`subcategory_fk_id`) REFERENCES `sk_subcategory`(`id`) ON DELETE SET NULL;

-- 7) 数据迁移步骤（从现有表导入规范化表）
-- 7.1 插入 brand 列表（去重）
INSERT IGNORE INTO `sk_brand` (`name`)
SELECT DISTINCT `brand` FROM `sk_product` WHERE `brand` IS NOT NULL AND `brand` <> '';

-- 7.2 插入 category 列（使用现有 category_id 字段作为 code）
INSERT IGNORE INTO `sk_category` (`code`, `name`)
SELECT DISTINCT `category_id` AS code, `category_id` AS name FROM `sk_product` WHERE `category_id` IS NOT NULL AND `category_id` <> '';

-- 7.3 插入 subcategory（用 sk_product.subcategory 填充）
-- 先找到对应 category id
INSERT IGNORE INTO `sk_subcategory` (`category_id`, `code`, `name`)
SELECT c.id AS category_id, sp.subcategory AS code, sp.subcategory AS name
FROM `sk_product` sp
JOIN `sk_category` c ON c.code = sp.category_id
WHERE sp.subcategory IS NOT NULL AND sp.subcategory <> '';

-- 7.4 把 sk_product 的 brand/category/subcategory 映射到新的 FK 字段
UPDATE `sk_product` p
LEFT JOIN `sk_brand` b ON b.name = p.brand
LEFT JOIN `sk_category` c ON c.code = p.category_id
LEFT JOIN `sk_subcategory` s ON s.code = p.subcategory AND s.category_id = c.id
SET p.brand_id = b.id, p.category_fk_id = c.id, p.subcategory_fk_id = s.id;

-- 7.5 规范化规格定义并迁移现有规格值
-- 先把所有 distinct spec 名称插入规范化表
INSERT IGNORE INTO `sk_specification_definition` (`name`)
SELECT DISTINCT `name` FROM `sk_product_specification` WHERE `name` IS NOT NULL AND `name` <> '';

-- 然后将旧表的值迁移到 sk_product_spec
INSERT INTO `sk_product_spec` (`product_id`, `spec_id`, `value`, `sort_order`, `created_at`)
SELECT sps.`product_id`, sd.id AS spec_id, sps.`value`, sps.`sort_order`, NOW()
FROM `sk_product_specification` sps
JOIN `sk_specification_definition` sd ON sd.name = sps.name;

-- 8) 可选：保留原始表为备份（已保留，未删除）。如果确认可删除或重命名，请手动执行以下操作：
-- RENAME TABLE `sk_product_specification` TO `sk_product_specification_backup_20251112`;
-- 注意生产环境请先备份并确认。

COMMIT;

-- 索引与性能建议（可单独执行以避免长锁）
-- 建议：在 sk_product_spec 上添加复合索引以加速按 product_id 查询
ALTER TABLE `sk_product_spec` ADD INDEX `idx_skps_product_specid` (`product_id`,`spec_id`);

-- 建议：在 sk_product_price_break 上添加复合索引
ALTER TABLE `sk_product_price_break` ADD INDEX `idx_pricebreak_product_quantity` (`product_id`, `quantity`);

-- 结束脚本

-- 回滚建议（如果需要回滚，请按照下列步骤手动执行）:
-- 1) 删除迁移插入的记录（例如从 brand, category, subcategory, specification_definition, sk_product_spec），或从备份恢复。
-- 2) 如果对 sk_product 增加了 FK 字段并填充了值，可重置为 NULL 并删除列。
-- 3) 本项目推荐先在测试环境多次验证脚本再在生产环境运行。
