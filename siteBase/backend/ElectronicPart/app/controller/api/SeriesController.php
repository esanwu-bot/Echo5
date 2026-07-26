<?php
/**
 * 电子元器件商城 - 产品系列API控制器
 * 文件说明：提供产品系列(SPU)详情、列表、型号矩阵等接口，遵循序列列表规范。
 * 路由：/api/v1/series
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProduct;
use app\model\SkProductModel;
use app\model\SkProductDocument;
use app\model\SkCategory;
use app\model\SkBrand;
use think\facade\Db;
use think\Response;
use think\facade\Log;

class SeriesController extends BaseController
{
    /**
     * 获取系列详情 (SPU级)
     * GET /api/v1/series/:id
     *
     * 返回结构遵循 docs/md/产品模块/序列列表 规范：
     *   seriesId / name / category{categoryId,name,path} / brand{brandId,name,logo}
     *   description / image / specSummary{packageRange,resistanceRange,toleranceRange,powerRange}
     *   modelCount / documents[] / actions{downloadDatasheet,downloadECAD,viewModels}
     *
     * @access public
     * @param int|string $id 系列ID (数字主键) 或 product_code (如 RC0603)
     * @return Response
     */
    public function read($id): Response
    {
        try {
            // 同时支持数字主键与 product_code 字符串查询
            if (is_numeric($id)) {
                $series = SkProduct::where('id', (int)$id)->find();
            } else {
                $series = SkProduct::where('product_code', (string)$id)->find();
            }
            if (!$series) {
                return $this->error('系列不存在', 404);
            }

            $seriesId = (int)$series->id;

            // 型号数量 (sk_product_models.status 字段为 varchar，值为 'Active')
            $modelCount = SkProductModel::where('series_id', $seriesId)
                ->where('status', 'Active')
                ->count();

            // 系列级文档
            $docs = SkProductDocument::where('series_id', $seriesId)
                ->where('status', 1)
                ->order('create_time', 'desc')
                ->select()
                ->toArray();

            $documents = array_map(function ($d) {
                return [
                    'type'     => $d['doc_type'] ?? 'datasheet',
                    'name'     => $d['title'] ?? '',
                    'url'      => $d['file_url'] ?? '',
                    'language' => $d['language'] ?? 'zh-CN',
                    'size'     => $d['file_size'] ?? '',
                    'version'  => $d['version'] ?? '',
                ];
            }, $docs);

            $categoryId = (int)$series->category_fk_id;
            $categoryNode = $categoryId > 0 ? SkCategory::find($categoryId) : null;
            $categoryPath = $this->buildCategoryPath($categoryId);
            $category = [
                'categoryId' => $categoryNode ? ((string)$categoryNode->id) : '',
                'name'       => $categoryNode ? $this->translateField('category', (int)$categoryNode->id, 'name', (string)($categoryNode->name ?? '')) : '',
                'path'       => $categoryPath,
            ];

            // 品牌对象 (手动查询)
            $brandId = (int)$series->brand_id;
            $brandNode = $brandId > 0 ? SkBrand::find($brandId) : null;
            $brand = [
                'brandId' => $brandNode ? ((string)($brandNode->brand_code ?? $brandNode->id)) : '',
                'name'    => $brandNode ? $this->translateField('brand', (int)$brandNode->id, 'brand_name', (string)($brandNode->brand_name ?? '')) : '',
                'logo'    => $brandNode ? ((string)($brandNode->brand_logo ?? '')) : '',
            ];

            // 规格摘要：优先读取缓存，缺失时动态计算并回写
            $specSummary = $this->getSpecSummary($series, $seriesId);

            // 主图
            $image = '';
            $imagesRaw = $series->images;
            if (!empty($imagesRaw)) {
                $decoded = is_string($imagesRaw) ? json_decode($imagesRaw, true) : $imagesRaw;
                if (is_array($decoded) && !empty($decoded[0])) {
                    $image = $decoded[0];
                }
            }

            // 文档/型号操作端点
            $seriesCode = (string)($series->product_code ?: (string)$seriesId);
            $actions = [
                'downloadDatasheet' => "/api/v1/series/{$seriesCode}/datasheet",
                'downloadECAD'      => "/api/v1/series/{$seriesCode}/ecad",
                'viewModels'        => "/api/v1/series/{$seriesCode}/models",
            ];

            $data = [
                'seriesId'    => $seriesCode,
                'id'          => $seriesId,
                'name'        => $this->translateField('product', $seriesId, 'name', (string)($series->name ?? '')),
                'mpnPrefix'   => (string)($series->mpn_prefix ?? ''),
                'category'    => $category,
                'brand'       => $brand,
                'description' => $this->translateField('product', $seriesId, 'description', (string)($series->description ?? '')),
                'image'       => $image,
                'specSummary' => $specSummary,
                'modelCount'  => $modelCount,
                'documents'   => $documents,
                'actions'     => $actions,
            ];

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 构建分类路径 (从根到当前节点的名称链)
     *
     * @access protected
     * @param int $categoryId 分类ID
     * @return array 名称数组
     */
    protected function buildCategoryPath(int $categoryId): array
    {
        if ($categoryId <= 0) {
            return [];
        }
        $path = [];
        $current = SkCategory::find($categoryId);
        while ($current) {
            $name = $this->translateField('category', (int)$current->id, 'name', (string)($current->name ?? ''));
            array_unshift($path, $name);
            $parentId = (int)($current->parent_id ?? 0);
            if ($parentId > 0) {
                $current = SkCategory::find($parentId);
            } else {
                break;
            }
        }
        return $path;
    }

    /**
     * 获取系列规格摘要（优先读缓存，缺失时计算并回写）
     *
     * @access protected
     * @param SkProduct $series 系列模型实例
     * @param int $seriesId 系列ID
     * @return array
     */
    protected function getSpecSummary($series, int $seriesId): array
    {
        $cached = $series->spec_summary;
        if (!empty($cached) && is_array($cached)) {
            return $cached;
        }

        $specSummary = $this->buildSpecSummary($seriesId);

        try {
            $series->spec_summary = $specSummary;
            $series->save();
        } catch (\Exception $e) {
            Log::warning('spec_summary 缓存写入失败 series_id=' . $seriesId . ': ' . $e->getMessage());
        }

        return $specSummary;
    }

    /**
     * 构建系列规格摘要 (聚合型号参数范围)
     *
     * @access protected
     * @param int $seriesId 系列ID
     * @return array packageRange / resistanceRange / toleranceRange / powerRange
     */
    protected function buildSpecSummary(int $seriesId): array
    {
        // 参数 code 到展示字段的映射
        $codeToField = [
            'package_type'      => 'packageRange',
            'resistance_value'  => 'resistanceRange',
            'tolerance'         => 'toleranceRange',
            'power_rating'      => 'powerRange',
        ];

        // 默认空值
        $summary = [
            'packageRange'     => '—',
            'resistanceRange'  => '—',
            'toleranceRange'   => '—',
            'powerRange'       => '—',
        ];

        // 优先用系列下型号的参数聚合
        $modelIds = SkProductModel::where('series_id', $seriesId)
            ->where('status', 'Active')
            ->column('id');
        if (!empty($modelIds)) {
            $rows = Db::name('sk_model_param_val')
                ->alias('mpv')
                ->join('sk_attribute attr', 'mpv.param_id = attr.id', 'LEFT')
                ->whereIn('mpv.model_id', $modelIds)
                ->whereIn('attr.code', array_keys($codeToField))
                ->field([
                    'attr.code as code',
                    'mpv.value',
                    'mpv.value_numeric',
                ])
                ->select()
                ->toArray();

            $grouped = [];
            foreach ($rows as $r) {
                $code = $r['code'] ?? '';
                if (!$code) {
                    continue;
                }
                $val = $r['value'] ?? '';
                if ($val === '' || $val === null) {
                    continue;
                }
                $grouped[$code][$val] = $r['value_numeric'] ?? null;
            }

            foreach ($codeToField as $code => $field) {
                if (!empty($grouped[$code])) {
                    $summary[$field] = $this->formatRange($grouped[$code], $code);
                }
            }
        }

        // Fallback：如果型号参数没有，尝试从 sk_product.features / specs 提取
        // 这里保持简单，直接返回默认值即可

        return $summary;
    }

    /**
     * 将参数值集合格式化为范围字符串
     *
     * @access protected
     * @param array $valueMap value => numeric|null
     * @param string $code 参数 code
     * @return string
     */
    protected function formatRange(array $valueMap, string $code): string
    {
        $values = array_keys($valueMap);
        if (empty($values)) {
            return '—';
        }

        // 数值型参数：取 min ~ max
        if (in_array($code, ['resistance_value'])) {
            $numerics = array_filter(array_map(function ($v) use ($valueMap) {
                return $valueMap[$v] ?? null;
            }, $values), function ($v) {
                return $v !== null && $v !== '';
            });
            if (!empty($numerics)) {
                $min = min($numerics);
                $max = max($numerics);
                // 转回展示标签
                $minLabel = $this->formatResistanceLabel((float)$min);
                $maxLabel = $this->formatResistanceLabel((float)$max);
                return "{$minLabel} ~ {$maxLabel}";
            }
        }

        // 枚举型参数：去重排序后拼接
        $unique = array_values(array_unique($values));
        sort($unique);
        if (count($unique) <= 4) {
            return implode(' / ', $unique);
        }
        // 多于 4 个取首尾
        return reset($unique) . ' ~ ' . end($unique);
    }

    /**
     * 格式化阻值展示标签
     *
     * @access protected
     * @param float $ohm
     * @return string
     */
    protected function formatResistanceLabel(float $ohm): string
    {
        if ($ohm < 1000) {
            return rtrim(rtrim(sprintf('%.2f', $ohm), '0'), '.') . 'Ω';
        }
        if ($ohm < 1000000) {
            return rtrim(rtrim(sprintf('%.2f', $ohm / 1000), '0'), '.') . 'kΩ';
        }
        return rtrim(rtrim(sprintf('%.2f', $ohm / 1000000), '0'), '.') . 'MΩ';
    }

    /**
     * 获取系列关键参数范围（用于详情页速览）
     * GET /api/v1/series/:id/parameter-ranges
     */
    public function parameterRanges($id): Response
    {
        try {
            $series = SkProduct::find($id);
            if (!$series) {
                return $this->error('系列不存在', 404);
            }

            // 获取该系列下所有型号的参数值
            $modelIds = SkProductModel::where('series_id', $id)
                ->where('status', 1)
                ->column('id');

            if (empty($modelIds)) {
                return $this->success([]);
            }

            // 查询参数值，并关联参数定义获取名称和单位
            $paramVals = Db::name('sk_model_param_val')
                ->alias('mpv')
                ->join('sk_attribute attr', 'mpv.param_id = attr.id', 'LEFT')
                ->whereIn('mpv.model_id', $modelIds)
                ->field([
                    'mpv.param_id',
                    'attr.name as param_name',
                    'attr.code as param_code',
                    'attr.unit as param_unit',
                    'mpv.value',
                    'mpv.value_numeric',
                ])
                ->select()
                ->toArray();

            // 多语言翻译：属性名称 (attribute模块)
            $lang = $this->getLangCode();
            $i18nService = app(\app\service\I18nService::class);
            $attrIds = array_values(array_unique(array_filter(array_column($paramVals, 'param_id'))));
            $attrTrans = [];
            if (!empty($attrIds)) {
                $attrTrans = $i18nService->getTranslations('attribute', $attrIds, $lang, ['name']);
            }

            // 按参数分组统计范围
            $paramGroups = [];
            foreach ($paramVals as $pv) {
                $name = $pv['param_name'] ?: 'unknown';
                // 翻译属性名称
                $attrId = $pv['param_id'] ?? 0;
                if ($attrId && !empty($attrTrans[$attrId]['name'])) {
                    $name = $attrTrans[$attrId]['name'];
                }
                $code = $pv['param_code'] ?: $name;
                $key = $code;
                if (!isset($paramGroups[$key])) {
                    $paramGroups[$key] = [
                        'name' => $name,
                        'code' => $code,
                        'label' => $name,
                        'unit' => $pv['param_unit'] ?: '',
                        'values' => [],
                        'numeric_values' => [],
                    ];
                }
                if ($pv['value'] !== null && $pv['value'] !== '' && !in_array($pv['value'], $paramGroups[$key]['values'])) {
                    $paramGroups[$key]['values'][] = $pv['value'];
                }
                if ($pv['value_numeric'] !== null) {
                    $paramGroups[$key]['numeric_values'][] = (float)$pv['value_numeric'];
                }
            }

            // 构建范围结果
            $result = [];
            foreach ($paramGroups as $group) {
                $range = [
                    'name' => $group['name'],
                    'code' => $group['code'],
                    'label' => $group['label'],
                    'unit' => $group['unit'],
                ];

                if (!empty($group['numeric_values'])) {
                    sort($group['numeric_values']);
                    $range['min_value'] = $group['numeric_values'][0];
                    $range['max_value'] = $group['numeric_values'][count($group['numeric_values']) - 1];
                } else {
                    sort($group['values']);
                    $range['values'] = $group['values'];
                }

                $result[] = $range;
            }

            return $this->success($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取系列型号矩阵页可用的动态筛选参数
     * GET /api/v1/series/:id/filters
     */
    public function filters($id): Response
    {
        try {
            $series = SkProduct::find($id);
            if (!$series) {
                return $this->error('系列不存在', 404);
            }

            $modelIds = Db::name('sk_product_models')
                ->where('series_id', $id)
                ->whereIn('status', [0, 1, 'Active', 'active'])
                ->column('id');

            if (empty($modelIds)) {
                return $this->success([]);
            }

            $paramVals = Db::name('sk_model_param_val')
                ->alias('mpv')
                ->join('sk_attribute attr', 'mpv.param_id = attr.id', 'LEFT')
                ->whereIn('mpv.model_id', $modelIds)
                ->field([
                    'mpv.param_id',
                    'attr.name as param_name',
                    'attr.code as param_code',
                    'mpv.value',
                ])
                ->select()
                ->toArray();

            // 多语言翻译：属性名称 (attribute模块)
            $lang = $this->getLangCode();
            $i18nService = app(\app\service\I18nService::class);

            // 收集所有属性ID并批量翻译 name
            $attrIds = array_values(array_unique(array_filter(array_column($paramVals, 'param_id'))));
            $attrTrans = [];
            if (!empty($attrIds)) {
                $attrTrans = $i18nService->getTranslations('attribute', $attrIds, $lang, ['name']);
            }

            $filterGroups = [];
            foreach ($paramVals as $pv) {
                $code = $pv['param_code'] ?: $pv['param_name'];
                $label = $pv['param_name'] ?: $code;
                // 翻译属性名称
                $attrId = $pv['param_id'] ?? 0;
                if ($attrId && !empty($attrTrans[$attrId]['name'])) {
                    $label = $attrTrans[$attrId]['name'];
                }
                if (!isset($filterGroups[$code])) {
                    $filterGroups[$code] = [
                        'name' => $code,
                        'label' => $label,
                        'values' => [],
                    ];
                }
                if ($pv['value'] !== null && $pv['value'] !== '' && !in_array($pv['value'], $filterGroups[$code]['values'])) {
                    $filterGroups[$code]['values'][] = $pv['value'];
                }
            }

            $result = array_values($filterGroups);
            return $this->success($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取系列下的型号矩阵 (带参数筛选)
     * GET /api/v1/series/:id/models
     */
    public function models($id): Response
    {
        try {
            $series = SkProduct::find($id);
            if (!$series) {
                return $this->error('系列不存在', 404);
            }

            $params = $this->request->get();

            $query = SkProductModel::with(['brand', 'category'])
                ->where('series_id', $id)
                ->whereIn('status', [0, 1, 'Active', 'active']);

            $keyword = trim((string)($params['keyword'] ?? ''));
            if (!empty($keyword)) {
                $query->where(function($q) use ($keyword) {
                    $q->whereOr([
                        ['model_code', 'like', "%{$keyword}%"],
                        ['model_name', 'like', "%{$keyword}%"],
                    ]);
                });
            }
            if (!empty($params['package_type'])) {
                $query->where('package_type', $params['package_type']);
            }
            if (!empty($params['in_stock'])) {
                $query->where('stock', '>', 0);
            }

            // 处理参数化筛选（param_filters）
            if (!empty($params['param_filters']) && is_array($params['param_filters'])) {
                // 直接从 sk_attribute 表按 code/name 查属性ID，不依赖分类关联
                $filterKeys = array_keys($params['param_filters']);
                $attrCodeToId = [];
                if (!empty($filterKeys)) {
                    $attrs = Db::name('sk_attribute')
                        ->whereIn('code', $filterKeys)
                        ->field('id, name, code')
                        ->select()
                        ->toArray();

                    foreach ($attrs as $attr) {
                        if (!empty($attr['code'])) {
                            $attrCodeToId[$attr['code']] = $attr['id'];
                        }
                        if (!empty($attr['name'])) {
                            $attrCodeToId[$attr['name']] = $attr['id'];
                        }
                    }
                }

                $filteredModelIds = null;

                foreach ($params['param_filters'] as $filterKey => $values) {
                    if (empty($values) || !is_array($values)) continue;

                    // package_type 是 sk_product_models 表字段，直接筛选
                    if ($filterKey === 'package_type') {
                        $query->whereIn('package_type', $values);
                        continue;
                    }

                    // 其他按属性编码从 sk_model_param_val 筛选
                    $attrId = $attrCodeToId[$filterKey] ?? 0;
                    if (!$attrId) continue;

                    $modelIds = Db::name('sk_model_param_val')
                        ->where('param_id', $attrId)
                        ->whereIn('value', $values)
                        ->column('model_id');

                    if (empty($modelIds)) {
                        // 没有匹配的型号，直接返回空结果
                        $query->where('id', 0);
                        break;
                    }

                    if ($filteredModelIds === null) {
                        $filteredModelIds = $modelIds;
                    } else {
                        $filteredModelIds = array_intersect($filteredModelIds, $modelIds);
                        if (empty($filteredModelIds)) {
                            $query->where('id', 0);
                            break;
                        }
                    }
                }

                if ($filteredModelIds !== null && !empty($filteredModelIds)) {
                    $query->whereIn('id', $filteredModelIds);
                }
            }

            $sortField = $params['sort_field'] ?? 'id';
            $sortOrder = strtolower($params['sort_order'] ?? 'asc') === 'asc' ? 'asc' : 'desc';
            $allowedSortFields = ['id', 'model_code', 'stock', 'moq'];
            if (in_array($sortField, $allowedSortFields)) {
                $query->order($sortField, $sortOrder);
            } else {
                $query->order('id', 'asc');
            }

            $total = (clone $query)->count();
            $page = max(1, intval($params['page'] ?? 1));
            $pageSize = min(100, max(10, intval($params['page_size'] ?? 20)));
            $list = $query->page($page, $pageSize)->select()->toArray();

            $modelIds = array_column($list, 'id');

            $paramsByModel = [];
            if (!empty($modelIds)) {
                $paramVals = Db::name('sk_model_param_val')
                    ->alias('mpv')
                    ->join('sk_attribute attr', 'mpv.param_id = attr.id', 'LEFT')
                    ->whereIn('mpv.model_id', $modelIds)
                    ->field('mpv.*, attr.name as param_name, attr.code as param_code')
                    ->select()
                    ->toArray();
                foreach ($paramVals as $pv) {
                    $paramsByModel[$pv['model_id']][] = $pv;
                }
            }

            // 多语言翻译：型号名称(model模块)、品牌名(brand模块)、属性名(attribute模块)
            $lang = $this->getLangCode();
            $i18nService = app(\app\service\I18nService::class);
            $list = $i18nService->mapData($list, 'model', $lang, ['model_name']);
            $brandIds = array_values(array_unique(array_filter(array_column($list, 'brand_id'))));
            $brandTrans = $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name']);

            // 翻译参数名称 (attribute模块)
            $allParamIds = [];
            foreach ($paramsByModel as $mid => $pvs) {
                foreach ($pvs as $pv) {
                    if (!empty($pv['param_id'])) {
                        $allParamIds[$pv['param_id']] = true;
                    }
                }
            }
            $attrTrans = [];
            if (!empty($allParamIds)) {
                $attrTrans = $i18nService->getTranslations('attribute', array_keys($allParamIds), $lang, ['name']);
            }
            foreach ($paramsByModel as $mid => &$pvs) {
                foreach ($pvs as &$pv) {
                    $pid = $pv['param_id'] ?? 0;
                    if ($pid && !empty($attrTrans[$pid]['name'])) {
                        $pv['param_name'] = $attrTrans[$pid]['name'];
                    }
                }
                unset($pv);
            }
            unset($pvs);

            $formatted = array_map(function($model) use ($paramsByModel, $brandTrans) {
                $brandId = $model['brand_id'] ?? 0;
                $brandName = ($brandTrans[$brandId]['brand_name'] ?? '') ?: ($model['brand']['brand_name'] ?? '');
                return [
                    'id' => $model['id'],
                    'model_code' => $model['model_code'] ?? '',
                    'model_name' => $model['model_name'] ?? '',
                    'brand_name' => $brandName,
                    'package_type' => $model['package_type'] ?? '',
                    'stock' => $model['stock'] ?? 0,
                    'moq' => $model['moq'] ?? 0,
                    'lead_time' => $model['lead_time'] ?? '',
                    'params' => $paramsByModel[$model['id']] ?? [],
                ];
            }, $list);

            return $this->success([
                'series_id' => (int)$id,
                'models' => $formatted,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'page_size' => $pageSize,
                    'total_pages' => (int)ceil($total / $pageSize),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 获取系列列表
     * GET /api/v1/series
     *
     * 支持参数：
     * - category_id  分类ID
     * - brand_id     品牌ID
     * - keyword      关键词
     * - package_type 封装类型（系列下存在该封装的型号）
     * - tolerance    精度值，如 0.1 / 0.5 / 1 / 5
     * - resistance_min  阻值范围最小值（Ω）
     * - resistance_max  阻值范围最大值（Ω）
     * - sort_by      排序：hot（热度） / model_count（型号数量） / newest（最新上架）
     * - sort_order   asc / desc
     * - page / page_size
     */
    public function index($categoryId = 0): Response
    {
        try {
            $params = $this->request->get();
            $categoryId = max((int)$categoryId, (int)($params['category_id'] ?? 0));
            $brandId = (int)($params['brand_id'] ?? 0);
            $keyword = trim((string)($params['keyword'] ?? ''));
            $packageType = trim((string)($params['package_type'] ?? ''));
            $tolerance = trim((string)($params['tolerance'] ?? ''));
            $resistanceMin = is_numeric($params['resistance_min'] ?? '') ? (float)$params['resistance_min'] : null;
            $resistanceMax = is_numeric($params['resistance_max'] ?? '') ? (float)$params['resistance_max'] : null;
            $sortBy = strtolower(trim((string)($params['sort_by'] ?? '')));
            $sortOrder = strtolower(trim((string)($params['sort_order'] ?? ''))) === 'asc' ? 'asc' : 'desc';
            $page = max(1, intval($params['page'] ?? 1));
            $pageSize = min(100, max(10, intval($params['page_size'] ?? 20)));

            $allowedSort = ['hot', 'model_count', 'newest'];
            if (!in_array($sortBy, $allowedSort)) {
                $sortBy = '';
            }

            // 第一步：构建基础查询，先获取满足所有过滤条件的系列 ID
            $baseQuery = SkProduct::alias('sp')->where('sp.status', 1);

            if ($categoryId > 0) {
                $baseQuery->where('sp.category_fk_id', $categoryId);
            }
            if ($brandId > 0) {
                $baseQuery->where('sp.brand_id', $brandId);
            }
            if (!empty($keyword)) {
                $baseQuery->where(function($q) use ($keyword) {
                    $q->whereOr([
                        ['sp.name', 'like', "%{$keyword}%"],
                        ['sp.description', 'like', "%{$keyword}%"],
                    ]);
                });
            }

            // 封装过滤：系列下存在指定封装的型号
            if (!empty($packageType)) {
                $baseQuery->whereExists(function($sub) use ($packageType) {
                    $sub->table('sk_product_models')
                        ->alias('spm_pkg')
                        ->whereColumn('spm_pkg.series_id', 'sp.id')
                        ->whereIn('spm_pkg.status', [0, 1, 'Active', 'active'])
                        ->where('spm_pkg.package_type', $packageType);
                });
            }

            // 精度过滤：系列下存在指定精度的型号参数
            if (!empty($tolerance)) {
                $toleranceEscaped = str_replace('%', '\%', $tolerance);
                $baseQuery->whereExists(function($sub) use ($toleranceEscaped) {
                    $sub->table('sk_product_models')
                        ->alias('spm_tol')
                        ->whereColumn('spm_tol.series_id', 'sp.id')
                        ->whereIn('spm_tol.status', [0, 1, 'Active', 'active'])
                        ->whereExists(function($inner) use ($toleranceEscaped) {
                            $inner->table('sk_model_param_val')
                                ->alias('mpv')
                                ->join('sk_attribute attr', 'mpv.param_id = attr.id')
                                ->whereColumn('mpv.model_id', 'spm_tol.id')
                                ->where('attr.code', 'tolerance')
                                ->whereLike('mpv.value', "%{$toleranceEscaped}%");
                        });
                });
            }

            // 阻值范围过滤：系列下存在阻值在范围内的型号参数
            if ($resistanceMin !== null || $resistanceMax !== null) {
                $baseQuery->whereExists(function($sub) use ($resistanceMin, $resistanceMax) {
                    $sub->table('sk_product_models')
                        ->alias('spm_res')
                        ->whereColumn('spm_res.series_id', 'sp.id')
                        ->whereIn('spm_res.status', [0, 1, 'Active', 'active'])
                        ->whereExists(function($inner) use ($resistanceMin, $resistanceMax) {
                            $inner->table('sk_model_param_val')
                                ->alias('mpv')
                                ->join('sk_attribute attr', 'mpv.param_id = attr.id')
                                ->whereColumn('mpv.model_id', 'spm_res.id')
                                ->where('attr.code', 'resistance');
                            if ($resistanceMin !== null) {
                                $inner->where('mpv.value_numeric', '>=', $resistanceMin);
                            }
                            if ($resistanceMax !== null) {
                                $inner->where('mpv.value_numeric', '<=', $resistanceMax);
                            }
                        });
                });
            }

            $allSeriesIds = $baseQuery->column('sp.id');

            // 第二步：计算每个系列的型号数量
            $modelCounts = [];
            if (!empty($allSeriesIds)) {
                $counts = Db::name('sk_product_models')
                    ->whereIn('series_id', $allSeriesIds)
                    ->whereIn('status', [0, 1, 'Active', 'active'])
                    ->field('series_id, COUNT(*) as count')
                    ->group('series_id')
                    ->select()
                    ->toArray();
                foreach ($counts as $c) {
                    $modelCounts[$c['series_id']] = $c['count'];
                }
            }

            // 第三步：排序
            if (!empty($keyword)) {
                $products = Db::name('sk_product')
                    ->whereIn('id', $allSeriesIds)
                    ->column('id, name, description', 'id');
                
                usort($allSeriesIds, function($a, $b) use ($products, $keyword) {
                    $pa = $products[$a] ?? ['name' => '', 'description' => ''];
                    $pb = $products[$b] ?? ['name' => '', 'description' => ''];
                    
                    $scoreA = 0;
                    $scoreB = 0;
                    
                    if (strpos(strtolower($pa['name']), strtolower($keyword)) !== false) {
                        $scoreA += 10;
                    }
                    if (strpos(strtolower($pb['name']), strtolower($keyword)) !== false) {
                        $scoreB += 10;
                    }
                    if (strpos(strtolower($pa['description']), strtolower($keyword)) !== false) {
                        $scoreA += 5;
                    }
                    if (strpos(strtolower($pb['description']), strtolower($keyword)) !== false) {
                        $scoreB += 5;
                    }
                    if (strpos($pa['name'], $keyword) === 0) {
                        $scoreA += 5;
                    }
                    if (strpos($pb['name'], $keyword) === 0) {
                        $scoreB += 5;
                    }
                    
                    return $scoreB - $scoreA;
                });
            } elseif ($sortBy === 'model_count') {
                usort($allSeriesIds, function($a, $b) use ($modelCounts, $sortOrder) {
                    $ca = $modelCounts[$a] ?? 0;
                    $cb = $modelCounts[$b] ?? 0;
                    if ($ca === $cb) {
                        return $sortOrder === 'asc' ? $a - $b : $b - $a;
                    }
                    $res = $ca > $cb ? -1 : 1;
                    return $sortOrder === 'asc' ? -$res : $res;
                });
            } elseif ($sortBy === 'hot') {
                $viewsMap = Db::name('sk_product')
                    ->whereIn('id', $allSeriesIds)
                    ->column('views', 'id');
                usort($allSeriesIds, function($a, $b) use ($viewsMap, $sortOrder) {
                    $va = (int)($viewsMap[$a] ?? 0);
                    $vb = (int)($viewsMap[$b] ?? 0);
                    if ($va === $vb) {
                        return $sortOrder === 'asc' ? $a - $b : $b - $a;
                    }
                    $res = $va > $vb ? -1 : 1;
                    return $sortOrder === 'asc' ? -$res : $res;
                });
            } elseif ($sortBy === 'newest') {
                $timeMap = Db::name('sk_product')
                    ->whereIn('id', $allSeriesIds)
                    ->column('create_time', 'id');
                usort($allSeriesIds, function($a, $b) use ($timeMap, $sortOrder) {
                    $ta = $timeMap[$a] ?? '';
                    $tb = $timeMap[$b] ?? '';
                    $res = strcmp($tb, $ta);
                    return $sortOrder === 'asc' ? -$res : $res;
                });
            } else {
                // 默认按 sort 降序、id 降序
                $sortMap = Db::name('sk_product')
                    ->whereIn('id', $allSeriesIds)
                    ->column('sort', 'id');
                usort($allSeriesIds, function($a, $b) use ($sortMap) {
                    $sa = (int)($sortMap[$a] ?? 0);
                    $sb = (int)($sortMap[$b] ?? 0);
                    if ($sa !== $sb) {
                        return $sb - $sa;
                    }
                    return $b - $a;
                });
            }

            // 第四步：分页
            $total = count($allSeriesIds);
            $offset = ($page - 1) * $pageSize;
            $pageIds = array_slice($allSeriesIds, $offset, $pageSize);

            // 第五步：查询详情
            $list = [];
            if (!empty($pageIds)) {
                $list = SkProduct::with(['category', 'brand'])
                    ->whereIn('id', $pageIds)
                    ->select()
                    ->toArray();
            }

            // 多语言翻译：系列名称/描述(product模块)、品牌名(brand模块)、分类名(category模块)
            $lang = $this->getLangCode();
            $i18nService = app(\app\service\I18nService::class);
            $list = $i18nService->mapData($list, 'product', $lang, ['name', 'description']);

            $brandIds = array_values(array_unique(array_filter(array_column($list, 'brand_id'))));
            $brandTrans = $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name']);
            $categoryIds = array_values(array_unique(array_filter(array_column($list, 'category_fk_id'))));
            $categoryTrans = $i18nService->getTranslations('category', $categoryIds, $lang, ['name']);

            $formatted = array_map(function($item) use ($modelCounts, $brandTrans, $categoryTrans) {
                $specSummary = $item['spec_summary'] ?? null;
                if (is_string($specSummary)) {
                    $specSummary = json_decode($specSummary, true);
                }
                $brandId = $item['brand_id'] ?? 0;
                $categoryId = $item['category_fk_id'] ?? 0;
                $brandName = ($brandTrans[$brandId]['brand_name'] ?? '') ?: ($item['brand']['brand_name'] ?? '');
                $categoryName = ($categoryTrans[$categoryId]['name'] ?? '') ?: ($item['category']['name'] ?? '');
                return [
                    'id' => $item['id'],
                    'name' => $item['name'] ?? '',
                    'description' => $item['description'] ?? '',
                    'category_id' => $categoryId,
                    'category_name' => $categoryName,
                    'brand_id' => $brandId,
                    'brand_name' => $brandName,
                    'image' => $this->extractFirstImage($item['images']),
                    'model_count' => $modelCounts[$item['id']] ?? 0,
                    'spec_summary' => $specSummary ?: (object)[
                        'packageRange' => '—',
                        'resistanceRange' => '—',
                        'toleranceRange' => '—',
                        'powerRange' => '—',
                    ],
                ];
            }, $list);

            return $this->success([
                'series' => $formatted,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'page_size' => $pageSize,
                    'total_pages' => (int)ceil($total / $pageSize),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误', 500);
        }
    }

    /**
     * 从 images 字段提取第一张图片 URL
     *
     * @access protected
     * @param mixed $images JSON 字符串或已解析数组
     * @return string
     */
    protected function extractFirstImage($images): string
    {
        if (empty($images)) {
            return '';
        }
        $decoded = is_array($images) ? $images : (is_string($images) ? json_decode($images, true) : null);
        if (is_array($decoded) && !empty($decoded)) {
            return (string)($decoded[0] ?? '');
        }
        return '';
    }

    /**
     * 翻译单个业务字段（按当前请求语言）
     *
     * @access protected
     * @param string $module     模块标识：product/brand/category/model
     * @param int    $businessId 业务ID
     * @param string $field      字段名
     * @param string $default    无翻译时返回的默认值（通常为原文）
     * @return string
     */
    protected function translateField(string $module, int $businessId, string $field, string $default): string
    {
        if ($businessId <= 0) {
            return $default;
        }
        try {
            $i18nService = app(\app\service\I18nService::class);
            $trans = $i18nService->getTranslations($module, [$businessId], $this->getLangCode(), [$field]);
            $value = $trans[$businessId][$field] ?? '';
            return $value !== '' ? (string)$value : $default;
        } catch (\Exception $e) {
            return $default;
        }
    }
}
