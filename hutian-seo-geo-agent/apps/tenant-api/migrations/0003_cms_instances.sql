-- ============================================================================
-- 壶天多租户元数据库 · migration 0003 — sitebase_instances → cms_instances（T8.0）
-- ============================================================================
-- ADR-cms-adapter 第 2 层：建站底座从硬编码 siteBase 抽象成 CMS 适配器接口，
-- sitebase_instances 表升级为 cms_instances，加 cms_type 字段（现有实例标 sitebase）。
--
-- 本 migration 供**存量库**升级（已有 sitebase_instances 表）：
--   1. RENAME TABLE sitebase_instances → cms_instances（仅在旧表存在时）
--   2. ADD COLUMN cms_type（仅在列不存在时）
--   3. ADD INDEX idx_cms_instances_cms_type（仅在索引不存在时）
--
-- 新装库直接跑 0001_init.sql（已是 cms_instances），本文件幂等跳过。
--
-- 跑法：mysql -u root -p hutian < migrations/0003_cms_instances.sql
-- 幂等：用 information_schema 条件判断，可重复跑
-- ============================================================================

USE hutian;

-- 幂等 DDL 通过存储过程实现（MySQL 无 RENAME TABLE IF EXISTS / ADD COLUMN IF NOT EXISTS）
DROP PROCEDURE IF EXISTS `migrate_0003_cms_instances`;
DELIMITER //
CREATE PROCEDURE `migrate_0003_cms_instances`()
BEGIN
  DECLARE old_table_exists INT DEFAULT 0;
  DECLARE new_table_exists INT DEFAULT 0;
  DECLARE cms_type_col_exists INT DEFAULT 0;
  DECLARE cms_type_idx_exists INT DEFAULT 0;

  -- ① 检查旧表 sitebase_instances 是否存在
  SELECT COUNT(*) INTO old_table_exists
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'sitebase_instances';

  -- ② 检查新表 cms_instances 是否存在
  SELECT COUNT(*) INTO new_table_exists
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'cms_instances';

  -- ③ 旧表存在且新表不存在 → RENAME
  IF old_table_exists = 1 AND new_table_exists = 0 THEN
    RENAME TABLE `sitebase_instances` TO `cms_instances`;
    SELECT '[0003] renamed sitebase_instances → cms_instances' AS step;
  ELSEIF old_table_exists = 1 AND new_table_exists = 1 THEN
    -- 两表并存（异常态，0001 已建 cms_instances 又残留旧表）：不动旧表，人工处理
    SELECT '[0003] WARN: both sitebase_instances and cms_instances exist — skipping rename, manual cleanup needed' AS step;
  ELSE
    SELECT '[0003] no sitebase_instances to rename (fresh install or already migrated)' AS step;
  END IF;

  -- ④ 检查 cms_instances.cms_type 列是否存在（新表可能由 0001 直接建好含此列）
  SELECT COUNT(*) INTO cms_type_col_exists
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'cms_instances' AND column_name = 'cms_type';

  IF cms_type_col_exists = 0 THEN
    ALTER TABLE `cms_instances`
      ADD COLUMN `cms_type` VARCHAR(32) NOT NULL DEFAULT 'sitebase' AFTER `deleted_at`;
    SELECT '[0003] added column cms_type (default sitebase)' AS step;
  ELSE
    SELECT '[0003] cms_type column already exists' AS step;
  END IF;

  -- ⑤ 检查 cms_type 索引是否存在
  SELECT COUNT(*) INTO cms_type_idx_exists
    FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'cms_instances' AND index_name = 'idx_cms_instances_cms_type';

  IF cms_type_idx_exists = 0 THEN
    ALTER TABLE `cms_instances` ADD INDEX `idx_cms_instances_cms_type` (`cms_type`);
    SELECT '[0003] added index idx_cms_instances_cms_type' AS step;
  ELSE
    SELECT '[0003] index idx_cms_instances_cms_type already exists' AS step;
  END IF;

  -- ⑥ 现有实例全部标 sitebase（ADR: 现有实例标 sitebase；default 已是 sitebase，兜底 UPDATE）
  UPDATE `cms_instances` SET `cms_type` = 'sitebase' WHERE `cms_type` IS NULL OR `cms_type` = '';

  SELECT '[0003] cms_instances migration done (existing rows tagged sitebase)' AS status;
END//
DELIMITER ;

CALL `migrate_0003_cms_instances`();
DROP PROCEDURE IF EXISTS `migrate_0003_cms_instances`;
