-- 创建缺失的表
USE `semiconductor_db`;

-- 创建留言表
CREATE TABLE IF NOT EXISTS `sk_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '电话',
  `company` VARCHAR(100) DEFAULT '' COMMENT '公司',
  `subject` VARCHAR(200) DEFAULT '' COMMENT '主题',
  `content` TEXT NOT NULL COMMENT '内容',
  `type` VARCHAR(20) DEFAULT 'general' COMMENT '类型: general, business, technical',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, replied, closed',
  `reply_content` TEXT COMMENT '回复内容',
  `reply_time` INT DEFAULT 0 COMMENT '回复时间戳',
  `create_time` INT NOT NULL DEFAULT 0 COMMENT '创建时间戳',
  `update_time` INT NOT NULL DEFAULT 0 COMMENT '更新时间戳'
) COMMENT='留言表';

-- 创建文档表
CREATE TABLE IF NOT EXISTS `sk_document` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
  `description` TEXT COMMENT '文档描述',
  `content` TEXT COMMENT '文档内容',
  `category` VARCHAR(50) DEFAULT '' COMMENT '分类',
  `file_path` VARCHAR(255) DEFAULT '' COMMENT '文件路径',
  `file_size` INT DEFAULT 0 COMMENT '文件大小',
  `file_type` VARCHAR(50) DEFAULT '' COMMENT '文件类型',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `create_time` INT NOT NULL DEFAULT 0 COMMENT '创建时间戳',
  `update_time` INT NOT NULL DEFAULT 0 COMMENT '更新时间戳'
) COMMENT='文档表';

-- 修改报价请求表添加created_at字段（如果不存在）
ALTER TABLE `sk_quote_request` 
ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

ALTER TABLE `sk_sample_apply` 
ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

-- 修改订单表字段名（如果total_price不存在）
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'semiconductor_db' AND TABLE_NAME = 'sk_order' AND COLUMN_NAME = 'total_amount');

SET @sql = IF(@exists = 0, 
  'ALTER TABLE `sk_order` CHANGE COLUMN `total_price` `total_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT "总金额"',
  'SELECT "total_amount column already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;