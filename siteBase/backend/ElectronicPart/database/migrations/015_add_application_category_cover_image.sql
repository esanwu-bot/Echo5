-- 为应用分类表添加封面图片字段
ALTER TABLE `sk_application_category`
ADD COLUMN IF NOT EXISTS `cover_image` VARCHAR(255) DEFAULT NULL COMMENT '封面图片URL' AFTER `is_hot`;
