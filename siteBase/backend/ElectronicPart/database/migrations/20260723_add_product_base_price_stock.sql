-- ============================================================
-- 产品主表新增基础单价与基础库存字段
-- 作用：支持后台商品编辑页直接维护单价与库存，并兼容既有阶梯价/供应商价/型号库存计算逻辑
-- 执行日期：2026-07-23
-- 兼容：MySQL 5.7（使用动态 SQL 判断字段是否存在）
-- ============================================================

-- 添加 price 字段（若不存在）
SET @add_price = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sk_product'
      AND column_name = 'price'
  ),
  'ALTER TABLE `sk_product` ADD COLUMN `price` DECIMAL(8,2) DEFAULT NULL COMMENT "基础单价（USD）"',
  'SELECT 1'
);
PREPARE stmt FROM @add_price;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 stock 字段（若不存在）
SET @add_stock = IF(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sk_product'
      AND column_name = 'stock'
  ),
  'ALTER TABLE `sk_product` ADD COLUMN `stock` INT(11) DEFAULT "0" COMMENT "基础库存"',
  'SELECT 1'
);
PREPARE stmt FROM @add_stock;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为已有数据设置安全默认值
UPDATE `sk_product` SET `stock` = 0 WHERE `stock` IS NULL;
