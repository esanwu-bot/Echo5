<?php
/**
 * 电子元器件商城 - 外部数据同步服务（WMS 集成）
 * 文件说明：提供商品/库存/订单与外部 WMS 系统的同步接口与工具方法。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service\outer;

use think\facade\Db;
use think\facade\Cache;
use think\facade\Log;
use think\Exception;

class SyncService
{
    protected $wmsApiUrl;
    protected $wmsApiKey;
    
    public function __construct()
    {
        $this->wmsApiUrl = config('wms.api_url', 'http://localhost:8080/api');
        $this->wmsApiKey = config('wms.api_key', '');
    }
    
    /**
     * 获取商品列表
     *
     * @param array $params 查询参数
     * @return array
     * @throws Exception
     */
    public function getProducts(array $params = []): array
    {
        try {
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $category = $params['category'] ?? '';
            $brand = $params['brand'] ?? '';
            $updatedSince = $params['updated_since'] ?? '';
            $keyword = $params['keyword'] ?? '';
            
            $where = [];
            $whereRaw = [];
            
            // 构建查询条件
            if (!empty($category)) {
                $where[] = ['category', '=', $category];
            }
            
            if (!empty($brand)) {
                $where[] = ['brand', '=', $brand];
            }
            
            if (!empty($keyword)) {
                $whereRaw[] = "(name LIKE ? OR sku LIKE ?)";
                $whereRawBind[] = "%{$keyword}%";
                $whereRawBind[] = "%{$keyword}%";
            }
            
            if (!empty($updatedSince)) {
                $where[] = ['updated_at', '>=', $updatedSince];
            }
            
            // 查询商品数据
            $query = Db::name('products')
                ->where($where)
                ->where('status', 1)
                ->order('updated_at', 'desc');
                
            if (!empty($whereRaw)) {
                $query->whereRaw(implode(' AND ', $whereRaw), $whereRawBind ?? []);
            }
            
            $total = $query->count();
            $products = $query->page($page, $limit)->select()->toArray();
            
            // 批量获取库存信息（避免 N+1）
            $productIds = array_column($products, 'id');
            $inventoryMap = !empty($productIds) ? $this->getProductInventory($productIds) : [];
            foreach ($products as &$product) {
                $product['stock'] = $inventoryMap[$product['id']]['available_quantity'] ?? 0;
                $product['reserved_stock'] = $inventoryMap[$product['id']]['reserved_quantity'] ?? 0;
            }
            
            return [
                'list' => $products,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ];
            
        } catch (\Exception $e) {
            Log::error('获取商品列表失败: ' . $e->getMessage());
            throw new Exception('获取商品列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品详情
     *
     * @param int $productId 商品ID
     * @return array|null
     * @throws Exception
     */
    public function getProductDetail(int $productId): ?array
    {
        try {
            $product = Db::name('products')
                ->where('id', $productId)
                ->where('status', 1)
                ->find();
                
            if (!$product) {
                return null;
            }
            
            // 获取库存信息
            $inventory = $this->getProductInventory([$productId]);
            $product['stock'] = $inventory[$productId]['available_quantity'] ?? 0;
            $product['reserved_stock'] = $inventory[$productId]['reserved_quantity'] ?? 0;
            
            // 获取商品图片
            $images = Db::name('product_images')
                ->where('product_id', $productId)
                ->order('sort', 'asc')
                ->column('image_url');
            $product['images'] = $images;
            
            // 获取商品规格
            $specs = Db::name('product_specs')
                ->where('product_id', $productId)
                ->where('status', 1)
                ->select()
                ->toArray();
            $product['specs'] = $specs;
            
            return $product;
            
        } catch (\Exception $e) {
            Log::error('获取商品详情失败: ' . $e->getMessage());
            throw new Exception('获取商品详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 批量获取商品库存
     *
     * @param array $productIds 商品ID数组
     * @return array
     * @throws Exception
     */
    public function getProductInventory(array $productIds): array
    {
        try {
            if (empty($productIds)) {
                return [];
            }
            
            $inventory = Db::name('inventory')
                ->whereIn('product_id', $productIds)
                ->group('product_id')
                ->field('product_id, SUM(quantity) as total_quantity, SUM(reserved_quantity) as reserved_quantity')
                ->select()
                ->toArray();
            
            $result = [];
            foreach ($inventory as $item) {
                $result[$item['product_id']] = [
                    'total_quantity' => (int)$item['total_quantity'],
                    'reserved_quantity' => (int)$item['reserved_quantity'],
                    'available_quantity' => (int)$item['total_quantity'] - (int)$item['reserved_quantity']
                ];
            }
            
            // 补充没有库存记录的商品
            foreach ($productIds as $productId) {
                if (!isset($result[$productId])) {
                    $result[$productId] = [
                        'total_quantity' => 0,
                        'reserved_quantity' => 0,
                        'available_quantity' => 0
                    ];
                }
            }
            
            return $result;
            
        } catch (\Exception $e) {
            Log::error('获取商品库存失败: ' . $e->getMessage());
            throw new Exception('获取商品库存失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取商品分类列表
     *
     * @return array
     * @throws Exception
     */
    public function getProductCategories(): array
    {
        try {
            $categories = Db::name('categories')
                ->where('status', 1)
                ->order('sort', 'asc')
                ->select()
                ->toArray();
                
            return $this->buildCategoryTree($categories);
            
        } catch (\Exception $e) {
            Log::error('获取商品分类失败: ' . $e->getMessage());
            throw new Exception('获取商品分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取品牌列表
     *
     * @return array
     * @throws Exception
     */
    public function getProductBrands(): array
    {
        try {
            $brands = Db::name('products')
                ->where('status', 1)
                ->group('brand')
                ->column('brand');
                
            return array_filter($brands);
            
        } catch (\Exception $e) {
            Log::error('获取品牌列表失败: ' . $e->getMessage());
            throw new Exception('获取品牌列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 预留库存
     *
     * @param array $reservations 预留信息
     * @param string $orderNo 订单号
     * @return array
     * @throws Exception
     */
    public function reserveInventory(array $reservations, string $orderNo): array
    {
        Db::startTrans();
        try {
            $results = [];
            
            foreach ($reservations as $reservation) {
                $productId = $reservation['product_id'];
                $quantity = $reservation['quantity'];
                
                // 检查库存是否充足
                $inventory = $this->getProductInventory([$productId]);
                $availableQuantity = $inventory[$productId]['available_quantity'] ?? 0;
                
                if ($availableQuantity < $quantity) {
                    throw new Exception("商品ID {$productId} 库存不足，可用库存：{$availableQuantity}，需要：{$quantity}");
                }
                
                // 预留库存
                $affected = Db::name('inventory')
                    ->where('product_id', $productId)
                    ->where('quantity - reserved_quantity', '>=', $quantity)
                    ->inc('reserved_quantity', $quantity)
                    ->update();
                    
                if ($affected === 0) {
                    throw new Exception("商品ID {$productId} 库存预留失败");
                }
                
                // 记录预留信息
                Db::name('inventory_reservations')->insert([
                    'order_no' => $orderNo,
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'status' => 1,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                
                $results[] = [
                    'product_id' => $productId,
                    'reserved_quantity' => $quantity,
                    'status' => 'success'
                ];
            }
            
            Db::commit();
            return $results;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('预留库存失败: ' . $e->getMessage());
            throw new Exception('预留库存失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 释放库存预留
     *
     * @param string $orderNo 订单号
     * @return array
     * @throws Exception
     */
    public function releaseReservation(string $orderNo): array
    {
        Db::startTrans();
        try {
            // 获取预留记录
            $reservations = Db::name('inventory_reservations')
                ->where('order_no', $orderNo)
                ->where('status', 1)
                ->select()
                ->toArray();
                
            if (empty($reservations)) {
                return ['message' => '没有找到预留记录'];
            }
            
            $results = [];
            foreach ($reservations as $reservation) {
                // 释放预留库存
                Db::name('inventory')
                    ->where('product_id', $reservation['product_id'])
                    ->dec('reserved_quantity', $reservation['quantity'])
                    ->update();
                    
                // 更新预留记录状态
                Db::name('inventory_reservations')
                    ->where('id', $reservation['id'])
                    ->update(['status' => 0, 'updated_at' => date('Y-m-d H:i:s')]);
                    
                $results[] = [
                    'product_id' => $reservation['product_id'],
                    'released_quantity' => $reservation['quantity'],
                    'status' => 'success'
                ];
            }
            
            Db::commit();
            return $results;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('释放库存预留失败: ' . $e->getMessage());
            throw new Exception('释放库存预留失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 创建出库订单
     *
     * @param array $orderData 订单数据
     * @return array
     * @throws Exception
     */
    public function createOutboundOrder(array $orderData): array
    {
        Db::startTrans();
        try {
            $orderNo = $orderData['order_no'];
            $items = $orderData['items'];
            $deliveryAddress = $orderData['delivery_address'];
            $customerInfo = $orderData['customer_info'] ?? [];
            
            // 创建出库订单
            $outboundOrderId = Db::name('outbound_orders')->insertGetId([
                'order_no' => $orderNo,
                'customer_name' => $customerInfo['name'] ?? '',
                'customer_phone' => $customerInfo['phone'] ?? '',
                'delivery_address' => json_encode($deliveryAddress),
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // 创建出库订单明细
            foreach ($items as $item) {
                Db::name('outbound_order_items')->insert([
                    'outbound_order_id' => $outboundOrderId,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'] ?? 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            // 扣减库存
            foreach ($items as $item) {
                $affected = Db::name('inventory')
                    ->where('product_id', $item['product_id'])
                    ->where('quantity', '>=', $item['quantity'])
                    ->dec('quantity', $item['quantity'])
                    ->update();
                    
                if ($affected === 0) {
                    throw new Exception("商品ID {$item['product_id']} 库存不足");
                }
                
                // 记录库存变动
                Db::name('inventory_transactions')->insert([
                    'product_id' => $item['product_id'],
                    'type' => 'outbound',
                    'quantity' => -$item['quantity'],
                    'reference_type' => 'outbound_order',
                    'reference_id' => $outboundOrderId,
                    'operator' => 'system',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            Db::commit();
            
            return [
                'outbound_order_id' => $outboundOrderId,
                'order_no' => $orderNo,
                'status' => 'created'
            ];
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('创建出库订单失败: ' . $e->getMessage());
            throw new Exception('创建出库订单失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取订单状态
     *
     * @param string $orderNo 订单号
     * @return array|null
     * @throws Exception
     */
    public function getOrderStatus(string $orderNo): ?array
    {
        try {
            $order = Db::name('outbound_orders')
                ->where('order_no', $orderNo)
                ->find();
                
            if (!$order) {
                return null;
            }
            
            // 获取订单明细
            $items = Db::name('outbound_order_items')
                ->alias('oi')
                ->join('products p', 'oi.product_id = p.id')
                ->where('oi.outbound_order_id', $order['id'])
                ->field('oi.*, p.name as product_name, p.sku')
                ->select()
                ->toArray();
                
            $order['items'] = $items;
            
            return $order;
            
        } catch (\Exception $e) {
            Log::error('获取订单状态失败: ' . $e->getMessage());
            throw new Exception('获取订单状态失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 取消订单
     *
     * @param string $orderNo 订单号
     * @param string $reason 取消原因
     * @return array
     * @throws Exception
     */
    public function cancelOrder(string $orderNo, string $reason = ''): array
    {
        Db::startTrans();
        try {
            $order = Db::name('outbound_orders')
                ->where('order_no', $orderNo)
                ->find();
                
            if (!$order) {
                throw new Exception('订单不存在');
            }
            
            if ($order['status'] !== 'pending') {
                throw new Exception('订单状态不允许取消');
            }
            
            // 获取订单明细
            $items = Db::name('outbound_order_items')
                ->where('outbound_order_id', $order['id'])
                ->select()
                ->toArray();
            
            // 恢复库存
            foreach ($items as $item) {
                Db::name('inventory')
                    ->where('product_id', $item['product_id'])
                    ->inc('quantity', $item['quantity'])
                    ->update();
                    
                // 记录库存变动
                Db::name('inventory_transactions')->insert([
                    'product_id' => $item['product_id'],
                    'type' => 'adjustment',
                    'quantity' => $item['quantity'],
                    'reference_type' => 'order_cancel',
                    'reference_id' => $order['id'],
                    'operator' => 'system',
                    'notes' => '订单取消恢复库存',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            // 更新订单状态
            Db::name('outbound_orders')
                ->where('id', $order['id'])
                ->update([
                    'status' => 'cancelled',
                    'cancel_reason' => $reason,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            
            Db::commit();
            
            return [
                'order_no' => $orderNo,
                'status' => 'cancelled',
                'message' => '订单取消成功'
            ];
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('取消订单失败: ' . $e->getMessage());
            throw new Exception('取消订单失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 确认发货
     *
     * @param string $orderNo 订单号
     * @param array $shippingData 发货信息
     * @return array
     * @throws Exception
     */
    public function shipOrder(string $orderNo, array $shippingData = []): array
    {
        try {
            $order = Db::name('outbound_orders')
                ->where('order_no', $orderNo)
                ->find();
                
            if (!$order) {
                throw new Exception('订单不存在');
            }
            
            if (!in_array($order['status'], ['pending', 'picking', 'packed'])) {
                throw new Exception('订单状态不允许发货');
            }
            
            // 更新订单状态
            $updateData = [
                'status' => 'shipped',
                'shipped_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            if (!empty($shippingData['tracking_number'])) {
                $updateData['tracking_number'] = $shippingData['tracking_number'];
            }
            
            if (!empty($shippingData['carrier'])) {
                $updateData['carrier'] = $shippingData['carrier'];
            }
            
            Db::name('outbound_orders')
                ->where('id', $order['id'])
                ->update($updateData);
            
            return [
                'order_no' => $orderNo,
                'status' => 'shipped',
                'message' => '发货成功'
            ];
            
        } catch (\Exception $e) {
            Log::error('确认发货失败: ' . $e->getMessage());
            throw new Exception('确认发货失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 同步商品到WMS系统
     *
     * @param array $productData 商品数据
     * @return array
     * @throws Exception
     */
    public function syncProductToWMS(array $productData): array
    {
        try {
            $url = $this->wmsApiUrl . '/products/sync';
            $response = $this->callWMSApi('POST', $url, $productData);
            
            Log::info('商品同步到WMS成功', [
                'product_id' => $productData['id'] ?? 0,
                'sku' => $productData['sku'] ?? '',
                'response' => $response
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('商品同步到WMS失败', [
                'product_data' => $productData,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 批量同步商品到WMS系统
     *
     * @param array $products 商品数据数组
     * @return array
     * @throws Exception
     */
    public function batchSyncProductsToWMS(array $products): array
    {
        try {
            $url = $this->wmsApiUrl . '/products/batch-sync';
            $response = $this->callWMSApi('POST', $url, ['products' => $products]);
            
            Log::info('批量商品同步到WMS成功', [
                'count' => count($products),
                'response' => $response
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('批量商品同步到WMS失败', [
                'count' => count($products),
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 从WMS系统获取库存更新
     *
     * @param array $productIds 商品ID数组
     * @return array
     * @throws Exception
     */
    public function getInventoryFromWMS(array $productIds = []): array
    {
        try {
            $url = $this->wmsApiUrl . '/inventory';
            $params = [];
            
            if (!empty($productIds)) {
                $params['product_ids'] = implode(',', $productIds);
            }
            
            $response = $this->callWMSApi('GET', $url, $params);
            
            Log::info('从WMS获取库存成功', [
                'product_count' => count($productIds),
                'inventory_count' => count($response['data'] ?? [])
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('从WMS获取库存失败', [
                'product_ids' => $productIds,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 同步库存到本地数据库
     *
     * @param array $inventoryData WMS库存数据
     * @return array
     * @throws Exception
     */
    public function syncInventoryFromWMS(array $inventoryData): array
    {
        Db::startTrans();
        try {
            $results = [];
            
            foreach ($inventoryData as $item) {
                $productId = $item['product_id'];
                $locationId = $item['location_id'] ?? 1;
                $batchNo = $item['batch_no'] ?? '';
                $quantity = $item['quantity'] ?? 0;
                $reservedQuantity = $item['reserved_quantity'] ?? 0;
                
                // 检查库存记录是否存在
                $existingInventory = Db::name('inventory')
                    ->where('product_id', $productId)
                    ->where('location_id', $locationId)
                    ->where('batch_no', $batchNo)
                    ->find();
                
                if ($existingInventory) {
                    // 更新现有库存
                    $oldQuantity = $existingInventory['quantity'];
                    $quantityChange = $quantity - $oldQuantity;
                    
                    Db::name('inventory')
                        ->where('id', $existingInventory['id'])
                        ->update([
                            'quantity' => $quantity,
                            'reserved_quantity' => $reservedQuantity,
                            'updated_at' => date('Y-m-d H:i:s')
                        ]);
                    
                    // 记录库存变动
                    if ($quantityChange != 0) {
                        Db::name('inventory_transactions')->insert([
                            'product_id' => $productId,
                            'location_id' => $locationId,
                            'batch_no' => $batchNo,
                            'type' => 'adjustment',
                            'quantity' => $quantityChange,
                            'reference_type' => 'wms_sync',
                            'reference_id' => 0,
                            'operator' => 'system',
                            'notes' => 'WMS库存同步',
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                    
                    $results[] = [
                        'product_id' => $productId,
                        'action' => 'updated',
                        'old_quantity' => $oldQuantity,
                        'new_quantity' => $quantity,
                        'change' => $quantityChange
                    ];
                } else {
                    // 创建新库存记录
                    Db::name('inventory')->insert([
                        'product_id' => $productId,
                        'location_id' => $locationId,
                        'batch_no' => $batchNo,
                        'quantity' => $quantity,
                        'reserved_quantity' => $reservedQuantity,
                        'production_date' => $item['production_date'] ?? null,
                        'expiry_date' => $item['expiry_date'] ?? null,
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                    
                    // 记录库存变动
                    if ($quantity > 0) {
                        Db::name('inventory_transactions')->insert([
                            'product_id' => $productId,
                            'location_id' => $locationId,
                            'batch_no' => $batchNo,
                            'type' => 'inbound',
                            'quantity' => $quantity,
                            'reference_type' => 'wms_sync',
                            'reference_id' => 0,
                            'operator' => 'system',
                            'notes' => 'WMS库存同步新增',
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                    }
                    
                    $results[] = [
                        'product_id' => $productId,
                        'action' => 'created',
                        'quantity' => $quantity
                    ];
                }
            }
            
            Db::commit();
            
            Log::info('WMS库存同步成功', [
                'sync_count' => count($results)
            ]);
            
            return $results;
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('WMS库存同步失败', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 同步订单到WMS系统
     *
     * @param array $orderData 订单数据
     * @return array
     * @throws Exception
     */
    public function syncOrderToWMS(array $orderData): array
    {
        try {
            $url = $this->wmsApiUrl . '/orders/sync';
            $response = $this->callWMSApi('POST', $url, $orderData);
            
            Log::info('订单同步到WMS成功', [
                'order_no' => $orderData['order_no'] ?? '',
                'response' => $response
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('订单同步到WMS失败', [
                'order_data' => $orderData,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 从WMS获取订单状态更新
     *
     * @param string $orderNo 订单号
     * @return array
     * @throws Exception
     */
    public function getOrderStatusFromWMS(string $orderNo): array
    {
        try {
            $url = $this->wmsApiUrl . '/orders/' . $orderNo . '/status';
            $response = $this->callWMSApi('GET', $url);
            
            Log::info('从WMS获取订单状态成功', [
                'order_no' => $orderNo,
                'status' => $response['status'] ?? ''
            ]);
            
            return $response;
            
        } catch (\Exception $e) {
            Log::error('从WMS获取订单状态失败', [
                'order_no' => $orderNo,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 调用WMS API
     *
     * @param string $method HTTP方法
     * @param string $url API地址
     * @param array $data 请求数据
     * @return array
     * @throws Exception
     */
    protected function callWMSApi(string $method, string $url, array $data = []): array
    {
        $ch = curl_init();
        
        // 基础配置
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->wmsApiKey,
                'User-Agent: WineShop-API/1.0'
            ]
        ]);
        
        // 根据方法设置请求参数
        switch (strtoupper($method)) {
            case 'GET':
                if (!empty($data)) {
                    $url .= '?' . http_build_query($data);
                    curl_setopt($ch, CURLOPT_URL, $url);
                }
                break;
                
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                break;
                
            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                break;
                
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception('WMS API调用失败: ' . $error);
        }
        
        if ($httpCode >= 400) {
            throw new Exception('WMS API返回错误: HTTP ' . $httpCode . ' - ' . $response);
        }
        
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('WMS API响应格式错误: ' . json_last_error_msg());
        }
        
        return $result;
    }
    
    /**
     * 实时库存同步任务
     *
     * @return array
     * @throws Exception
     */
    public function realTimeInventorySync(): array
    {
        try {
            // 获取需要同步的商品ID（最近更新的商品）
            $productIds = Db::name('products')
                ->where('status', 1)
                ->where('updated_at', '>=', date('Y-m-d H:i:s', time() - 3600)) // 最近1小时更新的
                ->column('id');
            
            if (empty($productIds)) {
                return ['message' => '没有需要同步的商品'];
            }
            
            // 从WMS获取最新库存
            $wmsInventory = $this->getInventoryFromWMS($productIds);
            
            if (empty($wmsInventory['data'])) {
                return ['message' => 'WMS没有返回库存数据'];
            }
            
            // 同步库存到本地
            $results = $this->syncInventoryFromWMS($wmsInventory['data']);
            
            // 更新商品表的库存字段
            foreach ($results as $result) {
                if ($result['action'] === 'updated' || $result['action'] === 'created') {
                    $totalStock = Db::name('inventory')
                        ->where('product_id', $result['product_id'])
                        ->sum('quantity - reserved_quantity');
                    
                    Db::name('products')
                        ->where('id', $result['product_id'])
                        ->update(['stock' => max(0, $totalStock)]);
                }
            }
            
            return [
                'message' => '实时库存同步完成',
                'synced_products' => count($productIds),
                'updated_records' => count($results)
            ];
            
        } catch (\Exception $e) {
            Log::error('实时库存同步失败', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * 构建分类树
     *
     * @param array $categories 分类数据
     * @param int $parentId 父级ID
     * @return array
     */
    protected function buildCategoryTree(array $categories, int $parentId = 0): array
    {
        $tree = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildCategoryTree($categories, $category['id']);
                if (!empty($children)) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        
        return $tree;
    }
}