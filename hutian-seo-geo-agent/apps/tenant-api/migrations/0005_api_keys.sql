-- ============================================================================
-- 壶天多租户元数据库 · 0005 新增 api_keys 表（T9.1 ADR-open-api D5）
-- ============================================================================
-- 背景：开放 API /open/v1/* 用 Bearer hsk_xxx 鉴权，需独立 api_keys 表。
--   - key 只存 SHA256 hash（key_hash，查询+防时序）；明文仅创建时返回一次
--   - key_prefix 存 hsk_test_xxxxxxxx（前缀+随机前8位）用于列表展示
--   - 绑定 workspace（submit_sitemap 归属校验 D4 需查该 workspace 的 cms_instances 域名）
--   - status: active / revoked；吊销立即失效
-- 与 GORM AutoMigrate 输出等价；SQL 文件是生产 schema 唯一可追溯基线（P1-13/14）。
--
-- 跑法：mysql -u root -p hutian < migrations/0005_api_keys.sql
-- 幂等：CREATE TABLE IF NOT EXISTS
-- ============================================================================

USE hutian;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`   DATETIME(3)  DEFAULT NULL,
  `updated_at`   DATETIME(3)  DEFAULT NULL,
  `deleted_at`   DATETIME(3)  DEFAULT NULL,
  `tenant_id`    BIGINT       NOT NULL,
  `workspace_id` BIGINT       NOT NULL,
  `name`         VARCHAR(128) DEFAULT NULL,
  `key_prefix`   VARCHAR(32)  NOT NULL,
  `key_hash`     VARCHAR(128) NOT NULL,
  `scopes`       VARCHAR(256) NOT NULL DEFAULT 'diagnose,schema,sitemap',
  `status`       VARCHAR(32)  NOT NULL DEFAULT 'active',
  `last_used_at` DATETIME(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_api_keys_hash` (`key_hash`),
  KEY `idx_api_keys_tenant` (`tenant_id`),
  KEY `idx_api_keys_workspace` (`workspace_id`),
  KEY `idx_api_keys_prefix` (`key_prefix`),
  KEY `idx_api_keys_status` (`status`),
  KEY `idx_api_keys_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
