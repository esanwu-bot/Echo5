-- =====================================================
-- 电子元器件产品属性筛选系统 - 数据库迁移脚本
-- =====================================================
-- 创建时间: 2026-01-09
-- 说明: 创建产品属性值表,优化索引,配置分类属性关联
-- =====================================================

USE `semiconductor_db`;

-- =====================================================
-- 1. 创建产品属性值表 (如果不存在)
-- =====================================================
CREATE TABLE IF NOT EXISTS `sk_product_attribute` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `attribute_id` int(11) NOT NULL COMMENT '属性ID',
  `attribute_value` text COLLATE utf8_unicode_ci NOT NULL COMMENT '属性值',
  `numeric_value` decimal(15,6) DEFAULT NULL COMMENT '数值型属性的数值(用于范围查询)',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_attribute` (`product_id`,`attribute_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_attribute` (`attribute_id`),
  KEY `idx_numeric_value` (`numeric_value`),
  KEY `idx_attribute_value` (`attribute_value`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='产品属性值表';

-- =====================================================
-- 2. 优化现有表的索引
-- =====================================================

-- sk_product 表索引优化
ALTER TABLE `sk_product` 
  ADD INDEX IF NOT EXISTS `idx_category_brand` (`category_id`, `brand_id`),
  ADD INDEX IF NOT EXISTS `idx_status_category` (`status`, `category_id`),
  ADD INDEX IF NOT EXISTS `idx_category_status` (`category_id`, `status`);

-- =====================================================
-- 3. 创建常用属性定义 (如果不存在)
-- =====================================================

-- 插入电阻相关属性
INSERT IGNORE INTO `sk_attribute` (`name`, `code`, `type`, `data_type`, `unit`, `is_system`, `status`, `sort_order`) VALUES
('阻值', 'resistance_value', 'text', 'string', 'Ω', 1, 1, 10),
('精度', 'tolerance', 'select', 'string', '%', 1, 1, 20),
('功率', 'power_rating', 'select', 'number', 'W', 1, 1, 30),
('温度系数', 'temperature_coefficient', 'text', 'string', 'ppm/°C', 1, 1, 40),
('封装尺寸', 'package_size', 'select', 'string', NULL, 1, 1, 50);

-- 插入电容相关属性
INSERT IGNORE INTO `sk_attribute` (`name`, `code`, `type`, `data_type`, `unit`, `is_system`, `status`, `sort_order`) VALUES
('容值', 'capacitance_value', 'text', 'string', 'F', 1, 1, 60),
('额定电压', 'rated_voltage', 'range', 'number', 'V', 1, 1, 70),
('介质材料', 'dielectric_material', 'select', 'string', NULL, 1, 1, 80),
('ESR', 'esr', 'range', 'number', 'Ω', 1, 1, 90);

-- 插入半导体相关属性
INSERT IGNORE INTO `sk_attribute` (`name`, `code`, `type`, `data_type`, `unit`, `is_system`, `status`, `sort_order`) VALUES
('最大电流', 'max_current', 'range', 'number', 'A', 1, 1, 100),
('反向电压', 'reverse_voltage', 'range', 'number', 'V', 1, 1, 110),
('正向压降', 'forward_voltage', 'range', 'number', 'V', 1, 1, 120);

-- =====================================================
-- 4. 配置分类-属性关联 (示例配置)
-- =====================================================

-- 获取属性ID (用于后续配置)
SET @attr_resistance = (SELECT id FROM sk_attribute WHERE code = 'resistance_value' LIMIT 1);
SET @attr_tolerance = (SELECT id FROM sk_attribute WHERE code = 'tolerance' LIMIT 1);
SET @attr_power = (SELECT id FROM sk_attribute WHERE code = 'power_rating' LIMIT 1);
SET @attr_temp_coef = (SELECT id FROM sk_attribute WHERE code = 'temperature_coefficient' LIMIT 1);
SET @attr_package_size = (SELECT id FROM sk_attribute WHERE code = 'package_size' LIMIT 1);
SET @attr_package_type = (SELECT id FROM sk_attribute WHERE code = 'package_type' LIMIT 1);
SET @attr_operating_voltage = (SELECT id FROM sk_attribute WHERE code = 'operating_voltage' LIMIT 1);
SET @attr_operating_temp = (SELECT id FROM sk_attribute WHERE code = 'operating_temperature' LIMIT 1);
SET @attr_pin_count = (SELECT id FROM sk_attribute WHERE code = 'pin_count' LIMIT 1);
SET @attr_capacitance = (SELECT id FROM sk_attribute WHERE code = 'capacitance_value' LIMIT 1);
SET @attr_rated_voltage = (SELECT id FROM sk_attribute WHERE code = 'rated_voltage' LIMIT 1);
SET @attr_dielectric = (SELECT id FROM sk_attribute WHERE code = 'dielectric_material' LIMIT 1);
SET @attr_max_current = (SELECT id FROM sk_attribute WHERE code = 'max_current' LIMIT 1);
SET @attr_reverse_voltage = (SELECT id FROM sk_attribute WHERE code = 'reverse_voltage' LIMIT 1);

-- 贴片电阻 (category_id = 106) 的属性配置
INSERT IGNORE INTO `sk_category_attribute` (`category_id`, `attribute_id`, `is_required`, `is_filter`, `sort_order`) VALUES
(106, @attr_resistance, 1, 1, 10),
(106, @attr_tolerance, 1, 1, 20),
(106, @attr_power, 1, 1, 30),
(106, @attr_temp_coef, 0, 1, 40),
(106, @attr_package_size, 1, 1, 50),
(106, @attr_operating_temp, 0, 1, 60);

-- 金属膜电阻 (category_id = 107) 的属性配置
INSERT IGNORE INTO `sk_category_attribute` (`category_id`, `attribute_id`, `is_required`, `is_filter`, `sort_order`) VALUES
(107, @attr_resistance, 1, 1, 10),
(107, @attr_tolerance, 1, 1, 20),
(107, @attr_power, 1, 1, 30),
(107, @attr_temp_coef, 1, 1, 40);

-- 陶瓷电容 (category_id = 115) 的属性配置
INSERT IGNORE INTO `sk_category_attribute` (`category_id`, `attribute_id`, `is_required`, `is_filter`, `sort_order`) VALUES
(115, @attr_capacitance, 1, 1, 10),
(115, @attr_rated_voltage, 1, 1, 20),
(115, @attr_dielectric, 1, 1, 30),
(115, @attr_package_size, 1, 1, 40),
(115, @attr_operating_temp, 0, 1, 50);

-- 二极管 (category_id = 120) 的属性配置
INSERT IGNORE INTO `sk_category_attribute` (`category_id`, `attribute_id`, `is_required`, `is_filter`, `sort_order`) VALUES
(120, @attr_max_current, 1, 1, 10),
(120, @attr_reverse_voltage, 1, 1, 20),
(120, @attr_package_type, 1, 1, 30);

-- =====================================================
-- 5. 数据迁移: 将现有产品的 specs 迁移到属性表
-- =====================================================

-- 注意: 这部分需要根据实际的 specs JSON 结构编写
-- 以下是示例迁移脚本,需要根据实际数据调整

-- 示例: 迁移产品1005的属性
-- INSERT INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value)
-- SELECT 
--   1005,
--   @attr_resistance,
--   '10kΩ',
--   10000
-- WHERE NOT EXISTS (
--   SELECT 1 FROM sk_product_attribute 
--   WHERE product_id = 1005 AND attribute_id = @attr_resistance
-- );

-- =====================================================
-- 6. 创建视图: 方便查询产品及其属性
-- =====================================================

CREATE OR REPLACE VIEW `v_product_with_attributes` AS
SELECT 
    p.id as product_id,
    p.product_code,
    p.name as product_name,
    p.category_id,
    c.name as category_name,
    p.brand_id,
    b.brand_name,
    p.status,
    p.stock,
    p.price,
    pa.attribute_id,
    a.name as attribute_name,
    a.code as attribute_code,
    pa.attribute_value,
    pa.numeric_value
FROM sk_product p
LEFT JOIN sk_category c ON p.category_id = c.id
LEFT JOIN sk_brands b ON p.brand_id = b.id
LEFT JOIN sk_product_attribute pa ON p.id = pa.product_id
LEFT JOIN sk_attribute a ON pa.attribute_id = a.id
WHERE p.status = 1;

-- =====================================================
-- 7. 创建存储过程: 获取分类的可筛选属性
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_get_category_filter_attributes`$$

CREATE PROCEDURE `sp_get_category_filter_attributes`(
    IN p_category_id INT
)
BEGIN
    -- 获取分类的可筛选属性及其可用值
    SELECT 
        a.id as attribute_id,
        a.name as attribute_name,
        a.code as attribute_code,
        a.type as attribute_type,
        a.data_type,
        a.unit,
        a.options,
        ca.is_required,
        ca.sort_order,
        -- 获取该属性在当前分类下的所有可用值
        (
            SELECT JSON_ARRAYAGG(DISTINCT pa.attribute_value)
            FROM sk_product_attribute pa
            JOIN sk_product p ON pa.product_id = p.id
            WHERE p.category_id = p_category_id
              AND pa.attribute_id = a.id
              AND p.status = 1
        ) as available_values,
        -- 获取数值型属性的范围
        (
            SELECT JSON_OBJECT(
                'min', MIN(pa.numeric_value),
                'max', MAX(pa.numeric_value)
            )
            FROM sk_product_attribute pa
            JOIN sk_product p ON pa.product_id = p.id
            WHERE p.category_id = p_category_id
              AND pa.attribute_id = a.id
              AND p.status = 1
              AND pa.numeric_value IS NOT NULL
        ) as value_range
    FROM sk_attribute a
    JOIN sk_category_attribute ca ON a.id = ca.attribute_id
    WHERE ca.category_id = p_category_id
      AND ca.is_filter = 1
      AND a.status = 1
    ORDER BY ca.sort_order;
END$$

DELIMITER ;

-- =====================================================
-- 8. 创建存储过程: 获取分类的可用品牌
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_get_category_brands`$$

CREATE PROCEDURE `sp_get_category_brands`(
    IN p_category_id INT
)
BEGIN
    -- 获取指定分类下有产品的品牌列表
    SELECT DISTINCT 
        b.id,
        b.brand_code,
        b.brand_name,
        b.brand_logo,
        COUNT(p.id) as product_count
    FROM sk_brands b
    JOIN sk_product p ON b.id = p.brand_id
    WHERE p.category_id = p_category_id
      AND p.status = 1
    GROUP BY b.id, b.brand_code, b.brand_name, b.brand_logo
    ORDER BY b.brand_name;
END$$

DELIMITER ;

-- =====================================================
-- 完成
-- =====================================================

SELECT 'Database migration completed successfully!' as status;
