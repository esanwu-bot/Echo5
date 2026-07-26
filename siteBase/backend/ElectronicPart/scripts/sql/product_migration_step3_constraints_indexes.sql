-- step3: add foreign key constraints and performance indexes
-- 运行前: 已完成 step1 + step2 并且验证了列类型和 engine（两表必须都是 InnoDB，id 与 category_id 必须类型一致）

-- 请在执行前务必运行以下诊断并确认类型一致：
-- SHOW CREATE TABLE `sk_category`\G
-- SHOW CREATE TABLE `sk_subcategory`\G
-- SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('sk_category','sk_subcategory','sk_brand','sk_specification_definition','sk_product');

START TRANSACTION;

-- 1) 为 sk_subcategory 添加外键到 sk_category
ALTER TABLE `sk_subcategory`
  ADD CONSTRAINT `fk_sk_subcategory_sk_category` FOREIGN KEY (`category_id`) REFERENCES `sk_category`(`id`) ON DELETE CASCADE;

-- 2) 为 sk_product_spec 的 spec_id 添加 FK 引用（如果之前未添加）
ALTER TABLE `sk_product_spec`
  ADD CONSTRAINT `fk_sk_product_spec_specdef` FOREIGN KEY (`spec_id`) REFERENCES `sk_specification_definition`(`id`) ON DELETE CASCADE;

-- 3) 为 sk_product 添加外键引用 brand/category/subcategory（若需要）
ALTER TABLE `sk_product`
  ADD CONSTRAINT `fk_product_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brand`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_product_category` FOREIGN KEY (`category_fk_id`) REFERENCES `sk_category`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_product_subcategory` FOREIGN KEY (`subcategory_fk_id`) REFERENCES `sk_subcategory`(`id`) ON DELETE SET NULL;

-- 4) 为 sk_product_price_break 添加外键引用 sk_product(product_id)
ALTER TABLE `sk_product_price_break`
  ADD CONSTRAINT `fk_pricebreak_product` FOREIGN KEY (`product_id`) REFERENCES `sk_product`(`product_id`) ON DELETE CASCADE;

COMMIT;

-- 索引建议（可单独执行）
ALTER TABLE `sk_product_spec` ADD INDEX `idx_skps_product_specid` (`product_id`,`spec_id`);
ALTER TABLE `sk_product_price_break` ADD INDEX `idx_pricebreak_product_quantity` (`product_id`, `quantity`);
