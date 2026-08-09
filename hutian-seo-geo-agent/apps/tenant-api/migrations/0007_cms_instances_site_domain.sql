-- ============================================================================
-- 壶天多租户元数据库 · 0007 cms_instances 加 site_domain 字段（T9.5 归属校验）
-- ============================================================================
-- 背景：ADR-open-api 5.8 D4 归属校验要求 submit_sitemap 的 host 必须属该 API key
--   绑定的 workspace。当前 cms_instances.base_url 存的是 CMS 后台 API 地址
--   （如 http://localhost:8001/api/v1），不是站点公开域名。
--   新增 site_domain 字段存站点的公开域名（如 brand-a.com），用于归属校验。
--
-- 关联链路：api_keys.workspace_id → workspaces.sitebase_instance_id
--         → cms_instances.site_domain → 对比 submit_sitemap 的 host
--
-- MVP 1:1 workspace:cms_instance，单域名；多域名后续扩展（workspace_domains 表）
--
-- 跑法：mysql -u root -proot hutian < migrations/0007_cms_instances_site_domain.sql
-- 幂等：ADD COLUMN IF NOT EXISTS（MySQL 8.0+ 支持，5.7 用 information_schema 判断）
-- ============================================================================

USE hutian;

-- MySQL 5.7 兼容写法（phpstudy 默认 5.7）：先检查再加
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'hutian' AND table_name = 'cms_instances' AND column_name = 'site_domain');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `cms_instances` ADD COLUMN `site_domain` VARCHAR(255) DEFAULT NULL AFTER `base_url`',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 加索引（归属校验按域名查）
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = 'hutian' AND table_name = 'cms_instances' AND index_name = 'idx_cms_instances_site_domain');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE `cms_instances` ADD INDEX `idx_cms_instances_site_domain` (`site_domain`)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新探针 seed 的 site_domain（instance 100 = tenant A = brand-a.com，200 = tenant B = brand-b.com）
UPDATE `cms_instances` SET `site_domain` = 'brand-a.com' WHERE `id` = 100 AND `site_domain` IS NULL;
UPDATE `cms_instances` SET `site_domain` = 'brand-b.com' WHERE `id` = 200 AND `site_domain` IS NULL;

SELECT '[migration] 0007: cms_instances.site_domain added, seed domains set' AS status;
