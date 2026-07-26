-- Generic Data Dictionary System SQL Script
-- Compatible with MySQL
-- This system supports various field types like text, dropdown, image, etc.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for dictionary_projects
-- ----------------------------
DROP TABLE IF EXISTS `dictionary_projects`;
CREATE TABLE `dictionary_projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL COMMENT '项目名称',
  `code` varchar(100) NOT NULL COMMENT '项目代码',
  `description` text COMMENT '项目描述',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '状态 1启用 0禁用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `status` (`status`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典项目表';

-- ----------------------------
-- Table structure for dictionary_fields
-- ----------------------------
DROP TABLE IF EXISTS `dictionary_fields`;
CREATE TABLE `dictionary_fields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL COMMENT '项目ID',
  `name` varchar(200) NOT NULL COMMENT '字段名称',
  `code` varchar(100) NOT NULL COMMENT '字段代码',
  `field_type` varchar(50) NOT NULL COMMENT '字段类型: text, textarea, number, select, radio, checkbox, image, file, date, datetime, boolean',
  `data_type` varchar(50) NOT NULL DEFAULT 'string' COMMENT '数据类型: string, integer, decimal, boolean, json, array',
  `options` text COMMENT '选项配置(JSON格式)',
  `default_value` text COMMENT '默认值',
  `placeholder` varchar(500) DEFAULT NULL COMMENT '占位符',
  `required` int(11) NOT NULL DEFAULT '0' COMMENT '是否必填 1是 0否',
  `min_length` int(11) DEFAULT NULL COMMENT '最小长度',
  `max_length` int(11) DEFAULT NULL COMMENT '最大长度',
  `min_value` decimal(15,4) DEFAULT NULL COMMENT '最小值',
  `max_value` decimal(15,4) DEFAULT NULL COMMENT '最大值',
  `regex_pattern` varchar(500) DEFAULT NULL COMMENT '正则表达式',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '状态 1启用 0禁用',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id_code` (`project_id`,`code`),
  KEY `project_id` (`project_id`),
  KEY `field_type` (`field_type`),
  KEY `status` (`status`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典字段表';

-- ----------------------------
-- Table structure for dictionary_data
-- ----------------------------
DROP TABLE IF EXISTS `dictionary_data`;
CREATE TABLE `dictionary_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL COMMENT '项目ID',
  `title` varchar(500) NOT NULL COMMENT '数据标题',
  `code` varchar(100) NOT NULL COMMENT '数据代码',
  `field_values` text NOT NULL COMMENT '字段值(JSON格式)',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '状态 1启用 0禁用',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id_code` (`project_id`,`code`),
  KEY `project_id` (`project_id`),
  KEY `status` (`status`),
  KEY `sort_order` (`sort_order`),
  KEY `title` (`title`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典数据表';

-- ----------------------------
-- Table structure for dictionary_field_options
-- ----------------------------
DROP TABLE IF EXISTS `dictionary_field_options`;
CREATE TABLE `dictionary_field_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `field_id` int(11) NOT NULL COMMENT '字段ID',
  `label` varchar(200) NOT NULL COMMENT '选项标签',
  `value` varchar(200) NOT NULL COMMENT '选项值',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '状态 1启用 0禁用',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `field_id` (`field_id`),
  KEY `sort_order` (`sort_order`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典字段选项表';

-- ----------------------------
-- Sample data for dictionary_projects
-- ----------------------------
INSERT INTO `dictionary_projects` (`name`, `code`, `description`, `status`, `sort_order`, `created_at`, `updated_at`) VALUES
('Banner管理', 'banner_management', 'Banner广告位管理系统', 1, 1, NOW(), NOW()),
('商品分类', 'product_category', '商品分类管理系统', 1, 2, NOW(), NOW()),
('订单状态', 'order_status', '订单状态管理系统', 1, 3, NOW(), NOW()),
('用户等级', 'user_level', '用户等级管理系统', 1, 4, NOW(), NOW());

-- ----------------------------
-- Sample data for dictionary_fields (Banner管理项目)
-- ----------------------------
INSERT INTO `dictionary_fields` (`project_id`, `name`, `code`, `field_type`, `data_type`, `options`, `required`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Banner标题', 'title', 'text', 'string', '{"maxLength":100}', 1, 1, 1, NOW(), NOW()),
(1, '图片链接', 'image', 'image', 'string', '{"fileTypes":["jpg","jpeg","png","gif"],"maxSize":5242880}', 1, 2, 1, NOW(), NOW()),
(1, '跳转链接', 'link', 'text', 'string', '{"pattern":"^https?://.*"}', 1, 3, 1, NOW(), NOW()),
(1, '显示位置', 'position', 'select', 'string', '{"options":["home_top","category_top","product_detail"]}', 1, 4, 1, NOW(), NOW()),
(1, '状态', 'status', 'radio', 'string', '{"options":["active","inactive"]}', 1, 5, 1, NOW(), NOW()),
(1, '排序值', 'sort_order', 'number', 'integer', '{"minValue":0,"maxValue":999}', 1, 6, 1, NOW(), NOW());

-- ----------------------------
-- Sample data for dictionary_field_options (显示位置字段)
-- ----------------------------
INSERT INTO `dictionary_field_options` (`field_id`, `label`, `value`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES
(4, '首页顶部', 'home_top', 1, 1, NOW(), NOW()),
(4, '分类页顶部', 'category_top', 2, 1, NOW(), NOW()),
(4, '商品详情页', 'product_detail', 3, 1, NOW(), NOW());

-- ----------------------------
-- Sample data for dictionary_field_options (状态字段)
-- ----------------------------
INSERT INTO `dictionary_field_options` (`field_id`, `label`, `value`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES
(5, '启用', 'active', 1, 1, NOW(), NOW()),
(5, '禁用', 'inactive', 2, 1, NOW(), NOW());

-- ----------------------------
-- Sample data for dictionary_data (Banner数据)
-- ----------------------------
INSERT INTO `dictionary_data` (`project_id`, `title`, `code`, `field_values`, `status`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, '首页轮播图1', 'home_banner_1', '{"title":"首页轮播图1","image":"/banners/home-1.jpg","link":"/products/1","position":"home_top","status":"active","sort_order":1}', 1, 1, NOW(), NOW()),
(1, '首页轮播图2', 'home_banner_2', '{"title":"首页轮播图2","image":"/banners/home-2.jpg","link":"/products/2","position":"home_top","status":"active","sort_order":2}', 1, 2, NOW(), NOW()),
(1, '分类页广告', 'category_banner_1', '{"title":"分类页广告","image":"/banners/category.jpg","link":"/categories/1","position":"category_top","status":"inactive","sort_order":1}', 1, 3, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;