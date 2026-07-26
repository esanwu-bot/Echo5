-- ============================================================
-- 为 sk_translation 表增加 is_translated 字段
-- 用于标识词条是否已完成翻译
-- ============================================================

ALTER TABLE `sk_translation`
  ADD COLUMN `is_translated` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已翻译完成: 0=未翻译, 1=已翻译' AFTER `is_auto`;

-- 将已有非中文且非空的翻译标记为已翻译
UPDATE `sk_translation`
SET `is_translated` = 1
WHERE `lang_code` != 'zh-CN'
  AND `trans_value` IS NOT NULL
  AND `trans_value` != '';
