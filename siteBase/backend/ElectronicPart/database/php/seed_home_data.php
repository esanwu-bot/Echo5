<?php
/**
 * 首页数据初始化脚本
 * 
 * HomeController数据对应关系：
 * 1. Hero横幅 -> sk_banner (position='home') - 后台菜单：轮播图管理
 * 2. 关于我们 -> sk_article (category_id=1) - 后台菜单：文章管理
 * 3. 招聘职位 -> sk_job - 后台菜单：需要新增或使用数据字典
 * 4. 其他静态数据 -> 使用数据字典实现后台管理
 */

require __DIR__ . '/../vendor/autoload.php';

// 直接配置数据库连接
$config = [
    'hostname' => '47.119.22.120',
    'database' => 'semiconductor_db',
    'username' => 'semiconductor_db',
    'password' => 'mLWHWwREKJRZmX2Y',
    'hostport' => '3306'
];

try {
    $pdo = new PDO(
        "mysql:host={$config['hostname']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "开始插入首页数据...\n\n";
    
    // 1. 插入首页轮播图数据 (sk_banner)
    echo "1. 插入首页轮播图...\n";
    $banners = [
        ['title' => '创新科技 引领未来', 'position' => 'home', 'image' => '/uploads/banners/home-1.jpg', 'link' => '/products', 'sort' => 1, 'status' => 1],
        ['title' => '智能芯片解决方案', 'position' => 'home', 'image' => '/uploads/banners/home-2.jpg', 'link' => '/applications', 'sort' => 2, 'status' => 1],
        ['title' => '全球市场覆盖', 'position' => 'home', 'image' => '/uploads/banners/home-3.jpg', 'link' => '/about', 'sort' => 3, 'status' => 1]
    ];
    
    foreach ($banners as $banner) {
        $pdo->exec("INSERT INTO sk_banner (title, position, image, link, sort, status, create_time, update_time) 
                    VALUES ('{$banner['title']}', '{$banner['position']}', '{$banner['image']}', '{$banner['link']}', {$banner['sort']}, {$banner['status']}, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE title=VALUES(title)");
    }
    echo "   完成：插入 " . count($banners) . " 条轮播图数据\n\n";
    
    // 2. 插入文章分类 (sk_article_category)
    echo "2. 插入文章分类...\n";
    $pdo->exec("INSERT INTO sk_article_category (id, name, slug, sort, status, create_time, update_time) 
                VALUES (1, '关于我们', 'about-us', 1, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE name=VALUES(name)");
    echo "   完成：插入文章分类\n\n";
    
    // 3. 插入关于我们文章 (sk_article)
    echo "3. 插入关于我们文章...\n";
    $aboutContent = '天启芯科技是一家专注于智能科技产品研发与应用的高科技企业，致力于为客户提供创新的技术解决方案。我们拥有专业的研发团队、先进的技术实力和完善的售后服务体系。';
    $pdo->exec("INSERT INTO sk_article (category_id, title, author, summary, content, status, views, publish_time, create_time, update_time) 
                VALUES (1, '关于天启芯科技', '技术团队', '{$aboutContent}', '{$aboutContent}', 1, 0, NOW(), NOW(), NOW())
                ON DUPLICATE KEY UPDATE summary=VALUES(summary)");
    echo "   完成：插入关于我们文章\n\n";
    
    // 4. 插入招聘职位 (sk_job)
    echo "4. 插入招聘职位...\n";
    $jobs = [
        [
            'job_title' => '研发工程师',
            'department' => '技术部',
            'location' => '深圳',
            'job_type' => '全职',
            'salary_range' => '15K-25K',
            'requirements' => '本科及以上学历，3年以上相关工作经验',
            'responsibilities' => '负责产品研发和技术创新',
            'status' => 1
        ],
        [
            'job_title' => '销售经理',
            'department' => '销售部',
            'location' => '上海',
            'job_type' => '全职',
            'salary_range' => '10K-20K',
            'requirements' => '大专及以上学历，2年以上销售经验',
            'responsibilities' => '负责市场开拓和客户维护',
            'status' => 1
        ]
    ];
    
    foreach ($jobs as $job) {
        $pdo->exec("INSERT INTO sk_job (job_title, department, location, job_type, salary_range, requirements, responsibilities, status, create_time, update_time) 
                    VALUES ('{$job['job_title']}', '{$job['department']}', '{$job['location']}', '{$job['job_type']}', '{$job['salary_range']}', '{$job['requirements']}', '{$job['responsibilities']}', {$job['status']}, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE job_title=VALUES(job_title)");
    }
    echo "   完成：插入 " . count($jobs) . " 条招聘职位\n\n";
    
    // 5. 创建数据字典项目 (用于管理首页其他静态数据)
    echo "5. 创建首页数据字典...\n";
    
    // 检查是否存在 sk_dictionary_project 表
    $tables = $pdo->query("SHOW TABLES LIKE 'sk_dictionary_project'")->fetchAll();
    
    if (empty($tables)) {
        echo "   跳过：数据字典表不存在，需要先创建数据字典表结构\n\n";
    } else {
        // 创建首页配置项目
        $time = time();
        $pdo->exec("INSERT INTO sk_dictionary_project (name, code, description, status, create_time, update_time) 
                    VALUES ('首页配置', 'home_config', '首页各区块的配置数据', 1, {$time}, {$time})
                    ON DUPLICATE KEY UPDATE name=VALUES(name)");
        
        $projectId = $pdo->lastInsertId();
        if ($projectId == 0) {
            $result = $pdo->query("SELECT id FROM sk_dictionary_project WHERE code='home_config'")->fetch();
            $projectId = $result['id'];
        }
        
        // 创建字段定义
        $fields = [
            ['code' => 'support_services', 'name' => '技术支持服务', 'type' => 'textarea', 'data_type' => 'json', 'description' => '技术支持区块的服务列表'],
            ['code' => 'coverage_stats', 'name' => '市场覆盖统计', 'type' => 'textarea', 'data_type' => 'json', 'description' => '全球市场覆盖统计数据'],
            ['code' => 'core_values', 'name' => '核心价值观', 'type' => 'textarea', 'data_type' => 'json', 'description' => '公司核心价值观列表'],
            ['code' => 'footer_links', 'name' => '页脚链接', 'type' => 'textarea', 'data_type' => 'json', 'description' => '页脚各栏目链接配置']
        ];
        
        foreach ($fields as $field) {
            $pdo->exec("INSERT INTO sk_dictionary_field (project_id, name, code, type, data_type, description, required, status, create_time, update_time) 
                        VALUES ({$projectId}, '{$field['name']}', '{$field['code']}', '{$field['type']}', '{$field['data_type']}', '{$field['description']}', 0, 1, {$time}, {$time})
                        ON DUPLICATE KEY UPDATE name=VALUES(name)");
        }
        
        // 插入默认数据
        $defaultData = [
            [
                'field_code' => 'support_services',
                'value' => json_encode([
                    ['title' => '技术咨询', 'description' => '专业的技术团队为您提供产品选型和应用建议', 'icon' => 'consultation'],
                    ['title' => '产品培训', 'description' => '系统的产品使用培训和技术指导', 'icon' => 'training'],
                    ['title' => '售后支持', 'description' => '7x24小时的技术支持和维护服务', 'icon' => 'support']
                ], JSON_UNESCAPED_UNICODE)
            ],
            [
                'field_code' => 'coverage_stats',
                'value' => json_encode([
                    ['label' => '服务国家', 'value' => '50+'],
                    ['label' => '合作伙伴', 'value' => '200+'],
                    ['label' => '客户满意度', 'value' => '98%']
                ], JSON_UNESCAPED_UNICODE)
            ],
            [
                'field_code' => 'core_values',
                'value' => json_encode([
                    ['title' => '诚信经营', 'description' => '以诚信为本，建立长期合作关系'],
                    ['title' => '创新驱动', 'description' => '持续创新，引领行业发展'],
                    ['title' => '客户至上', 'description' => '以客户需求为导向，提供优质服务']
                ], JSON_UNESCAPED_UNICODE)
            ],
            [
                'field_code' => 'footer_links',
                'value' => json_encode([
                    'company' => [
                        'title' => '公司信息',
                        'links' => [
                            ['name' => '关于我们', 'url' => '/about'],
                            ['name' => '企业文化', 'url' => '/about/culture'],
                            ['name' => '发展历程', 'url' => '/about/history']
                        ]
                    ],
                    'products' => [
                        'title' => '产品中心',
                        'links' => [
                            ['name' => '智能芯片', 'url' => '/products/chips'],
                            ['name' => '传感器', 'url' => '/products/sensors'],
                            ['name' => '控制器', 'url' => '/products/controllers']
                        ]
                    ],
                    'support' => [
                        'title' => '技术支持',
                        'links' => [
                            ['name' => '技术文档', 'url' => '/support/docs'],
                            ['name' => '常见问题', 'url' => '/support/faq'],
                            ['name' => '在线客服', 'url' => '/support/chat']
                        ]
                    ],
                    'contact' => [
                        'title' => '联系我们',
                        'info' => [
                            'address' => '深圳市南山区科技园',
                            'phone' => '+86-755-12345678',
                            'email' => 'info@tianqixin.tech'
                        ]
                    ]
                ], JSON_UNESCAPED_UNICODE)
            ]
        ];
        
        // 构建 field_values JSON
        $fieldValues = [];
        foreach ($defaultData as $data) {
            $fieldResult = $pdo->query("SELECT code FROM sk_dictionary_field WHERE project_id={$projectId} AND code='{$data['field_code']}'")->fetch();
            if ($fieldResult) {
                $fieldValues[$data['field_code']] = $data['value'];
            }
        }
        
        if (!empty($fieldValues)) {
            $fieldValuesJson = json_encode($fieldValues, JSON_UNESCAPED_UNICODE);
            $escapedJson = $pdo->quote($fieldValuesJson);
            $pdo->exec("INSERT INTO sk_dictionary_data (project_id, field_values, status, create_time, update_time) 
                        VALUES ({$projectId}, {$escapedJson}, 1, {$time}, {$time})
                        ON DUPLICATE KEY UPDATE field_values=VALUES(field_values)");
        }
        
        echo "   完成：创建首页数据字典配置\n\n";
    }
    
    echo "✓ 所有首页数据插入完成！\n\n";
    echo "数据对应关系：\n";
    echo "- Hero横幅：sk_banner (position='home') -> 后台菜单：轮播图管理\n";
    echo "- 关于我们：sk_article (category_id=1) -> 后台菜单：文章管理\n";
    echo "- 招聘职位：sk_job -> 后台菜单：需要添加招聘管理菜单\n";
    echo "- 其他配置：sk_dictionary_* 表 -> 后台菜单：需要添加数据字典管理\n";
    
} catch (PDOException $e) {
    echo "错误：" . $e->getMessage() . "\n";
    exit(1);
}
