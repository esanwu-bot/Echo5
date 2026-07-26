<?php
/**
 * 网站配置数据插入脚本
 * 插入网站地址等基础配置
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
    
    echo "开始插入网站配置...\n\n";
    
    // 检查sk_config表是否存在
    $tableExists = $pdo->query("SHOW TABLES LIKE 'sk_config'")->fetch();
    if (!$tableExists) {
        echo "创建sk_config表...\n";
        $pdo->exec("
            CREATE TABLE `sk_config` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置名称',
                `value` TEXT COMMENT '配置值',
                `description` VARCHAR(255) COMMENT '配置描述',
                `type` VARCHAR(20) DEFAULT 'text' COMMENT '配置类型：text/textarea/number/switch',
                `group` VARCHAR(50) DEFAULT 'basic' COMMENT '配置分组',
                `sort` INT DEFAULT 0 COMMENT '排序',
                `status` TINYINT DEFAULT 1 COMMENT '状态：0=禁用，1=启用',
                `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表'
        ");
        echo "✓ sk_config表创建成功\n\n";
    }
    
    // 插入网站配置
    $configs = [
        [
            'config_key' => 'website_url',
            'value' => 'http://localhost:8000',
            'description' => '网站地址（用于拼接图片等资源的完整URL）',
            'type' => 'text',
            'group' => 'basic',
            'sort' => 1
        ],
        [
            'config_key' => 'website_name',
            'value' => '天启芯科技',
            'description' => '网站名称',
            'type' => 'text',
            'group' => 'basic',
            'sort' => 2
        ],
        [
            'config_key' => 'website_title',
            'value' => '天启芯科技 - 创新科技解决方案',
            'description' => '网站标题',
            'type' => 'text',
            'group' => 'basic',
            'sort' => 3
        ],
        [
            'config_key' => 'website_keywords',
            'value' => '半导体,芯片,智能科技,音频ADC,运算放大器',
            'description' => '网站关键词',
            'type' => 'text',
            'group' => 'seo',
            'sort' => 4
        ],
        [
            'config_key' => 'website_description',
            'value' => '天启芯科技专注于智能科技产品的研发与应用，提供创新的技术解决方案',
            'description' => '网站描述',
            'type' => 'textarea',
            'group' => 'seo',
            'sort' => 5
        ],
        [
            'config_key' => 'contact_email',
            'value' => 'info@tianqixin.tech',
            'description' => '联系邮箱',
            'type' => 'text',
            'group' => 'contact',
            'sort' => 6
        ],
        [
            'config_key' => 'contact_phone',
            'value' => '+86-755-12345678',
            'description' => '联系电话',
            'type' => 'text',
            'group' => 'contact',
            'sort' => 7
        ],
        [
            'config_key' => 'contact_address',
            'value' => '深圳市南山区科技园',
            'description' => '联系地址',
            'type' => 'text',
            'group' => 'contact',
            'sort' => 8
        ]
    ];
    
    $insertedCount = 0;
    $updatedCount = 0;
    
    foreach ($configs as $config) {
        $exists = $pdo->query("SELECT id FROM sk_config WHERE config_key='{$config['config_key']}'")->fetch();
        
        if ($exists) {
            $pdo->exec("UPDATE sk_config SET 
                config_value='{$config['value']}',
                description='{$config['description']}',
                `group`='{$config['group']}'
                WHERE config_key='{$config['config_key']}'");
            echo "✓ 更新配置：{$config['config_key']}\n";
            $updatedCount++;
        } else {
            $pdo->exec("INSERT INTO sk_config (config_key, config_value, description, `group`) 
                        VALUES ('{$config['config_key']}', '{$config['value']}', '{$config['description']}', '{$config['group']}')");
            echo "✓ 插入配置：{$config['config_key']}\n";
            $insertedCount++;
        }
    }
    
    echo "\n";
    echo "========================================\n";
    echo "完成！\n";
    echo "插入配置：{$insertedCount} 个\n";
    echo "更新配置：{$updatedCount} 个\n";
    echo "========================================\n";
    echo "\n";
    echo "提示：请在后台管理系统中修改 website_url 为实际的网站地址\n";
    echo "路径：系统设置 -> 网站配置 -> 网站地址\n";
    
} catch (PDOException $e) {
    echo "错误：" . $e->getMessage() . "\n";
    exit(1);
}
