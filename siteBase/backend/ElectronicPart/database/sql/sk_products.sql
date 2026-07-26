-- 产品表设计
CREATE TABLE `sk_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '产品ID',
  `name` varchar(255) NOT NULL COMMENT '产品名称',
  `model_id` int(11) NOT NULL COMMENT '型号ID',
  `brand_id` int(11) NOT NULL COMMENT '品牌ID',
  `category_id` int(11) NOT NULL COMMENT '分类ID',
  `subcategory_id` int(11) DEFAULT NULL COMMENT '子分类ID',
  `description` text COMMENT '产品描述',
  `specs` json DEFAULT NULL COMMENT '产品规格（JSON格式）',
  `images` json DEFAULT NULL COMMENT '产品图片（JSON格式）',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `sort` int(11) NOT NULL DEFAULT '10' COMMENT '排序',
  `views` int(11) NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_model_id` (`model_id`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_subcategory_id` (`subcategory_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_product_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `sk_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_model` FOREIGN KEY (`model_id`) REFERENCES `sk_product_models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `sk_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品表';

-- 品牌表设计
CREATE TABLE `sk_brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '品牌ID',
  `name` varchar(100) NOT NULL COMMENT '品牌名称',
  `description` text COMMENT '品牌描述',
  `logo` varchar(255) DEFAULT NULL COMMENT '品牌Logo',
  `website` varchar(255) DEFAULT NULL COMMENT '品牌官网',
  `sort` int(11) NOT NULL DEFAULT '10' COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_brand_name` (`name`),
  KEY `idx_sort` (`sort`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品牌表';

-- 分类表设计
CREATE TABLE `sk_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name` varchar(100) NOT NULL COMMENT '分类名称',
  `slug` varchar(100) NOT NULL COMMENT '分类别名',
  `description` text COMMENT '分类描述',
  `parent_id` int(11) NOT NULL DEFAULT '0' COMMENT '父分类ID',
  `level` tinyint(1) NOT NULL DEFAULT '1' COMMENT '分类层级',
  `sort` int(11) NOT NULL DEFAULT '10' COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_slug` (`slug`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_sort` (`sort`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

-- 型号表设计
CREATE TABLE `sk_product_models` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '型号ID',
  `name` varchar(100) NOT NULL COMMENT '型号名称',
  `description` text COMMENT '型号描述',
  `brand_id` int(11) NOT NULL COMMENT '品牌ID',
  `category_id` int(11) NOT NULL COMMENT '分类ID',
  `sort` int(11) NOT NULL DEFAULT '10' COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_sort` (`sort`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `sk_brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_model_category` FOREIGN KEY (`category_id`) REFERENCES `sk_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品型号表';

-- 供应商表设计
CREATE TABLE `sk_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `name` varchar(255) NOT NULL COMMENT '供应商名称',
  `contact_person` varchar(100) DEFAULT NULL COMMENT '联系人',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话',
  `address` varchar(255) DEFAULT NULL COMMENT '地址',
  `website` varchar(255) DEFAULT NULL COMMENT '官网',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `rating` tinyint(1) DEFAULT NULL COMMENT '评分（1-5）',
  `lead_time_days` int(11) DEFAULT NULL COMMENT '交货周期（天）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_name` (`name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

-- 产品供应商关系表设计
CREATE TABLE `sk_product_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '关系ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `model_id` int(11) NOT NULL COMMENT '型号ID',
  `supplier_id` int(11) NOT NULL COMMENT '供应商ID',
  `supply_price` decimal(10,2) NOT NULL COMMENT '供应价格',
  `lead_time_days` int(11) DEFAULT NULL COMMENT '交货周期（天）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_supplier` (`product_id`,`supplier_id`),
  KEY `idx_model_id` (`model_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  CONSTRAINT `fk_product_supplier_product` FOREIGN KEY (`product_id`) REFERENCES `sk_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_supplier_model` FOREIGN KEY (`model_id`) REFERENCES `sk_product_models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_supplier_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `sk_suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品供应商关系表';

-- 库存表设计
CREATE TABLE `sk_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '库存ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `storage_location_id` int(11) NOT NULL COMMENT '存储位置ID',
  `quantity` int(11) NOT NULL DEFAULT '0' COMMENT '总库存',
  `available_quantity` int(11) NOT NULL DEFAULT '0' COMMENT '可用库存',
  `reserved_quantity` int(11) NOT NULL DEFAULT '0' COMMENT '已预订库存',
  `safety_stock` int(11) NOT NULL DEFAULT '0' COMMENT '安全库存',
  `in_transit_stock` int(11) NOT NULL DEFAULT '0' COMMENT '在途库存',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_product_location` (`product_id`,`storage_location_id`),
  KEY `idx_storage_location_id` (`storage_location_id`),
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `sk_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_location` FOREIGN KEY (`storage_location_id`) REFERENCES `sk_storage_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';

-- 存储位置表设计
CREATE TABLE `sk_storage_locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '存储位置ID',
  `location_code` varchar(50) NOT NULL COMMENT '位置编码',
  `location_name` varchar(100) NOT NULL COMMENT '位置名称',
  `description` text COMMENT '位置描述',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`),
  UNIQUE KEY `uk_location_name` (`location_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储位置表';

-- 插入示例数据
-- 品牌数据
INSERT INTO `sk_brands` (`id`, `name`, `description`, `logo`, `website`, `sort`, `status`) VALUES
(1, 'Intel', '全球领先的半导体公司', 'https://example.com/logos/intel.png', 'https://www.intel.com', 1, 1),
(2, 'AMD', '全球领先的半导体设计公司', 'https://example.com/logos/amd.png', 'https://www.amd.com', 2, 1),
(3, 'NVIDIA', '全球领先的GPU制造商', 'https://example.com/logos/nvidia.png', 'https://www.nvidia.com', 3, 1),
(4, 'Samsung', '全球领先的电子设备制造商', 'https://example.com/logos/samsung.png', 'https://www.samsung.com', 4, 1),
(5, 'TI', '全球领先的半导体设计公司', 'https://example.com/logos/ti.png', 'https://www.ti.com', 5, 1);

-- 分类数据
INSERT INTO `sk_categories` (`id`, `name`, `slug`, `description`, `parent_id`, `level`, `sort`, `status`) VALUES
(1, '处理器', 'processors', '计算机中央处理器', 0, 1, 1, 1),
(2, '显卡', 'graphics-cards', '图形处理单元', 0, 1, 2, 1),
(3, '存储器', 'memory', '计算机内存和存储设备', 0, 1, 3, 1),
(4, '集成电路', 'ic', '集成电路芯片', 0, 1, 4, 1),
(5, '电阻器', 'resistors', '电子电阻器', 4, 2, 1, 1);

-- 型号数据
INSERT