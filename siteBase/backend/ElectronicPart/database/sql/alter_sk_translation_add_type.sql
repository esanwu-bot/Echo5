-- ============================================================
-- 为 sk_translation 表增加 type 字段
-- 用于区分词条类型：1=API响应文本, 2=页面UI文本
-- ============================================================

ALTER TABLE `sk_translation`
  ADD COLUMN `type` tinyint(1) NOT NULL DEFAULT '2' COMMENT '词条类型: 1=API响应文本, 2=页面UI文本' AFTER `module`;

-- 创建索引加速按类型查询
CREATE INDEX `idx_type` ON `sk_translation`(`type`);
