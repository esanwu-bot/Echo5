-- 酒水商城代理系统数据库表结构
-- 使用ag_前缀区分代理商相关表

-- 1. 代理商表
CREATE TABLE `ag_agents` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '代理商ID',
  `agent_code` varchar(50) NOT NULL COMMENT '代理商编码',
  `company_name` varchar(255) NOT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `contact_email` varchar(100) NOT NULL COMMENT '联系邮箱',
  `business_license` varchar(255) DEFAULT NULL COMMENT '营业执照号',
  `address` text COMMENT '公司地址',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `district` varchar(50) DEFAULT NULL COMMENT '区县',
  `level` tinyint(2) NOT NULL DEFAULT '1' COMMENT '代理级别：1=一级，2=二级，3=三级',
  `parent_id` int(11) DEFAULT NULL COMMENT '上级代理商ID',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=正常，0=禁用，2=待审核',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '佣金比例(%)',
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '信用额度',
  `used_credit` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '已用信用额度',
  `total_sales` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT '累计销售额',
  `total_commission` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '累计佣金',
  `join_time` datetime NOT NULL COMMENT '加入时间',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_code` (`agent_code`),
  UNIQUE KEY `uk_contact_email` (`contact_email`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_status` (`status`),
  KEY `idx_province_city` (`province`, `city`),
  CONSTRAINT `fk_ag_agents_parent` FOREIGN KEY (`parent_id`) REFERENCES `ag_agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商表';

-- 2. 代理商用户表
CREATE TABLE `ag_agent_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `agent_id` int(11) NOT NULL COMMENT '代理商ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码',
  `real_name` varchar(100) NOT NULL COMMENT '真实姓名',
  `phone` varchar(20) NOT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `role` varchar(50) NOT NULL DEFAULT 'agent' COMMENT '角色：admin=管理员，agent=代理商，staff=员工',
  `permissions` json DEFAULT NULL COMMENT '权限列表',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=正常，0=禁用',
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT '最后登录IP',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `fk_agent_id` (`agent_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ag_agent_users_agent` FOREIGN KEY (`agent_id`) REFERENCES `ag_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商用户表';

-- 3. 代理商订单表
CREATE TABLE `ag_agent_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` varchar(50) NOT NULL COMMENT '订单号',
  `agent_id` int(11) NOT NULL COMMENT '代理商ID',
  `customer_name` varchar(100) NOT NULL COMMENT '客户姓名',
  `customer_phone` varchar(20) NOT NULL COMMENT '客户电话',
  `customer_address` text NOT NULL COMMENT '客户地址',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '订单总金额',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '优惠金额',
  `final_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '实付金额',
  `commission_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '佣金金额',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '佣金比例',
  `payment_method` varchar(50) DEFAULT NULL COMMENT '支付方式',
  `payment_status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '支付状态：0=未支付，1=已支付，2=部分支付',
  `order_status` varchar(50) NOT NULL DEFAULT 'pending' COMMENT '订单状态：pending=待处理，confirmed=已确认，shipped=已发货，completed=已完成，cancelled=已取消',
  `delivery_time` datetime DEFAULT NULL COMMENT '发货时间',
  `completed_time` datetime DEFAULT NULL COMMENT '完成时间',
  `remark` text COMMENT '备注',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `fk_ao_agent_id` (`agent_id`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_created_time` (`created_time`),
  CONSTRAINT `fk_ag_agent_orders_agent` FOREIGN KEY (`agent_id`) REFERENCES `ag_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商订单表';

-- 4. 代理商订单商品表
CREATE TABLE `ag_agent_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '订单商品ID',
  `order_id` int(11) NOT NULL COMMENT '订单ID',
  `product_id` int(11) NOT NULL COMMENT '商品ID',
  `product_name` varchar(255) NOT NULL COMMENT '商品名称',
  `product_image` varchar(500) DEFAULT NULL COMMENT '商品图片',
  `product_spec` varchar(255) DEFAULT NULL COMMENT '商品规格',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '商品单价',
  `quantity` int(11) NOT NULL DEFAULT '1' COMMENT '购买数量',
  `total_price` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '小计金额',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `fk_aoi_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_ag_agent_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `ag_agent_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商订单商品表';

-- 5. 佣金记录表
CREATE TABLE `ag_commission_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '佣金记录ID',
  `agent_id` int(11) NOT NULL COMMENT '代理商ID',
  `order_id` int(11) NOT NULL COMMENT '订单ID',
  `commission_type` varchar(50) NOT NULL DEFAULT 'direct' COMMENT '佣金类型：direct=直接佣金，indirect=间接佣金',
  `commission_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '佣金金额',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '佣金比例',
  `order_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '订单金额',
  `status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '状态：0=待结算，1=已结算，2=已取消',
  `settlement_time` datetime DEFAULT NULL COMMENT '结算时间',
  `remark` text COMMENT '备注',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `fk_cr_agent_id` (`agent_id`),
  KEY `fk_cr_order_id` (`order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_time` (`created_time`),
  CONSTRAINT `fk_ag_commission_records_agent` FOREIGN KEY (`agent_id`) REFERENCES `ag_agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ag_commission_records_order` FOREIGN KEY (`order_id`) REFERENCES `ag_agent_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='佣金记录表';

-- 6. 代理商产品价格表
CREATE TABLE `ag_agent_product_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `agent_id` int(11) NOT NULL COMMENT '代理商ID',
  `product_id` int(11) NOT NULL COMMENT '商品ID',
  `original_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '原价',
  `agent_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '代理价',
  `discount_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '折扣率',
  `min_quantity` int(11) NOT NULL DEFAULT '1' COMMENT '最小起订量',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `effective_time` datetime NOT NULL COMMENT '生效时间',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_product` (`agent_id`, `product_id`),
  KEY `fk_app_agent_id` (`agent_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ag_agent_product_prices_agent` FOREIGN KEY (`agent_id`) REFERENCES `ag_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商产品价格表';

-- 7. 代理商申请表
CREATE TABLE `ag_agent_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '申请ID',
  `application_no` varchar(50) NOT NULL COMMENT '申请编号',
  `company_name` varchar(255) NOT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) NOT NULL COMMENT '联系电话',
  `contact_email` varchar(100) NOT NULL COMMENT '联系邮箱',
  `business_license` varchar(255) DEFAULT NULL COMMENT '营业执照号',
  `license_image` varchar(500) DEFAULT NULL COMMENT '营业执照图片',
  `address` text COMMENT '公司地址',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `district` varchar(50) DEFAULT NULL COMMENT '区县',
  `business_scope` text COMMENT '经营范围',
  `expected_level` tinyint(2) NOT NULL DEFAULT '1' COMMENT '期望代理级别',
  `expected_area` text COMMENT '期望代理区域',
  `experience` text COMMENT '相关经验',
  `status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '状态：0=待审核，1=已通过，2=已拒绝',
  `review_time` datetime DEFAULT NULL COMMENT '审核时间',
  `review_user` varchar(100) DEFAULT NULL COMMENT '审核人',
  `review_remark` text COMMENT '审核备注',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_application_no` (`application_no`),
  KEY `idx_status` (`status`),
  KEY `idx_created_time` (`created_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商申请表';

-- 8. 代理商区域表
CREATE TABLE `ag_agent_areas` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `agent_id` int(11) NOT NULL COMMENT '代理商ID',
  `province` varchar(50) NOT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `district` varchar(50) DEFAULT NULL COMMENT '区县',
  `is_exclusive` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否独家：1=是，0=否',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=有效，0=无效',
  `created_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `fk_aa_agent_id` (`agent_id`),
  KEY `idx_area` (`province`, `city`, `district`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ag_agent_areas_agent` FOREIGN KEY (`agent_id`) REFERENCES `ag_agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理商区域表';

-- 插入初始数据

-- 插入示例代理商
INSERT INTO `ag_agents` (`agent_code`, `company_name`, `contact_name`, `contact_phone`, `contact_email`, `address`, `province`, `city`, `level`, `commission_rate`, `credit_limit`, `join_time`) VALUES
('AG001', '北京酒水贸易有限公司', '张三', '13800138001', 'zhangsan@example.com', '北京市朝阳区建国路1号', '北京市', '北京市', 1, 10.00, 100000.00, '2024-01-01 10:00:00'),
('AG002', '上海酒业销售公司', '李四', '13800138002', 'lisi@example.com', '上海市浦东新区陆家嘴1号', '上海市', '上海市', 1, 8.00, 80000.00, '2024-01-02 10:00:00'),
('AG003', '广州酒水经销商', '王五', '13800138003', 'wangwu@example.com', '广州市天河区珠江新城1号', '广东省', '广州市', 2, 6.00, 50000.00, '2024-01-03 10:00:00');

-- 插入代理商用户
INSERT INTO `ag_agent_users` (`agent_id`, `username`, `password`, `real_name`, `phone`, `email`, `role`) VALUES
(1, 'agent001', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '张三', '13800138001', 'zhangsan@example.com', 'agent'),
(2, 'agent002', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '李四', '13800138002', 'lisi@example.com', 'agent'),
(3, 'agent003', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '王五', '13800138003', 'wangwu@example.com', 'agent');