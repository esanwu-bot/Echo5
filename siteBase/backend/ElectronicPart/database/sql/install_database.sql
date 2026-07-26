-- 酒水商城数据库安装脚本
-- 执行前请确保已创建数据库：CREATE DATABASE IF NOT EXISTS semiconductor_db DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE semiconductor_db;

-- 用户表
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `username` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '用户名',
    `phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号',
    `email` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '邮箱',
    `password` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '密码',
    `nickname` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
    `avatar` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '头像',
    `gender` TINYINT NOT NULL DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
    `birthday` DATE NULL COMMENT '生日',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    `last_login_at` DATETIME NULL COMMENT '最后登录时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_phone` (`phone`),
    UNIQUE KEY `uk_email` (`email`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

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

-- 商品表
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '商品ID',
    `sku` VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'SKU编码',
    `name` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '商品名称',
    `category_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '分类ID',
    `brand` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '品牌',
    `description` TEXT COMMENT '商品描述',
    `main_image` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '主图',
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '销售价格',
    `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '原价',
    `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '成本价',
    `stock` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    `min_stock` INT NOT NULL DEFAULT 0 COMMENT '最小库存',
    `sales_count` INT NOT NULL DEFAULT 0 COMMENT '销量',
    `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    `weight` DECIMAL(8,3) NOT NULL DEFAULT 0.000 COMMENT '重量(kg)',
    `volume` DECIMAL(8,3) NOT NULL DEFAULT 0.000 COMMENT '体积(L)',
    `alcohol_content` DECIMAL(4,2) NOT NULL DEFAULT 0.00 COMMENT '酒精度',
    `origin` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '产地',
    `vintage` INT NOT NULL DEFAULT 0 COMMENT '年份',
    `storage_temp_min` DECIMAL(4,1) NOT NULL DEFAULT 0.0 COMMENT '最低储存温度',
    `storage_temp_max` DECIMAL(4,1) NOT NULL DEFAULT 0.0 COMMENT '最高储存温度',
    `shelf_life` INT NOT NULL DEFAULT 0 COMMENT '保质期(天)',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常，2-售罄',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sku` (`sku`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_brand` (`brand`),
    KEY `idx_status` (`status`),
    KEY `idx_price` (`price`),
    KEY `idx_sales_count` (`sales_count`),
    KEY `idx_created_at` (`created_at`),
    FULLTEXT KEY `ft_name_brand` (`name`, `brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 商品规格表
CREATE TABLE `product_specs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '规格ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '规格名称',
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '规格价格',
    `stock` INT NOT NULL DEFAULT 0 COMMENT '规格库存',
    `sku` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '规格SKU',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品规格表';

-- 商品图片表
CREATE TABLE `product_images` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `image_url` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '图片URL',
    `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品图片表';

-- 订单表
CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    `order_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '订单号',
    `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户ID',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '订单状态',
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态',
    `payment_method` TINYINT NOT NULL DEFAULT 1 COMMENT '支付方式：1-微信，2-支付宝，3-银行卡',
    `goods_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '商品金额',
    `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
    `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
    `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
    `address_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '收货地址ID',
    `delivery_method` TINYINT NOT NULL DEFAULT 1 COMMENT '配送方式：1-标准，2-次日达，3-当日达',
    `coupon_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '优惠券ID',
    `remark` TEXT COMMENT '订单备注',
    `paid_at` DATETIME NULL COMMENT '支付时间',
    `shipped_at` DATETIME NULL COMMENT '发货时间',
    `completed_at` DATETIME NULL COMMENT '完成时间',
    `cancelled_at` DATETIME NULL COMMENT '取消时间',
    `cancel_reason` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '取消原因',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` DATETIME NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_payment_status` (`payment_status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 订单明细表
CREATE TABLE `order_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
    `order_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '订单ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `spec_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '规格ID',
    `product_name` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '商品名称',
    `product_image` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '商品图片',
    `spec_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '规格名称',
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量',
    `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '小计金额',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 购物车表
CREATE TABLE `cart_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '购物车ID',
    `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户ID',
    `product_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品ID',
    `spec_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '规格ID',
    `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量',
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
    `selected` TINYINT NOT NULL DEFAULT 1 COMMENT '是否选中：0-否，1-是',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_product_spec` (`user_id`, `product_id`, `spec_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_product_id` (`product_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车表';

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

-- 支付记录表
CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '支付ID',
    `order_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '订单ID',
    `payment_no` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '支付单号',
    `payment_method` TINYINT NOT NULL DEFAULT 1 COMMENT '支付方式：1-微信，2-支付宝，3-银行卡',
    `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '支付金额',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态：pending-待支付，paid-已支付，failed-失败，refunded-已退款',
    `third_party_no` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '第三方支付单号',
    `paid_at` DATETIME NULL COMMENT '支付时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_payment_no` (`payment_no`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_status` (`status`),
    KEY `idx_third_party_no` (`third_party_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

-- 插入测试数据
-- 用户数据
INSERT INTO `users` (`username`, `phone`, `email`, `password`, `nickname`, `status`) VALUES
('admin', '13800138000', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理员', 1),
('test', '13900139000', 'test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '测试用户', 1);

-- 分类数据
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

-- 商品数据
INSERT INTO `products` (`sku`, `name`, `category_id`, `brand`, `description`, `main_image`, `price`, `original_price`, `cost_price`, `stock`, `min_stock`, `alcohol_content`, `origin`, `vintage`, `storage_temp_min`, `storage_temp_max`, `shelf_life`, `status`) VALUES
('MT001', '茅台飞天53°', 6, '茅台', '贵州茅台酒股份有限公司出品，采用传统工艺酿造，口感醇厚，香气浓郁', '/static/products/maotai.jpg', 2680.00, 2980.00, 2200.00, 50, 10, 53.00, '贵州茅台镇', 2023, 15.0, 25.0, 3650, 1),
('WLY001', '五粮液普五52°', 7, '五粮液', '五粮液股份有限公司出品，五种粮食酿造，口感绵甜', '/static/products/wuliangye.jpg', 1280.00, 1480.00, 1000.00, 30, 5, 52.00, '四川宜宾', 2023, 15.0, 25.0, 3650, 1),
('JNC001', '剑南春水晶剑52°', 8, '剑南春', '四川剑南春集团有限责任公司出品，历史悠久，工艺精湛', '/static/products/jiannanchun.jpg', 680.00, 780.00, 500.00, 80, 15, 52.00, '四川绵竹', 2023, 15.0, 25.0, 3650, 1),
('LF001', '拉菲传奇2018', 9, '拉菲', '法国拉菲酒庄出品，口感优雅，单宁柔顺', '/static/products/lafei.jpg', 680.00, 780.00, 450.00, 25, 5, 13.50, '法国波尔多', 2018, 12.0, 16.0, 3650, 1),
('BW001', '百威啤酒24听装', 3, '百威', '百威英博出品，口感清爽，泡沫丰富', '/static/products/baiwei.jpg', 158.00, 180.00, 120.00, 100, 20, 5.00, '中国', 2024, 2.0, 8.0, 365, 1);

-- 地址数据
INSERT INTO `user_addresses` (`user_id`, `name`, `phone`, `province`, `city`, `district`, `detail`, `is_default`) VALUES
(1, '张三', '13800138000', '北京市', '北京市', '朝阳区', '三里屯街道工体北路8号院', 1),
(1, '李四', '13900139000', '上海市', '上海市', '浦东新区', '陆家嘴金融贸易区世纪大道100号', 0),
(2, '王五', '13700137000', '广东省', '深圳市', '南山区', '科技园南区深南大道9988号', 1);

-- 库存数据
INSERT INTO `inventory` (`product_id`, `location_id`, `batch_no`, `quantity`, `production_date`, `expiry_date`) VALUES
(1, 1, 'MT20231201', 50, '2023-12-01', '2033-12-01'),
(2, 1, 'WLY20231201', 30, '2023-12-01', '2033-12-01'),
(3, 1, 'JNC20231201', 80, '2023-12-01', '2033-12-01'),
(4, 2, 'LF20180901', 25, '2018-09-01', '2028-09-01'),
(5, 3, 'BW20240101', 100, '2024-01-01', '2024-12-31');

-- 商品图片数据
INSERT INTO `product_images` (`product_id`, `image_url`, `sort`) VALUES
(1, '/static/products/maotai.jpg', 1),
(1, '/static/products/maotai-2.jpg', 2),
(1, '/static/products/maotai-3.jpg', 3),
(2, '/static/products/wuliangye.jpg', 1),
(2, '/static/products/wuliangye-2.jpg', 2),
(3, '/static/products/jiannanchun.jpg', 1),
(4, '/static/products/lafei.jpg', 1),
(5, '/static/products/baiwei.jpg', 1);

COMMIT;