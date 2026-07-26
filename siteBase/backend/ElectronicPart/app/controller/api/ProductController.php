<?php
/**
 * 电子元器件商城 - 商品接口
 * 文件说明：提供商品列表、详情、分类与品牌聚合信息，适配前端商品展示与筛选需求。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProduct;
use app\model\SkCategory;
use app\model\SkBrand;
use think\Response;
use think\facade\Log;

/**
 * 商品API控制器
 * @package app\controller\api
 */
class ProductController extends BaseController
{
    /**
     * 获取商品列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();

            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 50);
            $keyword = trim((string)($params['keyword'] ?? ''));
            $categoryId = (int)($params['category_id'] ?? 0);
            $subcategory = trim((string)($params['subcategory'] ?? ''));
            $rating = trim((string)($params['rating'] ?? ''));
            
            // 筛选条件
            $inStock = isset($params['in_stock']) ? (bool)$params['in_stock'] : null;
            $normallyStocked = isset($params['normally_stocked']) ? (bool)$params['normally_stocked'] : null;
            $active = isset($params['active']) ? (bool)$params['active'] : null;
            $newProducts = isset($params['new_products']) ? (bool)$params['new_products'] : null;
            $rohsCompliant = isset($params['rohs_compliant']) ? (bool)$params['rohs_compliant'] : null;

            $lang = $this->getLang();
            $cacheKey = 'product_index_' . $lang . '_' . md5(json_encode($params));

            $result = \think\facade\Cache::remember($cacheKey, function () use ($params, $page, $limit, $keyword, $categoryId, $subcategory, $rating, $inStock, $normallyStocked, $active, $newProducts, $rohsCompliant) {
                $query = SkProduct::with(['series', 'seriesModels'])->active()->order('created_at', 'desc')->order('id', 'desc');

                if ($keyword !== '') {
                    $query->whereLike('name|product_code|description', "%{$keyword}%");
                }
                if ($categoryId > 0) {
                    $query->where('category_id', $categoryId);
                }
                if ($subcategory !== '') {
                    $query->where('subcategory', $subcategory);
                }
                if ($rating !== '') {
                    $query->where('rating', $rating);
                }
                
                // 应用筛选条件
                if ($inStock !== null && $inStock) {
                    $query->where('stock', '>', 0);
                }
                if ($normallyStocked !== null) {
                    $query->where('normally_stocked', $normallyStocked ? 1 : 0);
                }
                if ($active !== null) {
                    $query->where('is_on_sale', $active ? 1 : 0);
                }
                if ($newProducts !== null) {
                    $query->whereRaw('1=1');
                }
                if ($rohsCompliant !== null) {
                    $query->where('rohs_compliant', $rohsCompliant ? 1 : 0);
                }

                $total = (clone $query)->count();
                $list = $query->page($page, $limit)->select();
                
                // 本地化产品数据
                $localizedFields = ['name', 'description'];
                $list = $this->localizeCollection($list, $localizedFields);

                // 格式化产品列表
                $products = [];
                foreach ($list as $item) {
                    // 优先取关联型号列表的第一个作为主型号
                    $seriesModels = $item->seriesModels;
                    $primaryModel = ($seriesModels && count($seriesModels) > 0) ? $seriesModels[0] : null;
                    $products[] = [
                        'id' => $item['id'],
                        'name' => $item['name'] ?? '',
                        'product_number' => $item['product_code'] ?? $item['product_name'] ?? '',
                        'model_id' => $primaryModel ? $primaryModel['id'] : null,
                        'model_code' => $primaryModel ? ($primaryModel['model_code'] ?? '') : '',
                        'model_name' => $primaryModel ? ($primaryModel['model_name'] ?? '') : '',
                        'new' => false,
                        'datasheet_link' => 'PDF',
                        'html_link' => 'HTML',
                        'images' => $item['images'] ? $this->getFullImageUrl($item['images']) : '',
                        'description' => $item['description'] ?? '',
                        'category' => $item['category'] ?? '',
                        'subcategory' => $item['subcategory'] ?? '',
                        'rating' => 'Catalog',
                        'operating_temperature_range_celsius' => '',
                        'ti_functional_safety_category' => '/',
                        'package_type' => '',
                        'pin_count' => 0,
                        'stock' => $item['stock'] ?? 0,
                        'normally_stocked' => false,
                        'rohs_compliant' => false
                    ];
                }

                $start = ($page - 1) * $limit + 1;
                $end = min($page * $limit, $total);

                return [
                    'total_products' => $total,
                    'current_page_range' => "{$start} to {$end} of {$total}",
                    'products' => $products
                ];
            }, 3600);

            return $this->success($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取商品详情
     */
    public function read(string $id): Response
    {
        try {
            // 使用正确的表 sk_products，并加载属性关联和型号关联
            $product = SkProduct::with(['attributes', 'seriesModels'])->find($id);

            if (!$product) {
                return $this->error('商品不存在', 404);
            }

            // 增加浏览量（不缓存）
            $product->views = (int)($product->views) + 1;
            $product->save();

            $lang = $this->getLangCode();
            $cacheKey = 'product_read_' . $lang . '_' . $id;

            $detailData = \think\facade\Cache::remember($cacheKey, function () use ($id, $lang) {
                $product = SkProduct::with(['attributes', 'seriesModels'])->find($id);
            
                // 本地化产品数据 - 添加features特性字段
                $localizedFields = ['name', 'description', 'features'];
                $productData = $this->localizeItem($product, $localizedFields);
                $productName = $productData['name'] ?? $product->name ?? '';

                // 获取 product_ui 静态标签翻译
                $uiLabels = $this->getProductUILabels($lang);
                
                // 获取产品规格参数 (从关联型号的参数值中获取)
                $specs = [];
                // 优先取关联型号列表的第一个作为主型号
                $seriesModels = $product->seriesModels;
                $primaryModel = ($seriesModels && count($seriesModels) > 0) ? $seriesModels[0] : null;
                $modelId = $primaryModel ? $primaryModel['id'] : null;
                
                // 1. 从 sk_model_param_val 表获取技术参数（新表优先）
                if ($modelId) {
                    $modelParams = \think\facade\Db::name('sk_model_param_val')
                        ->alias('mpv')
                        ->leftJoin('sk_attribute a', 'mpv.param_id = a.id')
                        ->where('mpv.model_id', $modelId)
                        ->field('a.name as spec_name, mpv.value, mpv.value_numeric')
                        ->select()
                        ->toArray();
                    foreach ($modelParams as $mp) {
                        $specName = $mp['spec_name'] ?? '';
                        $specValue = $mp['value'] ?? ($mp['value_numeric'] ?? '');
                        if (!empty($specName)) {
                            $specs[] = [
                                'spec_name' => $specName,
                                'value' => $specValue
                            ];
                        }
                    }
                }
                
                // 2. 从sk_product_attribute关联中获取技术参数（旧表 fallback）
                if ($product->attributes && count($product->attributes) > 0) {
                    foreach ($product->attributes as $attr) {
                        if (!empty($attr->attribute_value)) {
                            $specName = '';
                            if ($attr->attribute) {
                                $specName = $attr->attribute->getLocalizedField('name', $lang);
                            } else {
                                $attrDef = \app\model\SkAttribute::find($attr->attribute_id);
                                if ($attrDef) {
                                    $specName = $attrDef->getLocalizedField('name', $lang);
                                } else {
                                    $specName = '属性'.$attr->attribute_id;
                                }
                            }
                            $exists = false;
                            foreach ($specs as $s) {
                                if ($s['spec_name'] === $specName) {
                                    $exists = true;
                                    break;
                                }
                            }
                            if (!$exists && !empty($specName)) {
                                $specs[] = [
                                    'spec_name' => $specName,
                                    'value' => $attr->attribute_value
                                ];
                            }
                        }
                    }
                }
                
                // 3. 如果specs字段有数据，也合并进来
                if ($product->specs) {
                    $specsArray = $product->specs;
                    if (is_string($specsArray)) {
                        $decoded = json_decode($specsArray, true);
                        if (is_array($decoded)) {
                            $specsArray = $decoded;
                        }
                    }
                    if (is_array($specsArray)) {
                        foreach ($specsArray as $spec) {
                            $specName = $spec['spec_name'] ?? $spec['name'] ?? '';
                            $specValue = $spec['spec_value'] ?? $spec['value'] ?? '';
                            $exists = false;
                            foreach ($specs as $s) {
                                if ($s['spec_name'] === $specName) {
                                    $exists = true;
                                    break;
                                }
                            }
                            if (!$exists && !empty($specName)) {
                                $specs[] = [
                                    'spec_name' => $specName,
                                    'value' => $specValue
                                ];
                            }
                        }
                    }
                }
                
                // 获取产品图片
                $images = [];
                if ($product->images) {
                    $imagesArray = $product->images;
                    if (is_array($imagesArray)) {
                        $baseUrl = 'http://159.89.190.22:8000';
                        $images = array_map(function($img) use ($baseUrl) {
                            if (!empty($img) && strpos($img, 'http') !== 0) {
                                return $baseUrl . $img;
                            }
                            return $img;
                        }, $imagesArray);
                    }
                }
                
                // 获取型号数据（如果存在）
                $modelData = $primaryModel ?? null;

                // 从 sk_product_document 表获取技术文档
                $documents = [];
                $seriesId = $product->series_id;
                if ($modelId || $seriesId) {
                    $docQuery = \think\facade\Db::name('sk_product_document')
                        ->where('status', 1)
                        ->where(function($q) use ($modelId, $seriesId) {
                            if ($modelId) {
                                $q->where('model_id', $modelId);
                            }
                            if ($seriesId) {
                                $q->whereOr('series_id', $seriesId);
                            }
                        })
                        ->select()
                        ->toArray();
                    foreach ($docQuery as $doc) {
                        $documents[] = [
                            'docId' => 'doc-' . $doc['id'],
                            'docName' => $doc['title'],
                            'docType' => $doc['doc_type'],
                            'docSize' => $doc['file_size'] ?? '2.5MB',
                            'downloadUrl' => $doc['file_url'],
                            'uploadTime' => $this->formatDate($doc['upload_time'] ?? $product->update_time),
                            'language' => $doc['language'] ?? 'zh-CN',
                            'description' => $doc['title'],
                        ];
                    }
                }
                // Fallback: hardcoded documents
                if (empty($documents)) {
                    $documents[] = [
                        'docId' => 'doc-001',
                        'docName' => $productName . ' ' . $uiLabels[1],
                        'docType' => 'datasheet',
                        'docSize' => '5MB',
                        'downloadUrl' => $product->datasheet_url ?? $product->links_datasheet_url ?? '#',
                        'uploadTime' => $this->formatDate($product->update_time),
                        'language' => $lang,
                        'description' => $productName . ' ' . $uiLabels[3]
                    ];
                }
                
                // 构建产品详情数据结构，匹配前端页面需求
                $detailData = [
                    // ========== 1. 页面基础信息 ==========
                    'pageBaseInfo' => [
                        'productId' => $product->product_code ?? $product->id,
                        'productName' => $productName,
                        'productAlias' => $productData['description'] ?? '',
                        'language' => $lang,
                        'currency' => $product->pricing_currency ?? 'USD',
                        'isPreOrder' => $product->stock <= 0,
                        'viewCount' => $product->views ?? 0,
                        'createTime' => $this->formatDate($product->create_time),
                        'updateTime' => $this->formatDate($product->update_time)
                    ],
                    
                    // ========== 2. 产品参数（参数规格） ==========
                    'productParameters' => array_map(function($spec) {
                        return [
                            'paramName' => $spec['spec_name'],
                            'paramValue' => $spec['value'],
                            'paramUnit' => ''
                        ];
                    }, $specs),
                    
                    // ========== 3. 技术文档（文档列表） ==========
                    'technicalDocuments' => $documents,
                    
                    // ========== 4. 设计与开发（资源分类 + 资源列表） ==========
                    'designAndDevelop' => [
                        'hardwareDev' => [
                            [
                                'resourceId' => 'hw-001',
                                'resourceName' => $productName . ' ' . $uiLabels[2],
                                'resourceDesc' => $productName . ' ' . $uiLabels[4] . ' ' . $productName . $uiLabels[5],
                                'downloadUrl' => '#',
                                'fileSize' => '300MB',
                                'uploadTime' => $this->formatDate($product->update_time),
                                'actionBtn' => $uiLabels[6]
                            ]
                        ],
                        'softwareDev' => [
                            [
                                'resourceId' => 'sw-001',
                                'resourceName' => $productName . ' ' . $uiLabels[7],
                                'resourceDesc' => $productName . $uiLabels[8],
                                'downloadUrl' => '#',
                                'fileSize' => '50KB',
                                'uploadTime' => $this->formatDate($product->update_time),
                                'actionBtn' => $uiLabels[9]
                            ]
                        ],
                        'designTools' => [
                            [
                                'resourceId' => 'tool-001',
                                'resourceName' => $uiLabels[10],
                                'resourceDesc' => $uiLabels[11],
                                'downloadUrl' => '#',
                                'fileSize' => '10MB',
                                'uploadTime' => $this->formatDate($product->update_time),
                                'actionBtn' => $uiLabels[6]
                            ]
                        ],
                        'cadCaemodels' => [
                            [
                                'modelId' => 'model-001',
                                'modelName' => $productName . ' ' . ($product->package_type ?? 'SOT-23-5') . ' ' . $uiLabels[12],
                                'modelType' => $product->package_type ?? 'SOT-23-5',
                                'modelFormat' => 'IBIS',
                                'downloadUrl' => '#',
                                'fileSize' => '500KB',
                                'uploadTime' => $this->formatDate($product->update_time),
                                'actionBtn' => $uiLabels[13]
                            ]
                        ]
                    ],
                    
                    // ========== 5. 订购和质量（订购信息 + 质量管控） ==========
                    'orderAndQuality' => [
                        'orderInfo' => [
                            'moq' => strval($modelData->moq ?? $product->inventory_min_order_quantity ?? 3000),
                            'packaging' => $modelData->packaging_spec ?? $product->package_packaging ?? $uiLabels[14],
                            'packagingSpec' => $modelData->packaging_spec ?? $product->package_packaging ?? 'Tube: 100pcs/tube',
                            'leadTime' => ($modelData->lead_time ?? 0) > 0
                                ? ($modelData->lead_time . ' ' . $uiLabels[16])
                                : ('8 ' . $uiLabels[15]),
                            'priceRange' => [
                                '1~99' => '$' . number_format(floatval($product->price ?? 0), 2) . ' USD',
                                '100~999' => '$' . number_format(floatval($product->price ?? 0) * 0.9, 2) . ' USD',
                                '1000+' => '$' . number_format(floatval($product->price ?? 0) * 0.8, 2) . ' USD'
                            ],
                            'regionSupport' => ['CN', 'US', 'EU'],
                            'purchaseUrl' => '/order/' . ($product->product_code ?? $product->id)
                        ],
                        'qualityInfo' => [
                            'qualityPolicy' => $uiLabels[17],
                            'certifications' => ['ISO9001', 'IATF16949'],
                            'reliabilityReportUrl' => '#'
                        ]
                    ],
                    
                    // 额外保留一些原有字段，确保前端兼容
                    'id' => $product->id,
                    'images' => $images,
                    'main_image' => $images[0] ?? '',
                    'package_type' => $modelData->package_type ?? $product->package_type ?? '',
                    'pin_count' => $modelData->pin_count ?? $product->pin_count ?? 0,
                    'stock' => $modelData->stock ?? $product->stock ?? 0,
                    'is_new' => false,
                    'features' => $productData['features'] ?? '', // 特性数据
                    'package_info' => [
                        'package_type' => $modelData->package_type ?? $product->package_type ?? '',
                        'pin_count' => $modelData->pin_count ?? $product->pin_count ?? 0,
                        'size' => $this->extractSizeFromSpecs($specs)
                    ],
                    'model' => $modelData ? [
                        'id' => $modelData->id,
                        'model_code' => $modelData->model_code,
                        'model_name' => $modelData->model_name,
                        'pin_count' => $modelData->pin_count,
                        'stock' => $modelData->stock,
                        'packaging_spec' => $modelData->packaging_spec,
                        'operating_temperature' => $modelData->operating_temperature,
                        'material_type' => $modelData->material_type,
                        'pin_plating' => $modelData->pin_plating,
                        'moq' => $modelData->moq,
                        'lead_time' => $modelData->lead_time,
                    ] : null,
                    'breadcrumbs' => [
                        ['label' => $uiLabels[18], 'link' => '/'],
                        ['label' => $uiLabels[19], 'link' => '/products'],
                        ['label' => $productName, 'link' => '/product/' . $product->id]
                    ]
                ];

                return $detailData;
            }, 3600);

            return $this->success($detailData);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取产品详情页面的 UI 标签翻译
     * @param string $lang 语言代码
     * @return array [business_id => translated_value]
     */
    private function getProductUILabels(string $lang): array
    {
        // 默认中文标签
        $defaults = [
            1 => '数据手册', 2 => '评估模块', 3 => '的电气特性、典型应用、绝对最大额定值等详细信息',
            4 => '评估模块 (EVM) 性能演示套件 (PDK) 是用于评估', 5 => '的平台',
            6 => '登录以订购', 7 => 'FPGA 示例代码', 8 => '的 FPGA 接口示例代码',
            9 => '下载示例', 10 => '模拟工程师计算器', 11 => '用于模拟电路设计计算的在线/离线工具',
            12 => '封装模型', 13 => '下载模型', 14 => '管装', 15 => '周', 16 => '天',
            17 => '我们的质量方针：为全球客户提供高性能、高可靠性、高性价比的半导体产品与解决方案',
            18 => '首页', 19 => '产品',
        ];

        if ($lang === 'zh-CN') {
            return $defaults;
        }

        $i18nService = app(\app\service\I18nService::class);
        $bizIds = array_keys($defaults);
        $trans = $i18nService->getTranslations('product_ui', $bizIds, $lang, ['label']);

        $result = $defaults;
        foreach ($bizIds as $bizId) {
            if (!empty($trans[$bizId]['label'])) {
                $result[$bizId] = $trans[$bizId]['label'];
            }
        }
        return $result;
    }
    
    /**
     * 格式化规格参数
     */
    private function formatSpecs($specs): array
    {
        if (is_string($specs)) {
            $specs = json_decode($specs, true);
        }
        
        if (!is_array($specs)) {
            return [];
        }
        $formatted = [];

        // If specs are relational rows (from sk_product_spec), convert accordingly
        foreach ($specs as $item) {
            if (is_object($item) || (is_array($item) && array_key_exists('spec_id', $item))) {
                // array form from ORM or plain array with spec_id
                $specName = '';
                if (is_object($item) && isset($item->specDefinition)) {
                    $specName = $item->specDefinition->name ?? '';
                } elseif (is_array($item) && !empty($item['spec_id'])) {
                    // best-effort: try to use spec_name if present
                    $specName = $item['spec_name'] ?? '';
                }

                $formatted[] = [
                    'spec_name' => $specName,
                    'value' => is_object($item) ? ($item->value ?? '') : ($item['value'] ?? '')
                ];
            } else {
                // old-style JSON specs
                foreach ($specs as $key => $value) {
                    $formatted[] = [
                        'spec_name' => is_numeric($key) ? ($value['name'] ?? $value['spec_name'] ?? '') : $key,
                        'value' => is_array($value) ? ($value['value'] ?? '') : $value
                    ];
                }
                break;
            }
        }
        
        return $formatted;
    }
    
    /**
     * 获取完整图片URL
     */
    private function getFullImageUrl($imagePath): string
    {
        if (empty($imagePath)) {
            return '';
        }
        
        // 如果是JSON数组，取第一个
        if (is_string($imagePath) && strpos($imagePath, '[') === 0) {
            $images = json_decode($imagePath, true);
            $imagePath = is_array($images) && !empty($images) ? $images[0] : '';
        } elseif (is_array($imagePath)) {
            // 如果已经是数组，取第一个元素
            $imagePath = !empty($imagePath) ? $imagePath[0] : '';
        }
        
        if (empty($imagePath) || !is_string($imagePath)) {
            return '';
        }
        
        // 如果已经是完整URL，直接返回
        if (strpos($imagePath, 'http') === 0) {
            return $imagePath;
        }
        
        // 拼接完整URL
        $baseUrl = request()->domain();
        return $baseUrl . $imagePath;
    }

    /**
     * 获取热销商品
     */
    public function hot(): Response
    {
        try {
            $limit = (int)$this->request->get('limit', 10);
            $lang = $this->getLang();
            $cacheKey = 'product_hot_' . $lang . '_' . $limit;

            $products = \think\facade\Cache::remember($cacheKey, function () use ($limit) {
                $products = SkProduct::active()
                    ->order('views', 'desc')
                    ->order('created_at', 'desc')
                    ->limit($limit)
                    ->select();
            
                return $this->processImageUrls($products, ['image', 'icon']);
            }, 3600);

            return $this->success($products);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取推荐商品
     */
    public function recommended(): Response
    {
        try {
            $limit = (int)$this->request->get('limit', 10);
            // 简化：以 sort 值高、创建时间新的作为推荐
            $products = SkProduct::active()
                ->order('sort', 'desc')
                ->order('created_at', 'desc')
                ->limit($limit)
                ->select();
            
            $products = $this->processImageUrls($products, ['image', 'icon']);

            return $this->success($products);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取新品商品
     */
    public function new(): Response
    {
        try {
            $limit = (int)$this->request->get('limit', 10);
            $lang = $this->getLang();
            $cacheKey = 'product_new_' . $lang . '_' . $limit;

            $products = \think\facade\Cache::remember($cacheKey, function () use ($limit) {
                $products = SkProduct::active()
                    ->order('created_at', 'desc')
                    ->order('id', 'desc')
                    ->limit($limit)
                    ->select();
            
                // 为图片路径添加完整URL
                $baseUrl = $this->request->domain();
                $products = $products->map(function($item) use ($baseUrl) {
                    // 处理 images 字段，可能是 JSON 字符串或数组
                    $images = $item->images;
                    if (is_string($images)) {
                        $decoded = json_decode($images, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            $images = $decoded;
                        } else {
                            $images = [];
                        }
                    }
                    
                    if (!empty($images) && is_array($images)) {
                        $item->images = array_map(function($img) use ($baseUrl) {
                            if (!empty($img) && strpos($img, 'http') !== 0) {
                                return $baseUrl . $img;
                            }
                            return $img;
                        }, $images);
                    } else {
                        $item->images = [];
                    }
                    return $item;
                });

                return $products;
            }, 3600);

            return $this->success($products);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 搜索商品
     */
    public function search(): Response
    {
        try {
            $params = $this->request->get();

            $keyword = trim((string)($params['keyword'] ?? ''));
            if ($keyword === '') {
                return $this->error('搜索关键词不能为空', 400);
            }

            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $categoryId = (int)($params['category_id'] ?? 0);

            $query = SkProduct::active()
                ->whereLike('name|product_code', "%{$keyword}%")
                ->order('created_at', 'desc');

            if ($categoryId > 0) {
                $query->where('category_id', $categoryId);
            }

            $total = (clone $query)->count();
            $list = $query->page($page, $limit)->select()->toArray();
            $list = $this->processImageUrls($list, ['image', 'icon']);

            return $this->paginate($list, $total, $page, $limit);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取商品分类
     * 返回完整的三级分类结构，支持无限级分类
     */
    public function categories(): Response
    {
        try {
            // 获取所有启用的分类
            $categories = SkCategory::where('status', 1)
                ->order('sort', 'asc')
                ->order('id', 'asc')
                ->select()
                ->toArray();
            
            // 构建三级分类树
            $categoryTree = $this->buildCategoryTree($categories);

            return $this->success($categoryTree);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 构建分类树
     * @param array $categories 分类列表
     * @param int $parentId 父分类ID
     * @param int $level 分类层级
     * @return array 分类树结构
     */
    private function buildCategoryTree(array $categories, int $parentId = 0, int $level = 1): array
    {
        $tree = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] === $parentId) {
                // 限制为三级分类
                if ($level < 3) {
                    $children = $this->buildCategoryTree($categories, $category['id'], $level + 1);
                    if (!empty($children)) {
                        $category['children'] = $children;
                    }
                }
                
                // 格式化分类数据，添加level字段
                $formattedCategory = [
                    'id' => $category['id'],
                    'name' => $category['name'],
                    'level' => $level,
                    'parent_id' => $category['parent_id'],
                    'path' => $category['path'] ?? '',
                    'sort' => $category['sort'] ?? 0,
                    'status' => $category['status'],
                    'create_time' => $category['create_time'] ?? '',
                    'update_time' => $category['update_time'] ?? ''
                ];
                
                // 添加子分类
                if (isset($category['children'])) {
                    $formattedCategory['children'] = $category['children'];
                }
                
                $tree[] = $formattedCategory;
            }
        }
        
        return $tree;
    }

    /**
     * 获取品牌列表
     */
    public function brands(): Response
    {
        try {
            $lang = $this->getLang();
            $cacheKey = 'product_brands_' . $lang;

            $brandList = \think\facade\Cache::remember($cacheKey, function () {
                $brands = SkBrand::order('brand_name', 'asc')->select();
                
                // 本地化品牌数据
                $localizedFields = ['brand_name', 'description'];
                return $this->localizeCollection($brands, $localizedFields);
            }, 3600);
            
            return $this->success($brandList);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取电子元件库存数据
     */
    public function electronicComponents(): Response
    {
        try {
            $products = SkProduct::with(['category', 'subcategory', 'brand', 'inventory', 'productSuppliers.suppliers', 'specs.specDefinition', 'productPriceBreaks'])->active()->select()->toArray();
            
            $electronicComponents = [];
            $categoryIndex = [];
            
            foreach ($products as $product) {
                // 格式化规格参数
                $specs = [];
                if (!empty($product['specs'])) {
                    foreach ($product['specs'] as $spec) {
                        $specName = $spec['spec_definition']['name'] ?? $spec['spec_name'] ?? '';
                        if (!empty($specName)) {
                            $specs[$specName] = $spec['value'] ?? '';
                        }
                    }
                }
                
                // 格式化库存数据
                $inventory = [
                    '总库存' => 0,
                    '可用库存' => 0,
                    '在途库存' => 0,
                    '安全库存' => 0
                ];
                if (!empty($product['inventory'])) {
                    foreach ($product['inventory'] as $inv) {
                        $inventory['总库存'] += $inv['quantity'] ?? 0;
                        $inventory['可用库存'] += $inv['available_quantity'] ?? 0;
                        $inventory['在途库存'] += $inv['in_transit_stock'] ?? 0;
                        $inventory['安全库存'] += $inv['safety_stock'] ?? 0;
                    }
                }
                
                // 格式化供应商信息
                $supplierInfo = $this->formatSupplierInfo($product['product_suppliers'] ?? [], $product['product_price_breaks'] ?? []);
                
                // 格式化参数特征
                $parameterFeatures = [];
                if (!empty($product['specs'])) {
                    $parameterKeys = ['技术类型', '阻值范围', '工作电压', '工作温度'];
                    foreach ($product['specs'] as $spec) {
                        $specName = $spec['spec_definition']['name'] ?? $spec['spec_name'] ?? '';
                        if (in_array($specName, $parameterKeys)) {
                            $parameterFeatures[$specName] = $spec['value'] ?? '';
                        }
                    }
                }
                
                // 构建完整的电子元件数据
                $component = [
                    '产品ID' => $product['product_code'] ?? $product['id'],
                    '产品名称' => $product['name'] ?? '',
                    '型号' => $product['model']['model_name'] ?? $product['model_code'] ?? '',
                    '规格' => $specs,
                    '品牌' => $product['brand']['name'] ?? '',
                    '分类' => $product['category']['name'] ?? '' . (!empty($product['subcategory']['name']) ? '/' . $product['subcategory']['name'] : ''),
                    '库存' => $inventory,
                    '供应商信息' => $supplierInfo,
                    '参数特征' => $parameterFeatures
                ];
                
                $electronicComponents[] = $component;
                
                // 构建分类索引
                $categoryName = $product['category']['name'] ?? '';
                $subcategoryName = $product['subcategory']['name'] ?? '';
                if (!empty($categoryName)) {
                    if (!isset($categoryIndex[$categoryName])) {
                        $categoryIndex[$categoryName] = [];
                    }
                    if (!empty($subcategoryName) && !in_array($subcategoryName, $categoryIndex[$categoryName])) {
                        $categoryIndex[$categoryName][] = $subcategoryName;
                    }
                }
            }
            
            // 构建返回数据
            $result = [
                '电子元件库存' => $electronicComponents,
                '分类索引' => $categoryIndex,
                '元数据' => [
                    '最后更新时间' => date('Y-m-d\TH:i:s\Z'),
                    '记录总数' => count($electronicComponents),
                    '版本' => '1.0'
                ]
            ];
            
            return $this->success($result);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 格式化供应商信息
     */
    private function formatSupplierInfo($productSuppliers, $productPriceBreaks): array
    {
        $supplierInfo = [
            '供应商编码' => '',
            '最小订购量' => 0,
            '价格阶梯' => []
        ];
        
        // 格式化供应商编码和最小订购量
        if (!empty($productSuppliers)) {
            foreach ($productSuppliers as $ps) {
                $supplierInfo['供应商编码'] = $ps['supplier']['supplier_code'] ?? '';
                $supplierInfo['最小订购量'] = $ps['min_order_quantity'] ?? 0;
                break; // 只取第一个供应商
            }
        }
        
        // 格式化价格阶梯
        $priceBreaks = [];
        if (!empty($productPriceBreaks)) {
            foreach ($productPriceBreaks as $pb) {
                $range = '';
                if ($pb['quantity'] === 1) {
                    $range = '1-999';
                } elseif ($pb['quantity'] === 1000) {
                    $range = '1000-9999';
                } else {
                    $range = '10000+';
                }
                $priceBreaks[$range] = $pb['price'] ?? 0;
            }
        }
        $supplierInfo['价格阶梯'] = $priceBreaks;
        
        return $supplierInfo;
    }

    /**
     * 从规格中提取尺寸信息
     */
    private function extractSizeFromSpecs(array $specs): string
    {
        foreach ($specs as $spec) {
            $specName = strtolower($spec['spec_name'] ?? '');
            if (strpos($specName, '尺寸') !== false || strpos($specName, 'size') !== false || strpos($specName, '封装尺寸') !== false) {
                return $spec['value'] ?? '';
            }
        }
        return '';
    }

    /**
     * 格式化日期
     */
    private function formatDate($date): string
    {
        if (empty($date)) {
            return date('Y-m-d\TH:i:s\Z');
        }

        if (is_string($date)) {
            try {
                $dt = new \DateTime($date);
                return $dt->format('Y-m-d\TH:i:s\Z');
            } catch (\Exception $e) {
                return $date;
            }
        }

        if (is_object($date) && method_exists($date, 'format')) {
            return $date->format('Y-m-d\TH:i:s\Z');
        }

        return strval($date);
    }
}