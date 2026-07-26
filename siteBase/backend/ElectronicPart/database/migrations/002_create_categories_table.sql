-- 商品分类表
CREATE TABLE `categories` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID',
    `parent_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '父分类ID',
    `name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '分类名称',
    `code` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '分类编码',
    `image` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '分类图片',
    `description` TEXT COMMENT '分类描述',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_status` (`status`),
    KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

-- 插入测试数据
INSERT INTO `categories` (`name`, `code`, `parent_id`, `sort`, `status`) VALUES
('白酒', 'baijiu', 0, 1, 1),
('红酒', 'wine', 0, 2, 1),
('啤酒', 'beer', 0, 3, 1),
('洋酒', 'spirits', 0, 4, 1),
('清酒', 'sake', 0, 5, 1),
('茅台', 'maotai', 1, 1, 1),
('五粮液', 'wuliangye', 1, 2, 1),
('剑南春', 'jiannanchun', 1, 3, 1),
('法国红酒', 'french_wine', 2, 1, 1),
('意大利红酒', 'italian_wine', 2, 2, 1),
('澳洲红酒', 'australian_wine', 2, 3, 1);