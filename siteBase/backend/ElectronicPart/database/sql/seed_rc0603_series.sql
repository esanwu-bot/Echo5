-- =====================================================================
-- 电子元器件商城 - RC0603 厚膜贴片电阻系列 Seed 数据
-- 文件说明：按产品模块规划生成完整的系列(SPU) + 型号(SKU) + 参数 + 文档数据
-- 备注：用于演示 /api/v1/series/{id} 接口的完整响应结构
-- =====================================================================

USE `semiconductor_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. 分类树：被动元件 > 电阻器 > 厚膜贴片电阻
-- ---------------------------------------------------------------------
INSERT INTO `sk_category` (`id`, `parent_id`, `name`, `slug`, `code`, `path`, `level`, `is_leaf`, `is_hot`, `sort`, `status`)
VALUES
  (200, 0,   '被动元件',     'passive-components', 'PASSIVE', '200',     1, 0, 1, 1, 1),
  (201, 200, '电阻器',       'resistors',          'RES',     '200/201', 2, 0, 1, 1, 1),
  (202, 201, '厚膜贴片电阻', 'thick-film-resistor','TFR',     '200/201/202', 3, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `slug`=VALUES(`slug`), `code`=VALUES(`code`);

-- ---------------------------------------------------------------------
-- 2. 更新 YAGEO 品牌（brand_code 改为 yageo，补 logo）
-- ---------------------------------------------------------------------
UPDATE `sk_brands`
SET `brand_code` = 'yageo',
    `brand_name` = 'YAGEO',
    `brand_logo` = 'https://cdn.tianqixin.tech/brands/yageo.png',
    `description` = 'YAGEO Corporation (国巨) - 全球领先的被动元件供应商'
WHERE `id` = 1;

-- ---------------------------------------------------------------------
-- 3. 创建 RC0603 系列 (SPU, sk_product)
-- ---------------------------------------------------------------------
DELETE FROM `sk_product` WHERE `id` = 2001;

INSERT INTO `sk_product`
  (`id`, `category_id`, `product_code`, `name`, `package_type`, `description`,
   `images`, `datasheet_url`, `status`, `is_new`, `views`, `sort`,
   `brand_id`, `category_fk_id`, `is_on_sale`, `features`, `create_time`, `update_time`)
VALUES
  (2001, '202', 'RC0603', 'RC0603 厚膜贴片电阻系列',
   '0603',
   'RC 系列为标准厚膜贴片电阻，采用高稳定性陶瓷基体与贵金属玻璃釉材料，具备优异的耐湿性、耐焊接热性和长期可靠性。广泛应用于消费电子、通讯设备、工业控制、汽车电子等领域。',
   '["https://cdn.tianqixin.tech/series/rc0603.png"]',
   'https://cdn.tianqixin.tech/datasheets/rc0603-datasheet.pdf',
   '1', 0, 158, 100,
   1, 202, 1,
   '高稳定性厚膜电阻元件\n阻值范围 1Ω ~ 10MΩ\n精度 ±0.1% ~ ±5%\n功率 1/20W ~ 1/4W\n符合 RoHS / 无铅标准\n工作温度 -55°C ~ +155°C',
   NOW(), NOW());

-- ---------------------------------------------------------------------
-- 4. 批量生成型号 (SKU, sk_product_models) + 参数值 (sk_model_param_val)
-- ---------------------------------------------------------------------
-- 清理旧数据
DELETE FROM `sk_model_param_val` WHERE `model_id` IN (SELECT `id` FROM `sk_product_models` WHERE `series_id` = 2001);
DELETE FROM `sk_product_models` WHERE `series_id` = 2001;

-- 用存储过程批量生成型号
DROP PROCEDURE IF EXISTS `sp_seed_rc0603_models`;
DELIMITER $$
CREATE PROCEDURE `sp_seed_rc0603_models`()
BEGIN
  DECLARE v_idx INT DEFAULT 0;
  DECLARE v_model_id INT;
  DECLARE v_pkg VARCHAR(10);
  DECLARE v_tol VARCHAR(10);
  DECLARE v_power VARCHAR(10);
  DECLARE v_res_ohm DECIMAL(12,2);
  DECLARE v_res_label VARCHAR(20);
  DECLARE v_code VARCHAR(40);
  DECLARE v_name VARCHAR(80);
  DECLARE v_stock INT;
  DECLARE v_moq INT;

  -- 阻值数组 (E24 系列, 1Ω ~ 10MΩ, 取代表性值)
  -- 共 24 个基数 × 5 个十进制档位 = 120 个，再叠加封装/精度组合后截取 156 个
  WHILE v_idx < 156 DO
    -- 简化生成策略：按 idx 推导封装、精度、阻值
    -- 封装：0201/0402/0603/0805/1206/1210/2010/2512 (8 种)
    SET v_pkg = ELT((v_idx MOD 8) + 1, '0201','0402','0603','0805','1206','1210','2010','2512');

    -- 精度：±0.1% / ±0.5% / ±1% / ±5% (4 种)
    SET v_tol = ELT(FLOOR(v_idx / 8) MOD 4 + 1, '±0.1%','±0.5%','±1%','±5%');

    -- 功率：按封装匹配
    SET v_power = CASE v_pkg
      WHEN '0201' THEN '1/20W'
      WHEN '0402' THEN '1/16W'
      WHEN '0603' THEN '1/10W'
      WHEN '0805' THEN '1/8W'
      WHEN '1206' THEN '1/4W'
      WHEN '1210' THEN '1/3W'
      WHEN '2010' THEN '1/2W'
      WHEN '2512' THEN '1W'
    END;

    -- 阻值：E24 系列基数 × 十进制档位
    SET v_res_ohm = ELT((v_idx MOD 24) + 1,
      1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
      3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1)
      * POW(10, FLOOR(v_idx / 24));

    -- 阻值标签 (Ω/KΩ/MΩ)
    SET v_res_label = CASE
      WHEN v_res_ohm < 1000 THEN CONCAT(v_res_ohm, 'Ω')
      WHEN v_res_ohm < 1000000 THEN CONCAT(ROUND(v_res_ohm/1000, 1), 'kΩ')
      ELSE CONCAT(ROUND(v_res_ohm/1000000, 1), 'MΩ')
    END;

    -- 型号编码
    SET v_code = CONCAT('RC', v_pkg, '-', LPAD(v_idx+1, 3, '0'), 'F');
    SET v_name = CONCAT('RC', v_pkg, ' ', v_res_label, ' ', v_tol);

    -- 库存随机 0~5000，MOQ 随机 100/500/1000
    SET v_stock = FLOOR(RAND() * 5000);
    SET v_moq = ELT((v_idx MOD 3) + 1, 100, 500, 1000);

    -- 插入型号
    INSERT INTO `sk_product_models`
      (`model_code`, `model_name`, `category_id`, `brand_id`, `series_id`, `series`,
       `package_type`, `datasheet_url`, `description`, `status`,
       `pin_count`, `stock`, `packaging_spec`, `operating_temperature`,
       `moq`, `lead_time`, `created_at`, `updated_at`)
    VALUES
      (v_code, v_name, 202, 1, 2001, 'RC0603 厚膜贴片电阻系列',
       v_pkg, 'https://cdn.tianqixin.tech/datasheets/rc0603-datasheet.pdf',
       CONCAT(v_name, ' - 厚膜贴片电阻'), 'Active',
       0, v_stock, '卷带包装', '-55°C ~ +155°C',
       v_moq, 7, NOW(), NOW());

    SET v_model_id = LAST_INSERT_ID();

    -- 插入参数值 (封装/阻值/精度/功率)
    -- param_id=3 package_type, 7 resistance_value, 8 tolerance, 9 power_rating
    INSERT INTO `sk_model_param_val` (`model_id`, `param_id`, `value`, `value_numeric`) VALUES
      (v_model_id, 3,  v_pkg,        NULL),
      (v_model_id, 7,  v_res_label,  v_res_ohm),
      (v_model_id, 8,  v_tol,        NULL),
      (v_model_id, 9,  v_power,      NULL);

    SET v_idx = v_idx + 1;
  END WHILE;
END$$
DELIMITER ;

CALL `sp_seed_rc0603_models`();
DROP PROCEDURE IF EXISTS `sp_seed_rc0603_models`;

-- ---------------------------------------------------------------------
-- 5. 系列级文档 (sk_product_document)
-- ---------------------------------------------------------------------
DELETE FROM `sk_product_document` WHERE `series_id` = 2001;

INSERT INTO `sk_product_document`
  (`series_id`, `model_id`, `doc_type`, `title`, `language`, `file_url`, `file_size`, `version`, `status`, `create_time`, `update_time`)
VALUES
  (2001, NULL, 'datasheet',     'RC0603 Datasheet (中文版)',  'zh-CN', 'https://cdn.tianqixin.tech/datasheets/rc0603-datasheet-zh.pdf', '2.3MB', 'Rev. 1.2', 1, NOW(), NOW()),
  (2001, NULL, 'datasheet',     'RC0603 Datasheet (English)', 'en-US', 'https://cdn.tianqixin.tech/datasheets/rc0603-datasheet-en.pdf', '2.1MB', 'Rev. 1.2', 1, NOW(), NOW()),
  (2001, NULL, 'certification', 'RoHS 合规证书',              'zh-CN', 'https://cdn.tianqixin.tech/certs/rc0603-rohs.pdf',              '180KB', '2024',    1, NOW(), NOW()),
  (2001, NULL, 'certification', 'REACH 合规声明',             'zh-CN', 'https://cdn.tianqixin.tech/certs/rc0603-reach.pdf',             '120KB', '2024',    1, NOW(), NOW()),
  (2001, NULL, 'application_note','RC 系列电阻选型应用指南',  'zh-CN', 'https://cdn.tianqixin.tech/docs/rc-series-app-note.pdf',       '1.5MB', 'Rev. 2.0',1, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- 验证
SELECT CONCAT('系列型号数: ', COUNT(*)) AS result FROM `sk_product_models` WHERE `series_id` = 2001;
SELECT CONCAT('参数值数: ', COUNT(*)) AS result FROM `sk_model_param_val` mpv JOIN `sk_product_models` m ON mpv.model_id = m.id WHERE m.series_id = 2001;
SELECT CONCAT('文档数: ', COUNT(*)) AS result FROM `sk_product_document` WHERE `series_id` = 2001;
