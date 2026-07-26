<?php
/**
 * 电子元器件商城 - 后台规格管理控制器
 * 文件说明：管理产品规格的增删改查与校验，供后台商品编辑与维护使用。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProductSpecification;
use app\model\SkProduct;
use think\exception\ValidateException;
use think\facade\Log;

class SpecificationController extends BaseController
{
    /**
     * 获取规格列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkProductSpecification::where([]);

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('name|value', 'like', '%' . $keyword . '%');
        }

        $total = $query->count();
        $list = $query->order('sort_order', 'asc')
                      ->order('id', 'desc')
                      ->page($page, $limit)
                      ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取规格详情
     */
    public function read($id)
    {
        $specification = SkProductSpecification::find($id);

        if (!$specification) {
            return $this->error('规格不存在');
        }

        return $this->success($specification);
    }

    /**
     * 创建新规格
     */
    public function save()
    {
        try {
            $data = $this->request->param();
            
            // 验证必填字段
            if (empty($data['product_id']) || empty($data['name']) || empty($data['value'])) {
                return $this->error('产品ID、名称和值为必填项');
            }

            // 检查产品是否存在
            if (!SkProduct::find($data['product_id'])) {
                return $this->error('产品不存在');
            }

            $specification = SkProductSpecification::create($data);
            return $this->success($specification, '规格创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新规格
     */
    public function update($id)
    {
        try {
            $specification = SkProductSpecification::find($id);
            if (!$specification) {
                return $this->error('规格不存在');
            }

            $data = $this->request->param();

            // 检查产品ID变更
            if (!empty($data['product_id']) && $data['product_id'] != $specification['product_id']) {
                if (!SkProduct::find($data['product_id'])) {
                    return $this->error('产品不存在');
                }
            }

            $specification->save($data);
            return $this->success($specification, '规格更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除规格
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的规格');
            }
            SkProductSpecification::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除规格
     */
    public function delete($id)
    {
        try {
            $specification = SkProductSpecification::find($id);
            if (!$specification) {
                return $this->error('规格不存在');
            }

            $specification->delete();
            return $this->success(null, '规格删除成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 按商品获取规格
     */
    public function byProduct($productId)
    {
        $specifications = SkProductSpecification::where('product_id', $productId)
                                                 ->order('sort_order', 'asc')
                                                 ->select();

        return $this->success($specifications);
    }
}
