<?php
/**
 * 产品示例数据插入脚本
 * 插入符合新字段结构的示例产品数据
 */

require __DIR__ . '/../vendor/autoload.php';

$config = [
    'hostname' => '47.119.22.120',
    'database' => 'semiconductor_db',
    'username' => 'semiconductor_db',
    'password' => 'mLWHWwREKJRZmX2Y'
];

try {
    $pdo = new PDO(
        "mysql:host={$config['hostname']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "开始插入产品示例数据...\n\n";
    
    // 获取或创建分类
    $categoryResult = $pdo->query("SELECT id FROM sk_category WHERE name='音频' LIMIT 1")->fetch();
    if (!$categoryResult) {
        $pdo->exec("INSERT INTO sk_category (name, slug, status, sort, create_time, update_time) 
                    VALUES ('音频', 'audio', 1, 1, NOW(), NOW())");
        $categoryId = $pdo->lastInsertId();
        echo "创建分类：音频 (ID: {$categoryId})\n";
    } else {
        $categoryId = $categoryResult['id'];
        echo "使用现有分类：音频 (ID: {$categoryId})\n";
    }
    
    // 示例产品数据
    $products = [
        [
            'product_code' => 'PCM1841-Q1',
            'name' => 'PCM1841-Q1 汽车级音频ADC',
            'name_en' => 'PCM1841-Q1 Automotive Audio ADC',
            'subcategory' => '音频 ADC',
            'rating' => 'Automotive',
            'description' => '汽车级、四通道、32位192kHz高性能音频模数转换器',
            'package_type' => 'VQFN-HR',
            'pin_count' => 24,
            'temperature_range' => '-40 to 125',
            'safety_category' => '/',
            'datasheet_url' => '/downloads/PCM1841-Q1.pdf',
            'html_url' => '/products/PCM1841-Q1.html',
            'is_new' => 1,
            'stock' => 1000,
            'normally_stocked' => 1,
            'rohs_compliant' => 1,
            'status' => 1
        ],
        [
            'product_code' => 'OPA1678',
            'name' => 'OPA1678 通用运算放大器',
            'name_en' => 'OPA1678 General Purpose Op Amp',
            'subcategory' => '通用运算放大器',
            'rating' => 'Catalog',
            'description' => '低噪声、高精度、双通道运算放大器',
            'package_type' => 'SOIC',
            'pin_count' => 8,
            'temperature_range' => '-40 to 85',
            'safety_category' => '/',
            'datasheet_url' => '/downloads/OPA1678.pdf',
            'html_url' => '/products/OPA1678.html',
            'is_new' => 0,
            'stock' => 500,
            'normally_stocked' => 1,
            'rohs_compliant' => 1,
            'status' => 1
        ],
        [
            'product_code' => 'TLV320ADC3100',
            'name' => 'TLV320ADC3100 音频编解码器',
            'name_en' => 'TLV320ADC3100 Audio Codec',
            'subcategory' => '音频编解码器',
            'rating' => 'Catalog',
            'description' => '低功耗立体声音频ADC，带有miniDSP',
            'package_type' => 'QFN',
            'pin_count' => 32,
            'temperature_range' => '-40 to 85',
            'safety_category' => '/',
            'datasheet_url' => '/downloads/TLV320ADC3100.pdf',
            'html_url' => '/products/TLV320ADC3100.html',
            'is_new' => 1,
            'stock' => 0,
            'normally_stocked' => 0,
            'rohs_compliant' => 1,
            'status' => 1
        ]
    ];
    
    $insertedCount = 0;
    foreach ($products as $product) {
        // 检查产品是否已存在
        $exists = $pdo->query("SELECT id FROM sk_product WHERE product_code='{$product['product_code']}'")->fetch();
        if ($exists) {
            echo "跳过：产品 {$product['product_code']} 已存在\n";
            continue;
        }
        
        $sql = "INSERT INTO sk_product (
            category_id, product_code, name, name_en, subcategory, rating,
            description, package_type, pin_count, temperature_range, safety_category,
            datasheet_url, html_url, is_new, stock, normally_stocked, rohs_compliant,
            status, views, sort, create_time, update_time
        ) VALUES (
            {$categoryId}, 
            '{$product['product_code']}',
            '{$product['name']}',
            '{$product['name_en']}',
            '{$product['subcategory']}',
            '{$product['rating']}',
            '{$product['description']}',
            '{$product['package_type']}',
            {$product['pin_count']},
            '{$product['temperature_range']}',
            '{$product['safety_category']}',
            '{$product['datasheet_url']}',
            '{$product['html_url']}',
            {$product['is_new']},
            {$product['stock']},
            {$product['normally_stocked']},
            {$product['rohs_compliant']},
            {$product['status']},
            0, 0, NOW(), NOW()
        )";
        
        $pdo->exec($sql);
        echo "✓ 插入产品：{$product['product_code']} - {$product['name']}\n";
        $insertedCount++;
    }
    
    echo "\n";
    echo "========================================\n";
    echo "完成！插入 {$insertedCount} 个产品\n";
    echo "========================================\n";
    
} catch (PDOException $e) {
    echo "错误：" . $e->getMessage() . "\n";
    exit(1);
}
