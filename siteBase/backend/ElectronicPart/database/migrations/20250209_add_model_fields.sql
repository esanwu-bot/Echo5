-- Migration: Add order and quality fields to sk_product_models table
-- Date: 2025-02-09
-- MySQL version compatible (without IF NOT EXISTS)

-- 添加字段到 sk_product_models 表
-- 注意：如果字段已存在会报错，请先确认字段不存在再执行

-- 引脚数量
ALTER TABLE `sk_product_models` 
ADD COLUMN `pin_count` int(11) DEFAULT 0 COMMENT '引脚数量';

-- 库存数量
ALTER TABLE `sk_product_models` 
ADD COLUMN `stock` int(11) DEFAULT 0 COMMENT '库存数量';

-- 包装规格
ALTER TABLE `sk_product_models` 
ADD COLUMN `packaging_spec` varchar(100) DEFAULT NULL COMMENT '包装规格';

-- 工作温度范围
ALTER TABLE `sk_product_models` 
ADD COLUMN `operating_temperature` varchar(50) DEFAULT NULL COMMENT '工作温度范围';

-- 材料类型
ALTER TABLE `sk_product_models` 
ADD COLUMN `material_type` varchar(50) DEFAULT NULL COMMENT '材料类型';

-- 引脚镀层
ALTER TABLE `sk_product_models` 
ADD COLUMN `pin_plating` varchar(50) DEFAULT NULL COMMENT '引脚镀层';

-- 最小起订量
ALTER TABLE `sk_product_models` 
ADD COLUMN `moq` int(11) DEFAULT 1 COMMENT '最小起订量';

-- 交期(天)
ALTER TABLE `sk_product_models` 
ADD COLUMN `lead_time` int(11) DEFAULT 0 COMMENT '交期(天)';

-- 添加索引以提高查询性能
CREATE INDEX `idx_model_status` ON `sk_product_models`(`status`);
CREATE INDEX `idx_model_stock` ON `sk_product_models`(`stock`);

-- 查看更新后的表结构
DESCRIBE `sk_product_models`;
