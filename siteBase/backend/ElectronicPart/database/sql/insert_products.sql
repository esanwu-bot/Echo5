-- 向sk_products表插入电子元件数据

-- 插入集成电路产品
INSERT INTO `sk_products` (`name`, `product_code`, `model_id`, `brand_id`, `category_id`, `subcategory_id`, `description`, `specs`, `images`, `status`, `sort`, `views`) VALUES
('Intel Core i9-13900K', 'IC001', 1, 1, 1, NULL, '第13代Intel Core i9处理器，24核32线程', '{"core_count": 24, "thread_count": 32, "base_frequency": "3.0 GHz", "max_turbo_frequency": "5.8 GHz", "tdp": 125}', '["https://example.com/products/intel-i9-13900k-1.jpg", "https://example.com/products/intel-i9-13900k-2.jpg"]', 1, 1, 0),
('AMD Ryzen 9 7950X', 'IC002', 2, 2, 1, NULL, 'AMD Ryzen 9 7000系列处理器，16核32线程', '{"core_count": 16, "thread_count": 32, "base_frequency": "4.5 GHz", "max_turbo_frequency": "5.7 GHz", "tdp": 170}', '["https://example.com/products/amd-ryzen-9-7950x-1.jpg"]', 1, 2, 0),
('NVIDIA GeForce RTX 4090', 'IC003', 3, 3, 2, NULL, 'NVIDIA旗舰级显卡，24GB GDDR6X显存', '{"memory": "24GB GDDR6X", "cuda_cores": 16384, "base_clock": "2230 MHz", "boost_clock": "2520 MHz", "tdp": 450}', '["https://example.com/products/nvidia-rtx-4090-1.jpg", "https://example.com/products/nvidia-rtx-4090-2.jpg"]', 1, 1, 0),
('Samsung DDR5 32GB', 'IC004', 4, 4, 3, NULL, 'Samsung DDR5内存，32GB容量，6000MHz频率', '{"capacity": "32GB", "frequency": "6000 MHz", "type": "DDR5", "voltage": "1.35V"}', '["https://example.com/products/samsung-ddr5-32gb-1.jpg"]', 1, 1, 0),
('TI LM358 Dual Op-Amp', 'IC005', 5, 5, 4, 5, 'TI LM358双运算放大器，低功耗，宽电压范围', '{"type": "Dual Op-Amp", "supply_voltage": "3V - 32V", "input_offset_voltage": "2mV", "bandwidth": "1MHz"}', '["https://example.com/products/ti-lm358-1.jpg"]', 1, 1, 0),
('ATMEGA328P', 'IC006', 6, 6, 4, NULL, 'ATMEGA328P，8位AVR单片机，Arduino Uno核心', '{"type": "8位MCU", "flash_memory": "32KB", "ram": "2KB", "eeprom": "1KB", "operating_voltage": "1.8V - 5.5V"}', '["https://example.com/products/atmega328p-1.jpg"]', 1, 2, 0),
('ESP8266', 'IC007', 7, 7, 4, NULL, 'ESP8266 WiFi模块，低成本，高性能', '{"type": "WiFi模块", "processor": "Tensilica L106", "flash": "4MB", "operating_voltage": "3.3V"}', '["https://example.com/products/esp8266-1.jpg"]', 1, 3, 0),
('LM7805', 'IC008', 8, 5, 4, 5, 'LM7805线性稳压器，5V输出', '{"type": "线性稳压器", "output_voltage": "5V", "max_current": "1.5A", "input_voltage": "7V - 35V"}', '["https://example.com/products/lm7805-1.jpg"]', 1, 2, 0);

-- 插入电阻产品
INSERT INTO `sk_products` (`name`, `product_code`, `model_id`, `brand_id`, `category_id`, `subcategory_id`, `description`, `specs`, `images`, `status`, `sort`, `views`) VALUES
('RC0402 10kΩ 1%', 'RES001', 9, 8, 4, 5, '0402封装贴片电阻，10kΩ阻值，±1%容差', '{"resistance": "10kΩ", "tolerance": "±1%", "power": "0.0625W", "temperature_coefficient": "±100ppm/℃", "package": "0402"}', '["https://example.com/products/rc0402-10k-1.jpg"]', 1, 1, 0),
('RC0603 1kΩ 5%', 'RES002', 10, 8, 4, 5, '0603封装贴片电阻，1kΩ阻值，±5%容差', '{"resistance": "1kΩ", "tolerance": "±5%", "power": "0.125W", "temperature_coefficient": "±100ppm/℃", "package": "0603"}', '["https://example.com/products/rc0603-1k-1.jpg"]', 1, 2, 0),
('1N4007 1A 1000V', 'DIODE001', 11, 9, 4, 6, '1N4007整流二极管，1A电流，1000V电压', '{"type": "整流二极管", "current": "1A", "voltage": "1000V", "package": "DO-41"}', '["https://example.com/products/1n4007-1.jpg"]', 1, 1, 0),
('1N4148 150mA 100V', 'DIODE002', 12, 9, 4, 6, '1N4148开关二极管，150mA电流，100V电压', '{"type": "开关二极管", "current": "150mA", "voltage": "100V", "package": "DO-35"}', '["https://example.com/products/1n4148-1.jpg"]', 1, 2, 0),
('2N2222 600mA 40V', 'TRANS001', 13, 10, 4, 7, '2N2222 NPN三极管，600mA电流，40V电压', '{"type": "NPN三极管", "current": "600mA", "voltage": "40V", "hfe": "30-300", "package": "TO-92"}', '["https://example.com/products/2n2222-1.jpg"]', 1, 1, 0),
('IRF540 33A 100V', 'MOSFET001', 14, 11, 4, 8, 'IRF540 N沟道MOSFET，33A电流，100V电压', '{"type": "N沟道MOSFET", "current": "33A", "voltage": "100V", "rds_on": "0.044Ω", "package": "TO-220"}', '["https://example.com/products/irf540-1.jpg"]', 1, 1, 0);

-- 插入电容产品
INSERT INTO `sk_products` (`name`, `product_code`, `model_id`, `brand_id`, `category_id`, `subcategory_id`, `description`, `specs`, `images`, `status`, `sort`, `views`) VALUES
('CC0402 100nF 50V', 'CAP001', 15, 8, 4, 9, '0402封装贴片电容，100nF容量，50V电压', '{"capacitance": "100nF", "voltage": "50V", "tolerance": "±10%", "temperature_coefficient": "X7R", "package": "0402"}', '["https://example.com/products/cc0402-100nf-1.jpg"]', 1, 1, 0),
('CC0603 10μF 25V', 'CAP002', 16, 8, 4, 9, '0603封装贴片电容，10μF容量，25V电压', '{"capacitance": "10μF", "voltage": "25V", "tolerance": "±20%", "temperature_coefficient": "X5R", "package": "0603"}', '["https://example.com/products/cc0603-10uf-1.jpg"]', 1, 2, 0),
('1000μF 16V', 'CAP003', 17, 12, 4, 9, '电解电容，1000μF容量，16V电压', '{"capacitance": "1000μF", "voltage": "16V", "type": "电解电容", "package": "Radial"}', '["https://example.com/products/1000uf-16v-1.jpg"]', 1, 3, 0);

-- 插入电感产品
INSERT INTO `sk_products` (`name`, `product_code`, `model_id`, `brand_id`, `category_id`, `subcategory_id`, `description`, `specs`, `images`, `status`, `sort`, `views`) VALUES
('LL0402 100nH', 'IND001', 18, 13, 4, 10, '0402封装贴片电感，100nH电感量', '{"inductance": "100nH", "tolerance": "±5%", "current": "100mA", "resistance": "0.3Ω", "package": "0402"}', '["https://example.com/products/ll0402-100nh-1.jpg"]', 1, 1, 0),
('LL0603 1μH', 'IND002', 19, 13, 4, 10, '0603封装贴片电感，1μH电感量', '{"inductance": "1μH", "tolerance": "±5%", "current": "200mA", "resistance": "0.2Ω", "package": "0603"}', '["https://example.com/products/ll0603-1uh-1.jpg"]', 1, 2, 0);

-- 插入IC产品
INSERT INTO `sk_products` (`name`, `product_code`, `model_id`, `brand_id`, `category_id`, `subcategory_id`, `description`, `specs`, `images`, `status`, `sort`, `views`) VALUES
('SN74HC00', 'IC009', 20, 5, 4, NULL, 'SN74HC00，4路2输入与非门', '{"type": "逻辑IC", "gate_type": "与非门", "number_of_gates": 4, "input_voltage": "2V - 6V", "output_current": "4mA"}', '["https://example.com/products/sn74hc00-1.jpg"]', 1, 3, 0),
('NE555', 'IC010', 21, 5, 4, NULL, 'NE555定时器IC', '{"type": "定时器", "supply_voltage": "4.5V - 16V", "output_current": "200mA", "frequency_range": "0.1Hz - 1MHz"}', '["https://example.com/products/ne555-1.jpg"]', 1, 4, 0);
