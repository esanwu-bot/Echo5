<?php
/**
 * 电子元器件商城 - 库存同步控制器（外部）
 * 文件说明：对外提供库存查询/批量获取接口，供外部系统同步库存信息使用。
 */
declare(strict_types=1);

namespace app\controller\outer;

use app\BaseController;
use app\service\outer\SyncService;
use think\Response;
use think\facade\Log;
class InventoryController extends BaseController
{
    protected $syncService;
    
    public function __construct()
    {
        parent::__construct();
        $this->syncService = new SyncService();
    }
    
    /**
     * 获取库存列表
     * @return Response
     */
    public function index(): Response
    {
        $page = (int)$this->request->get('page', 1);
        $limit = (int)$this->request->get('limit', 20);
        $productId = $this->request->get('product_id');
        $storageZone = $this->request->get('storage_zone');
        $lowStock = $this->request->get('low_stock'); // 是否只显示低库存
        
        // 参数验证
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        try {
            $result = $this->syncService->getInventoryList([
                'page' => $page,
                'limit' => $limit,
                'product_id' => $productId,
                'storage_zone' => $storageZone,
                'low_stock' => $lowStock
            ]);
            
            return json([
                'code' => 200,
                'message' => 'success',
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
     * 获取批次库存详情
     * @param string $lotNo
     * @return Response
     */
    public function lot(string $lotNo): Response
    {
        if (empty($lotNo)) {
            return json([
                'code' => 400,
                'message' => '批次号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $lot = $this->syncService->getInventoryLot($lotNo);
            
            if (!$lot) {
                return json([
                    'code' => 404,
                    'message' => '批次不存在',
                    'timestamp' => time()
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $lot,
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
     * 库存预警列表
     * @return Response
     */
    public function alerts(): Response
    {
        $type = $this->request->get('type'); // low_stock, expiring, expired
        $page = (int)$this->request->get('page', 1);
        $limit = (int)$this->request->get('limit', 20);
        
        // 参数验证
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        try {
            $result = $this->syncService->getInventoryAlerts([
                'type' => $type,
                'page' => $page,
                'limit' => $limit
            ]);
            
            return json([
                'code' => 200,
                'message' => 'success',
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
     * 库存统计
     * @return Response
     */
    public function statistics(): Response
    {
        $dimension = $this->request->get('dimension', 'category'); // category, brand, storage_zone
        $startDate = $this->request->get('start_date');
        $endDate = $this->request->get('end_date');
        
        try {
            $result = $this->syncService->getInventoryStatistics([
                'dimension' => $dimension,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            return json([
                'code' => 200,
                'message' => 'success',
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
     * 库存变动记录
     * @return Response
     */
    public function movements(): Response
    {
        $page = (int)$this->request->get('page', 1);
        $limit = (int)$this->request->get('limit', 20);
        $productId = $this->request->get('product_id');
        $lotNo = $this->request->get('lot_no');
        $type = $this->request->get('type'); // in, out, adjust
        $startDate = $this->request->get('start_date');
        $endDate = $this->request->get('end_date');
        
        // 参数验证
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        try {
            $result = $this->syncService->getInventoryMovements([
                'page' => $page,
                'limit' => $limit,
                'product_id' => $productId,
                'lot_no' => $lotNo,
                'type' => $type,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            return json([
                'code' => 200,
                'message' => 'success',
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
     * 库存调整
     * @return Response
     */
    public function adjust(): Response
    {
        $adjustments = $this->request->post('adjustments', []);
        $reason = $this->request->post('reason', '');
        $operator = $this->request->post('operator', '');
        
        if (empty($adjustments) || !is_array($adjustments)) {
            return json([
                'code' => 400,
                'message' => '调整数据不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        if (empty($reason)) {
            return json([
                'code' => 400,
                'message' => '调整原因不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        // 验证调整数据格式
        foreach ($adjustments as $adjustment) {
            if (!isset($adjustment['lot_no']) || !isset($adjustment['quantity']) ||
                empty($adjustment['lot_no']) || !is_numeric($adjustment['quantity'])) {
                return json([
                    'code' => 400,
                    'message' => '调整数据格式错误',
                    'timestamp' => time()
                ], 400);
            }
        }
        
        try {
            $result = $this->syncService->adjustInventory($adjustments, $reason, $operator);
            
            return json([
                'code' => 200,
                'message' => '库存调整成功',
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
     * 获取存储区域列表
     * @return Response
     */
    public function zones(): Response
    {
        try {
            $zones = $this->syncService->getStorageZones();
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $zones,
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
     * 库存盘点
     * @return Response
     */
    public function stocktake(): Response
    {
        $stocktakeData = $this->request->post();
        
        if (empty($stocktakeData['items']) || !is_array($stocktakeData['items'])) {
            return json([
                'code' => 400,
                'message' => '盘点数据不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $result = $this->syncService->performStocktake($stocktakeData);
            
            return json([
                'code' => 200,
                'message' => '盘点完成',
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