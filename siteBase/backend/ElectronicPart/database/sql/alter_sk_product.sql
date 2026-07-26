-- =============================================
-- 产品表结构升级脚本
-- 用于支持新的API数据结构
-- 执行前请备份数据库！
-- =============================================

USE semiconductor_db;

-- 1. 添加新字段
ALTER TABLE `sk_product`
-- API返回字段
ADD COLUMN `is_new` TINYINT DEFAULT 0 COMMENT '是否新品：0=否，1=是' AFTER `status`,
ADD COLUMN `html_url` VARCHAR(255) DEFAULT NULL COMMENT 'HTML链接' AFTER `datasheet_url`,
ADD COLUMN `subcategory` VARCHAR(100) DEFAULT NULL COMMENT '子分类' AFTER `category_id`,
ADD COLUMN `rating` VARCHAR(50) DEFAULT 'Catalog' COMMENT '等级：Automotive/Catalog等' AFTER `subcategory`,
ADD COLUMN `temperature_range` VARCHAR(50) DEFAULT NULL COMMENT '工作温度范围（摄氏度）' AFTER `rating`,
ADD COLUMN `safety_category` VARCHAR(50) DEFAULT '/' COMMENT '功能安全类别' AFTER `temperature_range`,
ADD COLUMN `pin_count` INT DEFAULT 0 COMMENT '引脚数量' AFTER `package_type`,
-- 筛选功能字段
ADD COLUMN `stock` INT DEFAULT 0 COMMENT '库存数量' AFTER `pin_count`,
ADD COLUMN `normally_stocked` TINYINT DEFAULT 0 COMMENT '常备库存：0=否，1=是' AFTER `stock`,
ADD COLUMN `rohs_compliant` TINYINT DEFAULT 0 COMMENT 'RoHS合规：0=否，1=是' AFTER `normally_stocked`,
-- 产品详情页字段
ADD COLUMN `features` TEXT DEFAULT NULL COMMENT '产品特性（JSON数组）' AFTER `description_en`,
ADD COLUMN `documents` TEXT DEFAULT NULL COMMENT '技术文档（JSON数组）' AFTER `features`;

-- 2. 添加索引优化查询性能
ALTER TABLE `sk_product`
ADD INDEX `idx_subcategory` (`subcategory`),
ADD INDEX `idx_rating` (`rating`),
ADD INDEX `idx_is_new` (`is_new`),
ADD INDEX `idx_stock` (`stock`),
ADD INDEX `idx_normally_stocked` (`normally_stocked`),
ADD INDEX `idx_rohs_compliant` (`rohs_compliant`);

-- 3. 更新现有数据的默认值
UPDATE `sk_product` SET `is_new` = 0 WHERE `is_new` IS NULL;
UPDATE `sk_product` SET `rating` = 'Catalog' WHERE `rating` IS NULL OR `rating` = '';
UPDATE `sk_product` SET `safety_category` = '/' WHERE `safety_category` IS NULL OR `safety_category` = '';
UPDATE `sk_product` SET `pin_count` = 0 WHERE `pin_count` IS NULL;
UPDATE `sk_product` SET `stock` = 0 WHERE `stock` IS NULL;
UPDATE `sk_product` SET `normally_stocked` = 0 WHERE `normally_stocked` IS NULL;
UPDATE `sk_product` SET `rohs_compliant` = 0 WHERE `rohs_compliant` IS NULL;

-- 4. 验证修改结果
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'semiconductor_db'
    AND TABLE_NAME = 'sk_product'
    AND COLUMN_NAME IN ('is_new', 'html_url', 'subcategory', 'rating', 'temperature_range', 'safety_category', 'pin_count')
ORDER BY 
    ORDINAL_POSITION;

-- 5. 显示表结构
SHOW COLUMNS FROM `sk_product`;

-- 6. 统计信息
SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN is_new = 1 THEN 1 ELSE 0 END) as new_products,
    SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as in_stock_products,
    SUM(CASE WHEN normally_stocked = 1 THEN 1 ELSE 0 END) as normally_stocked_products,
    SUM(CASE WHEN rohs_compliant = 1 THEN 1 ELSE 0 END) as rohs_compliant_products,
    COUNT(DISTINCT rating) as rating_types,
    COUNT(DISTINCT subcategory) as subcategory_count
FROM `sk_product`;
