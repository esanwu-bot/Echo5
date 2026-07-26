-- 库存表
CREATE TABLE `inventory` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '库存ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `location_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '库位ID',
    `batch_no` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '批次号',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    `reserved_quantity` INT NOT NULL DEFAULT 0 COMMENT '预留数量',
    `production_date` DATE NULL COMMENT '生产日期',
    `expiry_date` DATE NULL COMMENT '过期日期',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_location_id` (`location_id`),
    KEY `idx_batch_no` (`batch_no`),
    KEY `idx_expiry_date` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存表';

-- 库存事务记录表
CREATE TABLE `inventory_transactions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '事务ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `location_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '库位ID',
    `batch_no` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '批次号',
    `type` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '事务类型：inbound-入库，outbound-出库，adjustment-调整',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '变动数量',
    `reference_type` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '关联类型',
    `reference_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联ID',
    `operator` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '操作员',
    `notes` TEXT COMMENT '备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_type` (`type`),
    KEY `idx_reference` (`reference_type`, `reference_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存事务记录表';

-- 库存预留表
CREATE TABLE `inventory_reservations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '预留ID',
    `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单号',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '预留数量',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-已释放，1-预留中',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_order_no` (`order_no`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存预留表';

-- 插入测试库存数据
INSERT INTO `inventory` (`product_id`, `location_id`, `batch_no`, `quantity`, `production_date`, `expiry_date`) VALUES
(1, 1, 'MT20231201', 50, '2023-12-01', '2033-12-01'),
(2, 1, 'WLY20231201', 30, '2023-12-01', '2033-12-01'),
(3, 1, 'JNC20231201', 80, '2023-12-01', '2033-12-01'),
(4, 2, 'LF20180901', 25, '2018-09-01', '2028-09-01'),
(5, 3, 'BW20240101', 100, '2024-01-01', '2024-12-31');