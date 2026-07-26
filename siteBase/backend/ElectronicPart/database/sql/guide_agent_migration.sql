-- 导购Agent数据库迁移
-- 执行时间：2026-05-28
-- 说明：为agent_sessions表添加type字段，创建guide_search_history表
-- 兼容：MySQL 5.7+（不使用 IF NOT EXISTS 语法）

-- 1. 为agent_sessions表添加type字段
-- 如果字段已存在会报错，可忽略 Duplicate column name 错误
ALTER TABLE `agent_sessions`
ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'analytics' COMMENT '会话类型: guide-导购, analytics-数据分析' AFTER `session_id`;

-- 2. 为type字段添加索引
-- 如果索引已存在会报错，可忽略 Duplicate key name 错误
ALTER TABLE `agent_sessions`
ADD INDEX `idx_type` (`type`);

-- 3. 创建导购搜索历史表
CREATE TABLE IF NOT EXISTS `guide_search_history` (
  `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT(10) UNSIGNED DEFAULT NULL COMMENT '用户ID（游客为NULL）',
  `session_id` VARCHAR(32) DEFAULT NULL COMMENT '关联会话ID',
  `keyword` VARCHAR(255) NOT NULL COMMENT '搜索关键词',
  `intent` VARCHAR(50) DEFAULT NULL COMMENT '识别的意图类型',
  `products_found` INT(11) DEFAULT 0 COMMENT '搜索到的产品数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_keyword` (`keyword`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导购搜索历史表';
