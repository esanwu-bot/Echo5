-- ============================================================================
-- 壶天多租户元数据库 · 0004 补充 user_sessions 表
-- ============================================================================
-- 背景：models.go 定义了 UserSession 模型（T7.4 会话持久化），db.go 校验 11 表，
--   但 0001~0003 未包含此表 → SQL 初始化的生产库缺表，portal /sessions 全挂。
-- 本文件补齐，与 GORM AutoMigrate 输出等价。
--
-- 跑法：mysql -u root -p hutian < migrations/0004_user_sessions.sql
-- 幂等：CREATE TABLE IF NOT EXISTS
-- ============================================================================

USE hutian;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`    DATETIME(3)  DEFAULT NULL,
  `updated_at`    DATETIME(3)  DEFAULT NULL,
  `deleted_at`    DATETIME(3)  DEFAULT NULL,
  `tenant_id`     BIGINT       NOT NULL,
  `user_id`       BIGINT       NOT NULL,
  `workspace_id`  BIGINT       NOT NULL,
  `session_id`    VARCHAR(128) NOT NULL,
  `title`         VARCHAR(256) NOT NULL DEFAULT '新会话',
  `tool_count`    INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usession_tenant_user_sid` (`tenant_id`, `user_id`, `session_id`),
  KEY `idx_usession_tenant_id` (`tenant_id`),
  KEY `idx_usession_user_id` (`user_id`),
  KEY `idx_usession_workspace_id` (`workspace_id`),
  KEY `idx_usession_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
