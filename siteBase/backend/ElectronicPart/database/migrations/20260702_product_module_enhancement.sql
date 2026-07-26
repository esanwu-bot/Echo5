-- ============================================================
-- 产品模块架构增强 SQL 迁移脚本
-- 对应规划: docs/电子元件产品模块规划.md + docs/md/产品模块对比分析与调整方案.md
-- 执行日期: 2026-07-02
-- ============================================================

-- 1. 创建型号参数值表 (SKU级别参数)
-- 将 sk_product_attribute (product级) → sk_model_param_val (model级)
CREATE TABLE IF NOT EXISTS `sk_model_param_val` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `model_id` INT(11) NOT NULL COMMENT '型号/SKU ID',
  `param_id` INT(11) NOT NULL COMMENT '参数定义ID (sk_attribute.id)',
  `value` TEXT NOT NULL COMMENT '参数值文本 (如 10kΩ)',
  `value_numeric` DECIMAL(15,6) DEFAULT NULL COMMENT '数值化参数值 (如 10000.0)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_param` (`model_id`, `param_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_param` (`param_id`),
  KEY `idx_value_numeric` (`value_numeric`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='型号参数值表 (SKU级别参数)';

-- 2. 创建替代型号关系表
CREATE TABLE IF NOT EXISTS `sk_product_alternate` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `model_id` INT(11) NOT NULL COMMENT '原型号ID',
  `alternate_model_id` INT(11) NOT NULL COMMENT '替代型号ID',
  `match_type` ENUM('DIRECT', 'FUNCTIONAL') NOT NULL DEFAULT 'FUNCTIONAL' COMMENT '替代类型: DIRECT=Pin-to-Pin直接替代, FUNCTIONAL=功能替代',
  `similarity_score` DECIMAL(5,2) DEFAULT NULL COMMENT '参数相似度评分(0-100)',
  `notes` VARCHAR(255) DEFAULT NULL COMMENT '替代说明',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alternate` (`model_id`, `alternate_model_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_alternate` (`alternate_model_id`),
  KEY `idx_match_type` (`match_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='替代型号关系表';

-- 3. 创建产品文档管理表 (替代 sk_product_models.datasheet_url 单一字段)
CREATE TABLE IF NOT EXISTS `sk_product_document` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `series_id` INT(11) DEFAULT NULL COMMENT 'SPU/产品系列ID (NULL=型号级文档)',
  `model_id` INT(11) DEFAULT NULL COMMENT 'SKU/型号ID (NULL=系列级文档)',
  `doc_type` ENUM('datasheet', 'application_note', 'reference_design', 'cad_model', 'certification', 'soldering_guide') NOT NULL COMMENT '文档类型',
  `title` VARCHAR(255) NOT NULL COMMENT '文档标题',
  `language` VARCHAR(10) NOT NULL DEFAULT 'zh-CN' COMMENT '文档语言',
  `file_url` VARCHAR(500) NOT NULL COMMENT '文件下载链接',
  `file_size` VARCHAR(20) DEFAULT NULL COMMENT '文件大小',
  `version` VARCHAR(20) DEFAULT NULL COMMENT '版本号',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_series` (`series_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_doc_type` (`doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品文档管理表';

-- 4. SPU-SKU 层级修正: sk_product_models 增加 series_id 外键
-- 将 sk_product.model_id 的反向关系修正为 sk_product_models.series_id
-- (MySQL 不支持 IF NOT EXISTS, 用存储过程检查)
SET @db = (SELECT DATABASE());
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'series_id');

SET @sql = IF(@exists = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `series_id` INT(11) DEFAULT NULL COMMENT ''SPU/产品系列ID'' AFTER `brand_id`',
  'SELECT ''series_id column already exists'' AS msg'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idxExists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND INDEX_NAME = 'idx_series_id');

SET @sql2 = IF(@idxExists = 0,
  'ALTER TABLE `sk_product_models` ADD INDEX `idx_series_id` (`series_id`)',
  'SELECT ''idx_series_id index already exists'' AS msg'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 5. 数据迁移: 将现有 product.model_id 反转为 model.series_id
-- 每个 product 的 model_id 被记录, 迁移后 model.series_id = product.id
UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON p.model_id = m.id
  SET m.series_id = p.id
  WHERE m.series_id IS NULL AND p.model_id IS NOT NULL;

-- 6. 增强 sk_product_series 表以承载 SPU 级别信息
-- 添加分类、品牌、MPN前缀、数据手册等字段
SET @db2 = (SELECT DATABASE());
SET @colExists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'category_id');
SET @sql3 = IF(@colExists = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `category_id` INT(11) DEFAULT NULL COMMENT ''所属分类ID'' AFTER `series_name_en`',
  'SELECT ''category_id column already exists'' AS msg'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @colExists2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'brand_id');
SET @sql4 = IF(@colExists2 = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `brand_id` INT(11) DEFAULT NULL COMMENT ''所属品牌ID'' AFTER `category_id`',
  'SELECT ''brand_id column already exists'' AS msg'
);
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SET @colExists3 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'mpn_prefix');
SET @sql5 = IF(@colExists3 = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `mpn_prefix` VARCHAR(100) DEFAULT NULL COMMENT ''制造商型号前缀'' AFTER `brand_id`',
  'SELECT ''mpn_prefix column already exists'' AS msg'
);
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

SET @colExists4 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'datasheet_url');
SET @sql6 = IF(@colExists4 = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `datasheet_url` VARCHAR(500) DEFAULT NULL COMMENT ''系列级数据手册链接'' AFTER `image`',
  'SELECT ''datasheet_url column already exists'' AS msg'
);
PREPARE stmt6 FROM @sql6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

SET @colExists5 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND COLUMN_NAME = 'sort');
SET @sql7 = IF(@colExists5 = 0,
  'ALTER TABLE `sk_product_series` ADD COLUMN `sort` INT(11) NOT NULL DEFAULT 0 COMMENT ''排序权重'' AFTER `datasheet_url`',
  'SELECT ''sort column already exists'' AS msg'
);
PREPARE stmt7 FROM @sql7;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

-- 为新增字段添加索引
SET @idxExists2 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND INDEX_NAME = 'idx_category_id');
SET @sql8 = IF(@idxExists2 = 0,
  'ALTER TABLE `sk_product_series` ADD INDEX `idx_category_id` (`category_id`)',
  'SELECT ''idx_category_id index already exists'' AS msg'
);
PREPARE stmt8 FROM @sql8;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

SET @idxExists3 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db2 AND TABLE_NAME = 'sk_product_series' AND INDEX_NAME = 'idx_brand_id');
SET @sql9 = IF(@idxExists3 = 0,
  'ALTER TABLE `sk_product_series` ADD INDEX `idx_brand_id` (`brand_id`)',
  'SELECT ''idx_brand_id index already exists'' AS msg'
);
PREPARE stmt9 FROM @sql9;
EXECUTE stmt9;
DEALLOCATE PREPARE stmt9;
