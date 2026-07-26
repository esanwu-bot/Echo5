<?php

namespace app\controller\admin;

use app\BaseController;
use think\Request;
use think\facade\Db;
use think\facade\Log;

/**
 * 代客下单控制器
 */
class ProxyOrderController extends BaseController
{
    /**
     * 获取商品列表（用于下单选择）
     */
    public function getProducts(Request $request)
    {
        try {
            $page = $request->param('page', 1);
            $limit = $request->param('limit', 20);
            $keyword = $request->param('keyword', '');
            $categoryId = $request->param('category_id', 0);
            
            $where = [];
            $where[] = ['status', '=', 1]; // 只显示正常状态的商品
            $where[] = ['stock', '>', 0]; // 只显示有库存的商品
            
            if ($keyword) {
                $where[] = ['name|sku', 'like', "%{$keyword}%"];
            }
            
            if ($categoryId > 0) {
                $where[] = ['category_id', '=', $categoryId];
            }
            
            $products = Db::name('products')
                ->where($where)
                ->field('id,sku,name,price,original_price,stock,main_image,brand,category_id')
                ->order('sales_count desc, id desc')
                ->paginate([
                    'list_rows' => $limit,
                    'page' => $page,
                ]);
            
            return $this->success([
                'list' => $products->items(),
                'total' => $products->total(),
                'page' => $page,
                'limit' => $limit
            ], '获取商品列表成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 搜索用户（用于选择下单用户）
     */
    public function searchUsers(Request $request)
    {
        try {
            $keyword = $request->param('keyword', '');
            
            if (empty($keyword)) {
                return $this->success(['list' => []], '请输入搜索关键词');
            }
            
            $users = Db::name('users')
                ->where('status', 1)
                ->where('username|phone|nickname', 'like', "%{$keyword}%")
                ->field('id,username,phone,nickname,avatar')
                ->limit(10)
                ->select();
            
            return $this->success(['list' => $users], '搜索用户成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取用户地址列表
     */
    public function getUserAddresses(Request $request)
    {
        try {
            $userId = $request->param('user_id');
            
            if (empty($userId)) {
                return $this->error('用户ID不能为空');
            }
            
            $addresses = Db::name('user_addresses')
                ->where('user_id', $userId)
                ->where('deleted_at', null)
                ->field('id,name,phone,province,city,district,detail,is_default')
                ->order('is_default desc, id desc')
                ->select();
            
            return $this->success(['list' => $addresses], '获取用户地址成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 创建代客下单
     */
    public function createOrder(Request $request)
    {
        try {
            $data = $request->param();
            
            // 验证必要参数
            $requiredFields = ['user_id', 'items', 'address_id'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return $this->error("参数 {$field} 不能为空");
                }
            }
            
            $userId = $data['user_id'];
            $items = $data['items']; // 商品项目数组
            $addressId = $data['address_id'];
            $remark = $data['remark'] ?? '';
            
            // 验证用户是否存在
            $user = Db::name('users')->where('id', $userId)->find();
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            // 验证地址是否存在
            $address = Db::name('user_addresses')
                ->where('id', $addressId)
                ->where('user_id', $userId)
                ->find();
            if (!$address) {
                return $this->error('收货地址不存在');
            }
            
            // 验证商品项目
            if (empty($items) || !is_array($items)) {
                return $this->error('商品项目不能为空');
            }
            
            $totalAmount = 0;
            $orderItems = [];
            
            foreach ($items as $item) {
                if (empty($item['product_id']) || empty($item['quantity']) || $item['quantity'] <= 0) {
                    return $this->error('商品信息不完整');
                }
                
                // 获取商品信息
                $product = Db::name('products')
                    ->where('id', $item['product_id'])
                    ->where('status', 1)
                    ->find();
                
                if (!$product) {
                    return $this->error('商品不存在或已下架');
                }
                
                if ($product['stock'] < $item['quantity']) {
                    return $this->error("商品「{$product['name']}」库存不足");
                }
                
                $itemTotal = $product['price'] * $item['quantity'];
                $totalAmount += $itemTotal;
                
                $orderItems[] = [
                    'product_id' => $product['id'],
                    'product_name' => $product['name'],
                    'product_image' => $product['main_image'],
                    'spec_name' => '',
                    'price' => $product['price'],
                    'quantity' => $item['quantity'],
                    'total_amount' => $itemTotal
                ];
            }
            
            // 开始事务
            Db::startTrans();
            
            try {
                // 生成订单号
                $orderNo = 'PO' . date('YmdHis') . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
                
                // 创建订单
                $orderId = Db::name('orders')->insertGetId([
                    'order_no' => $orderNo,
                    'user_id' => $userId,
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'payment_method' => 1,
                    'goods_amount' => $totalAmount,
                    'delivery_fee' => 0,
                    'discount_amount' => 0,
                    'total_amount' => $totalAmount,
                    'address_id' => $addressId,
                    'delivery_method' => 1,
                    'remark' => $remark,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
                
                // 创建订单明细
                foreach ($orderItems as &$orderItem) {
                    $orderItem['order_id'] = $orderId;
                    $orderItem['created_at'] = date('Y-m-d H:i:s');
                    $orderItem['updated_at'] = date('Y-m-d H:i:s');
                }
                
                Db::name('order_items')->insertAll($orderItems);
                
                // 扣减库存
                foreach ($items as $item) {
                    Db::name('products')
                        ->where('id', $item['product_id'])
                        ->dec('stock', $item['quantity']);
                }
                
                // 提交事务
                Db::commit();
                
                return $this->success([
                    'order_id' => $orderId,
                    'order_no' => $orderNo,
                    'total_amount' => $totalAmount
                ], '代客下单成功');
                
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取代客下单订单列表
     */
    public function getProxyOrders(Request $request)
    {
        try {
            $page = $request->param('page', 1);
            $limit = $request->param('limit', 20);
            $orderNo = $request->param('order_no', '');
            $status = $request->param('status', '');
            $startDate = $request->param('start_date', '');
            $endDate = $request->param('end_date', '');
            
            $where = [];
            
            // 只查询代客下单的订单（订单号以PO开头）
            $where[] = ['order_no', 'like', 'PO%'];
            
            if ($orderNo) {
                $where[] = ['order_no', 'like', "%{$orderNo}%"];
            }
            
            if ($status) {
                $where[] = ['status', '=', $status];
            }
            
            if ($startDate && $endDate) {
                $where[] = ['created_at', 'between', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']];
            }
            
            $orders = Db::name('orders')
                ->alias('o')
                ->leftJoin('users u', 'o.user_id = u.id')
                ->where($where)
                ->field([
                    'o.id', 'o.order_no', 'o.status', 'o.payment_status',
                    'o.total_amount', 'o.created_at', 'o.remark',
                    'u.username', 'u.nickname', 'u.phone'
                ])
                ->order('o.created_at desc')
                ->paginate([
                    'list_rows' => $limit,
                    'page' => $page,
                ]);
            
            return $this->success([
                'list' => $orders->items(),
                'total' => $orders->total(),
                'page' => $page,
                'limit' => $limit
            ], '获取代客下单列表成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除代客下单
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的订单');
            }
            // 删除订单项和订单
            Db::name('order_items')->whereIn('order_id', $ids)->delete();
            Db::name('orders')->whereIn('id', $ids)->delete();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 获取订单详情
     */
    public function getOrderDetail(Request $request)
    {
        try {
            $orderId = $request->param('id');
            
            if (empty($orderId)) {
                return $this->error('订单ID不能为空');
            }
            
            // 获取订单基本信息
            $order = Db::name('orders')
                ->alias('o')
                ->leftJoin('users u', 'o.user_id = u.id')
                ->leftJoin('user_addresses ua', 'o.address_id = ua.id')
                ->where('o.id', $orderId)
                ->field([
                    'o.*',
                    'u.username', 'u.nickname', 'u.phone as user_phone', 'u.avatar',
                    'ua.name as receiver_name', 'ua.phone as receiver_phone',
                    'ua.province', 'ua.city', 'ua.district', 'ua.detail'
                ])
                ->find();
            
            if (!$order) {
                return $this->error('订单不存在');
            }
            
            // 获取订单明细
            $orderItems = Db::name('order_items')
                ->where('order_id', $orderId)
                ->select();
            
            $order['items'] = $orderItems;
            
            return $this->success($order, '获取订单详情成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}