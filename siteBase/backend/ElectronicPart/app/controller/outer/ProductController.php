<?php
/**
 * 电子元器件商城 - 控制器
 * 文件说明：对外（同步/查询）商品相关接口，供第三方或其他系统调用。
 * 注意：此项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\controller\outer;

use app\BaseController;
use app\service\outer\SyncService;
use think\Response;
use think\facade\Log;

/**
 * 商品同步控制器
 */
class ProductController extends BaseController
{
    protected $syncService;
    
    public function __construct()
    {
        parent::__construct();
        $this->syncService = new SyncService();
    }
    
    /**
     * 获取商品列表
     * @return Response
     */
    public function index(): Response
    {
        $page = (int)$this->request->get('page', 1);
        $limit = (int)$this->request->get('limit', 20);
        $category = $this->request->get('category');
        $brand = $this->request->get('brand');
        $updatedSince = $this->request->get('updated_since');
        $keyword = $this->request->get('keyword');
        
        // 参数验证
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        try {
            $result = $this->syncService->getProducts([
                'page' => $page,
                'limit' => $limit,
                'category' => $category,
                'brand' => $brand,
                'updated_since' => $updatedSince,
                'keyword' => $keyword
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
     * 获取商品详情
     * @param int $id
     * @return Response
     */
    public function read(int $id): Response
    {
        if ($id <= 0) {
            return json([
                'code' => 400,
                'message' => '无效的商品ID',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $product = $this->syncService->getProductDetail($id);
            
            if (!$product) {
                return json([
                    'code' => 404,
                    'message' => '商品不存在',
                    'timestamp' => time()
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $product,
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
     * 批量获取商品库存
     * @return Response
     */
    public function inventory(): Response
    {
        $productIds = $this->request->post('product_ids', []);
        
        if (empty($productIds) || !is_array($productIds)) {
            return json([
                'code' => 400,
                'message' => '商品ID列表不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        // 验证商品ID格式
        foreach ($productIds as $id) {
            if (!is_numeric($id) || $id <= 0) {
                return json([
                    'code' => 400,
                    'message' => '无效的商品ID格式',
                    'timestamp' => time()
                ], 400);
            }
        }
        
        try {
            $inventory = $this->syncService->getProductInventory($productIds);
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $inventory,
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
     * 获取商品分类列表
     * @return Response
     */
    public function categories(): Response
    {
        try {
            $categories = $this->syncService->getProductCategories();
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $categories,
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
     * 获取品牌列表
     * @return Response
     */
    public function brands(): Response
    {
        try {
            $brands = $this->syncService->getProductBrands();
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $brands,
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
     * 预留库存
     * @return Response
     */
    public function reserve(): Response
    {
        $reservations = $this->request->post('reservations', []);
        $orderNo = $this->request->post('order_no');
        
        if (empty($reservations) || empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '缺少必要参数',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $result = $this->syncService->reserveInventory($reservations, $orderNo);
            
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
     * 释放库存预留
     * @return Response
     */
    public function release(): Response
    {
        $orderNo = $this->request->post('order_no');
        
        if (empty($orderNo)) {
            return json([
                'code' => 400,
                'message' => '订单号不能为空',
                'timestamp' => time()
            ], 400);
        }
        
        try {
            $result = $this->syncService->releaseReservation($orderNo);
            
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
}