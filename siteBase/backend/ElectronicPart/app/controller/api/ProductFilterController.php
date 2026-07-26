<?php
/**
 * 电子元器件商城 - 产品筛选接口
 * 文件说明：提供针对分类的可筛选属性、属性值与筛选结果查询，供前端产品筛选组件使用。
 *
 * @deprecated 2.0 请使用 ParametricSearchController (POST /api/v1/parametric-search) 替代
 *             此控制器基于 sk_product（产品级）筛选，硬编码了多个字段。
 *             新方案基于 sk_product_models（型号级），通过 sk_model_param_val 统一筛选，
 *             详见 ParametricSearchService。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\Product;
use app\model\ProductAttribute;
use app\model\Attribute;
use app\model\CategoryAttribute;
use app\model\Brand;
use app\model\Category;
use app\service\ParametricSearchService;
use think\facade\Db;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

class ProductFilterController extends BaseController
{
    /**
     * 获取分类的可筛选属性及其可用值
     * GET /api/products/categories/{categoryId}/attributes
     *
     * @deprecated 2.0 请使用 GET /api/v1/parametric-search/filters/:categoryId 替代
     */
    public function getCategoryAttributes(int $categoryId): Response
    {
        try {
            // 验证分类是否存在
            $category = Category::find($categoryId);
            if (!$category) {
                return $this->error('分类不存在', 404);
            }

            $lang = $this->getLangCode();
            $cacheKey = 'productFilter_getCategoryAttributes_' . $categoryId . '_' . $lang;

            $data = Cache::remember($cacheKey, function () use ($categoryId, $category) {
                // 委托给 ParametricSearchService 获取筛选选项（基于 sk_model_param_val）
                $service = app(ParametricSearchService::class);
                $filterOptions = $service->getFilterOptions($categoryId);

                // 提取动态属性筛选器（排除 brands 等静态筛选器）
                $attributes = array_filter($filterOptions, function ($item) {
                    return is_array($item) && isset($item['code']) && $item['code'] !== 'brands';
                });
                $attributes = array_values($attributes);

                // 应用多语言翻译到属性名称
                $attributes = $this->localizeCollection($attributes, ['name'], 'sk_attribute');

                // 应用多语言翻译到分类名称
                $categoryData = $this->localizeItem($category, ['name'], 'sk_category');

                return [
                    'category' => [
                        'id' => $categoryData['id'],
                        'name' => $categoryData['name'],
                        'parent_id' => $categoryData['parent_id']
                    ],
                    'attributes' => $attributes
                ];
            }, 3600);

            return $this->success($data);

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取分类的可用品牌列表
     * GET /api/products/categories/{categoryId}/brands
     *
     * @deprecated 2.0 请使用 GET /api/v1/parametric-search/filters/:categoryId 替代
     */
    public function getCategoryBrands(int $categoryId): Response
    {
        try {
            $lang = $this->getLangCode();
            $cacheKey = 'productFilter_getCategoryBrands_' . $categoryId . '_' . $lang;

            $data = Cache::remember($cacheKey, function () use ($categoryId, $lang) {
                // 委托给 ParametricSearchService 获取品牌列表（基于 sk_product_models）
                $service = app(ParametricSearchService::class);
                $filterOptions = $service->getFilterOptions($categoryId);

                $brands = [];
                if (!empty($filterOptions['brands']['options'])) {
                    $brands = $filterOptions['brands']['options'];
                }

                // 应用品牌名称多语言翻译
                if ($lang !== 'zh-CN' && !empty($brands)) {
                    $i18nService = app(\app\service\I18nService::class);
                    $brandIds = array_column($brands, 'id');
                    $translations = $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name']);
                    foreach ($brands as &$brand) {
                        $bid = $brand['id'];
                        if (!empty($translations[$bid]['brand_name'])) {
                            $brand['name'] = $translations[$bid]['brand_name'];
                        }
                    }
                }

                return [
                    'brands' => $brands,
                    'total' => count($brands)
                ];
            }, 3600);

            return $this->success($data);

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 产品筛选接口
     * POST /api/products/filter
     *
     * @deprecated 2.0 请使用 POST /api/v1/parametric-search（unifiedSearch）替代
     *             此方法基于 sk_product（产品级），通过 sk_product_attribute 筛选。
     *             新方法基于 sk_product_models（型号级），通过 sk_model_param_val + sk_attribute 统一筛选。
     */
    public function filter(): Response
    {
        try {
            $params = $this->request->post();

            // 转换为 ParametricSearchService 参数格式
            $serviceParams = [
                'category_id' => $params['category_id'] ?? 0,
                'keyword' => $params['keyword'] ?? '',
                'brand_ids' => $params['brand_ids'] ?? [],
                'in_stock' => false,
                'page' => max(1, intval($params['page'] ?? 1)),
                'page_size' => min(100, max(10, intval($params['page_size'] ?? 20))),
                'sort_field' => $params['sort_by'] ?? 'id',
                'sort_order' => strtolower($params['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc',
            ];

            // 转换属性筛选参数
            if (!empty($params['attributes']) && is_array($params['attributes'])) {
                $attributeFilters = [];
                foreach ($params['attributes'] as $attr) {
                    $filter = [
                        'attribute_id' => $attr['attribute_id'] ?? 0,
                        'logic' => $attr['logic'] ?? 'or',
                    ];
                    if (isset($attr['values']) && is_array($attr['values'])) {
                        $filter['values'] = $attr['values'];
                    }
                    if (isset($attr['min'])) {
                        $filter['min'] = $attr['min'];
                    }
                    if (isset($attr['max'])) {
                        $filter['max'] = $attr['max'];
                    }
                    $attributeFilters[] = $filter;
                }
                $serviceParams['attribute_filters'] = $attributeFilters;
            }

            $service = app(ParametricSearchService::class);
            $result = $service->search($serviceParams);

            // 附加 deprecation 信息
            $result['_deprecation'] = 'This endpoint is deprecated. Use POST /api/v1/parametric-search (unifiedSearch) instead.';

            return $this->success($result);

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取产品的所有属性
     */
    private function getProductAttributes(int $productId): array
    {
        $attributes = Db::name('sk_product_attribute')
            ->alias('pa')
            ->join('sk_attribute a', 'pa.attribute_id = a.id')
            ->where('pa.product_id', $productId)
            ->field('a.name, a.code, a.unit, pa.attribute_value, pa.numeric_value')
            ->select()
            ->toArray();

        $result = [];
        foreach ($attributes as $attr) {
            $result[$attr['code']] = [
                'name' => $attr['name'],
                'value' => $attr['attribute_value'],
                'numeric_value' => $attr['numeric_value'],
                'unit' => $attr['unit']
            ];
        }

        return $result;
    }

    /**
     * 获取分类树
     * GET /api/products/categories/tree
     */
    public function getCategoryTree(): Response
    {
        try {
            $langCode = $this->getLangCode();
            $cacheKey = 'productFilter_getCategoryTree_' . $langCode;
            
            $data = Cache::remember($cacheKey, function() use ($langCode) {
                $categories = Db::name('sk_category')
                    ->where('status', 1)
                    ->order('sort', 'asc')
                    ->order('id', 'asc')
                    ->select()
                    ->toArray();

                // 多语言映射：非中文时批量翻译 name 字段
                if ($langCode !== 'zh-CN' && !empty($categories)) {
                    /** @var \app\service\I18nService $i18nService */
                    $i18nService = app(\app\service\I18nService::class);
                    $categories = $i18nService->mapData($categories, 'category', $langCode, ['name']);
                }

                // 构建树形结构
                $tree = $this->buildTree($categories, 0);

                return [
                    'categories' => $tree
                ];
            }, 3600);

            return $this->success($data);

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 构建分类树
     */
    private function buildTree(array $categories, int $parentId = 0): array
    {
        $tree = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildTree($categories, $category['id']);
                
                $node = [
                    'id' => $category['id'],
                    'name' => $category['name'],
                    'code' => $category['code'] ?? '',
                    'parent_id' => $category['parent_id'],
                    'has_children' => !empty($children)
                ];
                
                if (!empty($children)) {
                    $node['children'] = $children;
                }
                
                $tree[] = $node;
            }
        }
        
        return $tree;
    }

    /**
     * 导出产品到Excel
     */
    public function exportExcel()
    {
        // 逻辑与 filter 类似，但返回 Excel 文件
        // 这里先返回一个占位响应
        return $this->success([], 'Excel 导出功能开发中');
    }
}
