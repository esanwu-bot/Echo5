-- 为已有 sk_lang_country 表添加 status 状态字段
-- 运行前请确认表已存在

ALTER TABLE `sk_lang_country` 
  ADD COLUMN `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用 0禁用' AFTER `name`,
  ADD INDEX `idx_status` (`status`);

-- 将已有数据全部设为启用
UPDATE `sk_lang_country` SET `status` = 1 WHERE `status` IS NULL;
