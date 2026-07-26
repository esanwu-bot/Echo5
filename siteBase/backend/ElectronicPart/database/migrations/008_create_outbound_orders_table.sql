-- 出库订单表
CREATE TABLE `outbound_orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '出库订单ID',
    `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单号',
    `customer_name` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '客户姓名',
    `customer_phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '客户电话',
    `delivery_address` JSON COMMENT '配送地址',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理，picking-拣货中，packed-已打包，shipped-已发货，delivered-已送达，cancelled-已取消',
    `tracking_number` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '物流单号',
    `carrier` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '承运商',
    `shipped_at` DATETIME NULL COMMENT '发货时间',
    `delivered_at` DATETIME NULL COMMENT '送达时间',
    `cancel_reason` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '取消原因',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库订单表';

-- 出库订单明细表
CREATE TABLE `outbound_order_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
    `outbound_order_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '出库订单ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量',
    `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
    `picked_quantity` INT NOT NULL DEFAULT 0 COMMENT '已拣货数量',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_outbound_order_id` (`outbound_order_id`),
    KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库订单明细表';