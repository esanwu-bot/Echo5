-- 报价申请表
CREATE TABLE IF NOT EXISTS `sk_quote_request` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT '用户ID',
  `company` varchar(200) DEFAULT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `phone` varchar(50) NOT NULL COMMENT '电话',
  `product_info` json DEFAULT NULL COMMENT '产品信息',
  `quantity` varchar(100) DEFAULT NULL COMMENT '数量',
  `message` text COMMENT '留言',
  `status` tinyint(1) DEFAULT '0' COMMENT '状态 0待处理 1已处理 2已拒绝',
  `reply_content` text COMMENT '回复内容',
  `reply_time` datetime DEFAULT NULL COMMENT '回复时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价申请表';

-- 样品申请表
CREATE TABLE IF NOT EXISTS `sk_sample_apply` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT '用户ID',
  `company` varchar(200) DEFAULT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `phone` varchar(50) NOT NULL COMMENT '电话',
  `address` varchar(500) NOT NULL COMMENT '收货地址',
  `product_id` int(11) DEFAULT NULL COMMENT '产品ID',
  `product_name` varchar(200) DEFAULT NULL COMMENT '产品名称',
  `quantity` int(11) DEFAULT '1' COMMENT '申请数量',
  `purpose` text COMMENT '使用目的',
  `status` tinyint(1) DEFAULT '0' COMMENT '状态 0待处理 1已发货 2已拒绝',
  `tracking_number` varchar(100) DEFAULT NULL COMMENT '快递单号',
  `reply_content` text COMMENT '回复内容',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品申请表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS `sk_config` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `group` varchar(50) DEFAULT 'system' COMMENT '分组',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
