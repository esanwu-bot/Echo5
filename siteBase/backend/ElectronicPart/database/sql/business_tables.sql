-- 业务申请相关表结构

-- 报价申请表
CREATE TABLE IF NOT EXISTS `sk_quote_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT 0 COMMENT '用户ID',
  `company` varchar(255) NOT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人',
  `email` varchar(255) NOT NULL COMMENT '邮箱',
  `phone` varchar(50) NOT NULL COMMENT '电话',
  `product_info` text NOT NULL COMMENT '产品信息',
  `quantity` int(11) NOT NULL COMMENT '数量',
  `message` text COMMENT '备注信息',
  `status` enum('pending','processing','completed','rejected') DEFAULT 'pending' COMMENT '状态',
  `reply_content` text COMMENT '回复内容',
  `reply_time` int(11) DEFAULT NULL COMMENT '回复时间',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='报价申请表';

-- 样品申请表
CREATE TABLE IF NOT EXISTS `sk_sample_apply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT 0 COMMENT '用户ID',
  `company` varchar(255) NOT NULL COMMENT '公司名称',
  `contact_name` varchar(100) NOT NULL COMMENT '联系人',
  `email` varchar(255) NOT NULL COMMENT '邮箱',
  `phone` varchar(50) NOT NULL COMMENT '电话',
  `address` text NOT NULL COMMENT '收货地址',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `product_name` varchar(255) NOT NULL COMMENT '产品名称',
  `quantity` int(11) NOT NULL COMMENT '申请数量',
  `purpose` text COMMENT '使用目的',
  `status` enum('pending','approved','shipped','delivered','rejected') DEFAULT 'pending' COMMENT '状态',
  `tracking_number` varchar(100) DEFAULT NULL COMMENT '快递单号',
  `reply_content` text COMMENT '回复内容',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品申请表';

-- 职位表
CREATE TABLE IF NOT EXISTS `sk_job` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_title` varchar(255) NOT NULL COMMENT '职位名称',
  `department` varchar(100) NOT NULL COMMENT '部门',
  `location` varchar(100) NOT NULL COMMENT '工作地点',
  `job_type` enum('full-time','part-time','contract','intern') DEFAULT 'full-time' COMMENT '工作类型',
  `salary_range` varchar(100) DEFAULT NULL COMMENT '薪资范围',
  `requirements` text NOT NULL COMMENT '职位要求',
  `responsibilities` text NOT NULL COMMENT '工作职责',
  `status` enum('active','inactive') DEFAULT 'active' COMMENT '状态',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职位表';

-- 职位申请表
CREATE TABLE IF NOT EXISTS `sk_job_apply` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL COMMENT '职位ID',
  `name` varchar(100) NOT NULL COMMENT '姓名',
  `email` varchar(255) NOT NULL COMMENT '邮箱',
  `phone` varchar(50) NOT NULL COMMENT '电话',
  `resume_url` varchar(500) DEFAULT NULL COMMENT '简历文件URL',
  `cover_letter` text COMMENT '求职信',
  `status` enum('pending','interviewed','hired','rejected') DEFAULT 'pending' COMMENT '状态',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职位申请表';

-- 插入示例数据

-- 示例职位数据
INSERT INTO `sk_job` (`job_title`, `department`, `location`, `job_type`, `salary_range`, `requirements`, `responsibilities`, `status`, `create_time`, `update_time`) VALUES
('高级硬件工程师', '研发部', '深圳', 'full-time', '20K-35K', '本科及以上学历，电子工程相关专业，3年以上硬件设计经验', '负责半导体产品的硬件设计和测试，参与新产品开发', 'active', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('销售工程师', '销售部', '上海', 'full-time', '15K-25K', '本科学历，电子或市场营销专业，有B2B销售经验优先', '负责客户开发和维护，产品推广和技术支持', 'active', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('产品经理', '产品部', '北京', 'full-time', '25K-40K', '本科及以上学历，5年以上产品管理经验，熟悉半导体行业', '负责产品规划和市场分析，协调研发和销售团队', 'active', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());