<?php
/**
 * 电子元器件商城 - 品牌管理（后台）
 * 文件说明：管理品牌信息（创建/查询/更新），用于后台维护品牌数据以支持商品归属。
 */
declare(strict_types=1);

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkBrand;
use think\Response;
use think\facade\Log;
class BrandController extends BaseController
{
    /**
     * 获取品牌列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $keyword = trim((string)($params['keyword'] ?? ''));
            
            $query = SkBrand::order('created_at', 'desc');
            
            // 按名称搜索（brand_name 是数据库实际字段）
            if ($keyword !== '') {
                $query->whereLike('brand_name', "%{$keyword}%");
            }
            
            $total = (clone $query)->count();
            $list = $query->page($page, $limit)->select();
            
            return $this->paginate($list, $total, $page, $limit);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取单个品牌详情
     */
    public function read(int $id): Response
    {
        try {
            $brand = SkBrand::find($id);
            
            if (!$brand) {
                return $this->error('品牌不存在', 404);
            }
            
            return $this->success($brand);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 新增品牌
     */
    public function save(): Response
    {
        try {
            $params = $this->filterDeprecatedLangFields($this->request->post());
            
            // 验证必填字段
            if (empty($params['name'])) {
                return $this->error('品牌名称不能为空', 400);
            }
            
            $name = trim((string)$params['name']);
            
            // 检查品牌名称是否已存在
            $existing = SkBrand::where('brand_name', $name)->find();
            if ($existing) {
                return $this->error('品牌名称已存在', 400);
            }
            
            // 构建品牌数据（brand_name 是数据库实际字段，name 是虚拟属性）
            $brand = new SkBrand([
                'brand_name' => $name,
                'description' => $params['description'] ?? '',
                'logo' => $params['logo'] ?? '',
                'website' => $params['website'] ?? '',
                'sort' => (int)($params['sort'] ?? 0),
                'status' => (int)($params['status'] ?? 1)
            ]);
            
            if ($brand->save()) {
                return $this->success([
                    'id' => $brand->id,
                    'message' => '品牌创建成功'
                ], 201);
            }
            
            return $this->error('创建品牌失败', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 编辑品牌
     */
    public function update(int $id): Response
    {
        try {
            $params = $this->filterDeprecatedLangFields($this->request->post());
            
            // 验证必填字段
            if (empty($params['name'])) {
                return $this->error('品牌名称不能为空', 400);
            }
            
            $brand = SkBrand::find($id);
            if (!$brand) {
                return $this->error('品牌不存在', 404);
            }
            
            $name = trim((string)$params['name']);
            
            // 检查品牌名称是否被其他品牌占用
            $existing = SkBrand::where('brand_name', $name)
                ->where('id', '<>', $id)
                ->find();
            if ($existing) {
                return $this->error('品牌名称已存在', 400);
            }
            
            // 更新品牌数据（brand_name 是数据库实际字段，触发 isDirty('brand_name') 推队列）
            $brand->brand_name = $name;
            $brand->description = $params['description'] ?? '';
            $brand->logo = $params['logo'] ?? '';
            $brand->website = $params['website'] ?? '';
            $brand->sort = (int)($params['sort'] ?? $brand->sort);
            $brand->status = (int)($params['status'] ?? $brand->status);
            
            if ($brand->save()) {
                return $this->success([
                    'message' => '品牌更新成功'
                ]);
            }
            
            return $this->error('更新品牌失败', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除品牌
     */
    public function delete(int $id): Response
    {
        try {
            $brand = SkBrand::find($id);
            
            if (!$brand) {
                return $this->error('品牌不存在', 404);
            }
            
            // 检查是否有产品关联该品牌
            $productCount = \app\model\SkProduct::where('brand_id', $id)->count();
            if ($productCount > 0) {
                return $this->error("删除失败：还有 {$productCount} 个产品关联到该品牌，请先修改这些产品", 400);
            }
            
            if ($brand->delete()) {
                return $this->success([
                    'message' => '品牌删除成功'
                ]);
            }
            
            return $this->error('删除品牌失败', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除品牌
     */
    public function batchDelete(): Response
    {
        try {
            $params = $this->request->post();
            $ids = $params['ids'] ?? [];
            
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的品牌', 400);
            }
            
            $failed = [];
            $deleted = 0;
            
            foreach ($ids as $id) {
                $brand = SkBrand::find($id);
                if (!$brand) {
                    $failed[] = "品牌 ID {$id} 不存在";
                    continue;
                }
                
                // 检查关联产品
                $productCount = \app\model\SkProduct::where('brand_id', $id)->count();
                if ($productCount > 0) {
                    $failed[] = "品牌 {$brand->name} 有 {$productCount} 个关联产品，无法删除";
                    continue;
                }
                
                if ($brand->delete()) {
                    $deleted++;
                } else {
                    $failed[] = "品牌 {$brand->name} 删除失败";
                }
            }
            
            $message = "成功删除 {$deleted} 个品牌";
            if (!empty($failed)) {
                $message .= "；失败：" . implode("; ", $failed);
            }
            
            return $this->success([
                'deleted' => $deleted,
                'failed' => count($failed),
                'message' => $message
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
