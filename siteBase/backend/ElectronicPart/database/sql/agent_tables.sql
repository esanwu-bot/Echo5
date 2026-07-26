-- ============================================================
-- Agent 智能体相关数据表
-- 用于存储 AI 对话会话和生成的分析报告
-- ============================================================

-- -----------------------------------------------------------
-- 1. Agent 对话会话表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `agent_sessions`;

CREATE TABLE `agent_sessions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` varchar(32) NOT NULL COMMENT '会话唯一ID',
  `title` varchar(255) DEFAULT NULL COMMENT '会话标题',
  `user_id` int(10) unsigned DEFAULT '0' COMMENT '用户ID',
  `messages` json DEFAULT NULL COMMENT '对话历史(JSON格式)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  KEY `updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent 对话会话';

-- -----------------------------------------------------------
-- 2. Agent 分析报告表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `agent_reports`;

CREATE TABLE `agent_reports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_type` varchar(50) NOT NULL COMMENT '报告类型: daily/weekly/product/translation',
  `title` varchar(255) NOT NULL,
  `content` longtext COMMENT '报告内容(Markdown)',
  `data_json` json DEFAULT NULL COMMENT '报告数据(JSON)',
  `chart_options` json DEFAULT NULL COMMENT '图表配置(ECharts)',
  `created_by` int(10) unsigned DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `report_type` (`report_type`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Agent 生成的分析报告';
