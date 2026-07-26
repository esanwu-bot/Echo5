<?php

use think\migration\Seeder;

class InitialDataSeeder extends Seeder
{
    public function run()
    {
        // Insert categories
        $categories = [
            ['id' => 1, 'name' => 'Red Wine', 'parent_id' => 0, 'sort_order' => 1, 'status' => 1],
            ['id' => 2, 'name' => 'White Wine', 'parent_id' => 0, 'sort_order' => 2, 'status' => 1],
            ['id' => 3, 'name' => 'Sparkling Wine', 'parent_id' => 0, 'sort_order' => 3, 'status' => 1],
            ['id' => 4, 'name' => 'Whiskey', 'parent_id' => 0, 'sort_order' => 4, 'status' => 1],
            ['id' => 5, 'name' => 'Vodka', 'parent_id' => 0, 'sort_order' => 5, 'status' => 1],
        ];
        
    $this->table('product_category')->insert($categories)->save();

        // Insert products
        $products = [
            [
                'id' => 1,
                'name' => 'Moutai Flying Fairy 53°',
                'description' => 'Premium Chinese liquor with rich aroma and smooth taste',
                'price' => 2860.00,
                'stock' => 50,
                'category_id' => 1,
                'main_image' => '/images/moutai-53.jpg',
                'status' => 1,
                'sales_count' => 42
            ],
            [
                'id' => 2,
                'name' => 'Moutai 407',
                'description' => 'Classic Moutai with traditional brewing process',
                'price' => 1520.00,
                'stock' => 30,
                'category_id' => 1,
                'main_image' => '/images/moutai-407.jpg',
                'status' => 1,
                'sales_count' => 38
            ],
            [
                'id' => 3,
                'name' => 'Wuliangye Traditional 2018',
                'description' => 'Five-grain liquor with complex flavor profile',
                'price' => 158.00,
                'stock' => 100,
                'category_id' => 1,
                'main_image' => '/images/wuliangye-2018.jpg',
                'status' => 1,
                'sales_count' => 35
            ],
            [
                'id' => 4,
                'name' => 'Wuliangye Wuxing',
                'description' => 'Premium five-grain spirit with aged complexity',
                'price' => 4250.00,
                'stock' => 20,
                'category_id' => 1,
                'main_image' => '/images/wuliangye-wuxing.jpg',
                'status' => 1,
                'sales_count' => 25
            ],
            [
                'id' => 5,
                'name' => 'Moutai 1L Special Edition',
                'description' => 'Large bottle premium Moutai for special occasions',
                'price' => 680.00,
                'stock' => 15,
                'category_id' => 1,
                'main_image' => '/images/moutai-1l.jpg',
                'status' => 1,
                'sales_count' => 18
            ]
        ];
        
        $this->table('products')->insert($products)->save();

        // Insert admin user
        $admin = [
            'id' => 1,
            'username' => 'admin',
            'password' => password_hash('admin123', PASSWORD_DEFAULT),
            'nickname' => 'Administrator',
            'status' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->table('admins')->insert($admin)->save();

        // Insert test user
        $user = [
            'id' => 1,
            'phone' => '13800138000',
            'nickname' => 'Test User',
            'status' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->table('users')->insert($user)->save();

        // Insert test address
        $address = [
            'id' => 1,
            'user_id' => 1,
            'name' => 'Zhang San',
            'phone' => '13800138000',
            'province' => 'Beijing',
            'city' => 'Beijing',
            'district' => 'Chaoyang District',
            'detail' => 'No. 123 Jianguo Road',
            'is_default' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        $this->table('addresses')->insert($address)->save();

        // Insert test orders
        $orders = [
            [
                'id' => 1,
                'order_no' => 'WINE20230511001',
                'user_id' => 1,
                'total_price' => 2860.00,
                'status' => 2,
                'address_id' => 1,
                'address_info' => json_encode([
                    'name' => 'Zhang San',
                    'phone' => '13800138000',
                    'full_address' => 'Beijing Beijing Chaoyang District No. 123 Jianguo Road'
                ]),
                'paid_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 hours')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
            ],
            [
                'id' => 2,
                'order_no' => 'WINE20230511002',
                'user_id' => 1,
                'total_price' => 1520.00,
                'status' => 3,
                'address_id' => 1,
                'address_info' => json_encode([
                    'name' => 'Zhang San',
                    'phone' => '13800138000',
                    'full_address' => 'Beijing Beijing Chaoyang District No. 123 Jianguo Road'
                ]),
                'paid_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'shipped_at' => date('Y-m-d H:i:s', strtotime('-12 hours')),
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 day -2 hours')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-12 hours'))
            ]
        ];
        
        $this->table('orders')->insert($orders)->save();

        // Insert order items
        $orderItems = [
            [
                'order_id' => 1,
                'product_id' => 1,
                'product_name' => 'Moutai Flying Fairy 53°',
                'product_image' => '/images/moutai-53.jpg',
                'price' => 2860.00,
                'quantity' => 1,
                'total_price' => 2860.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 hours')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-3 hours'))
            ],
            [
                'order_id' => 2,
                'product_id' => 2,
                'product_name' => 'Moutai 407',
                'product_image' => '/images/moutai-407.jpg',
                'price' => 1520.00,
                'quantity' => 1,
                'total_price' => 1520.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 day -2 hours')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day -2 hours'))
            ]
        ];
        
        $this->table('order_items')->insert($orderItems)->save();
    }
}