<?php
/**
 * 电子元器件商城 - 分类与属性接口
 * 文件说明：提供分类树、分类详情与可筛选属性查询，供商品筛选与展示使用。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkCategory;
use app\model\SkCategoryAttribute;

class CategoryController extends BaseController
{
    /**
     * 根据父ID获取分类列表
     */
    public function index()
    {
        $parentId = $this->request->param('parent_id', 0);
        $lang = $this->getLangCode();
        $cacheKey = 'category_index_' . $lang . '_' . $parentId;

        $categoryList = \think\facade\Cache::remember($cacheKey, function () use ($parentId) {
            $categories = SkCategory::where('parent_id', $parentId)
                ->where('status', 1)
                ->order('sort', 'asc')
                ->order('id', 'asc')
                ->select();

            return $this->localizeCollection($categories, ['name']);
        }, 3600);

        return $this->success($categoryList);
    }

    /**
     * 获取完整分类树（三级分类结构）
     */
    public function tree()
    {
        $lang = $this->getLangCode();
        $cacheKey = 'category_tree_' . $lang;

        $categoryTree = \think\facade\Cache::remember($cacheKey, function () {
            $categories = SkCategory::where('status', 1)
                ->order('sort', 'asc')
                ->order('id', 'asc')
                ->select();

            $localizedCategories = $this->localizeCollection($categories, ['name']);
            return $this->buildCategoryTree($localizedCategories);
        }, 3600);

        return $this->success($categoryTree);
    }

    /**
     * 获取分类详情（含子分类）
     */
    public function read($id)
    {
        $category = SkCategory::where('status', 1)->find($id);
        if (!$category) {
            return $this->error('分类不存在');
        }

        $lang = $this->getLangCode();
        $cacheKey = 'category_read_' . $lang . '_' . $id;

        $categoryData = \think\facade\Cache::remember($cacheKey, function () use ($id) {
            $category = SkCategory::where('status', 1)->find($id);

            $children = SkCategory::where('parent_id', $id)
                ->where('status', 1)
                ->order('sort', 'asc')
                ->select();

            $childrenList = $children->map(function ($child) {
                $grandchildren = SkCategory::where('parent_id', $child->id)
                    ->where('status', 1)
                    ->order('sort', 'asc')
                    ->select();

                $grandchildrenList = $grandchildren->map(function ($grandchild) {
                    return [
                        'id' => $grandchild->id,
                        'name' => $grandchild->name,
                        'sort_order' => $grandchild->sort,
                        'level' => $grandchild->level,
                        'path' => $grandchild->path,
                        'has_children' => $grandchild->is_leaf == 0,
                    ];
                });

                return [
                    'id' => $child->id,
                    'name' => $child->name,
                    'sort_order' => $child->sort,
                    'level' => $child->level,
                    'path' => $child->path,
                    'has_children' => $child->is_leaf == 0,
                    'children' => $grandchildrenList,
                ];
            });

            // 收集所有需要翻译的分类数据
            $allCategories = [$category->toArray()];
            foreach ($childrenList as $child) {
                $allCategories[] = $child;
                if (!empty($child['children'])) {
                    foreach ($child['children'] as $grandchild) {
                        $allCategories[] = $grandchild;
                    }
                }
            }
            $localized = $this->localizeCollection($allCategories, ['name'], 'sk_category');
            $nameMap = array_column($localized, 'name', 'id');

            return [
                'id' => $category->id,
                'name' => $nameMap[$category->id] ?? $category->name,
                'parent_id' => $category->parent_id,
                'sort_order' => $category->sort,
                'level' => $category->level,
                'path' => $category->path,
                'has_children' => $category->is_leaf == 0,
                'children' => $childrenList->map(function ($child) use ($nameMap) {
                    return [
                        'id' => $child['id'],
                        'name' => $nameMap[$child['id']] ?? $child['name'],
                        'sort_order' => $child['sort_order'],
                        'level' => $child['level'],
                        'path' => $child['path'],
                        'has_children' => $child['has_children'],
                        'children' => !empty($child['children']) ? array_map(function ($grandchild) use ($nameMap) {
                            return [
                                'id' => $grandchild['id'],
                                'name' => $nameMap[$grandchild['id']] ?? $grandchild['name'],
                                'sort_order' => $grandchild['sort_order'],
                                'level' => $grandchild['level'],
                                'path' => $grandchild['path'],
                                'has_children' => $grandchild['has_children'],
                            ];
                        }, $child['children']->toArray()) : [],
                    ];
                })->toArray(),
            ];
        }, 3600);

        return $this->success($categoryData);
    }

    /**
     * 获取所有分类（平铺列表）
     */
    public function all()
    {
        $categories = SkCategory::where('status', 1)
            ->order('sort', 'asc')
            ->order('id', 'asc')
            ->select();

        $categoryList = $this->localizeCollection($categories, ['name']);

        return $this->success($categoryList);
    }

    /**
     * 获取指定分类的属性（用于产品筛选）
     */
    public function attributes($id)
    {
        $lang = $this->getLangCode();
        $cacheKey = 'category_attributes_' . $lang . '_' . $id;

        $formattedAttributes = \think\facade\Cache::remember($cacheKey, function () use ($id, $lang) {
            $attributes = SkCategoryAttribute::with('attribute')
                ->where('category_id', $id)
                ->where('is_filter', 1)
                ->order('sort_order', 'asc')
                ->select();

            if ($attributes->isEmpty()) {
                $parentId = SkCategory::where('id', $id)->value('parent_id');
                if ($parentId) {
                    $attributes = SkCategoryAttribute::with('attribute')
                        ->where('category_id', $parentId)
                        ->where('is_filter', 1)
                        ->order('sort_order', 'asc')
                        ->select();
                }
            }

            return $attributes->map(function ($item) use ($lang, $id) {
                $attributeData = $item->attribute;
                if (!$attributeData) {
                    return null;
                }

                $fieldValues = $attributeData->field_values;
                if (!is_array($fieldValues)) {
                    $fieldValues = json_decode($fieldValues, true) ?: [];
                }

                $attrName = $fieldValues['attr_name'] ?? $attributeData->title ?? ('属性' . $item->attribute_id);
                $attrCode = $fieldValues['code'] ?? $attributeData->code ?? ('attr_' . $item->attribute_id);

                if ($lang !== 'zh-CN') {
                    /** @var \app\service\I18nService $i18nService */
                    $i18nService = app(\app\service\I18nService::class);
                    $translated = $i18nService->mapItem(
                        ['id' => $attributeData->id, 'name' => $attrName],
                        'attribute',
                        $lang,
                        ['name']
                    );
                    $attrName = $translated['name'];
                }

                $availableValues = [];
                if ($attributeData->type === 'select') {
                    $values = Db::name('sk_model_param_val')
                        ->alias('mpv')
                        ->join('sk_product_models m', 'mpv.model_id = m.id')
                        ->where('mpv.param_id', $item->attribute_id)
                        ->where('m.category_id', $id)
                        ->field('DISTINCT mpv.value')
                        ->limit(100)
                        ->column('value');
                    $availableValues = array_values(array_unique(array_filter($values)));
                    
                    if (empty($availableValues)) {
                        $parentId = SkCategory::where('id', $id)->value('parent_id');
                        if ($parentId) {
                            $values = Db::name('sk_model_param_val')
                                ->alias('mpv')
                                ->join('sk_product_models m', 'mpv.model_id = m.id')
                                ->where('mpv.param_id', $item->attribute_id)
                                ->where('m.category_id', $parentId)
                                ->field('DISTINCT mpv.value')
                                ->limit(100)
                                ->column('value');
                            $availableValues = array_values(array_unique(array_filter($values)));
                        }
                    }
                }

                return [
                    'id' => $item->attribute_id,
                    'name' => $attrName,
                    'code' => $attrCode,
                    'type' => $attributeData->type,
                    'data_type' => $attributeData->data_type,
                    'unit' => $attributeData->unit,
                    'is_filter' => (bool) $item->is_filter,
                    'sort_order' => $item->sort_order,
                    'available_values' => $availableValues,
                ];
            });
        }, 3600);

        return $this->success($formattedAttributes);
    }

    /**
     * Build category tree recursively
     * @param array $categories 分类列表
     * @param int $parentId 父分类ID
     * @param int $level 分类层级
     * @return array
     */
    private function buildCategoryTree(array $categories, int $parentId = 0, int $level = 1): array
    {
        $tree = [];

        foreach ($categories as $category) {
            if ($category['parent_id'] === $parentId) {
                if ($level < 3) {
                    $children = $this->buildCategoryTree($categories, $category['id'], $level + 1);
                    if (!empty($children)) {
                        $category['children'] = $children;
                    }
                }

                $formattedCategory = [
                    'id' => $category['id'],
                    'name' => $category['name'],
                    'level' => $category['level'],
                    'parent_id' => $category['parent_id'],
                    'sort_order' => $category['sort'],
                    'path' => $category['path'],
                    'has_children' => $category['is_leaf'] == 0,
                ];

                if (isset($category['children'])) {
                    $formattedCategory['children'] = $category['children'];
                }

                $tree[] = $formattedCategory;
            }
        }

        return $tree;
    }
}
