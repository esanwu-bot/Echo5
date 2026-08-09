-- ============================================================================
-- 壶天多租户元数据库 · 0006 plan_quotas seed（T9.3 ADR-open-api 5.5 配套护栏）
-- ============================================================================
-- 背景：ADR-open-api 5.5 D3 产品决策"plan_quotas 查不到配额=无限制放行"，
--   意味着漏 seed 一个付费 plan×meter 的配额 = 该 plan 无限用（成本/收入漏洞）。
--   本 migration 把每个 plan×meter 的配额显式写全，让"缺席=无限"只在代码里
--   作为 fail-safe 兜底，生产数据里不依赖隐式语义。
--
-- 与 P1-13/14"SQL 唯一基线"吻合：配额是生产数据，应走 migration 而非运行时 seed。
--
-- 配额矩阵（MVP 初值，产品可调）：
--   meter_kind        | free | pro  | enterprise
--   ------------------+------+------+-----------
--   seo_audits        |  100 | 1000 | -1 (无限)
--   llm_calls         |   50 |  500 | -1
--   pages_built       |   10 |  100 | -1
--   citations_tracked |    0 |  100 | -1
--
--   overage_policy: free=reject（超额拒绝），pro=degrade（降级），enterprise=allow（放行）
--   window_kind: 均为 month（按月重置）
--
-- 跑法：mysql -u root -p hutian < migrations/0006_plan_quotas_seed.sql
-- 幂等：INSERT ... ON DUPLICATE KEY UPDATE（重复跑只更新值，不报错）
-- ============================================================================

USE hutian;

-- free plan：限额最低，超额 reject（防滥用）
INSERT INTO `plan_quotas` (`plan`, `meter_kind`, `limit_per_window`, `window_kind`, `overage_policy`, `created_at`, `updated_at`)
VALUES
  ('free', 'seo_audits',        100, 'month', 'reject', NOW(), NOW()),
  ('free', 'llm_calls',          50, 'month', 'reject', NOW(), NOW()),
  ('free', 'pages_built',        10, 'month', 'reject', NOW(), NOW()),
  ('free', 'citations_tracked',   0, 'month', 'reject', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `limit_per_window` = VALUES(`limit_per_window`),
  `window_kind`       = VALUES(`window_kind`),
  `overage_policy`    = VALUES(`overage_policy`),
  `updated_at`        = NOW();

-- pro plan：中等限额，超额 degrade（降级响应，T9.7 细化）
INSERT INTO `plan_quotas` (`plan`, `meter_kind`, `limit_per_window`, `window_kind`, `overage_policy`, `created_at`, `updated_at`)
VALUES
  ('pro', 'seo_audits',         1000, 'month', 'degrade', NOW(), NOW()),
  ('pro', 'llm_calls',           500, 'month', 'degrade', NOW(), NOW()),
  ('pro', 'pages_built',         100, 'month', 'degrade', NOW(), NOW()),
  ('pro', 'citations_tracked',   100, 'month', 'degrade', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `limit_per_window` = VALUES(`limit_per_window`),
  `window_kind`       = VALUES(`window_kind`),
  `overage_policy`    = VALUES(`overage_policy`),
  `updated_at`        = NOW();

-- enterprise plan：无限，超额 allow（放行，按合同计费）
INSERT INTO `plan_quotas` (`plan`, `meter_kind`, `limit_per_window`, `window_kind`, `overage_policy`, `created_at`, `updated_at`)
VALUES
  ('enterprise', 'seo_audits',        -1, 'month', 'allow', NOW(), NOW()),
  ('enterprise', 'llm_calls',         -1, 'month', 'allow', NOW(), NOW()),
  ('enterprise', 'pages_built',       -1, 'month', 'allow', NOW(), NOW()),
  ('enterprise', 'citations_tracked', -1, 'month', 'allow', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `limit_per_window` = VALUES(`limit_per_window`),
  `window_kind`       = VALUES(`window_kind`),
  `overage_policy`    = VALUES(`overage_policy`),
  `updated_at`        = NOW();
