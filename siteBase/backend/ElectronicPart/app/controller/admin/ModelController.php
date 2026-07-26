<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProductModel;
use app\model\SkBrand;
use app\model\SkCategory;
use app\model\SkModelSpecification;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class ModelController extends BaseController
{
    /**
     * 获取型号列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkProductModel::with(['brand', 'category', 'series']);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('model_code|model_name|description', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['brand_id'])) {
            $query->where('brand_id', $params['brand_id']);
        }

        if (!empty($params['category_id'])) {
            $query->where('category_id', $params['category_id']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取型号详情
     */
    public function read($id)
    {
        $model = SkProductModel::with(['brand', 'category', 'series', 'specifications', 'products'])->find($id);
        if (!$model) {
            return $this->error('Model not found');
        }
        return $this->success($model);
    }

    /**
     * 创建新型号
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());
            
            // 验证必填字段
            if (empty($data['model_code'])) {
                return $this->error('Model code is required');
            }
            if (empty($data['model_name'])) {
                return $this->error('Model name is required');
            }
            
            // 检查型号代码是否已存在
            if (SkProductModel::where('model_code', $data['model_code'])->find()) {
                return $this->error('Model code already exists');
            }
            
            // 验证品牌
            if (!empty($data['brand_id'])) {
                if (!SkBrand::find($data['brand_id'])) {
                    return $this->error('Brand not found');
                }
            }
            
            // 验证分类
            if (!empty($data['category_id'])) {
                if (!SkCategory::find($data['category_id'])) {
                    return $this->error('Category not found');
                }
            }
            
            $specifications = $data['specifications'] ?? [];
            unset($data['specifications']);
            
            // 设置默认值
            $data['status'] = $data['status'] ?? 1;
            $data['sort'] = $data['sort'] ?? 0;
            
            $model = SkProductModel::create($data);
            
            // 如果提供了规格则保存
            if (!empty($specifications)) {
                $specData = [];
                foreach ($specifications as $spec) {
                    $specData[] = [
                        'model_id' => $model->id,
                        'spec_name' => $spec['spec_name'] ?? '',
                        'spec_value' => $spec['spec_value'] ?? '',
                        'sort_order' => $spec['sort_order'] ?? 0,
                    ];
                }
                if (!empty($specData)) {
                    (new SkModelSpecification)->saveAll($specData);
                }
            }
            
            Db::commit();
            return $this->success($model, 'Model created successfully');
            
        } catch (ValidateException $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新型号
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $model = SkProductModel::find($id);
            if (!$model) {
                return $this->error('Model not found');
            }
            
            $data = $this->filterDeprecatedLangFields($this->request->param());
            
            // 检查型号代码是否已存在（排除当前型号）
            if (!empty($data['model_code']) && 
                $data['model_code'] !== $model->model_code && 
                SkProductModel::where('model_code', $data['model_code'])->find()) {
                return $this->error('Model code already exists');
            }
            
            // 验证品牌
            if (!empty($data['brand_id'])) {
                if (!SkBrand::find($data['brand_id'])) {
                    return $this->error('Brand not found');
                }
            }
            
            // 验证分类
            if (!empty($data['category_id'])) {
                if (!SkCategory::find($data['category_id'])) {
                    return $this->error('Category not found');
                }
            }
            
            $specifications = $data['specifications'] ?? null;
            unset($data['specifications']);
            
            $model->save($data);
            
            // 如果提供了规格则更新
            if ($specifications !== null) {
                // 删除现有规格
                SkModelSpecification::where('model_id', $id)->delete();
                
                // 添加新规格
                if (!empty($specifications)) {
                    $specData = [];
                    foreach ($specifications as $spec) {
                        $specData[] = [
                            'model_id' => $id,
                            'spec_name' => $spec['spec_name'] ?? '',
                            'spec_value' => $spec['spec_value'] ?? '',
                            'sort_order' => $spec['sort_order'] ?? 0,
                        ];
                    }
                    if (!empty($specData)) {
                        (new SkModelSpecification)->saveAll($specData);
                    }
                }
            }
            
            Db::commit();
            return $this->success($model, 'Model updated successfully');
            
        } catch (ValidateException $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除型号
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的型号');
            }
            SkProductModel::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除型号
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $model = SkProductModel::find($id);
            if (!$model) {
                return $this->error('Model not found');
            }
            
            // 检查型号是否关联了任何商品
            if ($model->products()->count() > 0) {
                return $this->error('Cannot delete model that is associated with products');
            }
            
            // 删除规格
            SkModelSpecification::where('model_id', $id)->delete();
            
            // 删除型号
            $model->delete();
            
            Db::commit();
            return $this->success([], 'Model deleted successfully');
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 按品牌获取型号
     */
    public function getByBrand($brandId)
    {
        $models = SkProductModel::where('brand_id', $brandId)
                               ->where('status', 1)
                               ->order('id', 'desc')
                               ->select();
        
        return $this->success($models);
    }

    /**
     * 按分类获取型号
     */
    public function getByCategory($categoryId)
    {
        $models = SkProductModel::where('category_id', $categoryId)
                               ->where('status', 1)
                               ->order('id', 'desc')
                               ->select();
        
        return $this->success($models);
    }
}