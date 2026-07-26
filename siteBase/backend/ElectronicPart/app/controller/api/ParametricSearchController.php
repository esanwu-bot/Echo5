<?php
/**
 * 电子元器件商城 - 参数化搜索接口
 * 文件说明：提供产品列表页的参数化筛选和搜索功能。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProduct;
use app\model\SkCategory;
use app\service\ParametricSearchService;
use think\facade\Db;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 参数化搜索API控制器
 * @package app\controller\api
 */
class ParametricSearchController extends BaseController
{
    /**
     * 统一参数筛选 (型号级)
     * POST /api/v1/parametric-search
     * 使用 ParametricSearchService 在 sk_product_models 层面做筛选
     */
    public function unifiedSearch(): Response
    {
        try {
            $params = $this->request->post();
            $service = app(ParametricSearchService::class);
            $data = $service->search($params);
            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取分类下的产品列表（支持参数化筛选）
     * GET /api/v1/parametric-search/products
     *
     * @deprecated 2.0 请使用 unifiedSearch() 替代 (POST /api/v1/parametric-search)
     *             此方法基于 sk_product（产品级），硬编码了 bandwidth/slew_rate 等字段。
     *             新方法基于 sk_product_models（型号级），通过 sk_model_param_val 统一筛选。
     */
    public function getProducts(): Response
    {
        try {
            $params = $this->request->get();
            
            // 基础参数
            $categoryId = (int)($params['category_id'] ?? 0);
            $subcategory = trim((string)($params['subcategory'] ?? ''));
            $keyword = trim((string)($params['keyword'] ?? ''));
            $page = max(1, intval($params['page'] ?? 1));
            $pageSize = min(100, max(10, intval($params['page_size'] ?? 20)));
            
            // 排序参数
            $sortField = $params['sort_field'] ?? 'id';
            $sortOrder = strtolower($params['sort_order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
            
            // 筛选参数
            $inStockOnly = isset($params['in_stock']) ? (bool)$params['in_stock'] : false;
            $classification = $params['classification'] ?? []; // 产品分类数组
            $channels = $params['channels'] ?? []; // 通道数数组
            $packageTypes = $params['package_types'] ?? []; // 封装类型数组
            $brands = $params['brands'] ?? []; // 品牌数组
            $attributeFilters = [];

            if (!empty($params['attribute_filters'])) {
                $decodedAttributeFilters = json_decode((string)$params['attribute_filters'], true);
                if (is_array($decodedAttributeFilters)) {
                    $attributeFilters = $decodedAttributeFilters;
                }
            }
            
            // 范围筛选
            $bandwidthMin = isset($params['bandwidth_min']) ? (float)$params['bandwidth_min'] : null;
            $bandwidthMax = isset($params['bandwidth_max']) ? (float)$params['bandwidth_max'] : null;
            $slewRateMin = isset($params['slew_rate_min']) ? (float)$params['slew_rate_min'] : null;
            $slewRateMax = isset($params['slew_rate_max']) ? (float)$params['slew_rate_max'] : null;
            $voltageMin = isset($params['voltage_min']) ? (float)$params['voltage_min'] : null;
            $voltageMax = isset($params['voltage_max']) ? (float)$params['voltage_max'] : null;
            $priceMin = isset($params['price_min']) ? (float)$params['price_min'] : null;
            $priceMax = isset($params['price_max']) ? (float)$params['price_max'] : null;

            $lang = $this->getLangCode();
            // 使用 md5 对所有筛选参数生成缓存 key，避免 key 过长
            $cacheKey = 'parametricSearch_getProducts_' . md5(json_encode($params) . '_' . $lang);
            
            $data = Cache::remember($cacheKey, function() use (
                $categoryId, $subcategory, $keyword, $page, $pageSize,
                $sortField, $sortOrder, $inStockOnly, $classification,
                $channels, $packageTypes, $brands, $attributeFilters,
                $bandwidthMin, $bandwidthMax, $slewRateMin, $slewRateMax,
                $voltageMin, $voltageMax, $priceMin, $priceMax, $lang
            ) {
                // 构建基础查询
                $query = Db::name('sk_product')
                    ->alias('p')
                    ->leftJoin('sk_brands b', 'p.brand_id = b.id')
                    ->leftJoin('sk_category c', 'p.category_fk_id = c.id')
                    ->leftJoin('sk_product_models pm', 'pm.series_id = p.id')
                    ->where('p.is_on_sale', 1);
                
                // 分类筛选（包含所有子分类）
                if ($categoryId > 0) {
                    $categoryIds = $this->getAllChildCategoryIds($categoryId);
                    $categoryIds[] = $categoryId; // 包含自身
                    $query->whereIn('p.category_fk_id', $categoryIds);
                }
                
                // 关键词搜索（零件编号、名称、描述）
                if (!empty($keyword)) {
                    $query->where(function($q) use ($keyword) {
                        $q->whereOr([
                            ['p.product_code', 'like', "%{$keyword}%"],
                            ['p.name', 'like', "%{$keyword}%"],
                            ['p.description', 'like', "%{$keyword}%"],
                            ['p.model_number', 'like', "%{$keyword}%"]
                        ]);
                    });
                }
                
                // 仅显示有货
                if ($inStockOnly) {
                    $query->where('p.stock', '>', 0);
                }
                
                // 产品分类筛选
                if (!empty($classification) && is_array($classification)) {
                    $query->whereIn('p.rating', $classification);
                }
                
                // 通道数筛选
                if (!empty($channels) && is_array($channels)) {
                    $query->whereIn('p.channels', $channels);
                }
                
                // 封装类型筛选
                if (!empty($packageTypes) && is_array($packageTypes)) {
                    $query->whereIn('p.package_type', $packageTypes);
                }
                
                // 品牌筛选
                if (!empty($brands) && is_array($brands)) {
                    $query->whereIn('p.brand_id', $brands);
                }

                // 属性筛选 —— 同时支持 sk_product_attribute（旧）和 sk_model_param_val（新）
                if (!empty($attributeFilters)) {
                    $query->where(function($q) use ($attributeFilters) {
                        foreach ($attributeFilters as $attributeFilter) {
                            $attributeId = (int)($attributeFilter['attribute_id'] ?? 0);
                            if ($attributeId <= 0) {
                                continue;
                            }

                            $values = $attributeFilter['values'] ?? [];
                            $min = $attributeFilter['min'] ?? null;
                            $max = $attributeFilter['max'] ?? null;
                            $logic = strtolower((string)($attributeFilter['logic'] ?? 'or'));

                            // 同时查询新旧两表
                            $q->where(function($subQ) use ($attributeId, $values, $min, $max, $logic) {
                                // 新表 sk_model_param_val（通过 pm.series_id = p.id 关联 sk_product_models）
                                $subQ->whereRaw(
                                    "EXISTS (
                                        SELECT 1 FROM sk_model_param_val mpv
                                        INNER JOIN sk_product_models spm ON mpv.model_id = spm.id
                                        WHERE spm.series_id = p.id
                                        AND mpv.param_id = ?
                                        " . $this->buildParamCondition($values, $min, $max, $logic) . "
                                    )",
                                    array_merge([$attributeId], $this->buildParamBindings($values, $min, $max, $logic))
                                );
                                // 旧表 sk_product_attribute
                                $subQ->whereOr(function($orQ) use ($attributeId, $values, $min, $max, $logic) {
                                    if (is_array($values) && !empty($values)) {
                                        if ($logic === 'and') {
                                            foreach ($values as $value) {
                                                $orQ->whereRaw(
                                                    "EXISTS (
                                                        SELECT 1 FROM sk_product_attribute pa
                                                        WHERE pa.product_id = p.id
                                                        AND pa.attribute_id = ?
                                                        AND pa.attribute_value = ?
                                                    )",
                                                    [$attributeId, $value]
                                                );
                                            }
                                            return;
                                        }

                                        $placeholders = implode(',', array_fill(0, count($values), '?'));
                                        $orQ->whereRaw(
                                            "EXISTS (
                                                SELECT 1 FROM sk_product_attribute pa
                                                WHERE pa.product_id = p.id
                                                AND pa.attribute_id = ?
                                                AND pa.attribute_value IN ({$placeholders})
                                            )",
                                            array_merge([$attributeId], $values)
                                        );
                                        return;
                                    }

                                    if ($min !== null || $max !== null) {
                                        $conditions = [];
                                        $bindings = [$attributeId];

                                        if ($min !== null && $min !== '') {
                                            $conditions[] = 'pa.numeric_value >= ?';
                                            $bindings[] = $min;
                                        }
                                        if ($max !== null && $max !== '') {
                                            $conditions[] = 'pa.numeric_value <= ?';
                                            $bindings[] = $max;
                                        }

                                        if (!empty($conditions)) {
                                            $orQ->whereRaw(
                                                "EXISTS (
                                                    SELECT 1 FROM sk_product_attribute pa
                                                    WHERE pa.product_id = p.id
                                                    AND pa.attribute_id = ?
                                                    AND " . implode(' AND ', $conditions) . "
                                                )",
                                                $bindings
                                            );
                                        }
                                    }
                                });
                            });
                        }
                    });
                }
                
                // 带宽范围筛选（需要解析 bandwidth 字段）
                if ($bandwidthMin !== null || $bandwidthMax !== null) {
                    $query->where(function($q) use ($bandwidthMin, $bandwidthMax) {
                        if ($bandwidthMin !== null) {
                            $q->whereRaw("CAST(REPLACE(REPLACE(p.bandwidth, 'MHz', ''), ' ', '') AS DECIMAL(10,2)) >= ?", [$bandwidthMin]);
                        }
                        if ($bandwidthMax !== null) {
                            $q->whereRaw("CAST(REPLACE(REPLACE(p.bandwidth, 'MHz', ''), ' ', '') AS DECIMAL(10,2)) <= ?", [$bandwidthMax]);
                        }
                    });
                }
                
                // 压摆率范围筛选
                if ($slewRateMin !== null || $slewRateMax !== null) {
                    $query->where(function($q) use ($slewRateMin, $slewRateMax) {
                        if ($slewRateMin !== null) {
                            $q->whereRaw("CAST(REPLACE(REPLACE(p.slew_rate, 'V/µs', ''), ' ', '') AS DECIMAL(10,2)) >= ?", [$slewRateMin]);
                        }
                        if ($slewRateMax !== null) {
                            $q->whereRaw("CAST(REPLACE(REPLACE(p.slew_rate, 'V/µs', ''), ' ', '') AS DECIMAL(10,2)) <= ?", [$slewRateMax]);
                        }
                    });
                }
                
                // 电压范围筛选
                if ($voltageMin !== null || $voltageMax !== null) {
                    $query->where(function($q) use ($voltageMin, $voltageMax) {
                        if ($voltageMin !== null) {
                            $q->where('p.voltage_range_max', '>=', $voltageMin);
                        }
                        if ($voltageMax !== null) {
                            $q->where('p.voltage_range_min', '<=', $voltageMax);
                        }
                    });
                }
                
                // 价格范围筛选
                if ($priceMin !== null || $priceMax !== null) {
                    if ($priceMin !== null) {
                        $query->where('p.pricing_unit_price', '>=', $priceMin);
                    }
                    if ($priceMax !== null) {
                        $query->where('p.pricing_unit_price', '<=', $priceMax);
                    }
                }
                
                // 获取总数
                $total = $query->count();
                
                // 排序
                $allowedSortFields = ['id', 'product_code', 'name', 'pricing_unit_price', 'stock', 'create_time', 'package_type', 'channels'];
                if (in_array($sortField, $allowedSortFields)) {
                    $query->order("p.{$sortField}", $sortOrder);
                } else {
                    $query->order('p.sort', 'desc')->order('p.id', 'desc');
                }
                
                // 分页查询
                $products = $query
                    ->field('p.*, b.brand_name as brand_name, c.name as category_name, pm.id as pm_id, pm.model_code as model_code, pm.model_name as model_name')
                    ->page($page, $pageSize)
                    ->select()
                    ->toArray();
                
                // 应用多语言翻译
                $brandTranslations = [];
                if ($lang !== 'zh-CN') {
                    $i18nService = app(\app\service\I18nService::class);
                    $products = $i18nService->mapData($products, 'product', $lang, ['name']);
                    
                    $brandIds = array_filter(array_unique(array_column($products, 'brand_id')));
                    if (!empty($brandIds)) {
                        $brandTranslations = $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name']);
                    }
                }

                // 批量构建产品型号关联（基于 pm.series_id = p.id leftJoin，已 joined）
                $modelMap = [];
                foreach ($products as $product) {
                    $productId = (int)$product['id'];
                    if (!empty($product['pm_id'])) {
                        $modelMap[$productId][] = [
                            'id' => (int)$product['pm_id'],
                            'code' => $product['model_code'] ?? null,
                            'name' => $product['model_name'] ?? null,
                            'isPrimary' => true
                        ];
                    }
                }
                
                // 格式化产品数据
                $formattedProducts = $this->formatProducts($products, $brandTranslations, $modelMap);
                
                return [
                    'products' => $formattedProducts,
                    'pagination' => [
                        'total' => $total,
                        'page' => $page,
                        'page_size' => $pageSize,
                        'total_pages' => ceil($total / $pageSize)
                    ],
                    '_deprecation' => 'This endpoint is deprecated. Use POST /api/v1/parametric-search (unifiedSearch) instead.',
                ];
            }, 3600);
            
            return $this->success($data);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取型号的参数值（按 param_id 分组）
     * GET /api/v1/parametric-search/model-params/:modelId
     */
    public function getModelParams(int $modelId): Response
    {
        try {
            $service = app(ParametricSearchService::class);
            $params = $service->getModelParams($modelId);
            return $this->success(['params' => $params]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取筛选选项（用于左侧筛选栏）
     * GET /api/v1/parametric-search/filters/:categoryId
     *
     * 委托 ParametricSearchService::getFilterOptions() 动态生成筛选选项，
     * 基于 sk_category_attribute + sk_model_param_val，不再硬编码字段。
     */
    public function getFilterOptions(int $categoryId): Response
    {
        try {
            $category = SkCategory::find($categoryId);
            if (!$category) {
                return $this->error('分类不存在', 404);
            }

            $lang = $this->getLangCode();
            $cacheKey = 'parametricSearch_getFilterOptions_' . $categoryId . '_' . $lang;

            $data = Cache::remember($cacheKey, function () use ($categoryId, $category) {
                // 委托 ParametricSearchService 动态生成筛选选项（基于 sk_model_param_val）
                $service = app(ParametricSearchService::class);
                $filters = $service->getFilterOptions($categoryId);

                // 应用多语言翻译到分类名称
                $categoryData = $this->localizeItem($category, ['name'], 'sk_category');

                return [
                    'category' => [
                        'id' => $categoryData['id'],
                        'name' => $categoryData['name'],
                    ],
                    'filters' => $filters,
                ];
            }, 3600);

            return $this->success($data);

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 格式化产品数据
     */
    private function formatProducts(array $products, array $brandTranslations = [], array $modelMap = []): array
    {
        $formatted = [];
        
        foreach ($products as $product) {
            // 解析图片
            $images = [];
            if (!empty($product['images'])) {
                $decoded = json_decode($product['images'], true);
                $images = is_array($decoded) ? $decoded : [];
            }
            
            // 解析带宽数值
            $bandwidthMHz = null;
            if (!empty($product['bandwidth'])) {
                $bandwidthStr = str_replace(['MHz', ' ', 'M'], '', $product['bandwidth']);
                $bandwidthMHz = is_numeric($bandwidthStr) ? (float)$bandwidthStr : null;
            }
            
            // 解析压摆率数值
            $slewRate = null;
            if (!empty($product['slew_rate'])) {
                $slewRateStr = str_replace(['V/µs', 'V/us', ' ', 'V/μs'], '', $product['slew_rate']);
                $slewRate = is_numeric($slewRateStr) ? (float)$slewRateStr : null;
            }
            
            // 品牌名称多语言映射（sk_translation 字段名是 brand_name）
            $brandId = (int)($product['brand_id'] ?? 0);
            $brandName = $brandTranslations[$brandId]['brand_name'] ?? ($product['brand_name'] ?? $product['brand'] ?? '');

            // 型号列表：优先从关联表取，否则回退到 joined pm_id
            $productId = (int)$product['id'];
            $models = $modelMap[$productId] ?? [];
            $primaryModel = null;
            foreach ($models as $m) {
                if ($m['isPrimary']) {
                    $primaryModel = $m;
                    break;
                }
            }
            if (!$primaryModel && !empty($models)) {
                $primaryModel = $models[0];
            }
            if (!$primaryModel && !empty($product['pm_id'])) {
                $primaryModel = [
                    'id' => (int)$product['pm_id'],
                    'code' => $product['model_code'] ?? null,
                    'name' => $product['model_name'] ?? null,
                    'isPrimary' => true
                ];
                $models[] = $primaryModel;
            }
            
            $formatted[] = [
                'id' => $productId,
                'partNumber' => $product['product_code'] ?? $product['model_number'] ?? '',
                'name' => $product['name'] ?? '',
                'modelId' => $primaryModel['id'] ?? null,
                'modelCode' => $primaryModel['code'] ?? null,
                'modelName' => $primaryModel['name'] ?? null,
                'models' => $models,
                'manufacturer' => $brandName,
                'classification' => $product['rating'] ?? '通用',
                'description' => strip_tags($product['description'] ?? ''),
                'price' => (float)($product['pricing_unit_price'] ?? 0),
                'currency' => $product['pricing_currency'] ?? 'USD',
                'inStock' => ($product['stock'] ?? 0) > 0,
                'stock' => (int)($product['stock'] ?? 0),
                'packageType' => $product['package_type'] ?? '',
                'channels' => $product['channels'] ? (int)$product['channels'] : null,
                'bandwidthMHz' => $bandwidthMHz,
                'slewRate' => $slewRate,
                'supplyVoltageMin' => $product['voltage_range_min'] ? (float)$product['voltage_range_min'] : null,
                'supplyVoltageMax' => $product['voltage_range_max'] ? (float)$product['voltage_range_max'] : null,
                'offsetVoltageVal' => $product['offset_voltage'] ? (float)$product['offset_voltage'] : null,
                'images' => $images,
                'categoryId' => $product['category_id'],
                'subcategory' => $product['subcategory'],
                'createTime' => $product['create_time']
            ];
        }
        
        return $formatted;
    }

    /**
     * 递归获取所有子分类ID
     * @param int $categoryId 父分类ID
     * @return int[] 所有子孙分类ID数组
     */
    private function getAllChildCategoryIds(int $categoryId): array
    {
        $childIds = Db::name('sk_category')
            ->where('parent_id', $categoryId)
            ->where('status', 1)
            ->column('id');

        $result = $childIds;
        foreach ($childIds as $childId) {
            $grandChildIds = $this->getAllChildCategoryIds($childId);
            $result = array_merge($result, $grandChildIds);
        }

        return $result;
    }

    /**
     * 构建参数值筛选 WHERE 片段（用于 sk_model_param_val EXISTS 子查询）
     */
    private function buildParamCondition(array $values, $min, $max, string $logic): string
    {
        $conditions = [];
        if (!empty($values)) {
            if ($logic === 'and') {
                foreach ($values as $v) {
                    $conditions[] = 'AND mpv.value = ?';
                }
            } else {
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $conditions[] = "AND mpv.value IN ({$placeholders})";
            }
        }
        if ($min !== null && $min !== '') {
            $conditions[] = 'AND mpv.value_numeric >= ?';
        }
        if ($max !== null && $max !== '') {
            $conditions[] = 'AND mpv.value_numeric <= ?';
        }
        return implode(' ', $conditions);
    }

    /**
     * 构建参数值筛选绑定参数
     */
    private function buildParamBindings(array $values, $min, $max, string $logic): array
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
}
