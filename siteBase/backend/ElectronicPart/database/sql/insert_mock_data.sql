USE `semiconductor_db`;

-- insert_mock_data.sql
-- 将 `component-parametric-search/component-parametric-search/products.json` 中的数据导入到 `sk_product` 表
-- 说明：为了简单起见，部分字段使用了默认或占位值：
--  - `category_id` / `brand_id` 设置为 NULL/0
--  - `stock` 根据 `inStock` 字段设置为 100 或 0
--  - `specs` 列存储为 JSON，包含 bandwidthMHz, slewRate, supplyVoltageMin, supplyVoltageMax, offsetVoltageVal
--  - `images` 设为空数组
-- 执行前请备份数据库：
--    mysqldump -u root -p semiconductor_db > backup.sql
-- 导入：
--    mysql -u root -p semiconductor_db < insert_mock_data.sql

INSERT INTO `sk_product` (
  `category_id`, `product_code`, `name`, `description`, `package_type`, `pin_count`, `stock`, `specs`, `images`,
  `pricing_unit_price`, `pricing_currency`, `brand`, `inventory_min_order_quantity`, `inventory_lead_time`, `status`, `is_new`, `create_time`, `update_time`, `brand_id`, `created_at`
) VALUES
  (NULL,'LM358-GEN','LM358-GEN','Industry Standard Dual Operational Amplifier','SOIC',2,100,'{"bandwidthMHz":1.0,"slewRate":0.5,"supplyVoltageMin":3.0,"supplyVoltageMax":32.0,"offsetVoltageVal":2.0}','[]',0.15,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'UA741-SINGLE','UA741-SINGLE','Single General Purpose Op Amp','PDIP',1,100,'{"bandwidthMHz":1.0,"slewRate":0.5,"supplyVoltageMin":5.0,"supplyVoltageMax":40.0,"offsetVoltageVal":1.0}','[]',0.25,'USD','STMicroelectronics',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'TLV2374-RAIL','TLV2374-RAIL','Quad Rail-to-Rail Input/Output Op Amp','TSSOP',4,0,'{"bandwidthMHz":3.0,"slewRate":2.4,"supplyVoltageMin":2.7,"supplyVoltageMax":16.0,"offsetVoltageVal":4.5}','[]',1.20,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'MCP6002','MCP6002','1MHz Low Power Op Amp','SOIC',2,100,'{"bandwidthMHz":1.0,"slewRate":0.6,"supplyVoltageMin":1.8,"supplyVoltageMax":6.0,"offsetVoltageVal":4.5}','[]',0.30,'USD','Microchip',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'AD8541','AD8541','General Purpose CMOS Op Amp','SOT-23',1,100,'{"bandwidthMHz":0.98,"slewRate":0.9,"supplyVoltageMin":2.7,"supplyVoltageMax":5.5,"offsetVoltageVal":3.0}','[]',0.45,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LM324-QUAD','LM324-QUAD','Quadruple Operational Amplifier','SOIC',4,100,'{"bandwidthMHz":1.2,"slewRate":0.5,"supplyVoltageMin":3.0,"supplyVoltageMax":32.0,"offsetVoltageVal":2.0}','[]',0.18,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'NCV2904','NCV2904','Dual Supply Op Amp Automotive','TSSOP',2,100,'{"bandwidthMHz":1.0,"slewRate":0.6,"supplyVoltageMin":3.0,"supplyVoltageMax":26.0,"offsetVoltageVal":2.0}','[]',0.40,'USD','ON Semiconductor',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'TSV912','TSV912','Wide Bandwidth Rail-to-Rail Op Amp','QFN',2,0,'{"bandwidthMHz":8.0,"slewRate":4.5,"supplyVoltageMin":2.5,"supplyVoltageMax":5.5,"offsetVoltageVal":1.5}','[]',0.85,'USD','STMicroelectronics',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LMV358','LMV358','Low-Voltage Rail-to-Rail Output Op Amp','VSSOP',2,100,'{"bandwidthMHz":1.0,"slewRate":1.0,"supplyVoltageMin":2.7,"supplyVoltageMax":5.5,"offsetVoltageVal":1.7}','[]',0.35,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA171','OPA171','36V, Low Power, RRO Op Amp','SOT-23',1,100,'{"bandwidthMHz":3.0,"slewRate":1.5,"supplyVoltageMin":2.7,"supplyVoltageMax":36.0,"offsetVoltageVal":0.25}','[]',0.95,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),

  (NULL,'OPA277','OPA277','High Precision Operational Amplifier','SOIC',1,100,'{"bandwidthMHz":1.0,"slewRate":0.8,"supplyVoltageMin":4.0,"supplyVoltageMax":36.0,"offsetVoltageVal":0.01}','[]',2.50,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'AD8628','AD8628','Zero-Drift, Single-Supply Op Amp','SOT-23',1,100,'{"bandwidthMHz":2.5,"slewRate":1.0,"supplyVoltageMin":2.7,"supplyVoltageMax":5.0,"offsetVoltageVal":0.001}','[]',3.10,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LTC2057','LTC2057','High Voltage, Low Noise Zero-Drift Op Amp','MSOP',1,0,'{"bandwidthMHz":1.5,"slewRate":0.45,"supplyVoltageMin":4.75,"supplyVoltageMax":36.0,"offsetVoltageVal":0.004}','[]',4.20,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA2192','OPA2192','RRI/O, Precision, Low Noise Op Amp','SOIC',2,100,'{"bandwidthMHz":10.0,"slewRate":20.0,"supplyVoltageMin":4.5,"supplyVoltageMax":36.0,"offsetVoltageVal":0.005}','[]',5.50,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'MCP6V51','MCP6V51','Zero-Drift Op Amp','SOT-23',1,100,'{"bandwidthMHz":2.0,"slewRate":0.9,"supplyVoltageMin":1.8,"supplyVoltageMax":5.5,"offsetVoltageVal":0.015}','[]',1.05,'USD','Microchip',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'MAX44250','MAX44250','20V, Ultra-Precision, Low-Noise Op Amp','SOT-23',1,100,'{"bandwidthMHz":10.0,"slewRate":8.0,"supplyVoltageMin":2.7,"supplyVoltageMax":20.0,"offsetVoltageVal":0.006}','[]',2.10,'USD','Maxim Integrated',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA333','OPA333','1.8V, MicroPower, Zero-Drift Op Amp','SC70',1,100,'{"bandwidthMHz":0.35,"slewRate":0.16,"supplyVoltageMin":1.8,"supplyVoltageMax":5.5,"offsetVoltageVal":0.01}','[]',1.80,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'ADA4522-2','ADA4522-2','55V, Low Noise, Zero Drift Op Amp','SOIC',2,0,'{"bandwidthMHz":3.0,"slewRate":1.3,"supplyVoltageMin":4.5,"supplyVoltageMax":55.0,"offsetVoltageVal":0.005}','[]',6.75,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'TSZ121','TSZ121','Very High Accuracy Op Amp','SC70',1,100,'{"bandwidthMHz":0.4,"slewRate":0.19,"supplyVoltageMin":1.8,"supplyVoltageMax":5.5,"offsetVoltageVal":0.005}','[]',1.40,'USD','STMicroelectronics',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA189','OPA189','14MHz, MUX-Friendly, Zero-Drift Op Amp','SOIC',1,100,'{"bandwidthMHz":14.0,"slewRate":20.0,"supplyVoltageMin":4.5,"supplyVoltageMax":36.0,"offsetVoltageVal":0.003}','[]',3.30,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),

  (NULL,'THS4031','THS4031','100MHz Low Noise High Speed Amplifier','SOIC',1,100,'{"bandwidthMHz":100.0,"slewRate":100.0,"supplyVoltageMin":9.0,"supplyVoltageMax":32.0,"offsetVoltageVal":0.5}','[]',4.50,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'ADA4897','ADA4897','Low Noise, Rail-to-Rail Output, High Speed','SOIC',1,100,'{"bandwidthMHz":230.0,"slewRate":120.0,"supplyVoltageMin":3.0,"supplyVoltageMax":10.0,"offsetVoltageVal":0.2}','[]',5.20,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LMH6629','LMH6629','Ultra-Low Noise, High-Speed Op Amp','WSON',1,0,'{"bandwidthMHz":900.0,"slewRate":1600.0,"supplyVoltageMin":2.7,"supplyVoltageMax":5.5,"offsetVoltageVal":0.28}','[]',3.80,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA855','OPA855','8GHz Unity Gain Stable Amplifier','WSON',1,100,'{"bandwidthMHz":8000.0,"slewRate":2750.0,"supplyVoltageMin":3.3,"supplyVoltageMax":5.25,"offsetVoltageVal":0.6}','[]',12.00,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'AD8001','AD8001','800MHz, 50mW Current Feedback Amplifier','SOIC',1,100,'{"bandwidthMHz":880.0,"slewRate":1200.0,"supplyVoltageMin":4.0,"supplyVoltageMax":6.0,"offsetVoltageVal":2.0}','[]',2.90,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LTC6409','LTC6409','10GHz GBW Differential Amplifier','QFN',1,100,'{"bandwidthMHz":10000.0,"slewRate":33000.0,"supplyVoltageMin":3.0,"supplyVoltageMax":5.25,"offsetVoltageVal":1.5}','[]',8.50,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'MAX4223','MAX4223','1GHz Current Feedback Amplifier','SOT-23',1,100,'{"bandwidthMHz":1000.0,"slewRate":1700.0,"supplyVoltageMin":2.85,"supplyVoltageMax":11.0,"offsetVoltageVal":1.0}','[]',2.45,'USD','Maxim Integrated',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'THS3091','THS3091','High Voltage, Low Distortion, Current Feedback','SOIC',1,0,'{"bandwidthMHz":235.0,"slewRate":7300.0,"supplyVoltageMin":10.0,"supplyVoltageMax":32.0,"offsetVoltageVal":0.9}','[]',6.10,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'TSH300','TSH300','Ultrafast Low Power Op Amp','SOIC',1,100,'{"bandwidthMHz":200.0,"slewRate":230.0,"supplyVoltageMin":3.0,"supplyVoltageMax":5.5,"offsetVoltageVal":1.0}','[]',1.95,'USD','STMicroelectronics',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA656','OPA656','Wideband, Unity-Gain Stable, FET-Input','SOT-23',1,100,'{"bandwidthMHz":500.0,"slewRate":290.0,"supplyVoltageMin":8.0,"supplyVoltageMax":12.0,"offsetVoltageVal":0.25}','[]',4.80,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),

  (NULL,'OPA1612','OPA1612','SoundPlus High-Performance Bipolar Audio Op Amp','SOIC',2,100,'{"bandwidthMHz":40.0,"slewRate":27.0,"supplyVoltageMin":4.5,"supplyVoltageMax":36.0,"offsetVoltageVal":0.1}','[]',4.50,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'AD797','AD797','Ultralow Distortion, Ultralow Noise Op Amp','PDIP',1,100,'{"bandwidthMHz":110.0,"slewRate":20.0,"supplyVoltageMin":10.0,"supplyVoltageMax":36.0,"offsetVoltageVal":0.025}','[]',9.50,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'LME49720','LME49720','Dual High Performance, High Fidelity Audio Op Amp','SOIC',2,100,'{"bandwidthMHz":55.0,"slewRate":20.0,"supplyVoltageMin":5.0,"supplyVoltageMax":34.0,"offsetVoltageVal":0.1}','[]',2.80,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA1656','OPA1656','Ultra-Low Noise, CMOS Audio Op Amp','VSSOP',2,100,'{"bandwidthMHz":53.0,"slewRate":24.0,"supplyVoltageMin":4.5,"supplyVoltageMax":36.0,"offsetVoltageVal":0.5}','[]',3.20,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'NJM4580','NJM4580','Dual Operational Amplifier for Audio','DIP',2,100,'{"bandwidthMHz":15.0,"slewRate":5.0,"supplyVoltageMin":4.0,"supplyVoltageMax":36.0,"offsetVoltageVal":0.3}','[]',0.50,'USD','JRC',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'O1642','O1642','JFET Input, Low Distortion Audio Op Amp','SOIC',2,100,'{"bandwidthMHz":11.0,"slewRate":20.0,"supplyVoltageMin":4.5,"supplyVoltageMax":36.0,"offsetVoltageVal":0.5}','[]',2.25,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'MUSES02','MUSES02','High Quality Audio Operational Amplifier','DIP',2,0,'{"bandwidthMHz":11.0,"slewRate":5.0,"supplyVoltageMin":7.0,"supplyVoltageMax":32.0,"offsetVoltageVal":0.2}','[]',35.00,'USD','JRC',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'AD825','AD825','Low Cost, High Speed, FET Input Op Amp','SOIC',1,100,'{"bandwidthMHz":41.0,"slewRate":125.0,"supplyVoltageMin":10.0,"supplyVoltageMax":36.0,"offsetVoltageVal":1.0}','[]',3.80,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'OPA1632','OPA1632','Fully Differential Audio Amplifier','SOIC',1,100,'{"bandwidthMHz":180.0,"slewRate":50.0,"supplyVoltageMin":5.0,"supplyVoltageMax":32.0,"offsetVoltageVal":0.2}','[]',4.20,'USD','Texas Instruments',1,'7-14 days','1',0,NOW(),NOW(),0,NULL),
  (NULL,'SSM2019','SSM2019','Self-Contained Audio Preamplifier','DIP',1,100,'{"bandwidthMHz":4.0,"slewRate":16.0,"supplyVoltageMin":10.0,"supplyVoltageMax":36.0,"offsetVoltageVal":0.05}','[]',6.50,'USD','Analog Devices',1,'7-14 days','1',0,NOW(),NOW(),0,NULL)
;

-- End of insert_mock_data.sql