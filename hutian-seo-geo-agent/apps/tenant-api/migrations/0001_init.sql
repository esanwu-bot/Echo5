-- ============================================================================
-- 壶天多租户元数据库 · 初始 migration（生产用）
-- ============================================================================
-- 对应 docs/多租户-数据库设计.md 的 9 张表 + 索引/约束
-- 生产 schema 演进以此文件为可追溯基线；本地 dev 可用 `tenant-api -migrate` (AutoMigrate) 快速起表。
-- AutoMigrate 与本文件应保持等价，差异以本文件为准（GORM AutoMigrate 对外键/enum 支持半吊子）。
--
-- 约束清单（对照文档"索引与约束要点"，建表时逐条核）：
--   [✓] workspaces(tenant_id, slug) 联合唯一
--   [✓] seats(tenant_id, user_id) 联合唯一
--   [✓] tenant_credentials.workspace_id 唯一
--   [✓] subscriptions.tenant_id 唯一（租户 1:1 订阅）
--   [✓] usage_meters(tenant_id, meter_kind, window_start) 联合唯一
--   [✓] plan_quotas(plan, meter_kind, window_kind) 联合唯一（平台级配额）
--   [✓] 所有含 tenant_id 表：tenant_id 单列索引 + 业务复合索引前缀走 tenant_id
--   [✓] 不建 DB 外键（靠应用层 + tenant_id 索引挡串数据，GORM AutoMigrate 默认也不建 fk）
--   [✓] 引擎 InnoDB（事务/行锁，多租户并发写必需）；charset utf8mb4（emoji/完整 Unicode）
--
-- 跑法：mysql -u root -p hutian < migrations/0001_init.sql
-- 幂等：用 CREATE TABLE IF NOT EXISTS，可重复跑
-- ============================================================================

USE hutian;

-- ────────────────────────────────────────────────
-- 1. tenants — 租户=计费/登录主体（无 tenant_id）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tenants` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`    DATETIME(3)  DEFAULT NULL,
  `updated_at`    DATETIME(3)  DEFAULT NULL,
  `deleted_at`    DATETIME(3)  DEFAULT NULL,
  `slug`          VARCHAR(64)  NOT NULL,
  `display_name`  VARCHAR(128) NOT NULL,
  `status`        VARCHAR(32)  NOT NULL DEFAULT 'trial',  -- enum: trial/active/grace/readonly/suspended
  `owner_seat_id` BIGINT       DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenants_slug` (`slug`),
  KEY `idx_tenants_deleted_at` (`deleted_at`),
  KEY `idx_tenants_status` (`status`),
  KEY `idx_tenants_owner_seat_id` (`owner_seat_id`),
  KEY `idx_tenants_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 2. sitebase_instances — siteBase 实例池（无 tenant_id，平台级）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sitebase_instances` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`     DATETIME(3)  DEFAULT NULL,
  `updated_at`     DATETIME(3)  DEFAULT NULL,
  `deleted_at`     DATETIME(3)  DEFAULT NULL,
  `base_url`       VARCHAR(255) NOT NULL,
  `provision_kind` VARCHAR(32)  NOT NULL DEFAULT 'preset',  -- enum: preset/container
  `capacity`       BIGINT       NOT NULL DEFAULT 1,         -- M6=1，预留共享模式
  `health`         VARCHAR(32)  NOT NULL DEFAULT 'healthy', -- enum: healthy/degraded/down
  PRIMARY KEY (`id`),
  KEY `idx_sitebase_instances_created_at` (`created_at`),
  KEY `idx_sitebase_instances_deleted_at` (`deleted_at`),
  KEY `idx_sitebase_instances_health` (`health`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 3. plan_quotas — 套餐配额表（平台级，无 tenant_id）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plan_quotas` (
  `id`               BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`       DATETIME(3)  DEFAULT NULL,
  `updated_at`       DATETIME(3)  DEFAULT NULL,
  `deleted_at`       DATETIME(3)  DEFAULT NULL,
  `plan`             VARCHAR(32)  NOT NULL,                 -- enum: free/pro/enterprise
  `meter_kind`       VARCHAR(32)  NOT NULL,                 -- enum: llm_calls/pages_built/seo_audits/citations_tracked
  `limit_per_window` BIGINT       NOT NULL DEFAULT -1,      -- -1=无限
  `window_kind`      VARCHAR(32)  NOT NULL DEFAULT 'month', -- enum: month/total
  `overage_policy`   VARCHAR(32)  NOT NULL DEFAULT 'reject',-- enum: reject/degrade/allow
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_quota_plan_kind_window` (`plan`, `meter_kind`, `window_kind`),
  KEY `idx_plan_quotas_created_at` (`created_at`),
  KEY `idx_plan_quotas_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 4. workspaces — 品牌/站主体（tenant 1:N）← FR-T03 品牌派生落点
--    跨租户外键：sitebase_instance_id 指向 sitebase_instances（平台级，无 tenant_id 语义，靠应用层校验归属）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workspaces` (
  `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`           DATETIME(3)  DEFAULT NULL,
  `updated_at`           DATETIME(3)  DEFAULT NULL,
  `deleted_at`           DATETIME(3)  DEFAULT NULL,
  `tenant_id`            BIGINT       NOT NULL,
  `slug`                 VARCHAR(64)  NOT NULL,
  `brand_name`           VARCHAR(128) NOT NULL,             -- 渲染器/兜底品牌来源（FR-T03）
  `industry`             VARCHAR(64)  DEFAULT NULL,
  `sitebase_instance_id` BIGINT       NOT NULL,
  `fallback_copy_json`   JSON         DEFAULT NULL,         -- 兜底 settings 文案
  `status`               VARCHAR(32)  NOT NULL DEFAULT 'active', -- enum: active/archived
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_workspace_tenant_slug` (`tenant_id`, `slug`),  -- 联合唯一：租户内 slug 唯一
  KEY `idx_workspaces_tenant_id` (`tenant_id`),
  KEY `idx_workspaces_sitebase_instance_id` (`sitebase_instance_id`),
  KEY `idx_workspaces_status` (`status`),
  KEY `idx_workspaces_created_at` (`created_at`),
  KEY `idx_workspaces_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 5. tenant_credentials — 每 workspace 的 siteBase 凭证（加密）← NFR-T02
--    workspace_id 唯一（一 workspace 一套凭证）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tenant_credentials` (
  `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`           DATETIME(3)  DEFAULT NULL,
  `updated_at`           DATETIME(3)  DEFAULT NULL,
  `deleted_at`           DATETIME(3)  DEFAULT NULL,
  `workspace_id`         BIGINT       NOT NULL,
  `auth_kind`            VARCHAR(32)  NOT NULL,             -- enum: jwt_password/client_credentials
  `encrypted_secret`     VARBINARY(1024) NOT NULL,          -- envelope 加密后的 secret
  `key_version`          BIGINT       NOT NULL DEFAULT 1,   -- 主密钥版本，支持轮换
  `username`             VARCHAR(128) DEFAULT NULL,
  `token_cache_encrypted` VARBINARY(2048) DEFAULT NULL,
  `expires_at`           DATETIME(3)  DEFAULT NULL,
  `last_rotated_at`      DATETIME(3)  DEFAULT NULL,
  `status`               VARCHAR(32)  NOT NULL DEFAULT 'active', -- enum: active/rotating/revoked
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_credentials_workspace_id` (`workspace_id`),
  KEY `idx_tenant_credentials_status` (`status`),
  KEY `idx_tenant_credentials_expires_at` (`expires_at`),
  KEY `idx_tenant_credentials_created_at` (`created_at`),
  KEY `idx_tenant_credentials_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 6. subscriptions — 租户 1:1，与桌面授权共用结构
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`                   BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`           DATETIME(3)  DEFAULT NULL,
  `updated_at`           DATETIME(3)  DEFAULT NULL,
  `deleted_at`           DATETIME(3)  DEFAULT NULL,
  `tenant_id`            BIGINT       NOT NULL,
  `plan`                 VARCHAR(32)  NOT NULL DEFAULT 'free',  -- enum: free/pro/enterprise
  `status`               VARCHAR(32)  NOT NULL DEFAULT 'trial', -- enum: active/trial/grace/readonly/suspended/canceled
  `seats_limit`          BIGINT       NOT NULL DEFAULT 1,
  `current_period_start` DATETIME(3)  DEFAULT NULL,
  `current_period_end`   DATETIME(3)  DEFAULT NULL,
  `trial_ends_at`        DATETIME(3)  DEFAULT NULL,
  `grace_days`           BIGINT       NOT NULL DEFAULT 7,
  `cancel_at`            DATETIME(3)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_subscriptions_tenant_id` (`tenant_id`),  -- 租户 1:1 订阅
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_plan` (`plan`),
  KEY `idx_subscriptions_current_period_start` (`current_period_start`),
  KEY `idx_subscriptions_current_period_end` (`current_period_end`),
  KEY `idx_subscriptions_trial_ends_at` (`trial_ends_at`),
  KEY `idx_subscriptions_created_at` (`created_at`),
  KEY `idx_subscriptions_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 7. seats — 租户成员+角色（联合唯一 tenant_id+user_id）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `seats` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(3)  DEFAULT NULL,
  `updated_at` DATETIME(3)  DEFAULT NULL,
  `deleted_at` DATETIME(3)  DEFAULT NULL,
  `tenant_id`  BIGINT       NOT NULL,
  `user_id`    BIGINT       NOT NULL,
  `role`       VARCHAR(32)  NOT NULL DEFAULT 'member',  -- enum: owner/admin/member
  `status`     VARCHAR(32)  NOT NULL DEFAULT 'active', -- enum: active/disabled
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_seat_tenant_user` (`tenant_id`, `user_id`),  -- 联合唯一
  KEY `idx_seats_tenant_id` (`tenant_id`),
  KEY `idx_seats_user_id` (`user_id`),
  KEY `idx_seats_status` (`status`),
  KEY `idx_seats_created_at` (`created_at`),
  KEY `idx_seats_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 8. usage_meters — 用量计量 ← FR-S03（联合唯一 tenant_id+meter_kind+window_start）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `usage_meters` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`  DATETIME(3)  DEFAULT NULL,
  `updated_at`  DATETIME(3)  DEFAULT NULL,
  `deleted_at`  DATETIME(3)  DEFAULT NULL,
  `tenant_id`   BIGINT       NOT NULL,
  `meter_kind`  VARCHAR(32)  NOT NULL,                -- enum: llm_calls/pages_built/seo_audits/citations_tracked
  `window_start` DATETIME(3) NOT NULL,
  `count`       BIGINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usage_tenant_kind_window` (`tenant_id`, `meter_kind`, `window_start`),  -- 联合唯一
  KEY `idx_usage_meters_tenant_id` (`tenant_id`),
  KEY `idx_usage_meters_window_start` (`window_start`),
  KEY `idx_usage_meters_created_at` (`created_at`),
  KEY `idx_usage_meters_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────
-- 9. audit_logs — 审计，带三元 ← NFR-T03（tenant_id 可空：平台级操作无 tenant）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `created_at`  DATETIME(3)  DEFAULT NULL,
  `updated_at`  DATETIME(3)  DEFAULT NULL,
  `deleted_at`  DATETIME(3)  DEFAULT NULL,
  `tenant_id`   BIGINT       DEFAULT NULL,   -- 可空：平台级操作
  `workspace_id` BIGINT      DEFAULT NULL,
  `seat_id`     BIGINT       DEFAULT NULL,
  `actor_kind`  VARCHAR(32)  NOT NULL,       -- enum: human/agent
  `action`      VARCHAR(128) NOT NULL,
  `target_kind` VARCHAR(64)  DEFAULT NULL,
  `target_id`   BIGINT       DEFAULT NULL,
  `meta_json`   JSON         DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_tenant_id` (`tenant_id`),
  KEY `idx_audit_logs_workspace_id` (`workspace_id`),
  KEY `idx_audit_logs_seat_id` (`seat_id`),
  KEY `idx_audit_logs_actor_kind` (`actor_kind`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_target_kind` (`target_kind`),
  KEY `idx_audit_logs_target_id` (`target_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),  -- 分区键候选
  KEY `idx_audit_logs_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
