<?php
/**
 * 电子元器件商城 - 参数化搜索服务
 * 文件说明：处理基于 sk_product_models（型号/SKU）的参数化筛选与搜索，
 *           统一替代旧版基于 sk_product 表的硬编码字段筛选逻辑。
 */

namespace app\service;

use think\facade\Db;

/**
 * 参数化搜索服务
 *
 * 基于 sk_product_models（型号/SKU）+ sk_model_param_val（参数值）实现统一参数化筛选。
 * 替代旧版 ParametricSearchController@getProducts 与 ProductFilterController 中的硬编码筛选。
 *
 * @package app\service
 */
class ParametricSearchService
{
    /**
     * 统一参数筛选查询
     *
     * @access public
     * @param array $params 筛选参数
     *   [
     *     'category_id' => int,
     *     'keyword' => string,
     *     'attribute_filters' => [['attribute_id' => int, 'values' => [], 'min' => float, 'max' => float, 'logic' => 'and'|'or']],
     *     'brand_ids' => [],
     *     'in_stock' => bool,
     *     'page' => int,
     *     'page_size' => int,
     *     'sort_field' => string,
     *     'sort_order' => 'asc'|'desc',
     *   ]
     * @return array ['models' => [], 'pagination' => [...]]
     */
    public function search(array $params): array
    {
        $categoryId = (int)($params['category_id'] ?? 0);
        $keyword = trim((string)($params['keyword'] ?? ''));
        $page = max(1, intval($params['page'] ?? 1));
        $pageSize = min(100, max(10, intval($params['page_size'] ?? 20)));
        $brandIds = $params['brand_ids'] ?? [];
        $inStockOnly = !empty($params['in_stock']);
        $sortField = $params['sort_field'] ?? 'id';
        $sortOrder = strtolower($params['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $attributeFilters = [];

        if (!empty($params['attribute_filters'])) {
            $decoded = is_string($params['attribute_filters'])
                ? json_decode($params['attribute_filters'], true)
                : $params['attribute_filters'];
            if (is_array($decoded)) {
                $attributeFilters = $decoded;
            }
        }

        // 基础查询：型号为主表
        $query = Db::name('sk_product_models')
            ->alias('m')
            ->leftJoin('sk_brands b', 'm.brand_id = b.id')
            ->leftJoin('sk_category c', 'm.category_id = c.id');

        // 分类筛选
        if ($categoryId > 0) {
            $query->where('m.category_id', $categoryId);
        }

        // 关键词搜索
        if (!empty($keyword)) {
            $query->where(function ($q) use ($keyword) {
                $q->whereOr([
                    ['m.model_code', 'like', "%{$keyword}%"],
                    ['m.model_name', 'like', "%{$keyword}%"],
                    ['m.description', 'like', "%{$keyword}%"],
                ]);
            });
        }

        // 品牌筛选
        if (!empty($brandIds) && is_array($brandIds)) {
            $query->whereIn('m.brand_id', $brandIds);
        }

        // 仅显示有货
        if ($inStockOnly) {
            $query->where('m.stock', '>', 0);
        }

        // 属性筛选：优先 sk_model_param_val，旧表 sk_product_attribute 作为 fallback
        if (!empty($attributeFilters)) {
            foreach ($attributeFilters as $filter) {
                $attributeId = (int)($filter['attribute_id'] ?? 0);
                if ($attributeId <= 0) {
                    continue;
                }

                $values = $filter['values'] ?? [];
                $min = $filter['min'] ?? null;
                $max = $filter['max'] ?? null;
                $logic = strtolower($filter['logic'] ?? 'or');

                $bindings = $this->buildParamValueBindings($values, $min, $max, $logic);
                $condition = $this->buildParamValueCondition($values, $min, $max, $logic, 'mpv');
                $paCondition = $this->buildParamValueCondition($values, $min, $max, $logic, 'pa');

                // 优先匹配 sk_model_param_val (新表)，OR fallback 到 sk_product_attribute (旧表)
                $combinedSql = "(
                    EXISTS (
                        SELECT 1 FROM sk_model_param_val mpv
                        WHERE mpv.model_id = m.id
                        AND mpv.param_id = ?
                        {$condition}
                    )
                    OR EXISTS (
                        SELECT 1 FROM sk_product_attribute pa
                        WHERE pa.attribute_id = ?
                        {$paCondition}
                        AND EXISTS (
                            SELECT 1 FROM sk_product p WHERE p.id = pa.product_id AND p.series_id = m.series_id
                        )
                    )
                )";

                $combinedBindings = array_merge(
                    [$attributeId],
                    $bindings,
                    [$attributeId],
                    $bindings
                );

                if ($logic === 'and') {
                    $query->whereRaw($combinedSql, $combinedBindings);
                } else {
                    $query->whereRaw($combinedSql, $combinedBindings, 'or');
                }
            }
        }

        $total = $query->count();

        // 排序
        $allowedSortFields = ['id', 'model_code', 'model_name', 'stock', 'pricing_unit_price', 'created_at'];
        if (in_array($sortField, $allowedSortFields)) {
            $query->order("m.{$sortField}", $sortOrder);
        } else {
            $query->order('m.id', 'desc');
        }

        $models = $query
            ->field('m.*, b.brand_name as brand_name, c.name as category_name')
            ->page($page, $pageSize)
            ->select()
            ->toArray();

        // 对每个型号获取关联参数
        foreach ($models as &$model) {
            $model['params'] = Db::name('sk_model_param_val')
                ->alias('mpv')
                ->leftJoin('sk_attribute a', 'mpv.param_id = a.id')
                ->where('mpv.model_id', $model['id'])
                ->field('a.name as param_name, mpv.value, mpv.value_numeric, a.unit')
                ->select()
                ->toArray();
        }

        return [
            'models' => $models,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
                'total_pages' => ceil($total / $pageSize),
            ],
        ];
    }

    /**
     * 构建参数值筛选条件片段
     *
     * @access private
     * @param array $values 筛选值列表
     * @param mixed $min 数值最小值
     * @param mixed $max 数值最大值
     * @param string $logic 逻辑(and|or)
     * @param string $alias 表别名(默认 mpv)
     * @return string SQL 条件片段
     */
    private function buildParamValueCondition(array $values, $min, $max, string $logic, string $alias = 'mpv'): string
    {
        $conditions = [];
        if (!empty($values)) {
            if ($logic === 'and') {
                foreach ($values as $v) {
                    $conditions[] = "AND {$alias}.value = ?";
                }
            } else {
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $conditions[] = "AND {$alias}.value IN ({$placeholders})";
            }
        }
        if ($min !== null && $min !== '') {
            $conditions[] = "AND {$alias}.value_numeric >= ?";
        }
        if ($max !== null && $max !== '') {
            $conditions[] = "AND {$alias}.value_numeric <= ?";
        }
        return implode(' ', $conditions);
    }

    /**
     * 构建参数值筛选绑定参数
     *
     * @access private
     * @param array $values 筛选值列表
     * @param mixed $min 数值最小值
     * @param mixed $max 数值最大值
     * @param string $logic 逻辑(and|or)
     * @return array 绑定参数数组
     */
    private function buildParamValueBindings(array $values, $min, $max, string $logic): array
    {
        $bindings = [];
        if (!empty($values)) {
            $bindings = $values;
        }
        if ($min !== null && $min !== '') {
            $bindings[] = $min;
        }
        if ($max !== null && $max !== '') {
            $bindings[] = $max;
        }
        return $bindings;
    }

    /**
     * 获取型号的参数值列表
     *
     * @access public
     * @param int $modelId 型号ID
     * @return array 参数值列表
     */
    public function getModelParams(int $modelId): array
    {
        return Db::name('sk_model_param_val')
            ->alias('mpv')
            ->leftJoin('sk_attribute a', 'mpv.param_id = a.id')
            ->where('mpv.model_id', $modelId)
            ->field('a.id as param_id, a.name as param_name, a.unit, mpv.value, mpv.value_numeric')
            ->select()
            ->toArray();
    }

    /**
     * 获取分类下的所有可用参数筛选选项
     *
     * 替代旧版 ParametricSearchController@getFilterOptions 中的硬编码筛选器。
     *
     * @access public
     * @param int $categoryId 分类ID
     * @return array 筛选选项列表
     */
    public function getFilterOptions(int $categoryId): array
    {
        // 1. 动态参数筛选器（来自 sk_attribute + sk_category_attribute）
        $dynamicFilters = $this->getDynamicFilterOptions($categoryId);

        // 2. 静态筛选器（品牌、价格、库存等）
        $staticFilters = $this->getStaticFilterOptions($categoryId);

        return array_merge($dynamicFilters, $staticFilters);
    }

    /**
     * 获取动态参数筛选选项（可筛选属性维度的筛选器）
     *
     * @access private
     * @param int $categoryId 分类ID
     * @return array 动态筛选选项
     */
    private function getDynamicFilterOptions(int $categoryId): array
    {
        $attributes = Db::name('sk_category_attribute')
            ->alias('ca')
            ->join('sk_attribute a', 'ca.attribute_id = a.id')
            ->where('ca.category_id', $categoryId)
            ->where('ca.is_filter', 1)
            ->where('a.status', 1)
            ->field('a.id, a.name, a.code, a.type, a.data_type, a.unit, a.options')
            ->select()
            ->toArray();

        if (empty($attributes)) {
            $parentId = Db::name('sk_category')->where('id', $categoryId)->value('parent_id');
            if ($parentId) {
                $attributes = Db::name('sk_category_attribute')
                    ->alias('ca')
                    ->join('sk_attribute a', 'ca.attribute_id = a.id')
                    ->where('ca.category_id', $parentId)
                    ->where('ca.is_filter', 1)
                    ->where('a.status', 1)
                    ->field('a.id, a.name, a.code, a.type, a.data_type, a.unit, a.options')
                    ->select()
                    ->toArray();
            }
        }

        $result = [];
        foreach ($attributes as $attr) {
            $item = [
                'id' => $attr['id'],
                'name' => $attr['name'],
                'code' => $attr['code'],
                'type' => $attr['type'],
                'data_type' => $attr['data_type'],
                'unit' => $attr['unit'],
            ];

            if ($attr['type'] === 'range' && $attr['data_type'] === 'number') {
                $range = Db::name('sk_model_param_val')
                    ->alias('mpv')
                    ->join('sk_product_models m', 'mpv.model_id = m.id')
                    ->where('mpv.param_id', $attr['id'])
                    ->where('m.category_id', $categoryId)
                    ->field(
                        'MIN(mpv.value_numeric) as min_value',
                        'MAX(mpv.value_numeric) as max_value'
                    )
                    ->find();
                $item['value_range'] = [
                    'min' => $range['min_value'] ?? 0,
                    'max' => $range['max_value'] ?? 0,
                ];
                
                if (($item['value_range']['min'] ?? 0) == 0 && ($item['value_range']['max'] ?? 0) == 0) {
                    $parentId = Db::name('sk_category')->where('id', $categoryId)->value('parent_id');
                    if ($parentId) {
                        $range = Db::name('sk_model_param_val')
                            ->alias('mpv')
                            ->join('sk_product_models m', 'mpv.model_id = m.id')
                            ->where('mpv.param_id', $attr['id'])
                            ->where('m.category_id', $parentId)
                            ->field(
                                'MIN(mpv.value_numeric) as min_value',
                                'MAX(mpv.value_numeric) as max_value'
                            )
                            ->find();
                        $item['value_range'] = [
                            'min' => $range['min_value'] ?? 0,
                            'max' => $range['max_value'] ?? 0,
                        ];
                    }
                }
            } else {
                $values = Db::name('sk_model_param_val')
                    ->alias('mpv')
                    ->join('sk_product_models m', 'mpv.model_id = m.id')
                    ->where('mpv.param_id', $attr['id'])
                    ->where('m.category_id', $categoryId)
                    ->field('DISTINCT mpv.value')
                    ->limit(100)
                    ->column('value');
                $item['available_values'] = array_values(array_unique(array_filter($values)));
                
                if (empty($item['available_values'])) {
                    $parentId = Db::name('sk_category')->where('id', $categoryId)->value('parent_id');
                    if ($parentId) {
                        $values = Db::name('sk_model_param_val')
                            ->alias('mpv')
                            ->join('sk_product_models m', 'mpv.model_id = m.id')
                            ->where('mpv.param_id', $attr['id'])
                            ->where('m.category_id', $parentId)
                            ->field('DISTINCT mpv.value')
                            ->limit(100)
                            ->column('value');
                        $item['available_values'] = array_values(array_unique(array_filter($values)));
                    }
                }
            }

            $result[] = $item;
        }

        return $result;
    }

    /**
     * 获取静态筛选选项（品牌、价格等非属性维度的筛选器）
     *
     * @access private
     * @param int $categoryId 分类ID
     * @return array 静态筛选选项
     */
    private function getStaticFilterOptions(int $categoryId): array
    {
        $result = [];

        // 品牌选项
        $brands = Db::name('sk_product_models')
            ->alias('m')
            ->join('sk_brands b', 'm.brand_id = b.id')
            ->where('m.category_id', $categoryId)
            ->where('m.brand_id', '>', 0)
            ->field('b.id, b.brand_name as name, COUNT(m.id) as model_count')
            ->group('b.id')
            ->order('b.brand_name', 'asc')
            ->select()
            ->toArray();

        if (!empty($brands)) {
            $result['brands'] = [
                'name' => '品牌',
                'code' => 'brands',
                'type' => 'checkbox',
                'data_type' => 'string',
                'options' => $brands,
            ];
        }

        return $result;
    }
}
