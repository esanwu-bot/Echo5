<?php
/**
 * 电子元器件商城 - 型号管理接口
 * 文件说明：提供产品型号列表、详情与查询接口，支持按品牌、分类筛选。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use think\facade\Db;
use think\facade\Log;
use think\facade\Cache;
use app\model\SkProductModel;
use app\model\SkBrand;
use app\model\SkCategory;
use app\model\SkProductPriceBreak;
use app\model\SkDocument;
use app\model\SkModelParamVal;
use app\model\SkAttribute;
use think\Response;

/**
 * 型号管理API控制器
 */
class ModelController extends BaseController
{
    /**
     * 获取型号列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();

            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $keyword = trim((string)($params['keyword'] ?? ''));
            $brandId = (int)($params['brand_id'] ?? 0);
            $categoryId = (int)($params['category_id'] ?? 0);
            $status = (int)($params['status'] ?? -1);

            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'model_index_' . $lang . '_p' . $page . '_l' . $limit . '_k' . $keyword . '_b' . $brandId . '_c' . $categoryId . '_s' . $status;

            $data = Cache::remember($cacheKey, function () use ($page, $limit, $keyword, $brandId, $categoryId, $status) {
                $query = SkProductModel::with(['brand', 'category'])->order('created_at', 'desc');

                if ($keyword !== '') {
                    $query->whereLike('model_code|model_name|series', "%{$keyword}%");
                }

                if ($brandId > 0) {
                    $query->where('brand_id', $brandId);
                }

                if ($categoryId > 0) {
                    $query->where('category_id', $categoryId);
                }

                if ($status >= 0) {
                    $query->where('status', $status);
                }

                $total = (clone $query)->count();
                $list = $query->page($page, $limit)->select()->toArray();

                return [
                    'total' => $total,
                    'list' => $list,
                    'page' => $page,
                    'limit' => $limit
                ];
            }, 3600);

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号详情（基础信息）
     */
    public function read(string $id): Response
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'model_read_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $model = SkProductModel::with(['brand', 'category', 'specifications'])->find($id);

            if (!$model) {
                return null;
            }

            return $model;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('型号不存在', 404);
            }

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号详情页（TI风格完整数据）
     * GET /api/v1/models/:id/detail
     */
    public function detail(string $id): Response
    {
        $lang = $this->getLangCode();
        $cacheKey = 'model_detail_' . $id . '_' . $lang;

        $detailData = Cache::remember($cacheKey, function () use ($id, $lang) {
            $model = SkProductModel::with(['brand', 'category', 'specifications'])->find($id);

            if (!$model) {
                return null;
            }

            // 获取价格阶梯
            $priceBreaks = $this->getModelPriceBreaks($id);

            // 获取技术文档
            $documents = $this->getModelDocuments($model);

            // 构建 TI 风格的型号详情数据结构
            $detailData = [
                // ========== 1. 头部信息 ==========
                'header' => [
                    'modelCode' => $model->model_code,
                    'modelName' => $model->model_name,
                    'status' => $this->getModelStatusText($model->status, $model->stock),
                    'statusCode' => $model->status,
                    'inStock' => $model->stock > 0,
                    'stockQuantity' => $model->stock,
                    'description' => $model->description ?? '',
                    'equivalentModel' => $model->model_code . '.B', // 等同产品
                ],

                // ========== 2. 产品图片 ==========
                'images' => [
                    'mainImage' => $this->getModelMainImage($model),
                    'thumbnail' => $this->getModelThumbnail($model),
                ],

                // ========== 3. 数据手册 ==========
                'datasheets' => $documents['datasheets'] ?? [],

                // ========== 4. 定价信息 ==========
                'pricing' => [
                    'currency' => 'USD',
                    'priceBreaks' => $priceBreaks,
                    'moq' => $model->moq ?? 1,
                ],

                // ========== 5. 质量信息 ==========
                'qualityInfo' => [
                    'grade' => [
                        'label' => '等级',
                        'value' => $model->material_type ?? '量产'
                    ],
                    'rohs' => [
                        'label' => 'RoHS',
                        'value' => '是'
                    ],
                    'reach' => [
                        'label' => 'REACH',
                        'value' => '是'
                    ],
                    'pinPlating' => [
                        'label' => '引脚镀层/焊球材料',
                        'value' => $model->pin_plating ?? 'NiPdAu'
                    ],
                    'msl' => [
                        'label' => 'MSL 等级/回流焊峰值温度',
                        'value' => 'Level-2-260C-1 YEAR'
                    ],
                    'reliability' => [
                        'label' => '质量、可靠性和封装信息',
                        'link' => '#'
                    ],
                ],

                // ========== 6. 封装信息 ==========
                'packageInfo' => [
                    'packageType' => [
                        'label' => '封装 | 引脚',
                        'value' => ($model->package_type ?? 'VQFN') . ' (' . ($model->pin_count ?? 16) . ')'
                    ],
                    'operatingTemperature' => [
                        'label' => '工作温度范围 (°C)',
                        'value' => $model->operating_temperature ?? '-40 to 125'
                    ],
                    'packaging' => [
                        'label' => '包装数量 | 包装',
                        'value' => $model->packaging_spec ?? '3,000 | LARGE T&R'
                    ],
                ],

                // ========== 7. 产品特性 ==========
                'features' => $this->getModelFeatures($model, $lang),

                // ========== 8. 详细说明 ==========
                'description' => [
                    'title' => $model->model_name . ' 的说明',
                    'content' => $this->getModelDescription($model, $lang)
                ],

                // ========== 9. 订购信息 ==========
                'orderInfo' => [
                    'purchaseButton' => [
                        'text' => '登录以订购',
                        'action' => 'login_to_order',
                        'url' => '/order/' . $model->model_code
                    ],
                    'checkStock' => [
                        'text' => '登录以查看库存',
                        'action' => 'login_check_stock'
                    ],
                    'leadTime' => ($model->lead_time ?? 0) > 0 ? ($model->lead_time . ' 天') : '8 周',
                    'regionSupport' => ['CN', 'US', 'EU', 'JP'],
                ],

                // ========== 10. 面包屑导航 ==========
                'breadcrumbs' => $this->getBreadcrumbs($model),

                // ========== 11. 关联资源 ==========
                'relatedResources' => [
                    'params' => [
                        'title' => '参数',
                        'link' => '/model/' . $model->id . '/params'
                    ],
                    'techDocs' => [
                        'title' => '技术文档',
                        'link' => '/model/' . $model->id . '/docs'
                    ],
                    'designDev' => [
                        'title' => '设计和开发',
                        'link' => '/model/' . $model->id . '/design'
                    ],
                    'support' => [
                        'title' => '支持和培训',
                        'link' => '/model/' . $model->id . '/support'
                    ],
                ],

                // ========== 12. 其他信息 ==========
                'exportControl' => [
                    'title' => '出口管制分类',
                    'note' => '*仅供参考',
                    'eccn' => '美国 ECCN: EAR99'
                ],

                // 原始数据保留
                'raw' => [
                    'id' => $model->id,
                    'categoryId' => $model->category_id,
                    'brandId' => $model->brand_id,
                    'series' => $model->series,
                    'createdAt' => $model->created_at,
                    'updatedAt' => $model->updated_at,
                ]
            ];

            return $detailData;
        }, 3600);

        try {
            if ($detailData === null) {
                return $this->error('型号不存在', 404);
            }

            // ========== 多语言翻译 ==========
            if ($lang !== 'zh-CN') {
                $i18nService = app(\app\service\I18nService::class);
                $modelId = (int)$id;

                // 1. 翻译型号名称和描述 (model模块)
                $modelTrans = $i18nService->getTranslations('model', [$modelId], $lang, ['model_name', 'description']);
                if (!empty($modelTrans[$modelId]['model_name'])) {
                    $detailData['header']['modelName'] = $modelTrans[$modelId]['model_name'];
                    $detailData['description']['title'] = $modelTrans[$modelId]['model_name'] . ' Description';
                }
                if (!empty($modelTrans[$modelId]['description'])) {
                    $detailData['header']['description'] = $modelTrans[$modelId]['description'];
                    // 用翻译后的描述替换生成的模板内容
                    $detailData['description']['content'] = $modelTrans[$modelId]['description'];
                }

                // 2. 翻译 UI 标签 (通过中文原文查找译文)
                $uiLabels = [
                    // qualityInfo 标签
                    '等级', 'RoHS', 'REACH', '引脚镀层/焊球材料',
                    'MSL 等级/回流焊峰值温度', '质量、可靠性和封装信息',
                    // qualityInfo 值
                    '是', '量产',
                    // packageInfo 标签
                    '封装 | 引脚', '工作温度范围 (°C)', '包装数量 | 包装',
                    // packageInfo 值
                    '卷带包装',
                    // orderInfo
                    '登录以订购', '登录以查看库存', '天', '周',
                    // relatedResources
                    '参数', '技术文档', '设计和开发', '支持和培训',
                    // exportControl
                    '出口管制分类', '*仅供参考', '美国 ECCN: EAR99',
                    // breadcrumbs
                    '首页', '的说明',
                    // status
                    '正在供货', '正在供货 (缺货)', '不建议用于新设计', '已停产',
                    // features
                    '符合 AEC-Q100 汽车级标准', '工作温度范围', '封装类型', '引脚数量',
                    '高性能、低功耗设计', '宽工作温度范围', '符合 RoHS 和 REACH 标准', '级别质量保证',
                ];
                $uiTrans = $i18nService->translateSourceTexts('ui', 0, $uiLabels, $lang);

                // 应用质量信息标签+值翻译
                foreach ($detailData['qualityInfo'] as $key => &$info) {
                    if (isset($info['label']) && isset($uiTrans[$info['label']])) {
                        $info['label'] = $uiTrans[$info['label']];
                    }
                    if (isset($info['value']) && isset($uiTrans[$info['value']])) {
                        $info['value'] = $uiTrans[$info['value']];
                    }
                }
                unset($info);

                // 应用封装信息标签+值翻译
                foreach ($detailData['packageInfo'] as $key => &$info) {
                    if (isset($info['label']) && isset($uiTrans[$info['label']])) {
                        $info['label'] = $uiTrans[$info['label']];
                    }
                    if (isset($info['value']) && isset($uiTrans[$info['value']])) {
                        $info['value'] = $uiTrans[$info['value']];
                    }
                }
                unset($info);

                // 订购信息
                if (isset($uiTrans['登录以订购'])) {
                    $detailData['orderInfo']['purchaseButton']['text'] = $uiTrans['登录以订购'];
                }
                if (isset($uiTrans['登录以查看库存'])) {
                    $detailData['orderInfo']['checkStock']['text'] = $uiTrans['登录以查看库存'];
                }
                // leadTime: "7 天" → "7 days" / "8 周" → "8 weeks"
                $leadTime = $detailData['orderInfo']['leadTime'] ?? '';
                if (strpos($leadTime, '天') !== false && isset($uiTrans['天'])) {
                    $detailData['orderInfo']['leadTime'] = str_replace('天', $uiTrans['天'], $leadTime);
                } elseif (strpos($leadTime, '周') !== false && isset($uiTrans['周'])) {
                    $detailData['orderInfo']['leadTime'] = str_replace('周', $uiTrans['周'], $leadTime);
                }

                // 关联资源
                $resKeys = ['params' => '参数', 'techDocs' => '技术文档', 'designDev' => '设计和开发', 'support' => '支持和培训'];
                foreach ($resKeys as $rk => $zhLabel) {
                    if (isset($uiTrans[$zhLabel])) {
                        $detailData['relatedResources'][$rk]['title'] = $uiTrans[$zhLabel];
                    }
                }

                // 出口管制
                if (isset($uiTrans['出口管制分类'])) {
                    $detailData['exportControl']['title'] = $uiTrans['出口管制分类'];
                }
                if (isset($uiTrans['*仅供参考'])) {
                    $detailData['exportControl']['note'] = $uiTrans['*仅供参考'];
                }
                if (isset($uiTrans['美国 ECCN: EAR99'])) {
                    $detailData['exportControl']['eccn'] = $uiTrans['美国 ECCN: EAR99'];
                }

                // header.status 翻译
                $statusText = $detailData['header']['status'] ?? '';
                if ($statusText !== '' && isset($uiTrans[$statusText])) {
                    $detailData['header']['status'] = $uiTrans[$statusText];
                }

                // features 翻译
                if (!empty($detailData['features'])) {
                    $translatedFeatures = [];
                    foreach ($detailData['features'] as $feat) {
                        // 完整匹配
                        if (isset($uiTrans[$feat])) {
                            $translatedFeatures[] = $uiTrans[$feat];
                            continue;
                        }
                        // 前缀匹配: "工作温度范围: xxx" → "Operating temperature: xxx"
                        $translated = false;
                        foreach (['工作温度范围', '封装类型', '引脚数量'] as $prefix) {
                            if (strpos($feat, $prefix . ': ') === 0 && isset($uiTrans[$prefix])) {
                                $translatedFeatures[] = $uiTrans[$prefix] . ': ' . substr($feat, strlen($prefix) + 2);
                                $translated = true;
                                break;
                            }
                        }
                        if (!$translated) {
                            $translatedFeatures[] = $feat;
                        }
                    }
                    $detailData['features'] = $translatedFeatures;
                }

                // 3. 翻译面包屑导航 (分类/品牌模块)
                if (!empty($detailData['breadcrumbs'])) {
                    // 首页
                    if (isset($uiTrans['首页'])) {
                        $detailData['breadcrumbs'][0]['label'] = $uiTrans['首页'];
                    }
                    // 分类名
                    $categoryId = $detailData['raw']['categoryId'] ?? 0;
                    if ($categoryId > 0) {
                        $catTrans = $i18nService->getTranslations('category', [$categoryId], $lang, ['name']);
                        if (!empty($catTrans[$categoryId]['name'])) {
                            foreach ($detailData['breadcrumbs'] as &$bc) {
                                if (strpos($bc['link'], '/category/') === 0) {
                                    $bc['label'] = $catTrans[$categoryId]['name'];
                                    break;
                                }
                            }
                            unset($bc);
                        }
                    }
                    // 品牌名
                    $brandId = $detailData['raw']['brandId'] ?? 0;
                    if ($brandId > 0) {
                        $brandTrans = $i18nService->getTranslations('brand', [$brandId], $lang, ['brand_name']);
                        if (!empty($brandTrans[$brandId]['brand_name'])) {
                            foreach ($detailData['breadcrumbs'] as &$bc) {
                                if (strpos($bc['link'], '/brand/') === 0) {
                                    $bc['label'] = $brandTrans[$brandId]['brand_name'];
                                    break;
                                }
                            }
                            unset($bc);
                        }
                    }
                }

                // 4. 翻译 raw.series (product模块: 系列名称)
                $seriesName = $detailData['raw']['series'] ?? '';
                if ($seriesName !== '') {
                    // 通过系列中文名查找 product 模块翻译
                    $seriesTrans = $i18nService->translateSourceTexts('product', 0, [$seriesName], $lang);
                    if (isset($seriesTrans[$seriesName]) && $seriesTrans[$seriesName] !== $seriesName) {
                        $detailData['raw']['series'] = $seriesTrans[$seriesName];
                    }
                }
            }

            return $this->success($detailData);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号状态文本
     */
    private function getModelStatusText($status, int $stock): string
    {
        $statusStr = strval($status);
        if ($statusStr === 'Active' || $statusStr === '1' || $statusStr === 'active') {
            if ($stock > 0) {
                return '正在供货';
            } else {
                return '正在供货 (缺货)';
            }
        } elseif ($statusStr === 'NRND') {
            return '不建议用于新设计';
        } elseif ($statusStr === 'Obsolete') {
            return '已停产';
        }
        return $statusStr;
    }

    /**
     * 获取型号主图
     */
    private function getModelMainImage($model): string
    {
        // 优先使用型号自己的图片，如果没有则使用关联产品的图片
        if (!empty($model->image)) {
            return $this->getFullImageUrl($model->image);
        }

        // 从关联产品中获取第一张图片
        if (!empty($model->products)) {
            foreach ($model->products as $product) {
                if (!empty($product->images)) {
                    $images = is_string($product->images) ? json_decode($product->images, true) : $product->images;
                    if (!empty($images[0])) {
                        return $this->getFullImageUrl($images[0]);
                    }
                }
            }
        }

        // 返回默认图片
        return 'http://159.89.190.22:8000/static/images/model-default.png';
    }

    /**
     * 获取型号缩略图
     */
    private function getModelThumbnail($model): string
    {
        return $this->getModelMainImage($model);
    }

    /**
     * 获取完整图片URL
     */
    private function getFullImageUrl($imagePath): string
    {
        if (empty($imagePath)) {
            return '';
        }

        if (strpos($imagePath, 'http') === 0) {
            return $imagePath;
        }

        $baseUrl = 'http://159.89.190.22:8000';
        return $baseUrl . $imagePath;
    }

    /**
     * 获取型号价格阶梯
     */
    private function getModelPriceBreaks($modelId): array
    {
        // 通过型号关联的产品获取价格阶梯
        // 注意：价格阶梯表使用 product_id 而非 model_id
        $model = SkProductModel::find($modelId);
        $result = [];

        if ($model && !empty($model->products)) {
            // 获取第一个关联产品的价格阶梯
            $firstProduct = $model->products->first();
            if ($firstProduct) {
                $priceBreaks = SkProductPriceBreak::where('product_id', $firstProduct->id)
                    ->order('quantity', 'asc')
                    ->select();

                if ($priceBreaks && count($priceBreaks) > 0) {
                    foreach ($priceBreaks as $pb) {
                        $result[] = [
                            'quantity' => $pb->quantity,
                            'price' => floatval($pb->price),
                            'currency' => $pb->currency ?? 'USD'
                        ];
                    }
                }
            }
        }

        // 如果没有找到价格阶梯，使用默认值
        if (empty($result)) {
            $result = [
                ['quantity' => '1-99', 'price' => 10.38, 'currency' => 'USD'],
                ['quantity' => '100-249', 'price' => 8.47, 'currency' => 'USD'],
                ['quantity' => '250-999', 'price' => 6.65, 'currency' => 'USD'],
                ['quantity' => '1,000+', 'price' => 5.64, 'currency' => 'USD'],
            ];
        }

        return $result;
    }

    /**
     * 获取型号技术文档（优先从 sk_product_document 表读取）
     */
    private function getModelDocuments($model): array
    {
        $datasheets = [];

        $modelId = $model->id;
        $seriesId = $model->series_id ?? null;

        // 从 sk_product_document 表查询文档（型号级 + 系列级）
        $docQuery = \think\facade\Db::name('sk_product_document')
            ->where('status', 1)
            ->where(function($q) use ($modelId, $seriesId) {
                $q->where('model_id', $modelId);
                if ($seriesId) {
                    $q->whereOr('series_id', $seriesId);
                }
            })
            ->order('doc_type', 'asc')
            ->select()
            ->toArray();

        foreach ($docQuery as $doc) {
            $datasheets[] = [
                'id' => 'doc-' . $doc['id'],
                'title' => $doc['title'],
                'description' => $doc['title'],
                'type' => $doc['doc_type'],
                'version' => $doc['version'] ?? 'Rev. A',
                'language' => $doc['language'] ?? 'zh-CN',
                'pdfUrl' => $doc['file_url'],
                'htmlUrl' => '',
                'fileSize' => $doc['file_size'] ?? '2.5MB',
                'uploadDate' => $doc['upload_time'] ?? $model->updated_at ?? date('Y-m-d'),
            ];
        }

        // Fallback: 从原 datasheet_url 字段
        if (empty($datasheets) && !empty($model->datasheet_url)) {
            $datasheets[] = [
                'id' => 'ds-001',
                'title' => $model->model_name . ' 数据手册',
                'description' => $model->model_name . ' 的电气特性、典型应用、绝对最大额定值等详细信息',
                'type' => 'datasheet',
                'version' => 'Rev. A',
                'language' => 'zh-CN',
                'pdfUrl' => $model->datasheet_url,
                'htmlUrl' => str_replace('.pdf', '.html', $model->datasheet_url),
                'fileSize' => '2.5MB',
                'uploadDate' => $model->updated_at ?? date('Y-m-d'),
            ];
        }

        return ['datasheets' => $datasheets];
    }

    /**
     * 获取型号特性
     */
    private function getModelFeatures($model, string $lang): array
    {
        $features = [];

        // 从规格参数中提取特性
        if (!empty($model->specifications)) {
            foreach ($model->specifications as $spec) {
                if (!empty($spec->spec_value)) {
                    $specName = $spec->spec_name ?? '';
                    $specValue = $spec->spec_value;

                    // 根据规格名称判断是否为特性
                    if (stripos($specName, '频率') !== false ||
                        stripos($specName, '带宽') !== false) {
                        $features[] = '带宽: ' . $specValue;
                    } elseif (stripos($specName, '增益') !== false) {
                        $features[] = '可编程增益: ' . $specValue;
                    } elseif (stripos($specName, '噪声') !== false) {
                        $features[] = '输入参考噪声: ' . $specValue;
                    } elseif (stripos($specName, '功耗') !== false ||
                               stripos($specName, '电流') !== false) {
                        $features[] = '静态电流: ' . $specValue;
                    } elseif (stripos($specName, '封装') !== false) {
                        $features[] = '封装: ' . $specValue;
                    }
                }
            }
        }

        // 如果规格中没有足够的特性，添加默认值
        if (count($features) < 3) {
            $defaultFeatures = [
                '符合 AEC-Q100 汽车级标准',
                '工作温度范围: ' . ($model->operating_temperature ?? '-40°C 至 +125°C'),
                '封装类型: ' . ($model->package_type ?? 'QFN'),
                '引脚数量: ' . ($model->pin_count ?? 16),
            ];
            $features = array_merge($features, $defaultFeatures);
        }

        return array_slice($features, 0, 10);
    }

    /**
     * 获取型号详细描述
     */
    private function getModelDescription($model, string $lang): string
    {
        $description = '';

        // 使用型号描述
        if (!empty($model->description)) {
            $description .= $model->description . "\n\n";
        }

        // 添加型号基本信息
        $description .= $model->model_name . ' 器件是一款';
        if (!empty($model->series)) {
            $description .= $model->series . '系列';
        }
        $description .= '高性能芯片，适用于各种应用场景。';
        $description .= "\n\n";

        // 添加封装信息
        $description .= '该器件采用 ' . ($model->package_type ?? '标准') . ' 封装';
        if ($model->pin_count > 0) {
            $description .= '，具有 ' . $model->pin_count . ' 个引脚';
        }
        $description .= '。';
        $description .= "\n\n";

        // 添加应用说明
        $description .= '主要特点：\n';
        $description .= '• 高性能、低功耗设计\n';
        $description .= '• 宽工作温度范围 (' . ($model->operating_temperature ?? '-40°C 至 +125°C') . ')\n';
        $description .= '• 符合 RoHS 和 REACH 标准\n';
        $description .= '• ' . ($model->material_type ?? '量产') . ' 级别质量保证\n';

        return $description;
    }

    /**
     * 获取面包屑导航
     */
    private function getBreadcrumbs($model): array
    {
        $breadcrumbs = [];

        // 首页
        $breadcrumbs[] = [
            'label' => '首页',
            'link' => '/'
        ];

        // 产品分类
        if (!empty($model->category)) {
            $breadcrumbs[] = [
                'label' => $model->category->name ?? '产品',
                'link' => '/category/' . $model->category_id
            ];
        } else {
            $breadcrumbs[] = [
                'label' => '产品',
                'link' => '/products'
            ];
        }

        // 品牌/系列
        if (!empty($model->brand)) {
            $breadcrumbs[] = [
                'label' => $model->brand->brand_name ?? $model->series ?? '系列',
                'link' => '/brand/' . $model->brand_id
            ];
        }

        // 当前型号
        $breadcrumbs[] = [
            'label' => $model->model_code,
            'link' => '/model/' . $model->id
        ];

        return $breadcrumbs;
    }

    /**
     * 创建型号
     */
    public function save(): Response
    {
        try {
            $data = $this->request->post();

            // 验证数据
            $validate = $this->validate($data, [
                'model_code' => 'require|unique:sk_product_models',
                'model_name' => 'require',
                'category_id' => 'require|integer',
                'brand_id' => 'require|integer',
            ]);

            if (true !== $validate) {
                return $this->error($validate, 400);
            }

            $model = SkProductModel::create($data);

            return $this->success($model, '型号创建成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新型号
     */
    public function update(int $id): Response
    {
        try {
            $model = SkProductModel::find($id);

            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            $data = $this->request->put();

            // 验证数据
            $validate = $this->validate($data, [
                'model_code' => 'require|unique:sk_product_models,model_code,' . $id,
                'model_name' => 'require',
                'category_id' => 'require|integer',
                'brand_id' => 'require|integer',
            ]);

            if (true !== $validate) {
                return $this->error($validate, 400);
            }

            $model->save($data);

            return $this->success($model, '型号更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除型号
     */
    public function delete(int $id): Response
    {
        try {
            $model = SkProductModel::find($id);

            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            // 检查是否有产品关联
            if ($model->products()->count() > 0) {
                return $this->error('该型号下有产品关联，无法删除', 400);
            }

            $model->delete();

            return $this->success([], '型号删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 按分类获取型号
     */
    public function getModelsByCategory(int $categoryId): Response
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'model_getModelsByCategory_' . $categoryId . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($categoryId) {
            $models = SkProductModel::where('category_id', $categoryId)->active()->select();

            return $models;
        }, 3600);

        try {
            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 按品牌获取型号
     */
    public function getModelsByBrand(int $brandId): Response
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'model_getModelsByBrand_' . $brandId . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($brandId) {
            $models = SkProductModel::where('brand_id', $brandId)->active()->select();

            return $models;
        }, 3600);

        try {
            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号的技术规格
     */
    public function getTechnicalSpecs(int $id): Response
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'model_getTechnicalSpecs_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $model = SkProductModel::with('specifications')->find($id);

            if (!$model) {
                return null;
            }

            return $model->specifications;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('型号不存在', 404);
            }

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新型号的技术规格
     */
    public function updateTechnicalSpecs(int $id): Response
    {
        try {
            $model = SkProductModel::find($id);

            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            $specs = $this->request->put('specifications');

            // 删除旧的规格
            $model->specifications()->delete();

            // 添加新的规格
            if (is_array($specs)) {
                foreach ($specs as $spec) {
                    $model->specifications()->create($spec);
                }
            }

            return $this->success([], '技术规格更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号库存分布（按仓库）
     *
     * @access public
     * @param int $id 型号ID
     * @return Response
     */
    public function stockLocations(int $id): Response
    {
        try {
            $model = SkProductModel::field('id, series_id, stock')->find($id);
            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            $productId = (int)$model->series_id;
            if ($productId <= 0) {
                return $this->success([]);
            }

            // 按仓库ID汇总可用库存
            $inventoryRows = Db::name('sk_inventory')
                ->where('product_id', $productId)
                ->field('warehouse_id, SUM(available_quantity) as available_stock, safety_stock')
                ->group('warehouse_id')
                ->select()
                ->toArray();

            $locations = [];
            foreach ($inventoryRows as $row) {
                $stock = (int)($row['available_stock'] ?? 0);
                $safetyStock = (int)($row['safety_stock'] ?? 0);
                $warehouseId = (int)($row['warehouse_id'] ?? 0);

                if ($stock <= 0) {
                    $status = 'out_of_stock';
                } elseif ($safetyStock > 0 && $stock < $safetyStock) {
                    $status = 'low_stock';
                } else {
                    $status = 'in_stock';
                }

                $warehouseName = $warehouseId > 0 ? ('Warehouse ' . $warehouseId) : 'Main Warehouse';
                $warehouseCode = $warehouseId > 0 ? ('WH' . $warehouseId) : 'MAIN';

                $locations[] = [
                    'warehouse' => $warehouseName,
                    'warehouse_code' => $warehouseCode,
                    'stock' => $stock,
                    'status' => $status,
                ];
            }

            return $this->success($locations);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取型号可下载资料
     *
     * @access public
     * @param int $id 型号ID
     * @return Response
     */
    public function downloads(int $id): Response
    {
        try {
            $model = SkProductModel::field('id, series_id, model_code, model_name, datasheet_url')->find($id);
            if (!$model) {
                return $this->error('型号不存在', 404);
            }

            $modelId = (int)$model->id;
            $seriesId = (int)$model->series_id;

            // 文档类型映射：数据库枚举 -> 前端类型
            $typeMap = [
                'datasheet' => 'datasheet',
                'application_note' => 'app_note',
                'reference_design' => 'ecad',
                'cad_model' => '3d_model',
                'certification' => 'spec_report',
                'soldering_guide' => 'app_note',
            ];

            $documents = [];

            // 从 sk_product_document 表读取（型号级 + 系列级）
            $docQuery = Db::name('sk_product_document')
                ->where('status', 1)
                ->where(function ($q) use ($modelId, $seriesId) {
                    $q->where('model_id', $modelId);
                    if ($seriesId > 0) {
                        $q->whereOr('series_id', $seriesId);
                    }
                })
                ->order('doc_type', 'asc')
                ->select()
                ->toArray();

            foreach ($docQuery as $doc) {
                $docType = $doc['doc_type'] ?? 'datasheet';
                $documents[] = [
                    'id' => 'doc-' . $doc['id'],
                    'title' => $doc['title'] ?? ($model->model_name . ' Document'),
                    'type' => $typeMap[$docType] ?? 'datasheet',
                    'url' => $doc['file_url'] ?? '',
                    'file_size' => $doc['file_size'] ?? '',
                    'language' => $doc['language'] ?? 'zh-CN',
                ];
            }

            // Fallback：如果没有任何文档且 datasheet_url 有值，返回默认数据手册
            if (empty($documents) && !empty($model->datasheet_url)) {
                $documents[] = [
                    'id' => 'ds-' . $modelId,
                    'title' => $model->model_name . ' Datasheet',
                    'type' => 'datasheet',
                    'url' => $model->datasheet_url,
                    'file_size' => '2.5MB',
                    'language' => 'zh-CN',
                ];
            }

            return $this->success($documents);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 型号参数对比
     */
    public function compare(): Response
    {
        try {
            $data = $this->request->post();
            $modelIds = isset($data['model_ids']) ? (array)$data['model_ids'] : [];

            if (empty($modelIds)) {
                return $this->error('请选择要对比的型号');
            }

            $modelIds = array_map('intval', $modelIds);
            $modelIds = array_filter($modelIds, function ($id) { return $id > 0; });
            $modelIds = array_slice($modelIds, 0, 4);

            $models = SkProductModel::with(['brand'])->whereIn('id', $modelIds)->select();

            if ($models->isEmpty()) {
                return $this->error('未找到型号数据');
            }

            $modelList = [];
            $allParamValues = [];
            $paramNameMap = [];

            foreach ($models as $model) {
                $brandName = $model->brand ? $model->brand->brand_name : '';

                $modelList[] = [
                    'id' => $model->id,
                    'model_code' => $model->model_code,
                    'model_name' => $model->model_name,
                    'brand_name' => $brandName,
                    'stock' => $model->stock ?? 0,
                    'unit_price' => $model->getAttr('pricing_unit_price') ?? 0,
                ];

                $paramVals = SkModelParamVal::with(['param'])
                    ->where('model_id', $model->id)
                    ->select();

                foreach ($paramVals as $pv) {
                    $paramId = $pv->param_id;
                    if (!isset($paramNameMap[$paramId])) {
                        $paramNameMap[$paramId] = $pv->param ? $pv->param->name : "参数{$paramId}";
                    }

                    if (!isset($allParamValues[$paramId])) {
                        $allParamValues[$paramId] = [];
                    }

                    $value = $pv->value;
                    if ($value === null || $value === '') {
                        $value = $pv->value_numeric !== null ? (string)$pv->value_numeric : '';
                    }
                    $allParamValues[$paramId][$model->id] = $value;
                }
            }

            // === I18n: model_name / brand_name / 参数名翻译 ===
            $i18nService = app(\app\service\I18nService::class);
            $lang = $this->getLangCode();

            // model_name 翻译（model 模块）
            $modelTrans = $i18nService->getTranslations('model', $modelIds, $lang, ['model_name']);

            // brand_name 翻译（brand 模块，字段名是 brand_name）
            $brandIds = array_values(array_unique(array_filter(array_map(function ($m) {
                return $m->brand_id ?? null;
            }, $models->all()))));
            $brandTrans = !empty($brandIds)
                ? $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name'])
                : [];

            $modelBrandMap = [];
            foreach ($models as $model) {
                $modelBrandMap[$model->id] = $model->brand_id ?? null;
            }

            foreach ($modelList as &$item) {
                if (isset($modelTrans[$item['id']]['model_name'])) {
                    $item['model_name'] = $modelTrans[$item['id']]['model_name'];
                }
                $brandId = $modelBrandMap[$item['id']] ?? null;
                if ($brandId && isset($brandTrans[$brandId]['brand_name'])) {
                    $item['brand_name'] = $brandTrans[$brandId]['brand_name'];
                }
            }
            unset($item);

            // 参数名翻译（attribute 模块）
            $paramIds = array_keys($paramNameMap);
            if (!empty($paramIds)) {
                $attrTrans = $i18nService->getTranslations('attribute', $paramIds, $lang, ['name']);
                foreach ($paramNameMap as $pid => $pname) {
                    if (isset($attrTrans[$pid]['name'])) {
                        $paramNameMap[$pid] = $attrTrans[$pid]['name'];
                    }
                }
            }

            $params = [];
            foreach ($allParamValues as $paramId => $values) {
                $paramValues = [];
                foreach ($modelIds as $mid) {
                    $paramValues[] = isset($values[$mid]) ? $values[$mid] : '';
                }

                $uniqueVals = array_unique(array_filter($paramValues, function ($v) { return $v !== ''; }));
                $hasDiff = count($uniqueVals) > 1;

                $params[] = [
                    'name' => $paramNameMap[$paramId],
                    'label' => $paramNameMap[$paramId],
                    'values' => $paramValues,
                    'has_diff' => $hasDiff,
                ];
            }

            return $this->success([
                'models' => $modelList,
                'params' => $params,
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
