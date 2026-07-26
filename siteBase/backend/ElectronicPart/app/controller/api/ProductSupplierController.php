<?php
/**
 * 电子元器件商城 - 产品供应商关联接口
 * 文件说明：提供产品与供应商关联关系的管理与查询接口。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProductSupplier;
use think\Response;
use think\facade\Log;

/**
 * 产品供应商关联API控制器
 * @package app\controller\api
 */
class ProductSupplierController extends BaseController
{
    /**
     * 获取产品供应商关联列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $productId = (int)($params['product_id'] ?? 0);
            $supplierId = (int)($params['supplier_id'] ?? 0);
            $status = (int)($params['status'] ?? -1);
            
            $query = SkProductSupplier::with(['product', 'supplier'])->order('created_at', 'desc');
            
            if ($productId > 0) {
                $query->where('product_id', $productId);
            }
            
            if ($supplierId > 0) {
                $query->where('supplier_id', $supplierId);
            }
            
            if ($status >= 0) {
                $query->where('status', $status);
            }
            
            $total = (clone $query)->count();
            $list = $query->page($page, $limit)->select()->toArray();
            
            return $this->success([
                'total' => $total,
                'list' => $list,
                'page' => $page,
                'limit' => $limit
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取产品供应商关联详情
     */
    public function read(string $id): Response
    {
        try {
            $productSupplier = SkProductSupplier::with(['product', 'supplier'])->find($id);
            
            if (!$productSupplier) {
                return $this->error('产品供应商关联不存在', 404);
            }
            
            return $this->success($productSupplier);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 创建产品供应商关联
     */
    public function save(): Response
    {
        try {
            $data = $this->request->post();
            
            // 验证数据
            $validate = $this->validate($data, [
                'product_id' => 'require|integer',
                'supplier_id' => 'require|integer',
                'min_order_quantity' => 'require|integer|min:1',
            ]);
            
            if (true !== $validate) {
                return $this->error($validate, 400);
            }
            
            $productSupplier = SkProductSupplier::create($data);
            
            return $this->success($productSupplier, '产品供应商关联创建成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新产品供应商关联
     */
    public function update(int $id): Response
    {
        try {
            $productSupplier = SkProductSupplier::find($id);
            
            if (!$productSupplier) {
                return $this->error('产品供应商关联不存在', 404);
            }
            
            $data = $this->request->put();
            
            // 验证数据
            $validate = $this->validate($data, [
                'product_id' => 'require|integer',
                'supplier_id' => 'require|integer',
                'min_order_quantity' => 'require|integer|min:1',
            ]);
            
            if (true !== $validate) {
                return $this->error($validate, 400);
            }
            
            $productSupplier->save($data);
            
            return $this->success($productSupplier, '产品供应商关联更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 删除产品供应商关联
     */
    public function delete(int $id): Response
    {
        try {
            $productSupplier = SkProductSupplier::find($id);
            
            if (!$productSupplier) {
                return $this->error('产品供应商关联不存在', 404);
            }
            
            $productSupplier->delete();
            
            return $this->success([], '产品供应商关联删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}