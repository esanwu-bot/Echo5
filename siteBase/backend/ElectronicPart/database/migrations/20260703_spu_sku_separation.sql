-- ============================================================
-- SPU-SKU 层级完全落地 + sk_product 表瘦身迁移脚本
-- 对应差异说明: 差异4 (SPU-SKU层级) + 差异6 (sk_product瘦身)
-- 执行日期: 2026-07-03
-- 说明:
--   1. sk_product 增加 series_id 外键, 移除 model_id (差异4)
--   2. SKU 级字段从 sk_product 迁移到 sk_product_models (差异6)
--   3. 保留 sk_product 旧字段用于双读过渡, 标记为 @deprecated
-- ============================================================

SET @db = (SELECT DATABASE());

-- ============================================================
-- 差异4: SPU-SKU 层级完全落地
-- ============================================================

-- 1.1 sk_product 增加 series_id 外键 (指向 sk_product_series.id)
SET @colExists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND COLUMN_NAME = 'series_id');
SET @sql = IF(@colExists = 0,
  'ALTER TABLE `sk_product` ADD COLUMN `series_id` INT(11) DEFAULT NULL COMMENT ''所属产品系列ID (SPU)'' AFTER `brand_id`',
  'SELECT ''sk_product.series_id already exists'' AS msg'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idxExists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND INDEX_NAME = 'idx_series_id');
SET @sql2 = IF(@idxExists = 0,
  'ALTER TABLE `sk_product` ADD INDEX `idx_series_id` (`series_id`)',
  'SELECT ''idx_series_id already exists'' AS msg'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 1.2 数据迁移: series_id 需由后台编辑页面手动选择, 此处不自动填充, 避免错误关联
--     (历史数据中 sk_product 与 sk_product_series 没有可靠对应关系)

-- 1.3 移除 sk_product.model_id 外键约束与索引
SET @fkExists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND CONSTRAINT_NAME = 'fk_product_model' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @sql3 = IF(@fkExists > 0,
  'ALTER TABLE `sk_product` DROP FOREIGN KEY `fk_product_model`',
  'SELECT ''fk_product_model constraint not found'' AS msg'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @idxExists2 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND INDEX_NAME = 'idx_model_id');
SET @sql4 = IF(@idxExists2 > 0,
  'ALTER TABLE `sk_product` DROP INDEX `idx_model_id`',
  'SELECT ''idx_model_id not found'' AS msg'
);
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SET @idxExists3 = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND INDEX_NAME = 'idx_product_model');
SET @sql5 = IF(@idxExists3 > 0,
  'ALTER TABLE `sk_product` DROP INDEX `idx_product_model`',
  'SELECT ''idx_product_model not found'' AS msg'
);
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- 1.4 移除 sk_product.model_id 列
SET @colExists2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product' AND COLUMN_NAME = 'model_id');
SET @sql6 = IF(@colExists2 > 0,
  'ALTER TABLE `sk_product` DROP COLUMN `model_id`',
  'SELECT ''model_id column not found'' AS msg'
);
PREPARE stmt6 FROM @sql6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

-- ============================================================
-- 差异6: sk_product 表瘦身 - SKU 级字段迁移到 sk_product_models
-- ============================================================

-- 2.1 为 sk_product_models 增加 SKU 级业务字段 (若不存在)
-- pricing_unit_price (单价)
SET @colExists3 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'pricing_unit_price');
SET @sql7 = IF(@colExists3 = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `pricing_unit_price` DECIMAL(10,2) DEFAULT NULL COMMENT ''单价'' AFTER `stock`',
  'SELECT ''pricing_unit_price already exists'' AS msg'
);
PREPARE stmt7 FROM @sql7;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

-- pricing_currency (货币)
SET @colExists4 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'pricing_currency');
SET @sql8 = IF(@colExists4 = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `pricing_currency` VARCHAR(10) DEFAULT ''CNY'' COMMENT ''货币'' AFTER `pricing_unit_price`',
  'SELECT ''pricing_currency already exists'' AS msg'
);
PREPARE stmt8 FROM @sql8;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

-- safety_stock (安全库存)
SET @colExists5 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'safety_stock');
SET @sql9 = IF(@colExists5 = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `safety_stock` INT(11) DEFAULT 0 COMMENT ''安全库存'' AFTER `stock`',
  'SELECT ''safety_stock already exists'' AS msg'
);
PREPARE stmt9 FROM @sql9;
EXECUTE stmt9;
DEALLOCATE PREPARE stmt9;

-- in_transit_stock (在途库存)
SET @colExists6 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'in_transit_stock');
SET @sql10 = IF(@colExists6 = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `in_transit_stock` INT(11) DEFAULT 0 COMMENT ''在途库存'' AFTER `safety_stock`',
  'SELECT ''in_transit_stock already exists'' AS msg'
);
PREPARE stmt10 FROM @sql10;
EXECUTE stmt10;
DEALLOCATE PREPARE stmt10;

-- normally_stocked (常备库存标记)
SET @colExists7 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sk_product_models' AND COLUMN_NAME = 'normally_stocked');
SET @sql11 = IF(@colExists7 = 0,
  'ALTER TABLE `sk_product_models` ADD COLUMN `normally_stocked` TINYINT(1) DEFAULT 0 COMMENT ''是否常备库存'' AFTER `in_transit_stock`',
  'SELECT ''normally_stocked already exists'' AS msg'
);
PREPARE stmt11 FROM @sql11;
EXECUTE stmt11;
DEALLOCATE PREPARE stmt11;

-- inventory_min_order_quantity (最小起订量 - 已有 moq, 此处不再重复添加)
-- inventory_lead_time (交期 - 已有 lead_time, 此处不再重复添加)

-- 2.2 数据迁移: 将 sk_product 中的 SKU 级字段值复制到 sk_product_models
--     通过 sk_product_models.series_id = sk_product.id 关联 (1.4 已删除 model_id)
--     仅更新 sk_product_models 中字段为空/0的记录
UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON m.series_id = p.id
  SET m.pricing_unit_price = COALESCE(m.pricing_unit_price, p.pricing_unit_price)
  WHERE p.pricing_unit_price IS NOT NULL AND p.pricing_unit_price > 0;

UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON m.series_id = p.id
  SET m.pricing_currency = COALESCE(NULLIF(m.pricing_currency, ''), p.pricing_currency)
  WHERE p.pricing_currency IS NOT NULL AND p.pricing_currency != '';

UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON m.series_id = p.id
  SET m.safety_stock = p.safety_stock
  WHERE p.safety_stock IS NOT NULL AND p.safety_stock > 0 AND m.safety_stock = 0;

UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON m.series_id = p.id
  SET m.in_transit_stock = p.in_transit_stock
  WHERE p.in_transit_stock IS NOT NULL AND p.in_transit_stock > 0 AND m.in_transit_stock = 0;

UPDATE `sk_product_models` m
  INNER JOIN `sk_product` p ON m.series_id = p.id
  SET m.normally_stocked = p.normally_stocked
  WHERE p.normally_stocked IS NOT NULL AND m.normally_stocked = 0;

-- 注: bandwidth/slew_rate/voltage_range_min/voltage_range_max/offset_voltage/channels
--     属于参数化字段, 应通过 sk_model_param_val 管理, 此处不自动迁移
--     如需迁移, 请通过后台"型号参数值"管理页面或单独脚本处理

-- 2.3 sk_product 中保留旧字段用于双读过渡, 但标记为废弃
--     (不在数据库层面删除, 仅在 Model 层标注 @deprecated, 避免影响现有接口)
-- 完成迁移验证后再执行字段删除 (见 2.4)

-- 2.4 (可选, 迁移验证完成后执行) 移除 sk_product 中已迁移的 SKU 级字段
-- 警告: 执行前请确保所有接口已切换到 sk_product_models 读取
-- ALTER TABLE `sk_product` DROP COLUMN `bandwidth`;
-- ALTER TABLE `sk_product` DROP COLUMN `slew_rate`;
-- ALTER TABLE `sk_product` DROP COLUMN `voltage_range_min`;
-- ALTER TABLE `sk_product` DROP COLUMN `voltage_range_max`;
-- ALTER TABLE `sk_product` DROP COLUMN `offset_voltage`;
-- ALTER TABLE `sk_product` DROP COLUMN `channels`;
-- ALTER TABLE `sk_product` DROP COLUMN `package_type`;
-- ALTER TABLE `sk_product` DROP COLUMN `stock`;
-- ALTER TABLE `sk_product` DROP COLUMN `safety_stock`;
-- ALTER TABLE `sk_product` DROP COLUMN `pricing_unit_price`;
-- ALTER TABLE `sk_product` DROP COLUMN `pricing_currency`;
-- ALTER TABLE `sk_product` DROP COLUMN `normally_stocked`;
-- ALTER TABLE `sk_product` DROP COLUMN `in_transit_stock`;

SELECT 'SPU-SKU 层级分离与表瘦身迁移完成' AS done;
