-- ============================================================================
-- 壶天多租户元数据库 · migration 0002 — users 表（M7 T7.1）
-- ============================================================================
-- 落地 9 表悬空 fk：seats.user_id 指向本表
-- 租户成员登录/个人资料/2FA 依赖此表（FR-TS01/08, NFR-TS05）
--
-- 红线（NFR-T02 同）：
--   - password_hash / totp_secret_encrypted / backup_codes_hash 永不出现在 API 响应
--     （GORM 模型 json:"-" 守，本 migration 仅建表，不碰出参）
--   - 明文 secret 永不落库（password 用 bcrypt/argon2，totp 用 envelope 加密）
--
-- 跑法：mysql -u root -p hutian < migrations/0002_users.sql
-- 幂等：CREATE TABLE IF NOT EXISTS，可重复跑
-- ============================================================================

USE hutian;

CREATE TABLE IF NOT EXISTS `users` (
  `id`                    BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`            DATETIME(3)  DEFAULT NULL,
  `updated_at`            DATETIME(3)  DEFAULT NULL,
  `deleted_at`            DATETIME(3)  DEFAULT NULL,
  `email`                 VARCHAR(255) NOT NULL,
  `password_hash`         VARCHAR(255) NOT NULL,             -- bcrypt/argon2 哈希
  `display_name`          VARCHAR(128) DEFAULT NULL,
  `status`                VARCHAR(32)  NOT NULL DEFAULT 'active', -- enum: active/disabled/pending_invite
  `totp_secret_encrypted` VARBINARY(512) DEFAULT NULL,        -- envelope 加密的 TOTP secret
  `totp_enabled`          TINYINT(1)   NOT NULL DEFAULT 0,
  `last_login_at`         DATETIME(3)  DEFAULT NULL,
  `failed_login_count`    INT          NOT NULL DEFAULT 0,
  `locked_until`          DATETIME(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_last_login_at` (`last_login_at`),
  KEY `idx_users_locked_until` (`locked_until`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 回填说明（不在本 SQL 内执行，由应用层/seed 处理）：
--   M6 探针 seed.sql 未插 seats 数据，seats.user_id 悬空但不破 T6.3a 探针
--   M7 登录链路（T7.5）会创建真实 users，并经 seats 关联 tenant
--   如需 dev seed users，另写 seed_users.sql，不动本 migration
-- ────────────────────────────────────────────────

SELECT '[0002] users table created (10 tables total)' AS status;
