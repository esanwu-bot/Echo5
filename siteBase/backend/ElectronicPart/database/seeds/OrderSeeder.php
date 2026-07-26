<?php

use think\migration\Seeder;

class OrderSeeder extends Seeder
{
    /**
     * Run Method.
     *
     * Write your database seeder using this method.
     */
    public function run()
    {
        // 创建测试用户
        $users = [
            [
                'id' => 1,
                'phone' => '13800138000',
                'nickname' => '张三',
                'avatar' => '',
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 2,
                'phone' => '13800138001',
                'nickname' => '李四',
                'avatar' => '',
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 3,
                'phone' => '13800138002',
                'nickname' => '王五',
                'avatar' => '',
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]
        ];

        $this->table('users')->insert($users)->save();

        // 创建收货地址
        $addresses = [
            [
                'id' => 1,
                'user_id' => 1,
                'name' => '张三',
                'phone' => '13800138000',
                'province' => '北京市',
                'city' => '北京市',
                'district' => '朝阳区',
                'detail' => '三里屯街道123号',
                'is_default' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 2,
                'user_id' => 2,
                'name' => '李四',
                'phone' => '13800138001',
                'province' => '上海市',
                'city' => '上海市',
                'district' => '浦东新区',
                'detail' => '陆家嘴金融区456号',
                'is_default' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 3,
                'user_id' => 3,
                'name' => '王五',
                'phone' => '13800138002',
                'province' => '广东省',
                'city' => '深圳市',
                'district' => '南山区',
                'detail' => '科技园南区789号',
                'is_default' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]
        ];

        $this->table('addresses')->insert($addresses)->save();

        // 创建测试订单
        $orders = [
            [
                'id' => 1,
                'order_no' => 'WINE' . date('YmdHis') . '0001',
                'user_id' => 1,
                'total_price' => 2999.00,
                'status' => 4, // 已完成
                'address_id' => 1,
                'address_info' => json_encode([
                    'name' => '张三',
                    'phone' => '13800138000',
                    'province' => '北京市',
                    'city' => '北京市',
                    'district' => '朝阳区',
                    'detail' => '三里屯街道123号',
                    'full_address' => '北京市北京市朝阳区三里屯街道123号'
                ]),
                'remark' => '请尽快发货，谢谢！',
                'paid_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
                'shipped_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'completed_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'created_at' => date('Y-m-d H:i:s', strtotime('-4 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ],
            [
                'id' => 2,
                'order_no' => 'WINE' . date('YmdHis') . '0002',
                'user_id' => 2,
                'total_price' => 1899.00,
                'status' => 3, // 已发货
                'address_id' => 2,
                'address_info' => json_encode([
                    'name' => '李四',
                    'phone' => '13800138001',
                    'province' => '上海市',
                    'city' => '上海市',
                    'district' => '浦东新区',
                    'detail' => '陆家嘴金融区456号',
                    'full_address' => '上海市上海市浦东新区陆家嘴金融区456号'
                ]),
                'remark' => '',
                'tracking_number' => 'SF1234567890',
                'paid_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'shipped_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ],
            [
                'id' => 3,
                'order_no' => 'WINE' . date('YmdHis') . '0003',
                'user_id' => 3,
                'total_price' => 599.00,
                'status' => 2, // 已付款
                'address_id' => 3,
                'address_info' => json_encode([
                    'name' => '王五',
                    'phone' => '13800138002',
                    'province' => '广东省',
                    'city' => '深圳市',
                    'district' => '南山区',
                    'detail' => '科技园南区789号',
                    'full_address' => '广东省深圳市南山区科技园南区789号'
                ]),
                'remark' => '工作日配送',
                'paid_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ],
            [
                'id' => 4,
                'order_no' => 'WINE' . date('YmdHis') . '0004',
                'user_id' => 1,
                'total_price' => 1299.00,
                'status' => 1, // 待付款
                'address_id' => 1,
                'address_info' => json_encode([
                    'name' => '张三',
                    'phone' => '13800138000',
                    'province' => '北京市',
                    'city' => '北京市',
                    'district' => '朝阳区',
                    'detail' => '三里屯街道123号',
                    'full_address' => '北京市北京市朝阳区三里屯街道123号'
                ]),
                'remark' => '',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 5,
                'order_no' => 'WINE' . date('YmdHis') . '0005',
                'user_id' => 2,
                'total_price' => 89.00,
                'status' => 5, // 已取消
                'address_id' => 2,
                'address_info' => json_encode([
                    'name' => '李四',
                    'phone' => '13800138001',
                    'province' => '上海市',
                    'city' => '上海市',
                    'district' => '浦东新区',
                    'detail' => '陆家嘴金融区456号',
                    'full_address' => '上海市上海市浦东新区陆家嘴金融区456号'
                ]),
                'remark' => '不需要了',
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ]
        ];

        $this->table('orders')->insert($orders)->save();

        // 创建订单商品
        $orderItems = [
            // 订单1的商品
            [
                'order_id' => 1,
                'product_id' => 1,
                'product_name' => '茅台飞天53度500ml',
                'product_image' => '/uploads/products/maotai_feitian.jpg',
                'price' => 2999.00,
                'quantity' => 1,
                'total_price' => 2999.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-4 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-4 days'))
            ],
            // 订单2的商品
            [
                'order_id' => 2,
                'product_id' => 2,
                'product_name' => '五粮液52度500ml',
                'product_image' => '/uploads/products/wuliangye.jpg',
                'price' => 1299.00,
                'quantity' => 1,
                'total_price' => 1299.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-3 days'))
            ],
            [
                'order_id' => 2,
                'product_id' => 3,
                'product_name' => '拉菲传奇红酒750ml',
                'product_image' => '/uploads/products/lafite_legend.jpg',
                'price' => 600.00,
                'quantity' => 1,
                'total_price' => 600.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-3 days'))
            ],
            // 订单3的商品
            [
                'order_id' => 3,
                'product_id' => 4,
                'product_name' => '奔富BIN389红酒750ml',
                'product_image' => '/uploads/products/penfolds_bin389.jpg',
                'price' => 599.00,
                'quantity' => 1,
                'total_price' => 599.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-2 days'))
            ],
            // 订单4的商品
            [
                'order_id' => 4,
                'product_id' => 2,
                'product_name' => '五粮液52度500ml',
                'product_image' => '/uploads/products/wuliangye.jpg',
                'price' => 1299.00,
                'quantity' => 1,
                'total_price' => 1299.00,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ],
            // 订单5的商品
            [
                'order_id' => 5,
                'product_id' => 5,
                'product_name' => '青岛啤酒500ml*12瓶',
                'product_image' => '/uploads/products/tsingtao_beer.jpg',
                'price' => 89.00,
                'quantity' => 1,
                'total_price' => 89.00,
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day'))
            ]
        ];

        $this->table('order_items')->insert($orderItems)->save();
    }
}