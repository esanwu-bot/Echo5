-- ============================================================
-- 为 sk_product_series 表添加 is_new 字段（新品标记）
-- 执行日期: 2026-07-17
-- 说明:
--   1. 添加 is_new 字段，用于标记系列是否为新品
--   2. 添加 is_new 索引，用于首页新品查询优化
-- ============================================================

SET @db = (SELECT DATABASE());

-- 1. 添加 is_new 字段到 sk_product_series 表
SET @colExists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'is_new');
SET @sql = IF(@colExists = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `is_new` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否新品: 0=否, 1=是'' AFTER `status`',
  'SELECT ''sk_product_series.is_new already exists'' AS msg'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 添加 is_new 索引
SET @idxExists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_series' AND INDEX_NAME = 'idx_is_new');
SET @sql2 = IF(@idxExists = 0,
  'ALTER TABLE `sk_product_series` ADD INDEX `idx_is_new` (`is_new`)',
  'SELECT ''idx_is_new already exists'' AS msg'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT 'sk_product_series.is_new 字段添加完成' AS done;
