<?php
/**
 * 直接使用PDO创建电子元器件产品表结构并插入数据
 * 
 * 此脚本将：
 * 1. 直接使用PDO连接数据库
 * 2. 创建所需的表结构
 * 3. 将MockProduct.json数据插入到数据库中
 * 
 * 使用方法：
 * 在命令行中运行: php direct_product_import.php
 */

// 设置脚本执行时间和内存限制
ini_set('memory_limit', '512M');
set_time_limit(0);

echo "========================================\n";
echo "电子元器件产品数据导入脚本 (PDO版本)\n";
echo "========================================\n\n";

try {
    // 数据库配置
    $config = [
        'hostname' => '47.119.22.120',
        'database' => 'semiconductor_db',
        'username' => 'semiconductor_db',
        'password' => 'mLWHWwREKJRZmX2Y',
        'hostport' => '3306'
    ];
    
    // 创建PDO连接
    $dsn = "mysql:host={$config['hostname']};port={$config['hostport']};dbname={$config['database']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['username'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "数据库连接成功！\n\n";
    
    // 步骤1: 创建表结构
    echo "步骤1: 创建表结构...\n";
    echo "----------------------------------------\n";
    
    // 创建sk_product表
    $createProductTable = "
        CREATE TABLE IF NOT EXISTS `sk_product` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `product_id` varchar(100) NOT NULL COMMENT '产品唯一标识符',
          `model_number` varchar(100) NOT NULL COMMENT '制造商型号',
          `brand` varchar(100) NOT NULL COMMENT '品牌/制造商',
          `category` varchar(50) NOT NULL COMMENT '产品主类别',
          `sub_category` varchar(50) DEFAULT NULL COMMENT '产品子类别',
          `name` varchar(200) NOT NULL COMMENT '产品名称',
          `description` text DEFAULT NULL COMMENT '产品描述',
          `image_url` varchar(500) DEFAULT NULL COMMENT '产品图片URL',
          `status` varchar(20) NOT NULL DEFAULT 'Active' COMMENT '产品状态',
          `package_type` varchar(50) DEFAULT NULL COMMENT '封装类型',
          `package_packaging` varchar(50) DEFAULT NULL COMMENT '包装方式',
          `inventory_stock` int(11) NOT NULL DEFAULT 0 COMMENT '库存数量',
          `inventory_min_order_quantity` int(11) NOT NULL DEFAULT 1 COMMENT '最小起订量',
          `inventory_lead_time` varchar(50) DEFAULT NULL COMMENT '供货周期',
          `pricing_unit_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '单价',
          `pricing_currency` varchar(10) NOT NULL DEFAULT 'USD' COMMENT '货币',
          `compliance_rohs` varchar(20) NOT NULL DEFAULT 'Unknown' COMMENT 'RoHS合规',
          `compliance_reach` varchar(20) NOT NULL DEFAULT 'Unknown' COMMENT 'REACH合规',
          `compliance_eccn` varchar(20) DEFAULT NULL COMMENT '出口管制分类编码',
          `links_datasheet_url` varchar(500) DEFAULT NULL COMMENT '数据手册链接',
          `links_product_page_url` varchar(500) DEFAULT NULL COMMENT '产品页面链接',
          `links_simulation_model_url` varchar(500) DEFAULT NULL COMMENT '仿真模型链接',
          `updated_at` datetime DEFAULT NULL COMMENT '更新时间',
          `created_at` datetime DEFAULT NULL COMMENT '创建时间',
          PRIMARY KEY (`id`),
          UNIQUE KEY `product_id` (`product_id`),
          KEY `model_number` (`model_number`),
          KEY `brand` (`brand`),
          KEY `category` (`category`),
          KEY `status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电子元器件产品表';
    ";
    
    $pdo->exec($createProductTable);
    echo "✓ 创建 sk_product 表成功\n";
    
    // 创建sk_product_specification表
    $createSpecTable = "
        CREATE TABLE IF NOT EXISTS `sk_product_specification` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `product_id` varchar(100) NOT NULL COMMENT '产品ID',
          `name` varchar(100) NOT NULL COMMENT '参数名称',
          `value` varchar(100) NOT NULL COMMENT '参数值',
          `unit` varchar(20) DEFAULT NULL COMMENT '参数单位',
          `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序',
          PRIMARY KEY (`id`),
          KEY `product_id` (`product_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规格参数表';
    ";
    
    $pdo->exec($createSpecTable);
    echo "✓ 创建 sk_product_specification 表成功\n";
    
    // 创建sk_product_price_break表
    $createPriceBreakTable = "
        CREATE TABLE IF NOT EXISTS `sk_product_price_break` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `product_id` varchar(100) NOT NULL COMMENT '产品ID',
          `quantity` int(11) NOT NULL COMMENT '数量分界点',
          `price` decimal(10,2) NOT NULL COMMENT '对应单价',
          PRIMARY KEY (`id`),
          KEY `product_id` (`product_id`),
          KEY `quantity` (`quantity`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品价格区间表';
    ";
    
    $pdo->exec($createPriceBreakTable);
    echo "✓ 创建 sk_product_price_break 表成功\n";
    
    echo "\n表结构创建完成！\n\n";
    
    // 步骤2: 插入模拟数据
    echo "步骤2: 插入模拟数据...\n";
    echo "----------------------------------------\n";
    
    // 查找MockProduct.json文件的正确路径
    $possiblePaths = [
        __DIR__ . '/../../docs/MockProduct.json',
        __DIR__ . '/../../../docs/MockProduct.json',
        __DIR__ . '/MockProduct.json',
        __DIR__ . '/../docs/MockProduct.json',
        'G:/tqx_new/tqx/docs/MockProduct.json'
    ];
    
    $mockProductsFile = null;
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $mockProductsFile = $path;
            break;
        }
    }
    
    if (!$mockProductsFile) {
        throw new Exception("无法找到MockProduct.json文件");
    }
    
    echo "找到MockProduct.json文件: {$mockProductsFile}\n";
    
    $jsonData = file_get_contents($mockProductsFile);
    $products = json_decode($jsonData, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON解析错误: " . json_last_error_msg());
    }
    
    echo "开始插入 " . count($products) . " 个产品到数据库...\n\n";
    
    $successCount = 0;
    $errorCount = 0;
    
    // 准备SQL语句
    $productStmt = $pdo->prepare("
        INSERT INTO sk_product (
            product_id, model_number, brand, category, sub_category, name, description, 
            image_url, status, package_type, package_packaging, inventory_stock, 
            inventory_min_order_quantity, inventory_lead_time, pricing_unit_price, 
            pricing_currency, compliance_rohs, compliance_reach, compliance_eccn, 
            links_datasheet_url, links_product_page_url, links_simulation_model_url, 
            updated_at, created_at
        ) VALUES (
            :product_id, :model_number, :brand, :category, :sub_category, :name, :description, 
            :image_url, :status, :package_type, :package_packaging, :inventory_stock, 
            :inventory_min_order_quantity, :inventory_lead_time, :pricing_unit_price, 
            :pricing_currency, :compliance_rohs, :compliance_reach, :compliance_eccn, 
            :links_datasheet_url, :links_product_page_url, :links_simulation_model_url, 
            :updated_at, :created_at
        )
    ");
    
    $specStmt = $pdo->prepare("
        INSERT INTO sk_product_specification (product_id, name, value, unit, sort_order) 
        VALUES (:product_id, :name, :value, :unit, :sort_order)
    ");
    
    $priceBreakStmt = $pdo->prepare("
        INSERT INTO sk_product_price_break (product_id, quantity, price) 
        VALUES (:product_id, :quantity, :price)
    ");
    
    // 遍历所有产品并插入数据库
    foreach ($products as $index => $product) {
        try {
            // 开始事务
            $pdo->beginTransaction();
            
            // 检查产品是否已存在
            $checkStmt = $pdo->prepare("SELECT id FROM sk_product WHERE product_id = :product_id");
            $checkStmt->execute(['product_id' => $product['productId']]);
            
            if ($checkStmt->fetch()) {
                echo "跳过已存在的产品: {$product['modelNumber']} ({$product['productId']})\n";
                $pdo->rollback();
                $errorCount++;
                continue;
            }
            
            // 插入产品主表数据
            $productData = [
                'product_id' => $product['productId'],
                'model_number' => $product['modelNumber'],
                'brand' => $product['brand'],
                'category' => $product['category'],
                'sub_category' => $product['subCategory'] ?? null,
                'name' => $product['name'],
                'description' => $product['description'],
                'image_url' => $product['imageUrl'],
                'status' => $product['status'],
                'package_type' => $product['package']['type'] ?? null,
                'package_packaging' => $product['package']['packaging'] ?? null,
                'inventory_stock' => $product['inventory']['stock'] ?? 0,
                'inventory_min_order_quantity' => $product['inventory']['minOrderQuantity'] ?? 1,
                'inventory_lead_time' => $product['inventory']['leadTime'] ?? null,
                'pricing_unit_price' => $product['pricing']['unitPrice'] ?? 0,
                'pricing_currency' => $product['pricing']['currency'] ?? 'USD',
                'compliance_rohs' => $product['compliance']['rohs'] ?? 'Unknown',
                'compliance_reach' => $product['compliance']['reach'] ?? 'Unknown',
                'compliance_eccn' => $product['compliance']['eccn'] ?? null,
                'links_datasheet_url' => $product['links']['datasheetUrl'] ?? null,
                'links_product_page_url' => $product['links']['productPageUrl'] ?? null,
                'links_simulation_model_url' => $product['links']['simulationModelUrl'] ?? null,
                'updated_at' => $product['updatedAt'] ?? date('Y-m-d H:i:s'),
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $productStmt->execute($productData);
            
            // 插入产品规格参数
            if (!empty($product['specifications'])) {
                foreach ($product['specifications'] as $specIndex => $spec) {
                    $specData = [
                        'product_id' => $product['productId'],
                        'name' => $spec['name'],
                        'value' => (string)($spec['value'] ?? ''),
                        'unit' => $spec['unit'] ?? null,
                        'sort_order' => $specIndex
                    ];
                    $specStmt->execute($specData);
                }
            }
            
            // 插入产品价格区间
            if (!empty($product['pricing']['priceBreaks'])) {
                foreach ($product['pricing']['priceBreaks'] as $priceBreak) {
                    $priceBreakData = [
                        'product_id' => $product['productId'],
                        'quantity' => $priceBreak['quantity'],
                        'price' => $priceBreak['price']
                    ];
                    $priceBreakStmt->execute($priceBreakData);
                }
            }
            
            // 提交事务
            $pdo->commit();
            
            echo "成功插入产品: {$product['modelNumber']} ({$product['productId']})\n";
            $successCount++;
            
        } catch (Exception $e) {
            // 回滚事务
            $pdo->rollback();
            
            echo "插入产品失败: {$product['modelNumber']} ({$product['productId']}) - " . $e->getMessage() . "\n";
            $errorCount++;
        }
    }
    
    echo "\n========================================\n";
    echo "数据插入完成！\n";
    echo "成功: {$successCount} 个产品\n";
    echo "失败: {$errorCount} 个产品\n";
    echo "========================================\n";
    
} catch (Exception $e) {
    echo "脚本执行出错: " . $e->getMessage() . "\n";
    exit(1);
}