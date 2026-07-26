<?php
/**
 * 电子元器件商城 - 订单同步控制器（外部系统调用）
 * 文件说明：处理来自外部系统的出库订单创建与状态查询请求，调用同步服务执行库存/订单操作。
 */
declare(strict_types=1);

namespace app\controller\outer;

use app\BaseController;
use app\service\outer\SyncService;
use think\Response;
use think\facade\Log;

/**
 * 订单同步控制器
 */
class OrderController extends BaseController
{
    protected $syncService;
    
    public function __construct()
    {
        parent::__construct();
        $this->syncService = new SyncService();
    }
    
    /**
     * 创建出库订单
     * @return Response
     */
    public function create(): Response
    {
        $orderData = $this->request->post();
        
        // 验证必要字段
        $required = ['order_no', 'items', 'delivery_address', 'customer_info'];
        foreach ($required as $field) {
            if (!isset($orderData[$field]) || empty($orderData[$field])) {
                return json([
                    'code' => 400,
                    'message' => "缺少必要字段: {$field}",
                    'timestamp' => time()
                ], 400);
            }
        }
        
        // 验证商品项目
        if (!is_array($orderData['items']) || empty($orderData['items'])) {
            return json([
                'code' => 400,
                'message' => '订单商品不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        foreach ($orderData['items'] as $item) {
            if (!isset($item['product_id']) || !isset($item['quantity']) || 
                !is_numeric($item['product_id']) || !is_numeric($item['quantity']) ||
                $item['product_id'] <= 0 || $item['quantity'] <= 0) {
                return json([
                    'code' => 400,
                    'message' => '商品信息格式错误',
                    'timestamp' => time()
                ], 400);
            }
        }
        
        try {
            $result = $this->syncService->createOutboundOrder($orderData);
            
            return json([
                'code' => 200,
                'message' => '订单创建成功',
                'data' => $result,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 查询订单状态
     * @param string $orderNo
     * @return Response
     */
    public function status(string $orderNo): Response
    {
        if (empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '订单号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $status = $this->syncService->getOrderStatus($orderNo);
            
            if (!$status) {
                return json([
                    'code' => 404,
                    'message' => '订单不存在',
                    'timestamp' => time()
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $status,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 取消订单
     * @param string $orderNo
     * @return Response
     */
    public function cancel(string $orderNo): Response
    {
        if (empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '订单号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        $reason = $this->request->post('reason', '');
        
        try {
            $result = $this->syncService->cancelOrder($orderNo, $reason);
            
            return json([
                'code' => 200,
                'message' => '订单取消成功',
                'data' => $result,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 确认发货
     * @param string $orderNo
     * @return Response
     */
    public function ship(string $orderNo): Response
    {
        if (empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '订单号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        $shippingData = $this->request->post();
        
        try {
            $result = $this->syncService->shipOrder($orderNo, $shippingData);
            
            return json([
                'code' => 200,
                'message' => '发货成功',
                'data' => $result,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 获取订单列表
     * @return Response
     */
    public function index(): Response
    {
        $page = (int)$this->request->get('page', 1);
        $limit = (int)$this->request->get('limit', 20);
        $status = $this->request->get('status');
        $startDate = $this->request->get('start_date');
        $endDate = $this->request->get('end_date');
        
        // 参数验证
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        try {
            $result = $this->syncService->getOrders([
                'page' => $page,
                'limit' => $limit,
                'status' => $status,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $result,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 获取订单详情
     * @param string $orderNo
     * @return Response
     */
    public function detail(string $orderNo): Response
    {
        if (empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '订单号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $detail = $this->syncService->getOrderDetail($orderNo);
            
            if (!$detail) {
                return json([
                    'code' => 404,
                    'message' => '订单不存在',
                    'timestamp' => time()
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $detail,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
    
    /**
     * 批量更新订单状态
     * @return Response
     */
    public function batchUpdate(): Response
    {
        $updates = $this->request->post('updates', []);
        
        if (empty($updates) || !is_array($updates)) {
            return json([
                'code' => 400,
                'message' => '更新数据不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $result = $this->syncService->batchUpdateOrders($updates);
            
            return json([
                'code' => 200,
                'message' => '批量更新成功',
                'data' => $result,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
                'timestamp' => time()
            ], 500);
        }
    }
}