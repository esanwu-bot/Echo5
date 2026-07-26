<?php
/**
 * 将MockProduct.json数据插入到电子元器件产品数据库表中
 * 
 * 使用方法：
 * 1. 确保已经运行了数据库迁移创建了表结构
 * 2. 在命令行中运行: php insert_mock_products.php
 */

// 设置脚本执行时间和内存限制
ini_set('memory_limit', '512M');
set_time_limit(0);

// 包含必要的文件
require_once __DIR__ . '/../vendor/autoload.php';

// 初始化ThinkPHP应用
$app = new \think\App();
$app->initialize();

try {
    // 读取MockProduct.json文件
    //$mockProductsFile = __DIR__ . '/../../docs/MockProduct.json';
    $mockProductsFile ="G:\\tqx_new\\tqx\\docs\\MockProduct.json";
    if (!file_exists($mockProductsFile)) {
        throw new Exception("MockProduct.json文件不存在: {$mockProductsFile}");
    }
    
    $jsonData = file_get_contents($mockProductsFile);
    $products = json_decode($jsonData, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON解析错误: " . json_last_error_msg());
    }
    
    echo "开始插入 " . count($products) . " 个产品到数据库...\n\n";
    
    $successCount = 0;
    $errorCount = 0;
    
    // 遍历所有产品并插入数据库
    foreach ($products as $index => $product) {
        try {
            // 开始事务
            \think\facade\Db::startTrans();
            
            // 检查产品是否已存在
            $existingProduct = \think\facade\Db::table('sk_product')
                ->where('product_id', $product['productId'])
                ->find();
            
            if ($existingProduct) {
                echo "跳过已存在的产品: {$product['modelNumber']} ({$product['productId']})\n";
                \think\facade\Db::rollback();
                $errorCount++;
                continue;
            }
            
            // 准备产品主表数据
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
            
            // 插入产品主表数据
            \think\facade\Db::table('sk_product')->insert($productData);
            
            // 插入产品规格参数
            if (!empty($product['specifications'])) {
                foreach ($product['specifications'] as $spec) {
                    $specData = [
                        'product_id' => $product['productId'],
                        'name' => $spec['name'],
                        'value' => $spec['value'],
                        'unit' => $spec['unit'] ?? null,
                        'sort_order' => 0
                    ];
                    \think\facade\Db::table('sk_product_specification')->insert($specData);
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
                    \think\facade\Db::table('sk_product_price_break')->insert($priceBreakData);
                }
            }
            
            // 提交事务
            \think\facade\Db::commit();
            
            echo "成功插入产品: {$product['modelNumber']} ({$product['productId']})\n";
            $successCount++;
            
        } catch (Exception $e) {
            // 回滚事务
            \think\facade\Db::rollback();
            
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