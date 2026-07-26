-- ============================================================
-- 业务模块多语言架构迁移脚本
-- 日期: 2026-06-18
-- 说明:
--   1. 扩展 sk_translation 表，支持业务词条 (business_id + field)
--   2. 将 sk_product / sk_brands / sk_category 中 DEPRECATED 多语言字段
--      迁移至 sk_translation 表（is_auto=0 表示人工录入）
--   3. 删除业务表中的 DEPRECATED 字段
--   4. sk_product_models 无 DEPRECATED 字段，无需迁移已有数据
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- -----------------------------------------------------------
-- 1. 扩展 sk_translation 表结构
-- -----------------------------------------------------------
ALTER TABLE `sk_translation`
  ADD COLUMN `business_id` INT UNSIGNED DEFAULT NULL COMMENT '业务ID' AFTER `module`,
  ADD COLUMN `field` VARCHAR(50) DEFAULT NULL COMMENT '字段名(name/description/features等)' AFTER `business_id`,
  ADD COLUMN `is_auto` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否自动翻译: 0=人工录入, 1=机器翻译' AFTER `field`,
  ADD COLUMN `source_lang` VARCHAR(10) NOT NULL DEFAULT 'zh-CN' COMMENT '源语言代码' AFTER `is_auto`,
  ADD INDEX `idx_module_business_field` (`module`, `business_id`, `field`),
  ADD INDEX `idx_module_business` (`module`, `business_id`);

-- -----------------------------------------------------------
-- 2. 迁移 sk_product 的 DEPRECATED 多语言数据
-- -----------------------------------------------------------

-- 2.1 product.name 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('product:name:', `id`), `name_en`, 'product', `id`, 'name', 0, 'zh-CN'
FROM `sk_product` WHERE `name_en` IS NOT NULL AND TRIM(`name_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('product:name:', `id`), `name_ja`, 'product', `id`, 'name', 0, 'zh-CN'
FROM `sk_product` WHERE `name_ja` IS NOT NULL AND TRIM(`name_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('product:name:', `id`), `name_ko`, 'product', `id`, 'name', 0, 'zh-CN'
FROM `sk_product` WHERE `name_ko` IS NOT NULL AND TRIM(`name_ko`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'zh-Hant', CONCAT('product:name:', `id`), `name_zh_hant`, 'product', `id`, 'name', 0, 'zh-CN'
FROM `sk_product` WHERE `name_zh_hant` IS NOT NULL AND TRIM(`name_zh_hant`) != '';

-- 2.2 product.description 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('product:description:', `id`), `description_en`, 'product', `id`, 'description', 0, 'zh-CN'
FROM `sk_product` WHERE `description_en` IS NOT NULL AND TRIM(`description_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('product:description:', `id`), `description_ja`, 'product', `id`, 'description', 0, 'zh-CN'
FROM `sk_product` WHERE `description_ja` IS NOT NULL AND TRIM(`description_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('product:description:', `id`), `description_ko`, 'product', `id`, 'description', 0, 'zh-CN'
FROM `sk_product` WHERE `description_ko` IS NOT NULL AND TRIM(`description_ko`) != '';

-- 2.3 product.features 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('product:features:', `id`), `features_en`, 'product', `id`, 'features', 0, 'zh-CN'
FROM `sk_product` WHERE `features_en` IS NOT NULL AND TRIM(`features_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('product:features:', `id`), `features_jp`, 'product', `id`, 'features', 0, 'zh-CN'
FROM `sk_product` WHERE `features_jp` IS NOT NULL AND TRIM(`features_jp`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('product:features:', `id`), `features_kr`, 'product', `id`, 'features', 0, 'zh-CN'
FROM `sk_product` WHERE `features_kr` IS NOT NULL AND TRIM(`features_kr`) != '';

-- -----------------------------------------------------------
-- 3. 迁移 sk_brands 的 DEPRECATED 多语言数据
-- -----------------------------------------------------------

-- 3.1 brands.brand_name 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('brand:name:', `id`), `name_en`, 'brand', `id`, 'name', 0, 'zh-CN'
FROM `sk_brands` WHERE `name_en` IS NOT NULL AND TRIM(`name_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('brand:name:', `id`), `name_ja`, 'brand', `id`, 'name', 0, 'zh-CN'
FROM `sk_brands` WHERE `name_ja` IS NOT NULL AND TRIM(`name_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('brand:name:', `id`), `name_ko`, 'brand', `id`, 'name', 0, 'zh-CN'
FROM `sk_brands` WHERE `name_ko` IS NOT NULL AND TRIM(`name_ko`) != '';

-- 3.2 brands.description 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('brand:description:', `id`), `description_en`, 'brand', `id`, 'description', 0, 'zh-CN'
FROM `sk_brands` WHERE `description_en` IS NOT NULL AND TRIM(`description_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('brand:description:', `id`), `description_ja`, 'brand', `id`, 'description', 0, 'zh-CN'
FROM `sk_brands` WHERE `description_ja` IS NOT NULL AND TRIM(`description_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('brand:description:', `id`), `description_ko`, 'brand', `id`, 'description', 0, 'zh-CN'
FROM `sk_brands` WHERE `description_ko` IS NOT NULL AND TRIM(`description_ko`) != '';

-- -----------------------------------------------------------
-- 4. 迁移 sk_category 的 DEPRECATED 多语言数据
--    注: sk_category 无 description 基础字段，但 DEPRECATED 字段仍迁移保留
-- -----------------------------------------------------------

-- 4.1 category.name 翻译
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('category:name:', `id`), `name_en`, 'category', `id`, 'name', 0, 'zh-CN'
FROM `sk_category` WHERE `name_en` IS NOT NULL AND TRIM(`name_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('category:name:', `id`), `name_ja`, 'category', `id`, 'name', 0, 'zh-CN'
FROM `sk_category` WHERE `name_ja` IS NOT NULL AND TRIM(`name_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('category:name:', `id`), `name_ko`, 'category', `id`, 'name', 0, 'zh-CN'
FROM `sk_category` WHERE `name_ko` IS NOT NULL AND TRIM(`name_ko`) != '';

-- 4.2 category.description 翻译（保留数据）
INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'en-US', CONCAT('category:description:', `id`), `description_en`, 'category', `id`, 'description', 0, 'zh-CN'
FROM `sk_category` WHERE `description_en` IS NOT NULL AND TRIM(`description_en`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ja-JP', CONCAT('category:description:', `id`), `description_ja`, 'category', `id`, 'description', 0, 'zh-CN'
FROM `sk_category` WHERE `description_ja` IS NOT NULL AND TRIM(`description_ja`) != '';

INSERT IGNORE INTO `sk_translation` (`lang_code`, `trans_key`, `trans_value`, `module`, `business_id`, `field`, `is_auto`, `source_lang`)
SELECT 'ko-KR', CONCAT('category:description:', `id`), `description_ko`, 'category', `id`, 'description', 0, 'zh-CN'
FROM `sk_category` WHERE `description_ko` IS NOT NULL AND TRIM(`description_ko`) != '';

-- -----------------------------------------------------------
-- 5. 删除 sk_product 的 DEPRECATED 字段
-- -----------------------------------------------------------
ALTER TABLE `sk_product`
  DROP COLUMN `name_en`,
  DROP COLUMN `name_ja`,
  DROP COLUMN `name_ko`,
  DROP COLUMN `name_zh_hant`,
  DROP COLUMN `description_en`,
  DROP COLUMN `description_ja`,
  DROP COLUMN `description_ko`,
  DROP COLUMN `features_en`,
  DROP COLUMN `features_jp`,
  DROP COLUMN `features_kr`;

-- -----------------------------------------------------------
-- 6. 删除 sk_brands 的 DEPRECATED 字段
-- -----------------------------------------------------------
ALTER TABLE `sk_brands`
  DROP COLUMN `name_en`,
  DROP COLUMN `name_ja`,
  DROP COLUMN `name_ko`,
  DROP COLUMN `description_en`,
  DROP COLUMN `description_ja`,
  DROP COLUMN `description_ko`;

-- -----------------------------------------------------------
-- 7. 删除 sk_category 的 DEPRECATED 字段
-- -----------------------------------------------------------
ALTER TABLE `sk_category`
  DROP COLUMN `name_en`,
  DROP COLUMN `name_ja`,
  DROP COLUMN `name_ko`,
  DROP COLUMN `description_en`,
  DROP COLUMN `description_ja`,
  DROP COLUMN `description_ko`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 迁移完成验证
-- ============================================================
-- SELECT module, field, lang_code, COUNT(*) AS cnt
-- FROM sk_translation
-- WHERE business_id IS NOT NULL
-- GROUP BY module, field, lang_code;
