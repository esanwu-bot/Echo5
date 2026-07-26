<?php
declare(strict_types=1);

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\model\User;
use app\model\Product;
use app\model\Order;
use app\model\CartItem;
use app\model\UserAddress;
use app\service\OrderService;
use app\service\PaymentService;
use app\service\outer\SyncService;
use think\facade\Db;
use think\facade\Log;

/**
 * 订单流程测试命令
 */
class OrderFlowTestCommand extends Command
{
    protected function configure()
    {
        $this->setName('test:order-flow')
            ->addOption('user-id', 'u', null, '测试用户ID')
            ->addOption('product-id', 'p', null, '测试商品ID')
            ->addOption('skip-payment', 's', null, '跳过支付流程')
            ->setDescription('测试完整的订单流程');
    }

    protected function execute(Input $input, Output $output)
    {
        $userId = $input->getOption('user-id') ?: 1;
        $productId = $input->getOption('product-id') ?: 1;
        $skipPayment = $input->getOption('skip-payment');
        
        $output->writeln("开始测试订单流程...");
        $output->writeln("测试用户ID: {$userId}");
        $output->writeln("测试商品ID: {$productId}");
        
        try {
            // 1. 验证用户和商品
            $this->validateTestData($userId, $productId, $output);
            
            // 2. 添加商品到购物车
            $cartItem = $this->addToCart($userId, $productId, $output);
            
            // 3. 创建订单
            $order = $this->createOrder($userId, $cartItem, $output);
            
            // 4. 支付流程（可选跳过）
            if (!$skipPayment) {
                $this->processPayment($order, $output);
            } else {
                $output->writeln("<comment>跳过支付流程，手动标记订单为已支付</comment>");
                $this->markOrderAsPaid($order, $output);
            }
            
            // 5. 验证库存预留
            $this->verifyInventoryReservation($order, $output);
            
            // 6. 验证出库订单创建
            $this->verifyOutboundOrder($order, $output);
            
            // 7. 模拟发货流程
            $this->simulateShipping($order, $output);
            
            // 8. 模拟确认收货
            $this->simulateDelivery($order, $output);
            
            $output->writeln("<info>订单流程测试完成！</info>");
            $output->writeln("订单号: {$order->order_no}");
            
            return 0;
            
        } catch (\Exception $e) {
            $output->writeln("<error>订单流程测试失败: {$e->getMessage()}</error>");
            Log::error('订单流程测试失败', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
    
    /**
     * 验证测试数据
     */
    protected function validateTestData(int $userId, int $productId, Output $output)
    {
        $output->writeln("1. 验证测试数据...");
        
        // 验证用户
        $user = User::find($userId);
        if (!$user) {
            throw new \Exception("用户ID {$userId} 不存在");
        }
        $output->writeln("   用户验证通过: {$user->nickname}");
        
        // 验证商品
        $product = Product::find($productId);
        if (!$product) {
            throw new \Exception("商品ID {$productId} 不存在");
        }
        $output->writeln("   商品验证通过: {$product->name}");
        
        // 验证库存
        if ($product->stock < 1) {
            throw new \Exception("商品库存不足");
        }
        $output->writeln("   库存验证通过: {$product->stock}");
        
        // 验证用户地址
        $address = UserAddress::where('user_id', $userId)->where('is_default', 1)->find();
        if (!$address) {
            // 创建测试地址
            $address = UserAddress::create([
                'user_id' => $userId,
                'name' => '测试收货人',
                'phone' => '13800138000',
                'province' => '北京市',
                'city' => '北京市',
                'district' => '朝阳区',
                'detail' => '测试地址详情',
                'is_default' => 1
            ]);
            $output->writeln("   创建测试地址: {$address->name}");
        } else {
            $output->writeln("   地址验证通过: {$address->name}");
        }
    }
    
    /**
     * 添加到购物车
     */
    protected function addToCart(int $userId, int $productId, Output $output): CartItem
    {
        $output->writeln("2. 添加商品到购物车...");
        
        // 检查是否已存在
        $existingItem = CartItem::where('user_id', $userId)
            ->where('product_id', $productId)
            ->find();
        
        if ($existingItem) {
            $existingItem->quantity += 1;
            $existingItem->save();
            $cartItem = $existingItem;
            $output->writeln("   更新购物车商品数量: {$cartItem->quantity}");
        } else {
            $product = Product::find($productId);
            $cartItem = CartItem::create([
                'user_id' => $userId,
                'product_id' => $productId,
                'quantity' => 1,
                'price' => $product->price,
                'selected' => 1
            ]);
            $output->writeln("   添加商品到购物车成功");
        }
        
        return $cartItem;
    }
    
    /**
     * 创建订单
     */
    protected function createOrder(int $userId, CartItem $cartItem, Output $output): Order
    {
        $output->writeln("3. 创建订单...");
        
        $orderService = new OrderService();
        $address = UserAddress::where('user_id', $userId)->where('is_default', 1)->find();
        
        $orderData = [
            'address_id' => $address->id,
            'delivery_method' => 1,
            'payment_method' => 1,
            'cart_ids' => [$cartItem->id],
            'remark' => '订单流程测试'
        ];
        
        $result = $orderService->createOrderFromCart($userId, $orderData);
        $order = Order::find($result['order_id']);
        
        $output->writeln("   订单创建成功: {$order->order_no}");
        $output->writeln("   订单金额: \${$order->total_amount} USD");
        
        return $order;
    }
    
    /**
     * 处理支付
     */
    protected function processPayment(Order $order, Output $output)
    {
        $output->writeln("4. 处理支付...");
        
        // 这里模拟支付成功
        $this->markOrderAsPaid($order, $output);
    }
    
    /**
     * 标记订单为已支付
     */
    protected function markOrderAsPaid(Order $order, Output $output)
    {
        $order->save([
            'status' => Order::STATUS_PAID,
            'paid_at' => time()
        ]);
        
        // 触发支付成功事件
        event('OrderPaid', $order);
        
        $output->writeln("   订单支付成功");
    }
    
    /**
     * 验证库存预留
     */
    protected function verifyInventoryReservation(Order $order, Output $output)
    {
        $output->writeln("5. 验证库存预留...");
        
        // 检查预留记录
        $reservations = Db::name('inventory_reservations')
            ->where('order_no', $order->order_no)
            ->where('status', 1)
            ->select()
            ->toArray();
        
        if (empty($reservations)) {
            throw new \Exception("库存预留记录不存在");
        }
        
        $totalReserved = array_sum(array_column($reservations, 'quantity'));
        $output->writeln("   库存预留成功，预留数量: {$totalReserved}");
        
        // 验证库存表中的预留数量
        foreach ($reservations as $reservation) {
            $inventory = Db::name('inventory')
                ->where('product_id', $reservation['product_id'])
                ->find();
            
            if (!$inventory || $inventory['reserved_quantity'] < $reservation['quantity']) {
                throw new \Exception("商品ID {$reservation['product_id']} 库存预留数量不正确");
            }
        }
        
        $output->writeln("   库存预留验证通过");
    }
    
    /**
     * 验证出库订单创建
     */
    protected function verifyOutboundOrder(Order $order, Output $output)
    {
        $output->writeln("6. 验证出库订单创建...");
        
        $outboundOrder = Db::name('outbound_orders')
            ->where('order_no', $order->order_no)
            ->find();
        
        if (!$outboundOrder) {
            throw new \Exception("出库订单未创建");
        }
        
        $output->writeln("   出库订单创建成功: {$outboundOrder['id']}");
        $output->writeln("   出库状态: {$outboundOrder['status']}");
        
        // 验证出库订单明细
        $items = Db::name('outbound_order_items')
            ->where('outbound_order_id', $outboundOrder['id'])
            ->select()
            ->toArray();
        
        if (empty($items)) {
            throw new \Exception("出库订单明细不存在");
        }
        
        $output->writeln("   出库订单明细数量: " . count($items));
    }
    
    /**
     * 模拟发货流程
     */
    protected function simulateShipping(Order $order, Output $output)
    {
        $output->writeln("7. 模拟发货流程...");
        
        $syncService = new SyncService();
        
        // 模拟发货
        $result = $syncService->shipOrder($order->order_no, [
            'tracking_number' => 'TEST' . date('YmdHis'),
            'carrier' => '测试物流'
        ]);
        
        $output->writeln("   发货成功: {$result['message']}");
        
        // 更新商城订单状态
        $order->save([
            'status' => Order::STATUS_SHIPPED,
            'shipped_at' => time()
        ]);
        
        $output->writeln("   商城订单状态已更新为已发货");
    }
    
    /**
     * 模拟确认收货
     */
    protected function simulateDelivery(Order $order, Output $output)
    {
        $output->writeln("8. 模拟确认收货...");
        
        // 更新出库订单状态
        Db::name('outbound_orders')
            ->where('order_no', $order->order_no)
            ->update([
                'status' => 'delivered',
                'delivered_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        
        // 更新商城订单状态
        $order->save([
            'status' => Order::STATUS_COMPLETED,
            'completed_at' => time()
        ]);
        
        $output->writeln("   确认收货成功，订单已完成");
        
        // 显示最终状态
        $this->showFinalStatus($order, $output);
    }
    
    /**
     * 显示最终状态
     */
    protected function showFinalStatus(Order $order, Output $output)
    {
        $output->writeln("");
        $output->writeln("=== 订单流程完成状态 ===");
        $output->writeln("订单号: {$order->order_no}");
        $output->writeln("订单状态: {$order->getStatusText()}");
        $output->writeln("创建时间: " . date('Y-m-d H:i:s', $order->created_at));
        $output->writeln("支付时间: " . ($order->paid_at ? date('Y-m-d H:i:s', $order->paid_at) : '未支付'));
        $output->writeln("发货时间: " . ($order->shipped_at ? date('Y-m-d H:i:s', $order->shipped_at) : '未发货'));
        $output->writeln("完成时间: " . ($order->completed_at ? date('Y-m-d H:i:s', $order->completed_at) : '未完成'));
        
        // 显示库存变化
        $transactions = Db::name('inventory_transactions')
            ->where('reference_type', 'outbound_order')
            ->where('created_at', '>=', date('Y-m-d H:i:s', $order->created_at))
            ->select()
            ->toArray();
        
        if (!empty($transactions)) {
            $output->writeln("");
            $output->writeln("=== 库存变动记录 ===");
            foreach ($transactions as $transaction) {
                $output->writeln("商品ID: {$transaction['product_id']}, 变动: {$transaction['quantity']}, 类型: {$transaction['type']}");
            }
        }
    }
}