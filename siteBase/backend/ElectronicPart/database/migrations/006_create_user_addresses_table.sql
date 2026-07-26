-- 用户地址表
CREATE TABLE `user_addresses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地址ID',
    `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户ID',
    `name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '收货人姓名',
    `phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号',
    `province` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '省份',
    `city` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '城市',
    `district` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '区县',
    `detail` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '详细地址',
    `postal_code` VARCHAR(10) NOT NULL DEFAULT '' COMMENT '邮政编码',
    `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认：0-否，1-是',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户地址表';

-- 插入测试数据
INSERT INTO `user_addresses` (`user_id`, `name`, `phone`, `province`, `city`, `district`, `detail`, `is_default`) VALUES
(1, '张三', '13800138000', '北京市', '北京市', '朝阳区', '三里屯街道工体北路8号院', 1),
(1, '李四', '13900139000', '上海市', '上海市', '浦东新区', '陆家嘴金融贸易区世纪大道100号', 0),
(2, '王五', '13700137000', '广东省', '深圳市', '南山区', '科技园南区深南大道9988号', 1);