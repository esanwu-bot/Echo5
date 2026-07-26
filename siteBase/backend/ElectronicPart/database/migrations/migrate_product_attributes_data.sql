-- =====================================================
-- 产品属性数据迁移脚本
-- =====================================================
-- 说明: 将现有产品的 specs JSON 数据迁移到 sk_product_attribute 表
-- =====================================================

USE `semiconductor_db`;

-- =====================================================
-- 1. 为现有产品添加属性值示例
-- =====================================================

-- 获取属性ID
SET @attr_resistance = (SELECT id FROM sk_attribute WHERE code = 'resistance_value' LIMIT 1);
SET @attr_tolerance = (SELECT id FROM sk_attribute WHERE code = 'tolerance' LIMIT 1);
SET @attr_power = (SELECT id FROM sk_attribute WHERE code = 'power_rating' LIMIT 1);
SET @attr_temp_coef = (SELECT id FROM sk_attribute WHERE code = 'temperature_coefficient' LIMIT 1);
SET @attr_package_size = (SELECT id FROM sk_attribute WHERE code = 'package_size' LIMIT 1);
SET @attr_operating_temp = (SELECT id FROM sk_attribute WHERE code = 'operating_temperature' LIMIT 1);
SET @attr_capacitance = (SELECT id FROM sk_attribute WHERE code = 'capacitance_value' LIMIT 1);
SET @attr_rated_voltage = (SELECT id FROM sk_attribute WHERE code = 'rated_voltage' LIMIT 1);

-- 产品 1005: 贴片电阻 RC0402
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(1005, @attr_resistance, '10kΩ', 10000),
(1005, @attr_tolerance, '±1%', 1),
(1005, @attr_power, '0.0625W', 0.0625),
(1005, @attr_temp_coef, '±100ppm/°C', 100),
(1005, @attr_package_size, '0402', NULL),
(1005, @attr_operating_temp, '-55°C ~ 155°C', NULL);

-- 产品 1006: 金属膜电阻 MFR-25
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(1006, @attr_resistance, '1kΩ', 1000),
(1006, @attr_tolerance, '±0.5%', 0.5),
(1006, @attr_power, '0.25W', 0.25),
(1006, @attr_temp_coef, '±25ppm/°C', 25);

-- 产品 1007: 功率电阻 RW-5W
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(1007, @attr_resistance, '100Ω', 100),
(1007, @attr_tolerance, '±5%', 5),
(1007, @attr_power, '5W', 5),
(1007, @attr_temp_coef, '±250ppm/°C', 250);

-- 产品 1008: 精密电阻 PFR-1206
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(1008, @attr_resistance, '1.5kΩ', 1500),
(1008, @attr_tolerance, '±0.1%', 0.1),
(1008, @attr_power, '0.25W', 0.25),
(1008, @attr_temp_coef, '±10ppm/°C', 10),
(1008, @attr_package_size, '1206', NULL);

-- 产品 1009: 可调电阻 3296W
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(1009, @attr_resistance, '10kΩ', 10000),
(1009, @attr_tolerance, '±10%', 10),
(1009, @attr_power, '0.5W', 0.5);

-- =====================================================
-- 2. 批量创建更多测试数据
-- =====================================================

-- 创建更多贴片电阻产品及其属性
INSERT IGNORE INTO sk_product (category_id, product_code, name, brand_id, status, stock, price, package_type) VALUES
(106, 'RC0603-1K', '贴片电阻 1KΩ ±1% 0603', 1, 1, 10000, 0.01, '0603'),
(106, 'RC0603-4.7K', '贴片电阻 4.7KΩ ±1% 0603', 1, 1, 8000, 0.01, '0603'),
(106, 'RC0805-10K', '贴片电阻 10KΩ ±1% 0805', 1, 1, 12000, 0.015, '0805'),
(106, 'RC0805-100K', '贴片电阻 100KΩ ±1% 0805', 1, 1, 9000, 0.015, '0805'),
(106, 'RC1206-1M', '贴片电阻 1MΩ ±1% 1206', 1, 1, 5000, 0.02, '1206');

-- 获取新创建产品的ID并添加属性
SET @prod_rc0603_1k = (SELECT id FROM sk_product WHERE product_code = 'RC0603-1K' LIMIT 1);
SET @prod_rc0603_47k = (SELECT id FROM sk_product WHERE product_code = 'RC0603-4.7K' LIMIT 1);
SET @prod_rc0805_10k = (SELECT id FROM sk_product WHERE product_code = 'RC0805-10K' LIMIT 1);
SET @prod_rc0805_100k = (SELECT id FROM sk_product WHERE product_code = 'RC0805-100K' LIMIT 1);
SET @prod_rc1206_1m = (SELECT id FROM sk_product WHERE product_code = 'RC1206-1M' LIMIT 1);

-- RC0603-1K 属性
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(@prod_rc0603_1k, @attr_resistance, '1kΩ', 1000),
(@prod_rc0603_1k, @attr_tolerance, '±1%', 1),
(@prod_rc0603_1k, @attr_power, '0.1W', 0.1),
(@prod_rc0603_1k, @attr_package_size, '0603', NULL);

-- RC0603-4.7K 属性
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(@prod_rc0603_47k, @attr_resistance, '4.7kΩ', 4700),
(@prod_rc0603_47k, @attr_tolerance, '±1%', 1),
(@prod_rc0603_47k, @attr_power, '0.1W', 0.1),
(@prod_rc0603_47k, @attr_package_size, '0603', NULL);

-- RC0805-10K 属性
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(@prod_rc0805_10k, @attr_resistance, '10kΩ', 10000),
(@prod_rc0805_10k, @attr_tolerance, '±1%', 1),
(@prod_rc0805_10k, @attr_power, '0.125W', 0.125),
(@prod_rc0805_10k, @attr_package_size, '0805', NULL);

-- RC0805-100K 属性
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(@prod_rc0805_100k, @attr_resistance, '100kΩ', 100000),
(@prod_rc0805_100k, @attr_tolerance, '±1%', 1),
(@prod_rc0805_100k, @attr_power, '0.125W', 0.125),
(@prod_rc0805_100k, @attr_package_size, '0805', NULL);

-- RC1206-1M 属性
INSERT IGNORE INTO sk_product_attribute (product_id, attribute_id, attribute_value, numeric_value) VALUES
(@prod_rc1206_1m, @attr_resistance, '1MΩ', 1000000),
(@prod_rc1206_1m, @attr_tolerance, '±1%', 1),
(@prod_rc1206_1m, @attr_power, '0.25W', 0.25),
(@prod_rc1206_1m, @attr_package_size, '1206', NULL);

-- =====================================================
-- 3. 验证数据
-- =====================================================

-- 查看产品及其属性
SELECT 
    p.id,
    p.product_code,
    p.name,
    a.name as attr_name,
    pa.attribute_value,
    pa.numeric_value
FROM sk_product p
LEFT JOIN sk_product_attribute pa ON p.id = pa.product_id
LEFT JOIN sk_attribute a ON pa.attribute_id = a.id
WHERE p.category_id = 106
ORDER BY p.id, a.id;

-- 统计信息
SELECT 
    '产品总数' as metric,
    COUNT(*) as count
FROM sk_product
WHERE category_id = 106

UNION ALL

SELECT 
    '属性值总数' as metric,
    COUNT(*) as count
FROM sk_product_attribute pa
JOIN sk_product p ON pa.product_id = p.id
WHERE p.category_id = 106;

SELECT 'Data migration completed!' as status;
