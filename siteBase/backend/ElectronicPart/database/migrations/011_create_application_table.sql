-- 创建应用领域表
CREATE TABLE `sk_application` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL COMMENT '应用领域标题',
  `title_en` VARCHAR(255) DEFAULT NULL COMMENT '英文标题',
  `description` TEXT COMMENT '描述',
  `description_en` TEXT COMMENT '英文描述',
  `cover_image` VARCHAR(255) DEFAULT NULL COMMENT '封面图片',
  `icon` VARCHAR(100) DEFAULT NULL COMMENT '图标',
  `content` LONGTEXT COMMENT '详细内容',
  `content_en` LONGTEXT COMMENT '英文详细内容',
  `features` JSON DEFAULT NULL COMMENT '特性列表',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0=禁用，1=启用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用领域表';

-- 插入示例数据
INSERT INTO `sk_application` (`title`, `title_en`, `description`, `description_en`, `cover_image`, `icon`, `content`, `sort`, `status`) VALUES
('半导体制造', 'Semiconductor Manufacturing', '提供半导体制造过程中的各种解决方案和产品', 'Providing various solutions and products for semiconductor manufacturing processes', '/uploads/application/semiconductor.jpg', 'icon-chip', '半导体制造是我们的核心应用领域之一，我们提供从晶圆加工到封装测试的全流程解决方案。', 1, 1),
('电子封装', 'Electronic Packaging', '专业的电子封装材料和技术支持', 'Professional electronic packaging materials and technical support', '/uploads/application/packaging.jpg', 'icon-package', '我们提供各种电子封装材料，包括封装基板、封装胶、焊料等，满足不同封装需求。', 2, 1),
('光伏新能源', 'Photovoltaic New Energy', '光伏产业的高纯材料和解决方案', 'High purity materials and solutions for photovoltaic industry', '/uploads/application/solar.jpg', 'icon-solar', '为光伏产业提供高纯硅材料、导电浆料等关键材料，助力新能源产业发展。', 3, 1),
('LED照明', 'LED Lighting', 'LED制造的高品质材料和工艺支持', 'High-quality materials and process support for LED manufacturing', '/uploads/application/led.jpg', 'icon-light', '提供LED制造所需的衬底材料、荧光粉、封装材料等，确保LED产品的高性能和高可靠性。', 4, 1);