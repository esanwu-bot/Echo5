<?php
// 事件定义文件
return [
    'bind' => [
        // 订单支付成功事件
        'OrderPaid' => 'app\listener\OrderPaidListener',
    ],

    'listen' => [
        'AppInit' => [],
        'HttpRun' => [],
        'HttpEnd' => [],
        'LogLevel' => [],
        'LogWrite' => [],
        
        // 订单相关事件
        'OrderPaid' => ['app\listener\OrderPaidListener'],
        'OrderCancelled' => [],
        'OrderShipped' => [],
        'OrderCompleted' => [],
        
        // 库存相关事件
        'InventoryChanged' => [],
        'InventoryLow' => [],
        
        // 用户相关事件
        'UserRegistered' => [],
        'UserLogin' => [],
    ],

    'subscribe' => [
    ],
];