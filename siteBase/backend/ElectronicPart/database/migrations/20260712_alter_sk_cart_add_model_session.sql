-- ============================================================
-- Migration: sk_cart 表改造
-- 1. 新增 model_id 字段（关联 sk_product_models）
-- 2. 新增 session_id 字段（支持游客购物车）
-- 3. 新增 spec_id 字段（规格ID）
-- 4. 修改 product_id 为可空（已废弃，保留向后兼容）
-- ============================================================

ALTER TABLE `sk_cart`
  ADD COLUMN `model_id` INT(10) UNSIGNED NULL DEFAULT NULL COMMENT '型号ID(sk_product_models)' AFTER `product_id`,
  ADD COLUMN `session_id` VARCHAR(64) NULL DEFAULT NULL COMMENT '游客会话ID' AFTER `model_id`,
  ADD COLUMN `spec_id` INT(11) NULL DEFAULT 0 COMMENT '规格ID' AFTER `quantity`,
  ADD INDEX `idx_session_id` (`session_id`),
  ADD INDEX `idx_model_id` (`model_id`);
