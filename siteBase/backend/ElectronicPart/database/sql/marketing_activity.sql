-- 营销活动表
CREATE TABLE IF NOT EXISTS `marketing_activity` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '活动ID',
  `name` varchar(200) NOT NULL COMMENT '活动名称',
  `type` varchar(50) NOT NULL DEFAULT 'discount' COMMENT '活动类型: discount-折扣, coupon-优惠券, gift-赠品, bundle-套餐, flash-限时抢购',
  `discount_type` varchar(50) NOT NULL DEFAULT 'percentage' COMMENT '优惠类型: percentage-百分比, fixed-固定金额, gift-赠品',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '优惠值',
  `status` varchar(50) NOT NULL DEFAULT 'draft' COMMENT '状态: draft-草稿, active-进行中, upcoming-未开始, ended-已结束, paused-已暂停',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `participant_count` int(11) NOT NULL DEFAULT '0' COMMENT '参与人数',
  `description` text COMMENT '活动描述',
  `rules` text COMMENT '活动规则(JSON格式)',
  `created_at` datetime DEFAULT NULL COMMENT '创建时间',
  `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`type`),
  KEY `idx_time` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销活动表';

-- 插入示例数据
INSERT INTO `marketing_activity` (`name`, `type`, `discount_type`, `discount_value`, `status`, `start_time`, `end_time`, `participant_count`, `description`, `created_at`, `updated_at`) VALUES
('春节特惠活动', 'discount', 'percentage', 20.00, 'active', '2024-01-01 00:00:00', '2024-01-31 23:59:59', 156, '春节期间全场8折优惠', NOW(), NOW()),
('新用户专享优惠券', 'coupon', 'fixed', 50.00, 'active', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 89, '新用户首单立减50元', NOW(), NOW()),
('买二送一活动', 'gift', 'gift', 0.00, 'upcoming', '2024-06-01 00:00:00', '2024-06-30 23:59:59', 0, '购买两件商品赠送同款一件', NOW(), NOW());
