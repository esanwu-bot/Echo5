<?php
/**
 * 电子元器件商城 - 分类管理（后台）
 * 文件说明：管理产品分类，支持树形结构、增删改查，用于后台商品分类维护。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkCategory;
use app\model\SkProduct;
use app\model\SkProductModel;
use app\model\SkCategoryAttribute;
use app\model\SkCategoryAttributeValue;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Validate;
use think\facade\Log;

class CategoryController extends BaseController
{
    /**
     * 获取分类列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkCategory::where([]);

        if (isset($params['parent_id']) && $params['parent_id'] !== '') {
            $query->where('parent_id', $params['parent_id']);
        } else if (empty($params['name'])) {
            // 如果未提供搜索名称，默认为顶级分类
            $query->where('parent_id', 0);
        }

        if (!empty($params['name'])) {
            $query->where('name', 'like', '%' . $params['name'] . '%');
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('sort', 'asc')
                     ->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取分类树
     */
    public function tree()
    {
        $tree = $this->buildCategoryTree();
        return $this->success($tree);
    }

    /**
     * 获取分类详情
     */
    public function read($id)
    {
        $category = SkCategory::find($id);
        if (!$category) {
            return $this->error('分类不存在');
        }
        return $this->success($category);
    }

    /**
     * 创建新分类
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkCategory.save');

            // 检查父分类是否存在并设置层级和路径
            if (!empty($data['parent_id'])) {
                $parent = SkCategory::find($data['parent_id']);
                if (!$parent) {
                    return $this->error('父分类不存在');
                }
                
                // 设置层级（父层级 + 1）
                $data['level'] = $parent->level + 1;
                
                // 确保最大层级为3
                if ($data['level'] > 3) {
                    return $this->error('分类层级不能超过3层');
                }
                
                // 设置路径（父路径 + 当前ID占位符，创建后将更新）
                $data['path'] = $parent->path . '/' . $parent->id;
            } else {
                // 根分类
                $data['level'] = 1;
                $data['path'] = '';
            }

            // 先创建分类以获取ID
            $category = SkCategory::create($data);
            
            // 使用实际ID更新路径
            if ($category->parent_id > 0) {
                $category->path = $category->path . '/' . $category->id;
            } else {
                $category->path = (string)$category->id;
            }
            
            // 新分类设为叶子节点（添加子分类后会更新）
            $category->is_leaf = 1;
            $category->save();
            
            // 如有需要更新父分类的is_leaf状态
            if ($category->parent_id > 0) {
                $parent = SkCategory::find($category->parent_id);
                $parent->is_leaf = 0;
                $parent->save();
            }
            
            return $this->success($category, '分类创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新分类
     */
    public function update($id)
    {
        try {
            $category = SkCategory::find($id);
            if (!$category) {
                return $this->error('分类不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkCategory.update');

            // 检查父分类逻辑
            if (isset($data['parent_id'])) {
                if ($data['parent_id'] == $id) {
                    return $this->error('不能将分类自身设置为父分类');
                }
                
                // 检查父分类是否为子分类
                if ($data['parent_id'] && $this->isChildCategory($id, $data['parent_id'])) {
                    return $this->error('不能将子分类设置为父分类');
                }
                
                // 检查父分类是否存在
                if ($data['parent_id'] > 0) {
                    $parent = SkCategory::find($data['parent_id']);
                    if (!$parent) {
                        return $this->error('父分类不存在');
                    }
                    
                    // 设置层级（父层级 + 1）
                    $data['level'] = $parent->level + 1;
                } else {
                    $data['level'] = 1;
                }
                
                // 确保最大层级为3
                if (isset($data['level']) && $data['level'] > 3) {
                    return $this->error('分类层级不能超过3层');
                }
            }

            // 更新分类
            $category->save($data);
            
            // 更新该分类及其所有子分类的路径
            $this->updateCategoryPath($category);
            
            return $this->success($category, '分类更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 更新分类路径及其子分类路径
     */
    private function updateCategoryPath($category)
    {
        // 更新当前分类路径
        if ($category->parent_id > 0) {
            $parent = SkCategory::find($category->parent_id);
            $category->path = $parent->path . '/' . $category->id;
        } else {
            $category->path = (string)$category->id;
        }
        
        // 更新is_leaf状态
        $hasChildren = SkCategory::where('parent_id', $category->id)->count() > 0;
        $category->is_leaf = $hasChildren ? 0 : 1;
        $category->save();
        
        // 更新父分类的is_leaf状态
        if ($category->parent_id > 0) {
            $parent = SkCategory::find($category->parent_id);
            $parentHasChildren = SkCategory::where('parent_id', $parent->id)->count() > 0;
            $parent->is_leaf = $parentHasChildren ? 0 : 1;
            $parent->save();
        }
        
        // 更新子分类路径和层级
        $children = SkCategory::where('parent_id', $category->id)->select();
        foreach ($children as $child) {
            $child->level = $category->level + 1;
            $this->updateCategoryPath($child);
        }
    }

    /**
     * 删除分类
     */
    public function delete($id)
    {
        try {
            $category = SkCategory::find($id);
            if (!$category) {
                return $this->error('分类不存在');
            }

            // 检查是否存在子分类
            if (SkCategory::where('parent_id', $id)->count() > 0) {
                return $this->error('存在子分类，无法删除');
            }

            // 检查是否存在关联商品（sk_product.category_fk_id）
            if (SkProduct::where('category_fk_id', $id)->count() > 0) {
                return $this->error('存在关联商品，无法删除');
            }

            // 检查是否存在关联型号（sk_product_models.category_id）
            if (SkProductModel::where('category_id', $id)->count() > 0) {
                return $this->error('存在关联型号，无法删除');
            }

            // 检查是否存在分类属性配置（sk_category_attribute.category_id）
            if (SkCategoryAttribute::where('category_id', $id)->count() > 0) {
                return $this->error('存在分类属性配置，无法删除');
            }

            // 检查是否存在分类属性值（sk_category_attribute_values.category_id）
            if (SkCategoryAttributeValue::where('category_id', $id)->count() > 0) {
                return $this->error('存在分类属性值，无法删除');
            }

            $parentId = $category->parent_id;
            $category->delete();

            // 如有需要更新父分类的is_leaf状态
            if ($parentId > 0) {
                $parent = SkCategory::find($parentId);
                $parentHasChildren = SkCategory::where('parent_id', $parentId)->count() > 0;
                $parent->is_leaf = $parentHasChildren ? 0 : 1;
                $parent->save();
            }

            return $this->success(null, '分类删除成功');
        } catch (\Exception $e) {
            Log::error('删除分类失败: ' . $e->getMessage(), [
                'category_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->error('删除分类失败：' . $e->getMessage());
        }
    }

    /**
     * 构建分类树结构
     */
    private function buildCategoryTree($parentId = 0)
    {
        $categories = SkCategory::where('parent_id', $parentId)
            ->order('sort', 'asc')
            ->select();

        $tree = [];
        foreach ($categories as $category) {
            $node = $category->toArray();
            $children = $this->buildCategoryTree($category->id);
            if ($children) {
                $node['children'] = $children;
            }
            $tree[] = $node;
        }
        return $tree;
    }

    /**
     * 检查分类是否为另一分类的子分类
     */
    private function isChildCategory($parentId, $childId)
    {
        $children = SkCategory::where('parent_id', $parentId)->column('id');
        if (in_array($childId, $children)) {
            return true;
        }
        foreach ($children as $child) {
            if ($this->isChildCategory($child, $childId)) {
                return true;
            }
        }
        return false;
    }
}