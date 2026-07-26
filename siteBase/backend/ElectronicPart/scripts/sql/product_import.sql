-- 创建电子元器件产品表结构
CREATE TABLE IF NOT EXISTS `sk_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL COMMENT '产品唯一标识符',
  `model_number` varchar(100) NOT NULL COMMENT '制造商型号',
  `brand` varchar(100) NOT NULL COMMENT '品牌/制造商',
  `category_id` varchar(50) NOT NULL COMMENT '产品主类别',
  `subcategory` varchar(50) DEFAULT NULL COMMENT '产品子类别',
  `name` varchar(200) NOT NULL COMMENT '产品名称',
  `description` text DEFAULT NULL COMMENT '产品描述',
  `image_url` varchar(500) DEFAULT NULL COMMENT '产品图片URL',
  `status` varchar(20) NOT NULL DEFAULT 'Active' COMMENT '产品状态',
  `package_type` varchar(50) DEFAULT NULL COMMENT '封装类型',
  `package_packaging` varchar(50) DEFAULT NULL COMMENT '包装方式',
  `stock` int(11) NOT NULL DEFAULT 0 COMMENT '库存数量',
  `inventory_min_order_quantity` int(11) NOT NULL DEFAULT 1 COMMENT '最小起订量',
  `inventory_lead_time` varchar(50) DEFAULT NULL COMMENT '供货周期',
  `pricing_unit_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
  `pricing_currency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT '货币',
  `compliance_rohs` varchar(20) NOT NULL DEFAULT 'Unknown' COMMENT 'RoHS合规',
  `compliance_reach` varchar(20) NOT NULL DEFAULT 'Unknown' COMMENT 'REACH合规',
  `compliance_eccn` varchar(20) DEFAULT NULL COMMENT '出口管制分类编码',
  `links_datasheet_url` varchar(500) DEFAULT NULL COMMENT '数据手册链接',
  `links_product_page_url` varchar(500) DEFAULT NULL COMMENT '产品页面链接',
  `links_simulation_model_url` varchar(500) DEFAULT NULL COMMENT '仿真模型链接',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  KEY `model_number` (`model_number`),
  KEY `brand` (`brand`),
  KEY `category_id` (`category_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电子元器件产品表';

-- 创建产品规格参数表
CREATE TABLE IF NOT EXISTS `sk_product_specification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL COMMENT '产品ID',
  `name` varchar(100) NOT NULL COMMENT '参数名称',
  `value` varchar(100) NOT NULL COMMENT '参数值',
  `unit` varchar(20) DEFAULT NULL COMMENT '参数单位',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规格参数表';

-- 创建产品价格区间表
CREATE TABLE IF NOT EXISTS `sk_product_price_break` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` varchar(100) NOT NULL COMMENT '产品ID',
  `quantity` int(11) NOT NULL COMMENT '数量分界点',
  `price` decimal(10,2) NOT NULL COMMENT '对应单价',
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `quantity` (`quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品价格区间表';

-- 插入产品数据
INSERT INTO `sk_product` (`product_id`, `model_number`, `brand`, `category_id`, `subcategory`, `name`, `description`, `image_url`, `status`, `package_type`, `package_packaging`, `stock`, `inventory_min_order_quantity`, `inventory_lead_time`, `pricing_unit_price`, `pricing_currency`, `compliance_rohs`, `compliance_reach`, `compliance_eccn`, `links_datasheet_url`, `links_product_page_url`, `links_simulation_model_url`, `update_time`, `create_time`) VALUES
('SKU-1001', 'STM32F407VGT6', 'STMicroelectronics', 'MCU', 'ARM Cortex-M4', 'MCU 32-bit ARM Cortex M4 RISC 1MB Flash', 'High-performance MCU with 168MHz CPU, 1MB Flash, 192KB RAM in LQFP100 package.', 'https://example.com/images/stm32f407.jpg', 'Active', 'LQFP100', 'Tray', 1500, 1, 'In Stock', 12.50, 'USD', 'Compliant', 'Compliant', '5A992.c', 'https://www.st.com/resource/en/datasheet/stm32f407vg.pdf', 'https://www.st.com/en/microcontrollers-microprocessors/stm32f407vg.html', NULL, '2025-11-10 14:30:00', '2025-11-11 23:00:00'),
('SKU-2002', 'RC0805FR-0710KL', 'Yageo', 'Resistor', 'Chip Resistor - Surface Mount', 'Resistor 10 kOhms 1% 1/8W 0805', 'Thick Film Chip Resistor, 10 kΩ, ±1% Tolerance, 0.125W (1/8W) Power Rating, 0805 Package.', 'https://example.com/images/rc0805.jpg', 'Active', '0805', 'Tape & Reel', 550000, 5000, 'In Stock', 0.005, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://www.yageo.com/en/Product/Detail/rchip/rc_sub/RC0805FR-07', 'https://www.yageo.com/en/Product/Detail/rchip/rc_sub/RC0805FR-07', NULL, '2025-11-11 08:00:00', '2025-11-11 23:00:00'),
('SKU-3003', 'C0805C104K5RACTU', 'KEMET', 'Capacitor', 'MLCC - Surface Mount', 'Capacitor 0.1uF 50V X7R 10% 0805', 'Multilayer Ceramic Capacitor (MLCC), 0.1μF, 50V, X7R Dielectric, ±10% Tolerance, 0805 Package.', 'https://example.com/images/c0805.jpg', 'Active', '0805', 'Tape & Reel', 800000, 4000, 'In Stock', 0.01, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://api.kemet.com/component-edge/download/datasheet/C0805C104K5RACTU.pdf', 'https://www.kemet.com/en/us/capacitor/ceramic/smd/C0805C104K5RACTU.html', NULL, '2025-11-11 09:15:00', '2025-11-11 23:00:00'),
('SKU-4004', 'LTST-C190GKT', 'Lite-On', 'LED', 'Standard LED - SMD', 'LED Green Clear 0603 SMD', 'Standard Green LED, 571nm, Clear Lens, 0603 Package.', 'https://example.com/images/ltst-c190.jpg', 'Active', '0603', 'Tape & Reel', 250000, 3000, 'In Stock', 0.02, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://example.com/datasheets/LTST-C190GKT.pdf', 'https://example.com/products/LTST-C190GKT', NULL, '2025-11-10 11:00:00', '2025-11-11 23:00:00'),
('SKU-5005', 'IRLB8721PBF', 'Infineon', 'Transistor', 'MOSFET - N-Channel', 'MOSFET N-CH 30V 62A TO-220AB', 'N-Channel MOSFET, 30V Vds, 62A Id, Low Rds(on), TO-220 Package. Logic Level Gate Drive.', 'https://example.com/images/irlb8721.jpg', 'Active', 'TO-220AB', 'Tube', 8200, 50, 'In Stock', 0.95, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://www.infineon.com/dgdl/irlb8721pbf.pdf', 'https://www.infineon.com/cms/en/product/power/mosfet/n-channel/irlb8721pbf/', NULL, '2025-11-09 17:00:00', '2025-11-11 23:00:00'),
('SKU-6006', 'DF13-2P-1.25DSA', 'Hirose', 'Connector', 'Wire-to-Board Header', 'Header 2 Pos 1.25mm Pitch SMD', 'Connector Header, 2 Position, 1.25mm Pitch, Surface Mount, Right Angle.', 'https://example.com/images/df13.jpg', 'Active', 'SMD', 'Tape & Reel', 45000, 100, 'In Stock', 0.15, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://www.hirose.com/product/en/download/DF13-2P-1.25DSA', 'https://www.hirose.com/product/en/products/DF13/', NULL, '2025-11-10 16:45:00', '2025-11-11 23:00:00'),
('SKU-7007', 'ABM3B-8.000MHZ-B2-T', 'Abracon', 'Crystal', 'Crystal SMD', 'Crystal 8.000MHz 18pF SMD', '8.000MHz Crystal, ±20ppm Frequency Stability, 18pF Load Capacitance, 50 Ohms ESR.', 'https://example.com/images/abm3b.jpg', 'Active', '5.0mm x 3.2mm', 'Tape & Reel', 75000, 1000, 'In Stock', 0.22, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://abracon.com/datasheets/ABM3B.pdf', 'https://abracon.com/Crystals/ABM3B.pdf', NULL, '2025-11-10 22:00:00', '2025-11-11 23:00:00'),
('SKU-8008', 'AMS1117-3.3', 'Advanced Monolithic Systems', 'Power Management', 'LDO Regulator', 'LDO Regulator 3.3V 1A SOT-223', 'Fixed 3.3V LDO Voltage Regulator, 1A Output Current, SOT-223 Package.', 'https://example.com/images/ams1117.jpg', 'Active', 'SOT-223', 'Tape & Reel', 120000, 2500, 'In Stock', 0.18, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://ams-semi.com/datasheets/AMS1117.pdf', 'https://ams-semi.com/products/ams1117/', NULL, '2025-11-11 01:30:00', '2025-11-11 23:00:00'),
('SKU-9009', 'MLZ2012A1R0WT000', 'TDK', 'Inductor', 'Multilayer Inductor', 'Inductor 1uH 550mA 0805', 'Multilayer Ferrite Inductor, 1.0µH, 550mA Rated Current, 0.2Ω DCR, 0805 Package.', 'https://example.com/images/mlz2012.jpg', 'Active', '0805', 'Tape & Reel', 300000, 4000, 'In Stock', 0.04, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://product.tdk.com/en/search/inductor/inductor/multilayer/mlz2012.pdf', 'https://product.tdk.com/en/search/inductor/inductor/multilayer/MLZ2012A1R0WT000', NULL, '2025-11-10 20:10:00', '2025-11-11 23:00:00'),
('SKU-1010', 'BAT54C', 'Nexperia', 'Diode', 'Schottky Diode - Array', 'Schottky Diode Array 30V 200mA SOT-23', 'Schottky Barrier Diode, Common Cathode Pair, 30V, 200mA, SOT-23 Package.', 'https://example.com/images/bat54c.jpg', 'NRND', 'SOT-23', 'Tape & Reel', 5000, 3000, '6 Weeks', 0.03, 'USD', 'Compliant', 'Compliant', 'EAR99', 'https://assets.nexperia.com/documents/datasheet/BAT54C.pdf', 'https://www.nexperia.com/products/diodes/schottky-diodes/BAT54C.html', NULL, '2025-11-05 10:00:00', '2025-11-11 23:00:00');

-- 插入产品规格参数数据
INSERT INTO `sk_product_specification` (`product_id`, `name`, `value`, `unit`, `sort_order`) VALUES
('SKU-1001', 'Core', 'ARM Cortex-M4', NULL, 0),
('SKU-1001', 'Max Frequency', '168', 'MHz', 1),
('SKU-1001', 'Flash Size', '1', 'MB', 2),
('SKU-1001', 'RAM Size', '192', 'KB', 3),
('SKU-1001', 'Operating Voltage', '1.8V ~ 3.6V', NULL, 4),
('SKU-2002', 'Resistance', '10', 'kΩ', 0),
('SKU-2002', 'Tolerance', '±1', '%', 1),
('SKU-2002', 'Power Rating', '0.125', 'W', 2),
('SKU-2002', 'Size', '0805', NULL, 3),
('SKU-2002', 'Temperature Coefficient', '±100', 'ppm/°C', 4),
('SKU-3003', 'Capacitance', '0.1', 'µF', 0),
('SKU-3003', 'Voltage Rating', '50', 'V', 1),
('SKU-3003', 'Dielectric', 'X7R', NULL, 2),
('SKU-3003', 'Tolerance', '±10', '%', 3),
('SKU-3003', 'Size', '0805', NULL, 4),
('SKU-4004', 'Color', 'Green', NULL, 0),
('SKU-4004', 'Wavelength', '571', 'nm', 1),
('SKU-4004', 'Luminous Intensity', '25', 'mcd', 2),
('SKU-4004', 'Forward Voltage', '2.1', 'V', 3),
('SKU-4004', 'Test Current', '20', 'mA', 4),
('SKU-5005', 'Vds (Drain-Source Voltage)', '30', 'V', 0),
('SKU-5005', 'Id (Continuous Drain Current)', '62', 'A', 1),
('SKU-5005', 'Rds(on) (Max)', '8.7', 'mΩ', 2),
('SKU-5005', 'Vgs(th) (Max)', '2.35', 'V', 3),
('SKU-6006', 'Number of Positions', '2', NULL, 0),
('SKU-6006', 'Pitch', '1.25', 'mm', 1),
('SKU-6006', 'Connector Type', 'Header', NULL, 2),
('SKU-6006', 'Mounting Type', 'Surface Mount, Right Angle', NULL, 3),
('SKU-7007', 'Frequency', '8.000', 'MHz', 0),
('SKU-7007', 'Load Capacitance', '18', 'pF', 1),
('SKU-7007', 'Frequency Stability', '±20', 'ppm', 2),
('SKU-7007', 'ESR', '50', 'Ω', 3),
('SKU-8008', 'Output Voltage', '3.3', 'V', 0),
('SKU-8008', 'Output Current', '1', 'A', 1),
('SKU-8008', 'Dropout Voltage (Max)', '1.3', 'V', 2),
('SKU-8008', 'Line Regulation', '0.2', '% (Max)', 3),
('SKU-9009', 'Inductance', '1.0', 'µH', 0),
('SKU-9009', 'Rated Current', '550', 'mA', 1),
('SKU-9009', 'DCR (Max)', '0.2', 'Ω', 2),
('SKU-9009', 'Tolerance', '±20', '%', 3),
('SKU-1010', 'Diode Type', 'Schottky Array (Common Cathode)', NULL, 0),
('SKU-1010', 'Vr (Reverse Voltage)', '30', 'V', 1),
('SKU-1010', 'If (Forward Current)', '200', 'mA', 2),
('SKU-1010', 'Vf (Forward Voltage) @ If', '0.8', 'V @ 100mA', 3);

-- 插入产品价格区间数据
INSERT INTO `sk_product_price_break` (`product_id`, `quantity`, `price`) VALUES
('SKU-1001', 100, 11.80),
('SKU-1001', 1000, 10.20),
('SKU-2002', 50000, 0.0045),
('SKU-2002', 500000, 0.004),
('SKU-3003', 40000, 0.009),
('SKU-3003', 400000, 0.008),
('SKU-4004', 30000, 0.018),
('SKU-5005', 500, 0.88),
('SKU-5005', 2500, 0.80),
('SKU-6006', 1000, 0.12),
('SKU-7007', 10000, 0.19),
('SKU-8008', 25000, 0.15),
('SKU-9009', 40000, 0.035),
('SKU-1010', 30000, 0.025);