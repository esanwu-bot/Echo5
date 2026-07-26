<?php
declare(strict_types=1);

namespace app\listener;

use app\model\Order;
use app\service\outer\SyncService;
use think\facade\Log;

/**
 * 订单支付成功监听器
 */
class OrderPaidListener
{
    protected $syncService;
    
    public function __construct()
    {
        $this->syncService = new SyncService();
    }
    
    /**
     * 处理订单支付成功事件
     *
     * @param Order $order 订单对象
     */
    public function handle(Order $order)
    {
        try {
            Log::info('订单支付成功，开始处理后续流程', [
                'order_id' => $order->id,
                'order_no' => $order->order_no
            ]);
            
            // 1. 预留库存
            $this->reserveInventory($order);
            
            // 2. 创建出库订单
            $this->createOutboundOrder($order);
            
            // 3. 同步订单到WMS系统
            $this->syncOrderToWMS($order);
            
            Log::info('订单支付成功处理完成', [
                'order_id' => $order->id,
                'order_no' => $order->order_no
            ]);
            
        } catch (\Exception $e) {
            Log::error('订单支付成功处理失败', [
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // 这里可以添加失败重试机制或者发送告警
            $this->handleProcessFailure($order, $e);
        }
    }
    
    /**
     * 预留库存
     *
     * @param Order $order 订单对象
     * @throws \Exception
     */
    protected function reserveInventory(Order $order)
    {
        // 获取订单商品
        $orderItems = $order->items;
        
        if (empty($orderItems)) {
            throw new \Exception('订单商品为空');
        }
        
        // 构建预留数据
        $reservations = [];
        foreach ($orderItems as $item) {
            $reservations[] = [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity
            ];
        }
        
        // 预留库存
        $result = $this->syncService->reserveInventory($reservations, $order->order_no);
        
        Log::info('库存预留成功', [
            'order_no' => $order->order_no,
            'reservations' => $result
        ]);
    }
    
    /**
     * 创建出库订单
     *
     * @param Order $order 订单对象
     * @throws \Exception
     */
    protected function createOutboundOrder(Order $order)
    {
        // 获取收货地址
        $address = $order->address;
        if (!$address) {
            throw new \Exception('订单收货地址不存在');
        }
        
        // 获取订单商品
        $orderItems = $order->items;
        
        // 构建出库订单数据
        $outboundData = [
            'order_no' => $order->order_no,
            'customer_info' => [
                'name' => $address->name,
                'phone' => $address->phone
            ],
            'delivery_address' => [
                'province' => $address->province,
                'city' => $address->city,
                'district' => $address->district,
                'detail' => $address->detail,
                'postal_code' => $address->postal_code
            ],
            'items' => []
        ];
        
        foreach ($orderItems as $item) {
            $outboundData['items'][] = [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->price
            ];
        }
        
        // 创建出库订单
        $result = $this->syncService->createOutboundOrder($outboundData);
        
        Log::info('出库订单创建成功', [
            'order_no' => $order->order_no,
            'outbound_order_id' => $result['outbound_order_id']
        ]);
    }
    
    /**
     * 同步订单到WMS系统
     *
     * @param Order $order 订单对象
     * @throws \Exception
     */
    protected function syncOrderToWMS(Order $order)
    {
        // 获取订单完整信息
        $orderData = [
            'order_no' => $order->order_no,
            'customer_info' => [
                'user_id' => $order->user_id,
                'name' => $order->address->name ?? '',
                'phone' => $order->address->phone ?? ''
            ],
            'order_info' => [
                'total_amount' => $order->total_amount,
                'goods_amount' => $order->goods_amount,
                'delivery_fee' => $order->delivery_fee,
                'payment_method' => $order->payment_method,
                'delivery_method' => $order->delivery_method,
                'remark' => $order->remark
            ],
            'delivery_address' => [
                'name' => $order->address->name ?? '',
                'phone' => $order->address->phone ?? '',
                'province' => $order->address->province ?? '',
                'city' => $order->address->city ?? '',
                'district' => $order->address->district ?? '',
                'detail' => $order->address->detail ?? '',
                'postal_code' => $order->address->postal_code ?? ''
            ],
            'items' => []
        ];
        
        // 添加商品信息
        foreach ($order->items as $item) {
            $orderData['items'][] = [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'spec_name' => $item->spec_name ?? '',
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total_amount' => $item->total_amount
            ];
        }
        
        // 同步到WMS
        $result = $this->syncService->syncOrderToWMS($orderData);
        
        Log::info('订单同步到WMS成功', [
            'order_no' => $order->order_no,
            'wms_response' => $result
        ]);
    }
    
    /**
     * 处理流程失败
     *
     * @param Order $order 订单对象
     * @param \Exception $exception 异常信息
     */
    protected function handleProcessFailure(Order $order, \Exception $exception)
    {
        // 记录失败信息到数据库
        try {
            \think\facade\Db::name('order_process_failures')->insert([
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'failure_type' => 'payment_process',
                'error_message' => $exception->getMessage(),
                'error_trace' => $exception->getTraceAsString(),
                'retry_count' => 0,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            Log::error('记录订单处理失败信息失败', [
                'order_no' => $order->order_no,
                'error' => $e->getMessage()
            ]);
        }
        
        // 发送告警通知（这里可以集成邮件、短信、钉钉等通知方式）
        $this->sendFailureAlert($order, $exception);
    }
    
    /**
     * 发送失败告警
     *
     * @param Order $order 订单对象
     * @param \Exception $exception 异常信息
     */
    protected function sendFailureAlert(Order $order, \Exception $exception)
    {
        // 这里可以实现具体的告警逻辑
        Log::warning('订单处理失败告警', [
            'order_no' => $order->order_no,
            'user_id' => $order->user_id,
            'total_amount' => $order->total_amount,
            'error' => $exception->getMessage(),
            'time' => date('Y-m-d H:i:s')
        ]);
        
        // 示例：发送到监控系统
        // $this->sendToMonitoringSystem($order, $exception);
    }
}