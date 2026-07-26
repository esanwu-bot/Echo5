<?php
/**
 * 电子元器件商城 - 订单服务
 * 文件说明：处理订单的创建、支付流程、状态变更与订单明细管理。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service;

use app\model\Order;
use app\model\OrderItem;
use app\model\CartItem;
use app\model\Address;
use app\model\Product;
use app\model\SkProductModel;
use think\facade\Db;
use think\facade\Log;
use think\Exception;

/**
 * 订单服务类
 */
class OrderService
{
    /**
     * 创建订单
     *
     * @param int $userId 用户ID
     * @param array $params 订单参数
     * @return array
     * @throws Exception
     */
    public function createOrder(int $userId, array $params): array
    {
        Db::startTrans();
        try {
            $result = $this->doCreateOrder($userId, $params);
            Db::commit();

            return $result;
        } catch (\Exception $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 创建订单核心逻辑（不含事务管理）
     * 供 createOrder 与 createOrderFromCart 复用，避免事务嵌套。
     *
     * @param int $userId 用户ID
     * @param array $params 订单参数
     * @return array
     * @throws Exception
     */
    private function doCreateOrder(int $userId, array $params): array
    {
        try {
            // 验证收货地址
            $address = Address::where('id', $params['address_id'])
                ->where('user_id', $userId)
                ->find();
            
            if (!$address) {
                throw new Exception('收货地址不存在');
            }
            
            // 验证商品和计算金额
            $items = $params['items'];
            $goodsAmount = 0;
            $orderItems = [];
            
            foreach ($items as $item) {
                $product = Product::find($item['product_id']);
                if (!$product || $product->is_on_sale != 1) {
                    throw new Exception("商品不存在或已下架: {$item['product_id']}");
                }
                
                $quantity = (int)$item['quantity'];
                $specId = (int)($item['spec_id'] ?? 0);
                
                $price = $product->price;
                $totalAmount = $price * $quantity;
                $goodsAmount += $totalAmount;
                
                $orderItems[] = [
                    'product_id' => $product->id,
                    'spec_id' => $specId,
                    'product_name' => $product->name,
                    'product_image' => $product->main_image,
                    'spec_name' => '',
                    'price' => $price,
                    'quantity' => $quantity,
                    'total_amount' => $totalAmount
                ];
                
                // 原子扣减库存：stock 字段位于 sk_product_models（sk_product 无 stock 列）。
                // 通过 WHERE stock >= quantity 的单条 UPDATE 同时完成「校验+扣减」，保证原子性，防止并发超卖。
                if ($specId > 0) {
                    $affected = SkProductModel::where('id', $specId)
                        ->where('stock', '>=', $quantity)
                        ->dec('stock', $quantity)
                        ->update();
                    if ($affected === 0) {
                        throw new Exception("商品库存不足: {$product->name}");
                    }
                } elseif (!$product->hasEnoughStock($quantity)) {
                    // 无具体型号时，沿用产品级聚合库存校验
                    throw new Exception("商品库存不足: {$product->name}");
                }

                // 增加销量
                $product->incrementSalesCount($quantity);
            }
            
            // 计算配送费
            $deliveryFee = $this->calculateDeliveryFee($params['delivery_method'] ?? 1, $goodsAmount);
            
            // 计算优惠金额
            $discountAmount = $this->calculateDiscount($userId, $params['coupon_id'] ?? 0, $goodsAmount);
            
            // 计算总金额
            $totalAmount = $goodsAmount + $deliveryFee - $discountAmount;
            
            // 生成订单号
            $orderNo = Order::generateOrderNo();
            
            // 创建订单
            $order = Order::create([
                'order_no' => $orderNo,
                'user_id' => $userId,
                'status' => Order::STATUS_PENDING,
                'payment_status' => Order::PAYMENT_STATUS_PENDING,
                'payment_method' => $params['payment_method'] ?? Order::PAYMENT_METHOD_WECHAT,
                'goods_amount' => $goodsAmount,
                'delivery_fee' => $deliveryFee,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'address_id' => $params['address_id'],
                'delivery_method' => $params['delivery_method'] ?? Order::DELIVERY_METHOD_STANDARD,
                'coupon_id' => $params['coupon_id'] ?? 0,
                'remark' => $params['remark'] ?? ''
            ]);
            
            // 创建订单明细
            foreach ($orderItems as &$orderItem) {
                $orderItem['order_id'] = $order->id;
                $orderItem['created_at'] = date('Y-m-d H:i:s');
                $orderItem['updated_at'] = date('Y-m-d H:i:s');
            }
            
            OrderItem::insertAll($orderItems);
            
            return [
                'order_id' => $order->id,
                'order_no' => $orderNo,
                'total_amount' => $totalAmount
            ];
        } catch (\Exception $e) {
            Log::error('创建订单失败: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 从购物车创建订单
     *
     * @param int $userId 用户ID
     * @param array $params 订单参数
     * @return array
     * @throws Exception
     */
    public function createOrderFromCart(int $userId, array $params): array
    {
        Db::startTrans();
        try {
            // 获取选中的购物车商品
            $cartItems = CartItem::getSelectedItems($userId);
            
            if (empty($cartItems)) {
                throw new Exception('请选择要购买的商品');
            }
            
            // 如果指定了购物车ID，则只处理指定的商品
            if (!empty($params['cart_ids'])) {
                $cartItems = array_filter($cartItems, function($item) use ($params) {
                    return in_array($item['id'], $params['cart_ids']);
                });
            }
            
            if (empty($cartItems)) {
                throw new Exception('没有找到要购买的商品');
            }
            
            // 转换为订单商品格式
            $orderItems = [];
            foreach ($cartItems as $cartItem) {
                $orderItems[] = [
                    'product_id' => $cartItem['product_id'],
                    'spec_id' => $cartItem['model_id'] ?? ($cartItem['spec_id'] ?? 0),
                    'quantity' => $cartItem['quantity']
                ];
            }
            
            $params['items'] = $orderItems;
            
            // 创建订单（复用核心逻辑，事务已由本方法开启，避免嵌套事务）
            $result = $this->doCreateOrder($userId, $params);
            
            // 删除购物车中的商品
            $cartIds = array_column($cartItems, 'id');
            CartItem::whereIn('id', $cartIds)->delete();
            
            Db::commit();
            
            return $result;
            
        } catch (\Exception $e) {
            Db::rollback();
            throw $e;
        }
    }
    
    /**
     * 取消订单
     *
     * @param Order $order 订单对象
     * @param string $reason 取消原因
     * @return bool
     * @throws Exception
     */
    public function cancelOrder(Order $order, string $reason = ''): bool
    {
        Db::startTrans();
        try {
            // 恢复库存
            $orderItems = $order->items;
            foreach ($orderItems as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increaseStock($item->quantity);
                    $product->dec('sales_count', $item->quantity);
                }
            }
            
            // 更新订单状态
            $order->cancel($reason);
            
            // 如果已支付，需要退款
            if ($order->payment_status === Order::PAYMENT_STATUS_PAID) {
                // 这里应该调用退款接口
                // $this->refundService->refund($order);
            }
            
            Db::commit();
            
            return true;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('取消订单失败: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 计算配送费
     *
     * @param int $deliveryMethod 配送方式
     * @param float $goodsAmount 商品金额
     * @return float
     */
    protected function calculateDeliveryFee(int $deliveryMethod, float $goodsAmount): float
    {
        // 满额免运费
        if ($goodsAmount >= 299) {
            return 0;
        }
        
        switch ($deliveryMethod) {
            case Order::DELIVERY_METHOD_STANDARD:
                return 0; // 标准配送免费
            case Order::DELIVERY_METHOD_EXPRESS:
                return 15; // 次日达
            case Order::DELIVERY_METHOD_SAME_DAY:
                return 25; // 当日达
            default:
                return 0;
        }
    }
    
    /**
     * 计算优惠金额
     *
     * @param int $userId 用户ID
     * @param int $couponId 优惠券ID
     * @param float $goodsAmount 商品金额
     * @return float
     */
    protected function calculateDiscount(int $userId, int $couponId, float $goodsAmount): float
    {
        if ($couponId <= 0) {
            return 0;
        }
        
        // 这里应该验证优惠券并计算优惠金额
        // $coupon = CouponService::validateAndUseCoupon($userId, $couponId, $goodsAmount);
        // return $coupon ? $coupon->discount_amount : 0;
        
        return 0;
    }
    
    /**
     * 订单支付成功处理
     *
     * @param Order $order 订单对象
     * @param array $paymentData 支付数据
     * @return bool
     * @throws Exception
     */
    public function paymentSuccess(Order $order, array $paymentData): bool
    {
        Db::startTrans();
        try {
            // 更新订单状态
            $order->pay();
            
            // 创建支付记录
            // PaymentService::createPaymentRecord($order, $paymentData);
            
            // 创建出库单
            $this->createOutboundOrder($order);
            
            Db::commit();
            
            return true;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('订单支付成功处理失败: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 创建出库单
     *
     * @param Order $order 订单对象
     * @return bool
     */
    protected function createOutboundOrder(Order $order): bool
    {
        try {
            // 构建出库单数据
            $outboundData = [
                'order_no' => $order->order_no,
                'items' => [],
                'delivery_address' => $order->address->toArray(),
                'customer_info' => [
                    'name' => $order->address->name,
                    'phone' => $order->address->phone
                ]
            ];
            
            foreach ($order->items as $item) {
                $outboundData['items'][] = [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->price
                ];
            }
            
            // 调用同步服务创建出库单
            $syncService = new \app\service\outer\SyncService();
            $syncService->createOutboundOrder($outboundData);
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('创建出库单失败: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 获取订单统计数据
     *
     * @return array
     */
    public static function getOrderStatistics(): array
    {
        // 今日统计
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $thisMonth = date('Y-m');
        $lastMonth = date('Y-m', strtotime('-1 month'));
        
        // 订单统计
        $todayOrders = Order::whereTime('created_at', $today)->count();
        $yesterdayOrders = Order::whereTime('created_at', $yesterday)->count();
        $monthOrders = Order::whereTime('created_at', $thisMonth)->count();
        $lastMonthOrders = Order::whereTime('created_at', $lastMonth)->count();
        $totalOrders = Order::count();
        
        // 销售额统计
        $todayRevenue = Order::whereTime('created_at', $today)
                             ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                             ->sum('total_amount');
        $yesterdayRevenue = Order::whereTime('created_at', $yesterday)
                                ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                ->sum('total_amount');
        $monthRevenue = Order::whereTime('created_at', $thisMonth)
                             ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                             ->sum('total_amount');
        $lastMonthRevenue = Order::whereTime('created_at', $lastMonth)
                                ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                ->sum('total_amount');
        $totalRevenue = Order::whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                             ->sum('total_amount');
        
        // 订单状态统计
        $pendingOrders = Order::where('status', Order::STATUS_PENDING)->count();
        $paidOrders = Order::where('status', Order::STATUS_PAID)->count();
        $shippedOrders = Order::where('status', Order::STATUS_SHIPPED)->count();
        $completedOrders = Order::where('status', Order::STATUS_COMPLETED)->count();
        $cancelledOrders = Order::where('status', Order::STATUS_CANCELLED)->count();
        
        // 计算增长率
        $orderGrowth = self::calculateGrowth($todayOrders, $yesterdayOrders);
        $revenueGrowth = self::calculateGrowth($todayRevenue, $yesterdayRevenue);
        $monthlyOrderGrowth = self::calculateGrowth($monthOrders, $lastMonthOrders);
        $monthlyRevenueGrowth = self::calculateGrowth($monthRevenue, $lastMonthRevenue);
        
        return [
            'orders' => [
                'today' => $todayOrders,
                'yesterday' => $yesterdayOrders,
                'month' => $monthOrders,
                'last_month' => $lastMonthOrders,
                'total' => $totalOrders,
                'growth' => $orderGrowth,
                'monthly_growth' => $monthlyOrderGrowth,
                'status_distribution' => [
                    'pending' => $pendingOrders,
                    'paid' => $paidOrders,
                    'shipped' => $shippedOrders,
                    'completed' => $completedOrders,
                    'cancelled' => $cancelledOrders
                ]
            ],
            'revenue' => [
                'today' => $todayRevenue,
                'yesterday' => $yesterdayRevenue,
                'month' => $monthRevenue,
                'last_month' => $lastMonthRevenue,
                'total' => $totalRevenue,
                'growth' => $revenueGrowth,
                'monthly_growth' => $monthlyRevenueGrowth
            ]
        ];
    }
    
    /**
     * 计算增长率
     *
     * @param float $current 当前值
     * @param float $previous 之前的值
     * @return float
     */
    private static function calculateGrowth(float $current, float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        
        return round(($current - $previous) / $previous * 100, 1);
    }
    
    /**
     * 更新订单状态
     *
     * @param Order $order 订单对象
     * @param int $status 新状态
     * @param array $extraData 额外数据
     * @return bool
     * @throws Exception
     */
    public static function updateOrderStatus(Order $order, int $status, array $extraData = []): bool
    {
        Db::startTrans();
        try {
            // 更新订单状态
            $order->status = $status;
            
            // 设置状态相关的时间戳
            switch ($status) {
                case Order::STATUS_PAID:
                    $order->paid_at = date('Y-m-d H:i:s');
                    $order->payment_status = Order::PAYMENT_STATUS_PAID;
                    break;
                case Order::STATUS_SHIPPED:
                    $order->shipped_at = date('Y-m-d H:i:s');
                    break;
                case Order::STATUS_COMPLETED:
                    $order->completed_at = date('Y-m-d H:i:s');
                    break;
                case Order::STATUS_CANCELLED:
                    $order->cancelled_at = date('Y-m-d H:i:s');
                    break;
            }
            
            // 设置额外数据
            foreach ($extraData as $key => $value) {
                $order->$key = $value;
            }
            
            $result = $order->save();
            
            // 如果订单变为已发货，创建出库单
            if ($status == Order::STATUS_SHIPPED) {
                // 创建出库单
                $syncService = new \app\service\outer\SyncService();
                $outboundData = [
                    'order_no' => $order->order_no,
                    'items' => [],
                    'delivery_address' => $order->address->toArray(),
                    'customer_info' => [
                        'name' => $order->address->name,
                        'phone' => $order->address->phone
                    ]
                ];
                
                foreach ($order->items as $item) {
                    $outboundData['items'][] = [
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->price
                    ];
                }
                
                $syncService->createOutboundOrder($outboundData);
            }
            
            Db::commit();
            return $result;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('更新订单状态失败: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 获取销售趋势
     *
     * @param int $days 天数
     * @return array
     */
    public static function getSalesTrend(int $days): array
    {
        $data = [];
        
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            
            $orders = Order::whereTime('created_at', $date)->count();
            $revenue = Order::whereTime('created_at', $date)
                          ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                          ->sum('total_amount');
            
            $data[] = [
                'date' => $date,
                'date_formatted' => date('m/d', strtotime($date)),
                'orders' => $orders,
                'revenue' => $revenue,
                'formatted_revenue' => '$' . number_format($revenue, 2) . ' USD'
            ];
        }
        
        return $data;
    }
}