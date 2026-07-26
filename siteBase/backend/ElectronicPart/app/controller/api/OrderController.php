<?php
/**
 * 电子元器件商城 - 订单接口（前台）
 * 文件说明：用户下单、订单查询与列表接口，包含订单项与地址信息的聚合查询。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\Order;
use app\model\OrderItem;
use app\model\Cart;
use app\model\Product;
use app\model\Address;
use app\model\SkProductModel;
use app\model\SkProductPriceBreak;
use app\model\SkProductSupplier;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Log;

class OrderController extends BaseController
{
    /**
     * 获取订单列表
     */
    public function index()
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->error('请先登录', 401);
            }

            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $status = $this->request->param('status', '');

            $query = Order::with(['items.product'])
                        ->where('user_id', $userId);

            if (!empty($status)) {
                $query->where('status', $status);
            }

            $orders = $query->order('created_at', 'desc')
                           ->page($page, $limit)
                           ->select();

            $total = $query->count();

            $orderList = [];
            foreach ($orders as $order) {
                $firstItem = null;
                if (!empty($order->items)) {
                    $firstItem = $order->items[0];
                }

                $orderList[] = [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'total_amount' => $order->total_amount,
                    'status' => $order->status,
                    'status_text' => $this->getStatusText($order->status),
                    'payment_method' => $order->payment_method,
                    'payment_method_text' => $this->getPaymentMethodText($order->payment_method),
                    'created_at' => $order->created_at,
                    'item_count' => count($order->items),
                    'first_item' => $firstItem ? [
                        'product_name' => $firstItem->product ? $firstItem->product->name : '',
                        'product_image' => $firstItem->product ? $firstItem->product->main_image : '',
                        'quantity' => $firstItem->quantity
                    ] : null
                ];
            }

            return $this->success([
                'list' => $orderList,
                'total' => $total,
                'page' => (int)$page,
                'limit' => (int)$limit
            ]);

        } catch (\Exception $e) {
            Log::error('Get order list error: ' . $e->getMessage());
            return $this->error('获取订单列表失败');
        }
    }

    /**
     * 创建订单
     */
    public function save()
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->error('请先登录', 401);
            }

            // Parameter validation
            $validate = Validate::rule([
                'address_id' => 'require|integer|>=:1',
                'payment_method' => 'require|in:wechat,alipay,cash',
                'cart_items' => 'require|array|min:1'
            ])->message([
                'address_id.require' => '收货地址为必填项',
                'payment_method.require' => '支付方式为必填项',
                'cart_items.require' => '购物车商品为必填项',
                'cart_items.min' => '至少需要一件商品'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $addressId = $params['address_id'];
            $paymentMethod = $params['payment_method'];
            $cartItems = $params['cart_items'];
            $remark = $params['remark'] ?? '';

            // Verify address
            $address = Address::where('id', $addressId)
                            ->where('user_id', $userId)
                            ->find();
            if (!$address) {
                return $this->error('收货地址不存在');
            }

            // Verify cart items and calculate total
            // 注意：sk_product 表没有 price/stock 字段（见 docs/产品价格定义说明.md）：
            // 库存取自 sk_product_models.stock，单价按用量匹配 sk_product_price_break 阶梯价，
            // 与购物车展示口径保持一致
            $totalAmount = 0;
            $orderItems = [];

            foreach ($cartItems as $cartItem) {
                if (!isset($cartItem['product_id']) || !isset($cartItem['quantity'])) {
                    return $this->error('无效的购物车商品数据');
                }

                $productId = (int)$cartItem['product_id'];
                $modelId = (int)($cartItem['model_id'] ?? 0);
                $quantity = (int)$cartItem['quantity'];

                if ($quantity <= 0) {
                    return $this->error('无效的购物车商品数量');
                }

                $product = Product::where('id', $productId)->find();
                if (!$product) {
                    return $this->error('商品不存在或已下架：' . $productId);
                }

                // 优先按型号校验库存并取阶梯价（与购物车展示一致）；无型号时回退产品级取价
                $model = $modelId > 0 ? SkProductModel::with('series')->find($modelId) : null;
                if ($model) {
                    if ((int)$model->stock < $quantity) {
                        return $this->error('商品库存不足：' . ($model->model_name ?: $model->model_code));
                    }
                    $unitPrice = $this->resolveUnitPrice($this->productKeysFromModel($model), $quantity);
                    $itemName = (string)($model->model_name ?: $model->model_code);
                } else {
                    $unitPrice = $this->resolveUnitPrice($this->productKeysFromProduct($product), $quantity);
                    $itemName = (string)($product->getData('name') ?: $product->product_code ?: '');
                }

                $itemAmount = $unitPrice * $quantity;
                $totalAmount += $itemAmount;

                $orderItems[] = [
                    'product_id' => $productId,
                    'model_id' => $modelId,
                    'product_name' => $itemName,
                    'product_image' => (string)($product->main_image ?? ''),
                    'price' => $unitPrice,
                    'quantity' => $quantity,
                    'amount' => $itemAmount
                ];
            }

            if ($totalAmount <= 0) {
                return $this->error('无效的订单金额');
            }

            // Start transaction
            Order::startTrans();
            try {
                // Create order
                $order = new Order();
                $order->user_id = $userId;
                $order->order_no = $this->generateOrderNo();
                $order->address_id = $addressId;
                $order->total_amount = $totalAmount;
                $order->payment_method = $paymentMethod;
                $order->status = 'pending';
                $order->remark = $remark;
                $order->save();

                // Create order items
                foreach ($orderItems as $itemData) {
                    $orderItem = new OrderItem();
                    $orderItem->order_id = $order->id;
                    $orderItem->product_id = $itemData['product_id'];
                    $orderItem->product_name = $itemData['product_name'];
                    $orderItem->product_image = $itemData['product_image'];
                    $orderItem->price = $itemData['price'];
                    $orderItem->quantity = $itemData['quantity'];
                    $orderItem->amount = $itemData['amount'];
                    $orderItem->save();

                    // 扣减库存：stock 字段位于 sk_product_models（sk_product 无 stock 列）
                    if (!empty($itemData['model_id'])) {
                        SkProductModel::where('id', $itemData['model_id'])
                            ->dec('stock', $itemData['quantity'])
                            ->update();
                    }
                }

                // Clear cart items
                Cart::where('user_id', $userId)
                   ->whereIn('product_id', array_column($orderItems, 'product_id'))
                   ->delete();

                Order::commit();

                return $this->success([
                    'order_id' => $order->id,
                    'order_no' => $order->order_no,
                    'total_amount' => $totalAmount
                ], '订单创建成功');

            } catch (\Exception $e) {
                Order::rollback();
                throw $e;
            }

        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error('Create order error: ' . $e->getMessage());
            return $this->error('创建订单失败');
        }
    }

    /**
     * 从型号构建价格查询键（product_code 优先，数字 id 兜底）
     *
     * @access protected
     * @param SkProductModel $model
     * @return array
     */
    protected function productKeysFromModel($model): array
    {
        $keys = [];
        if (!$model) {
            return $keys;
        }
        // 安全获取关联产品对象：relation 可能未加载或返回非对象（DB字段同名冲突）
        $series = $model->series;
        if (!is_object($series)) {
            $seriesId = (int)($model->getAttr('series_id') ?? 0);
            if ($seriesId > 0) {
                $series = \app\model\SkProduct::find($seriesId);
            }
        }
        if ($series && is_object($series)) {
            if (!empty($series->product_code)) {
                $keys[] = (string)$series->product_code;
            }
            if (!empty($series->id)) {
                $keys[] = (string)$series->id;
            }
        }
        return $keys;
    }

    /**
     * 从产品构建价格查询键（product_code 优先，数字 id 兜底）
     *
     * @access protected
     * @param mixed $product
     * @return array
     */
    protected function productKeysFromProduct($product): array
    {
        $keys = [];
        if (!empty($product->product_code)) {
            $keys[] = (string)$product->product_code;
        }
        if (!empty($product->id)) {
            $keys[] = (string)$product->id;
        }
        return $keys;
    }

    /**
     * 按产品键与用量匹配单价（阶梯价 → 主供应商 → 任意供应商最低价）
     *
     * 取价顺序见 docs/产品价格定义说明.md
     *
     * @access protected
     * @param array $productKeys
     * @param int $quantity
     * @return float
     */
    protected function resolveUnitPrice(array $productKeys, int $quantity): float
    {
        $quantity = max(1, $quantity);

        foreach ($productKeys as $productKey) {
            // 1) 按用量匹配阶梯（quantity >= 分界点的最高档）
            $matchedPrice = SkProductPriceBreak::getPriceByQuantity($productKey, $quantity);
            if ($matchedPrice !== null && (float)$matchedPrice > 0) {
                return (float)$matchedPrice;
            }

            // 2) 用量低于最低档时，取最低档作为参考价
            $minBreak = SkProductPriceBreak::where('product_id', $productKey)
                ->order('quantity', 'asc')
                ->find();
            if ($minBreak && (float)$minBreak->price > 0) {
                return (float)$minBreak->price;
            }
        }

        foreach ($productKeys as $productKey) {
            // 3) 主供应商价格
            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->where('is_primary', 1)
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }

            // 4) 任意供应商最低价
            $supplier = SkProductSupplier::where('product_id', $productKey)
                ->order('price', 'asc')
                ->find();
            if ($supplier && (float)$supplier->price > 0) {
                return (float)$supplier->price;
            }
        }

        return 0.0;
    }

    /**
     * 获取订单详情
     */
    public function read($id)
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->error('请先登录', 401);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('无效的订单ID');
            }

            $order = Order::with(['items.product', 'address'])
                        ->where('id', $id)
                        ->where('user_id', $userId)
                        ->find();
            if (!$order) {
                return $this->error('订单不存在');
            }

            $orderData = [
                'id' => $order->id,
                'order_no' => $order->order_no,
                'total_amount' => $order->total_amount,
                'status' => $order->status,
                'status_text' => $this->getStatusText($order->status),
                'payment_method' => $order->payment_method,
                'payment_method_text' => $this->getPaymentMethodText($order->payment_method),
                'remark' => $order->remark,
                'created_at' => $order->created_at,
                'paid_at' => $order->paid_at,
                'shipped_at' => $order->shipped_at,
                'completed_at' => $order->completed_at,
                'address' => $order->address ? [
                    'name' => $order->address->name,
                    'phone' => $order->address->phone,
                    'full_address' => $order->address->province . $order->address->city . $order->address->district . $order->address->detail
                ] : null,
                'items' => []
            ];

            foreach ($order->items as $item) {
                $orderData['items'][] = [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'product_image' => $item->product_image,
                    'price' => $item->price,
                    'quantity' => $item->quantity,
                    'amount' => $item->amount
                ];
            }

            return $this->success($orderData);

        } catch (\Exception $e) {
            Log::error('Get order detail error: ' . $e->getMessage());
            return $this->error('获取订单详情失败');
        }
    }

    /**
     * 取消订单
     */
    public function cancel($id)
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->error('请先登录', 401);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('无效的订单ID');
            }

            $order = Order::with(['items'])
                        ->where('id', $id)
                        ->where('user_id', $userId)
                        ->find();
            if (!$order) {
                return $this->error('订单不存在');
            }

            // Only pending orders can be cancelled
            if ($order->status !== 'pending') {
                return $this->error('只有待处理订单可以取消');
            }

            // Start transaction
            Order::startTrans();
            try {
                // Restore product stock
                foreach ($order->items as $item) {
                    Product::where('id', $item->product_id)
                          ->inc('stock', $item->quantity)
                          ->update();
                }

                // Update order status
                $order->status = 'cancelled';
                $order->cancelled_at = date('Y-m-d H:i:s');
                $order->save();

                Order::commit();

                return $this->success([], '订单取消成功');

            } catch (\Exception $e) {
                Order::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Cancel order error: ' . $e->getMessage());
            return $this->error('取消订单失败');
        }
    }

    /**
     * 确认收货
     */
    public function confirm($id)
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->error('请先登录', 401);
            }

            if (!is_numeric($id) || $id <= 0) {
                return $this->error('无效的订单ID');
            }

            $order = Order::where('id', $id)
                        ->where('user_id', $userId)
                        ->find();
            if (!$order) {
                return $this->error('订单不存在');
            }

            // Only shipped orders can be confirmed
            if ($order->status !== 'shipped') {
                return $this->error('只有已发货订单可以确认');
            }

            $order->status = 'completed';
            $order->completed_at = date('Y-m-d H:i:s');
            $order->save();

            return $this->success([], '订单确认成功');

        } catch (\Exception $e) {
            Log::error('Confirm order error: ' . $e->getMessage());
            return $this->error('确认订单失败');
        }
    }

    /**
     * 获取订单统计
     */
    public function stats()
    {
        try {
            $userId = $this->getUserId();
            if (!$userId) {
                return $this->success([
                    'pending' => 0,
                    'paid' => 0,
                    'shipped' => 0,
                    'completed' => 0,
                    'cancelled' => 0,
                    'total' => 0
                ]);
            }

            $stats = Order::where('user_id', $userId)
                        ->field('status, count(*) as count')
                        ->group('status')
                        ->select();

            $result = [
                'pending' => 0,
                'paid' => 0,
                'shipped' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'total' => 0
            ];

            foreach ($stats as $stat) {
                $result[$stat->status] = $stat->count;
                $result['total'] += $stat->count;
            }

            return $this->success($result);

        } catch (\Exception $e) {
            Log::error('Get order stats error: ' . $e->getMessage());
            return $this->success([
                'pending' => 0,
                'paid' => 0,
                'shipped' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'total' => 0
            ]);
        }
    }

    /**
     * 生成订单号
     */
    private function generateOrderNo()
    {
        return date('YmdHis') . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    /**
     * 获取状态文本
     */
    private function getStatusText($status)
    {
        $statusMap = [
            'pending' => '待支付',
            'paid' => '已支付',
            'shipped' => '已发货',
            'completed' => '已完成',
            'cancelled' => '已取消'
        ];
        return $statusMap[$status] ?? '未知';
    }

    /**
     * 获取支付方式文本
     */
    private function getPaymentMethodText($method)
    {
        $methodMap = [
            'wechat' => '微信支付',
            'alipay' => '支付宝',
            'cash' => '货到付款'
        ];
        return $methodMap[$method] ?? '未知';
    }
}