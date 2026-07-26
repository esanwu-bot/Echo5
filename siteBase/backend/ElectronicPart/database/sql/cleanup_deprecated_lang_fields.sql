-- ============================================================
-- 天启芯科技 - Phase 5 废弃多语言字段清理 SQL
-- 
-- ⚠️ 执行前提：
--   1. 已完成 php think lang:migrate --execute（数据已迁入 sk_lang_code）
--   2. 已验证新多语言架构正常工作
--   3. 建议先执行第1部分（仅注释保留字段），观察无问题后再执行第2部分（删除）
-- ============================================================

-- ============================================================
-- 第1部分：标记废弃字段（注释掉，数据保留）
-- ============================================================

-- sk_product
ALTER TABLE `sk_product` 
  MODIFY COLUMN `name_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED: 已迁移至sk_lang_code',
  MODIFY COLUMN `name_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_zh_hant` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `features_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `features_jp` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `features_kr` text COMMENT 'DEPRECATED';

-- sk_category
ALTER TABLE `sk_category`
  MODIFY COLUMN `name_en` varchar(100) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED';

-- sk_brands
ALTER TABLE `sk_brands`
  MODIFY COLUMN `name_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED';

-- sk_article
ALTER TABLE `sk_article`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_ko` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ko` text COMMENT 'DEPRECATED';

-- sk_news
ALTER TABLE `sk_news`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `summary_ko` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ko` text COMMENT 'DEPRECATED';

-- sk_faq
ALTER TABLE `sk_faq`
  MODIFY COLUMN `question_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `question_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `question_ko` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `answer_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `answer_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `answer_ko` text COMMENT 'DEPRECATED';

-- sk_banner
ALTER TABLE `sk_banner`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `subtitle_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `subtitle_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `subtitle_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED';

-- sk_document
ALTER TABLE `sk_document`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_en` longtext COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ja` longtext COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ko` longtext COMMENT 'DEPRECATED';

-- sk_training
ALTER TABLE `sk_training`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED';

-- sk_about
ALTER TABLE `sk_about`
  MODIFY COLUMN `title_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `title_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_en` longtext COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ja` longtext COMMENT 'DEPRECATED',
  MODIFY COLUMN `content_ko` longtext COMMENT 'DEPRECATED';

-- sk_attribute
ALTER TABLE `sk_attribute`
  MODIFY COLUMN `name_en` varchar(100) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ja` varchar(100) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `name_ko` varchar(100) DEFAULT NULL COMMENT 'DEPRECATED';

-- sk_certificate
ALTER TABLE `sk_certificate`
  MODIFY COLUMN `cert_name_en` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `cert_name_ja` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `cert_name_ko` varchar(255) DEFAULT NULL COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_en` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ja` text COMMENT 'DEPRECATED',
  MODIFY COLUMN `description_ko` text COMMENT 'DEPRECATED';


-- ============================================================
-- 第2部分：彻底删除废弃字段（确认无问题后执行）
-- 
-- ALTER TABLE `sk_product` DROP COLUMN `name_en`, DROP COLUMN `name_ja`, DROP COLUMN `name_ko`, DROP COLUMN `name_zh_hant`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`, DROP COLUMN `features_en`, DROP COLUMN `features_jp`, DROP COLUMN `features_kr`;
-- ALTER TABLE `sk_category` DROP COLUMN `name_en`, DROP COLUMN `name_ja`, DROP COLUMN `name_ko`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`;
-- ALTER TABLE `sk_brands` DROP COLUMN `name_en`, DROP COLUMN `name_ja`, DROP COLUMN `name_ko`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`;
-- ALTER TABLE `sk_article` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `summary_en`, DROP COLUMN `summary_ja`, DROP COLUMN `summary_ko`, DROP COLUMN `content_en`, DROP COLUMN `content_ja`, DROP COLUMN `content_ko`;
-- ALTER TABLE `sk_news` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `summary_en`, DROP COLUMN `summary_ja`, DROP COLUMN `summary_ko`, DROP COLUMN `content_en`, DROP COLUMN `content_ja`, DROP COLUMN `content_ko`;
-- ALTER TABLE `sk_faq` DROP COLUMN `question_en`, DROP COLUMN `question_ja`, DROP COLUMN `question_ko`, DROP COLUMN `answer_en`, DROP COLUMN `answer_ja`, DROP COLUMN `answer_ko`;
-- ALTER TABLE `sk_banner` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `subtitle_en`, DROP COLUMN `subtitle_ja`, DROP COLUMN `subtitle_ko`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`;
-- ALTER TABLE `sk_document` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `content_en`, DROP COLUMN `content_ja`, DROP COLUMN `content_ko`;
-- ALTER TABLE `sk_training` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`;
-- ALTER TABLE `sk_about` DROP COLUMN `title_en`, DROP COLUMN `title_ja`, DROP COLUMN `title_ko`, DROP COLUMN `content_en`, DROP COLUMN `content_ja`, DROP COLUMN `content_ko`;
-- ALTER TABLE `sk_attribute` DROP COLUMN `name_en`, DROP COLUMN `name_ja`, DROP COLUMN `name_ko`;
-- ALTER TABLE `sk_certificate` DROP COLUMN `cert_name_en`, DROP COLUMN `cert_name_ja`, DROP COLUMN `cert_name_ko`, DROP COLUMN `description_en`, DROP COLUMN `description_ja`, DROP COLUMN `description_ko`;
-- ============================================================
