<?php
declare(strict_types=1);

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use app\model\Order;
use app\model\Payment;
use app\service\outer\SyncService;
use think\facade\Db;
use think\facade\Log;

/**
 * 订单异常流程测试命令
 */
class OrderExceptionTestCommand extends Command
{
    protected function configure()
    {
        $this->setName('test:order-exception')
            ->addArgument('type', null, '异常类型: payment-fail|stock-shortage|order-cancel|refund')
            ->addOption('order-no', 'o', null, '测试订单号')
            ->setDescription('测试订单异常流程处理');
    }

    protected function execute(Input $input, Output $output)
    {
        $type = $input->getArgument('type');
        $orderNo = $input->getOption('order-no');
        
        if (!$type) {
            $output->writeln("<error>请指定异常类型: payment-fail|stock-shortage|order-cancel|refund</error>");
            return 1;
        }
        
        $output->writeln("开始测试订单异常流程: {$type}");
        
        try {
            switch ($type) {
                case 'payment-fail':
                    $this->testPaymentFailure($orderNo, $output);
                    break;
                    
                case 'stock-shortage':
                    $this->testStockShortage($orderNo, $output);
                    break;
                    
                case 'order-cancel':
                    $this->testOrderCancellation($orderNo, $output);
                    break;
                    
                case 'refund':
                    $this->testRefundProcess($orderNo, $output);
                    break;
                    
                default:
                    $output->writeln("<error>不支持的异常类型: {$type}</error>");
                    return 1;
            }
            
            $output->writeln("<info>异常流程测试完成</info>");
            return 0;
            
        } catch (\Exception $e) {
            $output->writeln("<error>异常流程测试失败: {$e->getMessage()}</error>");
            Log::error('订单异常流程测试失败', [
                'type' => $type,
                'order_no' => $orderNo,
                'error' => $e->getMessage()
            ]);
            return 1;
        }
    }
    
    /**
     * 测试支付失败处理
     */
    protected function testPaymentFailure(?string $orderNo, Output $output)
    {
        $output->writeln("1. 测试支付失败处理...");
        
        // 获取或创建测试订单
        $order = $this->getOrCreateTestOrder($orderNo, $output);
        
        // 创建失败的支付记录
        $payment = Payment::create([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'payment_method' => Payment::METHOD_WECHAT,
            'amount' => $order->total_amount,
            'status' => Payment::STATUS_FAILED,
            'failed_reason' => '测试支付失败',
            'failed_at' => time(),
            'created_at' => time()
        ]);
        
        $output->writeln("   创建失败支付记录: {$payment->payment_no}");
        
        // 检查订单状态是否保持为待支付
        if ($order->status !== Order::STATUS_PENDING) {
            throw new \Exception("订单状态应该保持为待支付");
        }
        
        $output->writeln("   订单状态验证通过: 保持待支付状态");
        
        // 检查库存是否未被预留
        $reservations = Db::name('inventory_reservations')
            ->where('order_no', $order->order_no)
            ->where('status', 1)
            ->count();
        
        if ($reservations > 0) {
            throw new \Exception("支付失败时不应该预留库存");
        }
        
        $output->writeln("   库存预留验证通过: 未预留库存");
        
        // 模拟用户重新支付
        $output->writeln("2. 模拟重新支付...");
        
        $newPayment = Payment::create([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'payment_method' => Payment::METHOD_WECHAT,
            'amount' => $order->total_amount,
            'status' => Payment::STATUS_SUCCESS,
            'paid_at' => time(),
            'created_at' => time()
        ]);
        
        // 更新订单状态
        $order->save([
            'status' => Order::STATUS_PAID,
            'paid_at' => time()
        ]);
        
        // 触发支付成功事件
        event('OrderPaid', $order);
        
        $output->writeln("   重新支付成功: {$newPayment->payment_no}");
        $output->writeln("   订单状态已更新为已支付");
    }
    
    /**
     * 测试库存不足处理
     */
    protected function testStockShortage(?string $orderNo, Output $output)
    {
        $output->writeln("1. 测试库存不足处理...");
        
        $order = $this->getOrCreateTestOrder($orderNo, $output);
        
        // 获取订单商品
        $orderItems = $order->items;
        if (empty($orderItems)) {
            throw new \Exception("订单商品为空");
        }
        
        $firstItem = $orderItems[0];
        
        // 模拟库存不足：将库存设置为0
        $originalStock = Db::name('inventory')
            ->where('product_id', $firstItem->product_id)
            ->value('quantity');
        
        Db::name('inventory')
            ->where('product_id', $firstItem->product_id)
            ->update(['quantity' => 0]);
        
        $output->writeln("   模拟库存不足: 商品ID {$firstItem->product_id} 库存设为0");
        
        // 尝试预留库存（应该失败）
        $syncService = new SyncService();
        
        try {
            $reservations = [
                [
                    'product_id' => $firstItem->product_id,
                    'quantity' => $firstItem->quantity
                ]
            ];
            
            $syncService->reserveInventory($reservations, $order->order_no);
            throw new \Exception("库存不足时预留应该失败");
            
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), '库存不足') !== false) {
                $output->writeln("   库存不足处理正确: {$e->getMessage()}");
            } else {
                throw $e;
            }
        }
        
        // 恢复库存
        Db::name('inventory')
            ->where('product_id', $firstItem->product_id)
            ->update(['quantity' => $originalStock]);
        
        $output->writeln("   恢复原始库存: {$originalStock}");
        
        // 发送库存不足通知（模拟）
        $this->sendStockShortageNotification($order, $firstItem, $output);
    }
    
    /**
     * 测试订单取消处理
     */
    protected function testOrderCancellation(?string $orderNo, Output $output)
    {
        $output->writeln("1. 测试订单取消处理...");
        
        $order = $this->getOrCreateTestOrder($orderNo, $output);
        
        // 如果订单已支付，先预留库存
        if ($order->status == Order::STATUS_PAID) {
            $this->reserveInventoryForOrder($order, $output);
        }
        
        // 取消订单
        $syncService = new SyncService();
        $result = $syncService->cancelOrder($order->order_no, '用户主动取消');
        
        $output->writeln("   订单取消成功: {$result['message']}");
        
        // 验证库存是否已释放
        $reservations = Db::name('inventory_reservations')
            ->where('order_no', $order->order_no)
            ->where('status', 1)
            ->count();
        
        if ($reservations > 0) {
            throw new \Exception("取消订单后应该释放所有库存预留");
        }
        
        $output->writeln("   库存预留已释放");
        
        // 验证出库订单状态
        $outboundOrder = Db::name('outbound_orders')
            ->where('order_no', $order->order_no)
            ->find();
        
        if ($outboundOrder && $outboundOrder['status'] !== 'cancelled') {
            throw new \Exception("出库订单状态应该为已取消");
        }
        
        $output->writeln("   出库订单状态已更新为已取消");
        
        // 更新商城订单状态
        $order->save([
            'status' => Order::STATUS_CANCELLED,
            'cancelled_at' => time(),
            'cancel_reason' => '用户主动取消'
        ]);
        
        $output->writeln("   商城订单状态已更新为已取消");
        
        // 如果已支付，处理退款
        if ($order->paid_at) {
            $this->processRefund($order, $output);
        }
    }
    
    /**
     * 测试退款流程
     */
    protected function testRefundProcess(?string $orderNo, Output $output)
    {
        $output->writeln("1. 测试退款流程...");
        
        $order = $this->getOrCreateTestOrder($orderNo, $output);
        
        // 确保订单已支付
        if ($order->status == Order::STATUS_PENDING) {
            $this->markOrderAsPaid($order, $output);
        }
        
        $this->processRefund($order, $output);
    }
    
    /**
     * 处理退款
     */
    protected function processRefund(Order $order, Output $output)
    {
        $output->writeln("2. 处理退款...");
        
        // 获取支付记录
        $payment = Payment::where('order_id', $order->id)
            ->where('status', Payment::STATUS_SUCCESS)
            ->find();
        
        if (!$payment) {
            throw new \Exception("未找到成功的支付记录");
        }
        
        // 创建退款记录
        $refundPayment = Payment::create([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'payment_method' => $payment->payment_method,
            'amount' => -$payment->amount, // 负数表示退款
            'status' => Payment::STATUS_SUCCESS,
            'third_party_no' => 'REFUND' . date('YmdHis'),
            'paid_at' => time(),
            'created_at' => time()
        ]);
        
        // 更新原支付记录状态
        $payment->save(['status' => Payment::STATUS_REFUNDED]);
        
        $output->writeln("   退款记录创建成功: {$refundPayment->payment_no}");
        $output->writeln("   退款金额: \${$payment->amount} USD");
        
        // 记录退款日志
        Log::info('订单退款成功', [
            'order_no' => $order->order_no,
            'refund_amount' => $payment->amount,
            'original_payment_no' => $payment->payment_no,
            'refund_payment_no' => $refundPayment->payment_no
        ]);
    }
    
    /**
     * 获取或创建测试订单
     */
    protected function getOrCreateTestOrder(?string $orderNo, Output $output): Order
    {
        if ($orderNo) {
            $order = Order::where('order_no', $orderNo)->find();
            if (!$order) {
                throw new \Exception("订单不存在: {$orderNo}");
            }
            $output->writeln("   使用现有订单: {$orderNo}");
        } else {
            // 创建测试订单
            $order = $this->createTestOrder($output);
            $output->writeln("   创建测试订单: {$order->order_no}");
        }
        
        return $order;
    }
    
    /**
     * 创建测试订单
     */
    protected function createTestOrder(Output $output): Order
    {
        // 这里简化创建一个基本的测试订单
        $order = Order::create([
            'order_no' => 'TEST' . date('YmdHis') . random_int(1000, 9999),
            'user_id' => 1,
            'status' => Order::STATUS_PENDING,
            'payment_method' => 1,
            'goods_amount' => 100.00,
            'delivery_fee' => 10.00,
            'total_amount' => 110.00,
            'address_id' => 1,
            'created_at' => time()
        ]);
        
        // 创建订单明细
        Db::name('order_items')->insert([
            'order_id' => $order->id,
            'product_id' => 1,
            'product_name' => '测试商品',
            'quantity' => 1,
            'price' => 100.00,
            'total_amount' => 100.00,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $order;
    }
    
    /**
     * 标记订单为已支付
     */
    protected function markOrderAsPaid(Order $order, Output $output)
    {
        $payment = Payment::create([
            'order_id' => $order->id,
            'order_no' => $order->order_no,
            'payment_method' => Payment::METHOD_WECHAT,
            'amount' => $order->total_amount,
            'status' => Payment::STATUS_SUCCESS,
            'paid_at' => time(),
            'created_at' => time()
        ]);
        
        $order->save([
            'status' => Order::STATUS_PAID,
            'paid_at' => time()
        ]);
        
        $output->writeln("   订单标记为已支付: {$payment->payment_no}");
    }
    
    /**
     * 为订单预留库存
     */
    protected function reserveInventoryForOrder(Order $order, Output $output)
    {
        $syncService = new SyncService();
        $orderItems = $order->items;
        
        $reservations = [];
        foreach ($orderItems as $item) {
            $reservations[] = [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity
            ];
        }
        
        $result = $syncService->reserveInventory($reservations, $order->order_no);
        $output->writeln("   库存预留成功，预留数量: " . count($result));
    }
    
    /**
     * 发送库存不足通知
     */
    protected function sendStockShortageNotification(Order $order, $item, Output $output)
    {
        $output->writeln("2. 发送库存不足通知...");
        
        // 这里可以实现具体的通知逻辑
        Log::warning('库存不足通知', [
            'order_no' => $order->order_no,
            'product_id' => $item->product_id,
            'product_name' => $item->product_name,
            'required_quantity' => $item->quantity,
            'time' => date('Y-m-d H:i:s')
        ]);
        
        $output->writeln("   库存不足通知已发送");
    }
}