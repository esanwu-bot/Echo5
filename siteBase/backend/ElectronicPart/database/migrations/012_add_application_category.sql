-- 创建应用领域分类表
CREATE TABLE `sk_application_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `name_en` VARCHAR(100) DEFAULT NULL COMMENT '英文名称',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0=禁用，1=启用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `cover_image` VARCHAR(255) DEFAULT NULL COMMENT '封面图片URL'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用领域分类表';

-- 为应用领域表添加分类ID
ALTER TABLE `sk_application` ADD COLUMN `category_id` INT UNSIGNED DEFAULT 0 COMMENT '分类ID' AFTER `id`;

-- 插入一些初始分类
INSERT INTO `sk_application_category` (`name`, `name_en`, `sort`, `status`) VALUES
('工业应用', 'Industrial Applications', 1, 1),
('消费电子', 'Consumer Electronics', 2, 1),
('汽车电子', 'Automotive Electronics', 3, 1),
('新能源', 'New Energy', 4, 1);
