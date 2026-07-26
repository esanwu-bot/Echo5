<?php
declare(strict_types=1);

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkInventory;
use app\model\SkProduct;
use think\Response;
use think\facade\Log;

/**
 * 库存管理控制器
 */
class InventoryController extends BaseController
{
    /**
     * 获取库存列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();

            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $productId = (int)($params['product_id'] ?? 0);
            $lowStock = (bool)($params['low_stock'] ?? false);

            $query = SkInventory::with(['product']);

            if ($productId > 0) {
                $query->where('product_id', $productId);
            }

            if ($lowStock) {
                $query->whereColumn('quantity', '<=', 'safety_stock');
            }

            $total = (clone $query)->count();
            $list = $query->page($page, $limit)->select()->toArray();

            // 格式化返回数据
            $inventories = [];
            foreach ($list as $item) {
                $inventories[] = [
                    'id' => $item['id'],
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product']['name'] ?? '',
                    'product_code' => $item['product']['product_code'] ?? '',
                    'quantity' => $item['quantity'] ?? 0,
                    'in_transit_quantity' => $item['in_transit_quantity'] ?? 0,
                    'available_quantity' => $item['available_quantity'] ?? 0,
                    'safety_stock' => $item['safety_stock'] ?? 0,
                    'supplier_id' => $item['supplier_id'] ?? 0,
                    'created_at' => $item['created_at'] ?? '',
                    'updated_at' => $item['updated_at'] ?? ''
                ];
            }

            return $this->success([
                'total' => $total,
                'list' => $inventories
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取库存详情
     */
    public function read(int $id): Response
    {
        try {
            $inventory = SkInventory::with(['product'])->find($id);

            if (!$inventory) {
                return $this->error('库存记录不存在', 404);
            }

            // 格式化返回数据
            $inventoryData = [
                'id' => $inventory->id,
                'product_id' => $inventory->product_id,
                'product_name' => $inventory->product->name ?? '',
                'product_code' => $inventory->product->product_code ?? '',
                'quantity' => $inventory->quantity ?? 0,
                'in_transit_quantity' => $inventory->in_transit_quantity ?? 0,
                'available_quantity' => $inventory->available_quantity ?? 0,
                'safety_stock' => $inventory->safety_stock ?? 0,
                'supplier_id' => $inventory->supplier_id ?? 0,
                'created_at' => $inventory->created_at ?? '',
                'updated_at' => $inventory->updated_at ?? ''
            ];

            return $this->success($inventoryData);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新库存信息
     */
    public function update(int $id): Response
    {
        try {
            $inventory = SkInventory::find($id);

            if (!$inventory) {
                return $this->error('库存记录不存在', 404);
            }

            $data = $this->request->put();

            // 允许更新的字段
            $allowFields = [
                'quantity',
                'in_transit_quantity',
                'available_quantity',
                'safety_stock',
                'supplier_id'
            ];

            // 更新数据
            foreach ($allowFields as $field) {
                if (isset($data[$field])) {
                    $inventory->$field = $data[$field];
                }
            }

            $inventory->save();

            return $this->success('库存更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量更新库存
     */
    /**
     * 批量删除库存记录
     */
    public function batchDelete(): Response
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的库存记录');
            }
            SkInventory::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    public function batchUpdate(): Response
    {
        try {
            $data = $this->request->put();
            $inventories = $data['inventories'] ?? [];

            if (empty($inventories)) {
                return $this->error('更新数据不能为空', 400);
            }

            foreach ($inventories as $item) {
                $inventory = SkInventory::find($item['id']);
                if ($inventory) {
                    // 更新允许的字段
                    $allowFields = [
                        'quantity',
                        'in_transit_quantity',
                        'available_quantity',
                        'safety_stock'
                    ];

                    foreach ($allowFields as $field) {
                        if (isset($item[$field])) {
                            $inventory->$field = $item[$field];
                        }
                    }
                    $inventory->save();
                }
            }

            return $this->success('批量更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取库存统计信息
     */
    public function statistics(): Response
    {
        try {
            // 计算总库存
            $totalInventory = SkInventory::sum('quantity');
            // 计算可用库存
            $availableInventory = SkInventory::sum('available_quantity');
            // 计算在途库存
            $inTransitInventory = SkInventory::sum('in_transit_quantity');
            // 计算安全库存
            $safetyStock = SkInventory::sum('safety_stock');
            // 计算低库存产品数量
            $lowStockProducts = SkInventory::whereColumn('quantity', '<=', 'safety_stock')->count();

            return $this->success([
                'total_inventory' => $totalInventory,
                'available_inventory' => $availableInventory,
                'in_transit_inventory' => $inTransitInventory,
                'safety_stock' => $safetyStock,
                'low_stock_products' => $lowStockProducts
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
