<?php

use think\migration\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run Method.
     *
     * Write your database seeder using this method.
     */
    public function run()
    {
        // 创建商品分类
        $categories = [
            [
                'id' => 1,
                'name' => '白酒',
                'parent_id' => 0,
                'sort_order' => 1,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 2,
                'name' => '红酒',
                'parent_id' => 0,
                'sort_order' => 2,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 3,
                'name' => '啤酒',
                'parent_id' => 0,
                'sort_order' => 3,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 4,
                'name' => '威士忌',
                'parent_id' => 0,
                'sort_order' => 4,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 5,
                'name' => '茅台系列',
                'parent_id' => 1,
                'sort_order' => 1,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 6,
                'name' => '五粮液系列',
                'parent_id' => 1,
                'sort_order' => 2,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 7,
                'name' => '法国红酒',
                'parent_id' => 2,
                'sort_order' => 1,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 8,
                'name' => '澳洲红酒',
                'parent_id' => 2,
                'sort_order' => 2,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]
        ];

    // Insert into the actual product_category table
    $this->table('product_category')->insert($categories)->save();

        // 创建商品数据
        $products = [
            [
                'name' => '茅台飞天53度500ml',
                'description' => '贵州茅台酒，国酒茅台，酱香型白酒的典型代表，口感醇厚，回味悠长。',
                'price' => 2999.00,
                'stock' => 50,
                'category_id' => 5,
                'main_image' => '/uploads/products/maotai_feitian.jpg',
                'images' => json_encode([
                    '/uploads/products/maotai_feitian_1.jpg',
                    '/uploads/products/maotai_feitian_2.jpg',
                    '/uploads/products/maotai_feitian_3.jpg'
                ]),
                'weight' => 1.2,
                'volume' => 500,
                'alcohol_content' => 53.0,
                'origin' => '贵州茅台镇',
                'sales_count' => 128,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '五粮液52度500ml',
                'description' => '五粮液，浓香型白酒典型代表，以高粱、大米、糯米、小麦、玉米五种粮食为原料。',
                'price' => 1299.00,
                'stock' => 80,
                'category_id' => 6,
                'main_image' => '/uploads/products/wuliangye.jpg',
                'images' => json_encode([
                    '/uploads/products/wuliangye_1.jpg',
                    '/uploads/products/wuliangye_2.jpg'
                ]),
                'weight' => 1.1,
                'volume' => 500,
                'alcohol_content' => 52.0,
                'origin' => '四川宜宾',
                'sales_count' => 95,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '拉菲传奇红酒750ml',
                'description' => '法国拉菲传奇红酒，来自波尔多产区，口感丰富，单宁柔顺，适合搭配牛排等红肉。',
                'price' => 899.00,
                'stock' => 120,
                'category_id' => 7,
                'main_image' => '/uploads/products/lafite_legend.jpg',
                'images' => json_encode([
                    '/uploads/products/lafite_legend_1.jpg',
                    '/uploads/products/lafite_legend_2.jpg'
                ]),
                'weight' => 1.5,
                'volume' => 750,
                'alcohol_content' => 13.5,
                'origin' => '法国波尔多',
                'sales_count' => 67,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '奔富BIN389红酒750ml',
                'description' => '澳洲奔富酒庄BIN389，赤霞珠与设拉子混酿，果香浓郁，口感平衡。',
                'price' => 599.00,
                'stock' => 200,
                'category_id' => 8,
                'main_image' => '/uploads/products/penfolds_bin389.jpg',
                'images' => json_encode([
                    '/uploads/products/penfolds_bin389_1.jpg',
                    '/uploads/products/penfolds_bin389_2.jpg'
                ]),
                'weight' => 1.4,
                'volume' => 750,
                'alcohol_content' => 14.5,
                'origin' => '澳大利亚',
                'sales_count' => 156,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '青岛啤酒500ml*12瓶',
                'description' => '青岛啤酒，中国知名啤酒品牌，口感清爽，泡沫丰富，适合聚会畅饮。',
                'price' => 89.00,
                'stock' => 500,
                'category_id' => 3,
                'main_image' => '/uploads/products/tsingtao_beer.jpg',
                'images' => json_encode([
                    '/uploads/products/tsingtao_beer_1.jpg',
                    '/uploads/products/tsingtao_beer_2.jpg'
                ]),
                'weight' => 6.5,
                'volume' => 6000,
                'alcohol_content' => 4.3,
                'origin' => '山东青岛',
                'sales_count' => 342,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '山崎12年威士忌700ml',
                'description' => '日本山崎12年单一麦芽威士忌，口感醇厚，带有蜂蜜和果香，是威士忌爱好者的首选。',
                'price' => 3999.00,
                'stock' => 15,
                'category_id' => 4,
                'main_image' => '/uploads/products/yamazaki_12.jpg',
                'images' => json_encode([
                    '/uploads/products/yamazaki_12_1.jpg',
                    '/uploads/products/yamazaki_12_2.jpg'
                ]),
                'weight' => 1.3,
                'volume' => 700,
                'alcohol_content' => 43.0,
                'origin' => '日本',
                'sales_count' => 23,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '剑南春52度500ml',
                'description' => '剑南春，中国名酒，浓香型白酒，口感绵甜，香味协调，是宴请宾客的佳品。',
                'price' => 699.00,
                'stock' => 100,
                'category_id' => 1,
                'main_image' => '/uploads/products/jiannanchun.jpg',
                'images' => json_encode([
                    '/uploads/products/jiannanchun_1.jpg',
                    '/uploads/products/jiannanchun_2.jpg'
                ]),
                'weight' => 1.0,
                'volume' => 500,
                'alcohol_content' => 52.0,
                'origin' => '四川绵竹',
                'sales_count' => 78,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'name' => '马爹利蓝带干邑700ml',
                'description' => '法国马爹利蓝带干邑，口感圆润，香味浓郁，是干邑白兰地的经典之作。',
                'price' => 1599.00,
                'stock' => 60,
                'category_id' => 4,
                'main_image' => '/uploads/products/martell_cordon_bleu.jpg',
                'images' => json_encode([
                    '/uploads/products/martell_cordon_bleu_1.jpg',
                    '/uploads/products/martell_cordon_bleu_2.jpg'
                ]),
                'weight' => 1.4,
                'volume' => 700,
                'alcohol_content' => 40.0,
                'origin' => '法国干邑',
                'sales_count' => 45,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]
        ];

        $this->table('products')->insert($products)->save();
    }
}