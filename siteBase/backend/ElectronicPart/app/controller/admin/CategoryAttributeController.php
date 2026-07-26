<?php
/**
 * 电子元器件商城 - 分类属性管理（后台）
 * 文件说明：管理分类与其可筛选属性，提供后台维护与前端筛选数据接口。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkCategoryAttribute;
use app\model\SkCategory;
use app\model\SkAttribute;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Validate;
use think\facade\Log;

class CategoryAttributeController extends BaseController
{
    /**
     * 获取分类属性列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        $categoryId = $params['category_id'] ?? 0;
        
        $query = SkCategoryAttribute::with(['category', 'attribute']);
        
        if ($categoryId > 0) {
            $query->where('category_id', $categoryId);
        }
        
        $total = $query->count();
        $list = $query->order('sort_order', 'asc')
                     ->order('create_time', 'desc')
                     ->page($page, $limit)
                     ->select();
        
        return $this->paginate($list, $total, $page, $limit);
    }
    
    /**
     * 获取指定分类的属性
     */
    public function getCategoryAttributes($categoryId)
    {
        // 1. Find the category to start with
        $category = Db::table('sk_category')->where('id', $categoryId)->find();
        if (!$category) {
            return $this->error('Category not found');
        }

        // 2. Build the inheritance chain (bottom-up)
        $categoryIds = [(int)$categoryId];
        $currParentId = (int)$category['parent_id'];
        
        // 安全计数器，防止数据损坏时陷入无限循环
        $safety = 0;
        while ($currParentId > 0 && $safety < 10) {
            $categoryIds[] = $currParentId;
            $parent = Db::table('sk_category')->where('id', $currParentId)->find();
            if ($parent) {
                $currParentId = (int)$parent['parent_id'];
            } else {
                $currParentId = 0;
            }
            $safety++;
        }
        
        // 同时检查path字段作为备用/替代方案
        if (!empty($category['path'])) {
            $pathIds = explode('/', $category['path']);
            foreach ($pathIds as $pid) {
                if (!empty($pid) && is_numeric($pid)) {
                    $categoryIds[] = (int)$pid;
                }
            }
        }
        
        $categoryIds = array_unique($categoryIds);

        // 3. Fetch all attribute associations for these categories
        // 按sort_order排序。注意：如需让子分类设置覆盖父分类设置，
        // 则需要更复杂的逻辑。目前先收集全部。
        $associations = Db::table('sk_category_attribute')
                          ->whereIn('category_id', $categoryIds)
                          ->order('sort_order', 'asc')
                          ->select();

        $results = [];
        $seenAttributeIds = [];

        foreach ($associations as $assoc) {
            $attrId = (int)$assoc['attribute_id'];
            if ($attrId > 0 && !in_array($attrId, $seenAttributeIds)) {
                // 获取属性定义
                $attribute = Db::table('sk_attribute')->where('id', $attrId)->find();
                if ($attribute) {
                    // 标准化属性数据（JSON字段）
                    if (!empty($attribute['options'])) {
                        $attribute['options'] = json_decode($attribute['options'], true);
                    } else {
                        $attribute['options'] = [];
                    }
                    
                    $assoc['attribute'] = $attribute;
                    $results[] = $assoc;
                    $seenAttributeIds[] = $attrId;
                }
            }
        }
        
        return $this->success($results);
    }
    
    /**
     * 创建分类与属性的关联
     */
    public function save()
    {
        try {
            $data = $this->request->param();
            
            // 验证数据
            $validate = Validate::rule([
                'category_id' => 'require|integer|gt:0',
                'attribute_id' => 'require|integer|gt:0',
                'is_required' => 'in:0,1',
                'is_filter' => 'in:0,1',
                'sort_order' => 'integer|egt:0'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            // 检查关联是否已存在
            $existing = SkCategoryAttribute::where('category_id', $data['category_id'])
                                          ->where('attribute_id', $data['attribute_id'])
                                          ->find();
            
            if ($existing) {
                return $this->error('This attribute is already associated with the category');
            }
            
            $categoryAttribute = SkCategoryAttribute::create($data);
            
            return $this->success($categoryAttribute, 'Category attribute relationship created successfully');
            
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新分类与属性的关联
     */
    public function update($id)
    {
        try {
            $categoryAttribute = SkCategoryAttribute::find($id);
            
            if (!$categoryAttribute) {
                return $this->error('Category attribute relationship not found');
            }
            
            $data = $this->request->param();
            
            // 验证数据
            $validate = Validate::rule([
                'is_required' => 'in:0,1',
                'is_filter' => 'in:0,1',
                'sort_order' => 'integer|egt:0'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            $categoryAttribute->save($data);
            
            return $this->success($categoryAttribute, 'Category attribute relationship updated successfully');
            
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 删除分类与属性的关联
     */
    public function delete($id)
    {
        try {
            $categoryAttribute = SkCategoryAttribute::find($id);
            
            if (!$categoryAttribute) {
                return $this->error('Category attribute relationship not found');
            }
            
            $categoryAttribute->delete();
            
            return $this->success(null, 'Category attribute relationship deleted successfully');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 批量向分类添加属性
     */
    public function batchAdd()
    {
        try {
            $data = $this->request->param();
            
            // 验证数据
            $validate = Validate::rule([
                'category_id' => 'require|integer|gt:0',
                'attribute_ids' => 'require|array|min:1',
                'attribute_ids.*' => 'integer|gt:0'
            ]);
            
            if (!$validate->check($data)) {
                return $this->error($validate->getError());
            }
            
            $categoryId = $data['category_id'];
            $attributeIds = $data['attribute_ids'];
            
            // 检查现有关联
            $existing = SkCategoryAttribute::where('category_id', $categoryId)
                                          ->where('attribute_id', 'in', $attributeIds)
                                          ->column('attribute_id');
            
            if (!empty($existing)) {
                return $this->error('Some attributes are already associated with the category: ' . implode(', ', $existing));
            }
            
            // 批量插入
            $insertData = [];
            foreach ($attributeIds as $attributeId) {
                $insertData[] = [
                    'category_id' => $categoryId,
                    'attribute_id' => $attributeId,
                    'is_required' => 0,
                    'is_filter' => 0,
                    'sort_order' => 0
                ];
            }
            
            SkCategoryAttribute::insertAll($insertData);
            
            return $this->success(null, 'Attributes added to category successfully');
            
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取分类可用的属性（尚未关联）
     */
    public function getAvailableAttributes($categoryId)
    {
        // 获取已关联到该分类的所有属性ID
        $associatedAttributeIds = SkCategoryAttribute::where('category_id', $categoryId)
                                                   ->column('attribute_id');
        
        // 获取尚未关联的所有属性
        $availableAttributes = SkAttribute::where('status', 1)
            ->where(function($query) use ($associatedAttributeIds) {
                if (!empty($associatedAttributeIds)) {
                    $query->where('id', 'not in', $associatedAttributeIds);
                }
            })
            ->order('sort_order', 'asc')
            ->order('id', 'asc')
            ->select();
        
        // 格式化属性以供前端使用
        $formattedAttributes = $availableAttributes->map(function($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'code' => $item->code,
                'type' => $item->type,
                'data_type' => $item->data_type,
                'unit' => $item->unit,
                'status' => $item->status
            ];
        });
        
        return $this->success($formattedAttributes);
    }
    
    /**
     * 删除分类下的所有属性
     */
    public function deleteByCategory()
    {
        try {
            $data = $this->request->param();
            $categoryId = $data['category_id'];
            
            if (empty($categoryId)) {
                return $this->error('Category ID is required');
            }
            
            // 删除该分类下的所有属性
            SkCategoryAttribute::where('category_id', $categoryId)->delete();
            
            return $this->success(null, 'Category attributes deleted successfully');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}