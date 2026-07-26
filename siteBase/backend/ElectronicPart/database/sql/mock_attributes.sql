-- Mock data for sk_dictionary_data table (electronic component attributes)
-- Inserting into project_id=9
INSERT INTO `sk_dictionary_data` (`project_id`, `field_values`, `status`, `sort_order`, `created_at`, `updated_at`)
VALUES
-- 电子组件属性列表
(9, '{"sort_order":0,"status":1,"attr_name":"封装类型","code":"package_type"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"工作温度","code":"operating_temperature"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"工作电压","code":"operating_voltage"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"功率","code":"power"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"精度","code":"tolerance"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"电阻值","code":"resistance"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"电容值","code":"capacitance"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"电感值","code":"inductance"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"电流","code":"current"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"频率","code":"frequency"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"耐压值","code":"voltage_rating"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"绝缘电阻","code":"insulation_resistance"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"介质损耗","code":"dielectric_loss"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"Q值","code":"q_factor"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"ESR","code":"esr"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"ESL","code":"esl"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"极性","code":"polarity"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"温度系数","code":"temperature_coefficient"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"引脚数量","code":"pin_count"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"RoHS合规","code":"rohs_compliant"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"认证标准","code":"certification"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"材质","code":"material"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"颜色","code":"color"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"尺寸","code":"size"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"重量","code":"weight"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"存储温度","code":"storage_temperature"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"湿度范围","code":"humidity_range"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"振动等级","code":"vibration_level"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"冲击等级","code":"shock_level"}', 1, 0, NOW(), NOW()),
(9, '{"sort_order":0,"status":1,"attr_name":"使用寿命","code":"lifespan"}', 1, 0, NOW(), NOW());

-- Example mock data for sk_category_attribute table
-- These associations will use the IDs from sk_dictionary_data (assuming they are sequential starting from 8)
INSERT INTO `sk_category_attribute` (`category_id`, `attribute_id`, `is_required`, `is_filter`, `sort_order`, `create_time`)
VALUES
-- 电阻分类属性关联 (assuming category_id=105)
(105, 8, 1, 1, 1, NOW()),
(105, 9, 1, 1, 2, NOW()),
(105, 10, 1, 1, 3, NOW()),
(105, 11, 1, 1, 4, NOW()),
(105, 12, 1, 1, 5, NOW()),
(105, 13, 1, 1, 6, NOW()),
(105, 19, 1, 1, 7, NOW()),
(105, 21, 1, 1, 8, NOW()),
(105, 22, 0, 0, 9, NOW()),
(105, 23, 1, 0, 10, NOW()),
-- 电容分类属性关联 (assuming category_id=114)
(114, 8, 1, 1, 1, NOW()),
(114, 9, 1, 1, 2, NOW()),
(114, 10, 1, 1, 3, NOW()),
(114, 14, 1, 1, 4, NOW()),
(114, 18, 0, 0, 5, NOW()),
(114, 18, 1, 1, 6, NOW()),
(114, 21, 1, 1, 7, NOW()),
(114, 22, 0, 0, 8, NOW()),
(114, 23, 1, 0, 9, NOW()),
-- 半导体分类属性关联 (assuming category_id=119)
(119, 8, 1, 1, 1, NOW()),
(119, 9, 1, 1, 2, NOW()),
(119, 10, 1, 1, 3, NOW()),
(119, 11, 1, 1, 4, NOW()),
(119, 20, 1, 1, 5, NOW()),
(119, 21, 1, 1, 6, NOW()),
(119, 22, 0, 0, 7, NOW()),
(119, 27, 0, 0, 8, NOW()),
(119, 28, 0, 0, 9, NOW());
