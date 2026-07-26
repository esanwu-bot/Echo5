-- migration_verification.sql
-- 运行前请在测试数据库中执行此 SQL 检查表/列类型与潜在不一致

-- 1) 验证表引擎
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('sk_category','sk_subcategory','sk_brand','sk_specification_definition','sk_product','sk_product_spec','sk_product_price_break');

-- 2) 显示 CREATE TABLE 以人工核对（逐个查看）
SHOW CREATE TABLE `sk_category`;
SHOW CREATE TABLE `sk_subcategory`;
SHOW CREATE TABLE `sk_brand`;
SHOW CREATE TABLE `sk_specification_definition`;
SHOW CREATE TABLE `sk_product`;
SHOW CREATE TABLE `sk_product_spec`;
SHOW CREATE TABLE `sk_product_price_break`;

-- 3) 栏位类型核对（简表）
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('sk_category','sk_subcategory','sk_brand','sk_specification_definition','sk_product','sk_product_spec','sk_product_price_break')
 ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 4) 查找 sk_product_spec 中引用的 spec_id 是否都存在于 sk_specification_definition
SELECT ps.spec_id, COUNT(*) AS cnt, SUM(CASE WHEN sd.id IS NULL THEN 1 ELSE 0 END) AS missing_def
  FROM sk_product_spec ps
  LEFT JOIN sk_specification_definition sd ON ps.spec_id = sd.id
 GROUP BY ps.spec_id
 HAVING missing_def > 0;

-- 5) 查找 sk_product.brand_id 在 sk_brand 中是否缺失
SELECT p.brand_id, COUNT(*) AS cnt
  FROM sk_product p
  LEFT JOIN sk_brand b ON p.brand_id = b.id
 WHERE p.brand_id IS NOT NULL AND b.id IS NULL
 GROUP BY p.brand_id;

-- 6) 确认 sk_product_spec.product_id 与 sk_product.id 的类型/值兼容性
-- 如果 sk_product_spec.product_id 为 varchar，而 sk_product.id 为 int，可检测是否存在非数字 product_id 或者不存在的引用
SELECT ps.product_id, COUNT(*) AS cnt
  FROM sk_product_spec ps
  LEFT JOIN sk_product p ON CAST(ps.product_id AS CHAR) = CAST(p.id AS CHAR)
 WHERE p.id IS NULL
 GROUP BY ps.product_id
 LIMIT 50;

-- 7) 检查 price_break 的 product_id 是否均可在 sk_product 中找到
SELECT pb.product_id, COUNT(*) AS cnt
  FROM sk_product_price_break pb
  LEFT JOIN sk_product p ON CAST(pb.product_id AS CHAR) = CAST(p.id AS CHAR)
 WHERE p.id IS NULL
 GROUP BY pb.product_id
 LIMIT 50;

-- 8) 建议：若要直接添加外键，请确保上述查询没有遗漏结果
