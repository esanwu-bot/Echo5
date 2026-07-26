-- =============================================
-- 数据字典系统表结构设计
-- =============================================

-- 1. 字典项目表
DROP TABLE IF EXISTS `sk_dictionary_project`;
CREATE TABLE `sk_dictionary_project` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `name` varchar(100) NOT NULL COMMENT '项目名称',
  `code` varchar(50) NOT NULL COMMENT '项目编码（唯一标识）',
  `description` varchar(500) DEFAULT NULL COMMENT '项目描述',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序值',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  `delete_time` int(11) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典-项目表';

-- 2. 字典字段表
DROP TABLE IF EXISTS `sk_dictionary_field`;
CREATE TABLE `sk_dictionary_field` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '字段ID',
  `project_id` int(11) unsigned NOT NULL COMMENT '所属项目ID',
  `name` varchar(100) NOT NULL COMMENT '字段名称',
  `code` varchar(50) NOT NULL COMMENT '字段编码',
  `type` varchar(20) NOT NULL COMMENT '字段类型：text=文本,number=数字,textarea=文本域,select=下拉选择,radio=单选,checkbox=多选,image=图片,file=文件,date=日期,datetime=日期时间',
  `data_type` varchar(20) NOT NULL DEFAULT 'string' COMMENT '数据类型：string=字符串,number=数字,boolean=布尔值,array=数组,object=对象',
  `required` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否必填：1=是，0=否',
  `options` text DEFAULT NULL COMMENT '选项配置（用于select/radio/checkbox类型，逗号分隔）',
  `default_value` varchar(255) DEFAULT NULL COMMENT '默认值',
  `description` varchar(500) DEFAULT NULL COMMENT '字段描述',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序值',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  `delete_time` int(11) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort_order`),
  CONSTRAINT `fk_field_project` FOREIGN KEY (`project_id`) REFERENCES `sk_dictionary_project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典-字段表';

-- 3. 字典数据表
DROP TABLE IF EXISTS `sk_dictionary_data`;
CREATE TABLE `sk_dictionary_data` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '数据ID',
  `project_id` int(11) unsigned NOT NULL COMMENT '所属项目ID',
  `field_values` text NOT NULL COMMENT '字段值（JSON格式存储）',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序值',
  `create_time` int(11) NOT NULL COMMENT '创建时间',
  `update_time` int(11) NOT NULL COMMENT '更新时间',
  `delete_time` int(11) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort_order`),
  CONSTRAINT `fk_data_project` FOREIGN KEY (`project_id`) REFERENCES `sk_dictionary_project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据字典-数据表';

-- =============================================
-- 初始化示例数据
-- =============================================

-- 插入示例项目
INSERT INTO `sk_dictionary_project` (`id`, `name`, `code`, `description`, `status`, `sort_order`, `create_time`, `update_time`) VALUES
(1, '产品信息', 'products', '产品信息管理', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '用户资料', 'users', '用户资料管理', 1, 2, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, '系统配置', 'system', '系统配置管理', 0, 3, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 插入示例字段（产品信息项目）
INSERT INTO `sk_dictionary_field` (`id`, `project_id`, `name`, `code`, `type`, `data_type`, `required`, `options`, `default_value`, `description`, `sort_order`, `status`, `create_time`, `update_time`) VALUES
(1, 1, '产品名称', 'name', 'text', 'string', 1, NULL, NULL, '产品名称字段', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, 1, '产品描述', 'description', 'textarea', 'string', 0, NULL, NULL, '产品详细描述', 2, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, 1, '产品价格', 'price', 'number', 'number', 1, NULL, NULL, '产品价格', 3, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(4, 1, '产品分类', 'category', 'select', 'string', 1, '红酒,白酒,啤酒,洋酒', NULL, '产品分类选择', 4, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- 插入示例数据
INSERT INTO `sk_dictionary_data` (`id`, `project_id`, `field_values`, `status`, `sort_order`, `create_time`, `update_time`) VALUES
(1, 1, '{"name":"拉菲红酒","description":"法国进口拉菲红酒，口感醇厚","price":299,"category":"红酒"}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, 1, '{"name":"茅台白酒","description":"贵州茅台经典白酒","price":1599,"category":"白酒"}', 1, 2, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
