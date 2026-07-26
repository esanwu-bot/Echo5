-- 横幅表结构
CREATE TABLE IF NOT EXISTS `sk_banner` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT '横幅标题',
  `subtitle` varchar(255) DEFAULT NULL COMMENT '副标题',
  `image` varchar(500) NOT NULL COMMENT '图片路径',
  `link` varchar(500) DEFAULT NULL COMMENT '跳转链接',
  `position` varchar(50) NOT NULL DEFAULT 'home' COMMENT '显示位置：home-首页，products-产品页等',
  `description` text COMMENT '描述',
  `sort` int(11) NOT NULL DEFAULT 0 COMMENT '排序值，数值越小越靠前',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `start_time` int(11) DEFAULT NULL COMMENT '开始时间',
  `end_time` int(11) DEFAULT NULL COMMENT '结束时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_position` (`position`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`),
  KEY `idx_start_end_time` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='横幅管理表';

-- 插入示例横幅数据
INSERT INTO `sk_banner` (`title`, `subtitle`, `image`, `link`, `position`, `description`, `sort`, `status`) VALUES
('天启芯科技 - 创新引领未来', '专注于智能科技产品的研发与应用', '/uploads/banners/home-banner-1.jpg', '/about', 'home', '首页主横幅，展示公司核心价值', 1, 1),
('智能芯片解决方案', '提供高性能、低功耗的智能芯片产品', '/uploads/banners/home-banner-2.jpg', '/products', 'home', '产品横幅，重点展示芯片产品', 2, 1),
('全球技术支持', '24小时专业技术支持服务', '/uploads/banners/home-banner-3.jpg', '/support', 'home', '服务横幅，强调技术支持能力', 3, 1);