-- step2: migrate dictionary data and product-spec values
-- 运行前: 已完成 step1（创建表与列）
-- 本步骤将插入品牌/类别/子类/规格定义, 并把 sk_product 的 brand/category/subcategory 映射到新增列,
-- 最后把旧的 sk_product_specification 的值迁移到 sk_product_spec

START TRANSACTION;

-- 1) 插入品牌（去重）
INSERT IGNORE INTO `sk_brand` (`name`)
SELECT DISTINCT `brand` FROM `sk_product` WHERE `brand` IS NOT NULL AND `brand` <> '';

-- 2) 插入类别（使用现有 category_id 字段作为 code）
INSERT IGNORE INTO `sk_category` (`code`, `name`)
SELECT DISTINCT `category_id` AS code, `category_id` AS name FROM `sk_product` WHERE `category_id` IS NOT NULL AND `category_id` <> '';

-- 3) 插入子类（以 sk_product.subcategory 填充）
INSERT IGNORE INTO `sk_subcategory` (`category_id`, `code`, `name`)
SELECT c.id AS category_id, sp.subcategory AS code, sp.subcategory AS name
FROM `sk_product` sp
JOIN `sk_category` c ON c.code = sp.category_id
WHERE sp.subcategory IS NOT NULL AND sp.subcategory <> '';

-- 4) 映射 sk_product 的 brand/category/subcategory 到新增列
UPDATE `sk_product` p
LEFT JOIN `sk_brand` b ON b.name = p.brand
LEFT JOIN `sk_category` c ON c.code = p.category_id
LEFT JOIN `sk_subcategory` s ON s.code = p.subcategory AND s.category_id = c.id
SET p.brand_id = b.id, p.category_fk_id = c.id, p.subcategory_fk_id = s.id;

-- 5) 插入规范化规格定义
INSERT IGNORE INTO `sk_specification_definition` (`name`)
SELECT DISTINCT `name` FROM `sk_product_specification` WHERE `name` IS NOT NULL AND `name` <> '';

-- 6) 把旧的规格值迁移到 sk_product_spec
INSERT INTO `sk_product_spec` (`product_id`, `spec_id`, `value`, `sort_order`, `created_at`)
SELECT sps.`product_id`, sd.id AS spec_id, sps.`value`, sps.`sort_order`, NOW()
FROM `sk_product_specification` sps
JOIN `sk_specification_definition` sd ON sd.name = sps.name;

COMMIT;

-- 验证建议（手动运行）:
-- SELECT COUNT(*) FROM sk_product_specification;
-- SELECT COUNT(*) FROM sk_product_spec;
-- SELECT product_id, brand, brand_id FROM sk_product WHERE brand_id IS NULL LIMIT 20;
