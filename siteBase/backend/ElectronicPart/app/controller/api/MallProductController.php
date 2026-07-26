<?php
/**
 * 电子元器件商城 - 商城商品接口
 * 文件说明：提供商城商品列表与详情接口，包含图片处理与前端格式化字段。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkProduct;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 商城商品API控制器
 * @package app\controller\api
 */
class MallProductController extends BaseController
{
    /**
     * 获取商城商品列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $keyword = trim((string)($params['keyword'] ?? ''));

            $lang = $this->getLangCode();
            $cacheKey = 'mallProduct_index_' . $lang . '_p' . $page . '_l' . $limit . '_k' . $keyword;

            $data = Cache::remember($cacheKey, function () use ($page, $limit, $keyword, $lang) {
                $query = SkProduct::active()
                    ->with(['category', 'brand'])
                    ->order('sort', 'desc')
                    ->order('id', 'desc');

                if ($keyword !== '') {
                    $query->whereLike('name|product_code|description', "%{$keyword}%");
                }

                $total = (clone $query)->count();
                $list = $query->page($page, $limit)->select();

                // 应用多语言翻译映射
                $list = $this->localizeCollection($list, ['name', 'description', 'features']);

                // 批量获取分类/品牌翻译
                $i18nService = app(\app\service\I18nService::class);
                $categoryIds = array_values(array_unique(array_filter(array_column($list, 'category_fk_id'))));
                $brandIds = array_values(array_unique(array_filter(array_column($list, 'brand_id'))));
                $categoryTrans = $categoryIds ? $i18nService->getTranslations('category', $categoryIds, $lang, ['name']) : [];
                $brandTrans = $brandIds ? $i18nService->getTranslations('brand', $brandIds, $lang, ['brand_name']) : [];

                // 库存状态文案翻译（ui模块）
                $statusLabels = $i18nService->translateSourceTexts('ui', 0, ['正在供货', '停止供货'], $lang);

                // 格式化数据以匹配前端需求
                $products = [];
                $baseUrl = $this->request->domain();

                foreach ($list as $item) {
                    $images = $item['images'] ?? [];
                    $formattedImages = [];
                    $mainImage = '';
                    if (!empty($images) && is_array($images)) {
                        $formattedImages = array_map(function($img) use ($baseUrl) {
                            if (!empty($img) && strpos($img, 'http') !== 0) {
                                return $baseUrl . $img;
                            }
                            return $img;
                        }, $images);
                        $mainImage = $formattedImages[0] ?? '';
                    }

                    $categoryId = (int)($item['category_fk_id'] ?? 0);
                    $brandId = (int)($item['brand_id'] ?? 0);
                    $categoryName = ($categoryTrans[$categoryId]['name'] ?? '') ?: ($item['category']['name'] ?? '');
                    $brandName = ($brandTrans[$brandId]['brand_name'] ?? '') ?: ($item['brand']['brand_name'] ?? '');
                    $statusKey = ($item['is_on_sale'] ?? 0) == 1 ? '正在供货' : '停止供货';

                    $products[] = [
                        'id' => $item['id'],
                        'product_code' => $item['product_code'],
                        'name' => $item['name'],
                        'description' => $this->stripHtmlTags($item['description'] ?? ''),
                        'category_name' => $categoryName,
                        'brand_name' => $brandName,
                        'images' => $formattedImages,
                        'main_image' => $mainImage,
                        'price' => $item['price'] ?? '0.00',
                        'currency' => 'USD',
                        'unit' => '1ku',
                        'stock' => $item['stock'] ?? 0,
                        'status_text' => $statusLabels[$statusKey] ?? $statusKey,
                        'is_new' => false,
                    ];
                }

                return [
                    'total' => $total,
                    'list' => $products,
                    'current_page' => $page,
                    'last_page' => ceil($total / $limit)
                ];
            }, 3600);

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取商城商品详情
     */
    public function mallProductDetail(string $id): Response
    {
        $lang = $this->getLangCode();
        $cacheKey = 'mallProduct_mallProductDetail_' . $id . '_' . $lang;

        $detail = Cache::remember($cacheKey, function () use ($id, $lang) {
            $product = SkProduct::active()
                ->with(['category', 'brand'])
                ->where('id', $id)
                ->find();

            if (!$product) {
                return null;
            }

            // 应用多语言翻译映射
            $product = $this->localizeItem($product, ['name', 'description', 'features']);

            $baseUrl = $this->request->domain();
            $images = $product['images'] ?? [];
            if (!empty($images) && is_array($images)) {
                $images = array_map(function($img) use ($baseUrl) {
                    if (!empty($img) && strpos($img, 'http') !== 0) {
                        return $baseUrl . $img;
                    }
                    return $img;
                }, $images);
            } else {
                $images = [];
            }

            // 格式化数据以匹配前端需求
            $i18nService = app(\app\service\I18nService::class);
            $categoryId = (int)($product['category_fk_id'] ?? 0);
            $brandId = (int)($product['brand_id'] ?? 0);

            // 分类名翻译（category模块: name）
            $categoryName = $product['category']['name'] ?? '';
            if ($categoryId && $categoryName) {
                $categoryTrans = $i18nService->getTranslations('category', [$categoryId], $lang, ['name']);
                $categoryName = ($categoryTrans[$categoryId]['name'] ?? '') ?: $categoryName;
            }

            // 品牌名翻译（brand模块: brand_name）
            $brandName = $product['brand']['brand_name'] ?? '';
            if ($brandId && $brandName) {
                $brandTrans = $i18nService->getTranslations('brand', [$brandId], $lang, ['brand_name']);
                $brandName = ($brandTrans[$brandId]['brand_name'] ?? '') ?: $brandName;
            }

            // 库存状态文案翻译（ui模块）
            $statusKey = ($product['is_on_sale'] ?? 0) == 1 ? '有现货' : '无现货';
            $statusLabels = $i18nService->translateSourceTexts('ui', 0, [$statusKey], $lang);
            $statusText = $statusLabels[$statusKey] ?? $statusKey;

            $detail = [
                'id' => $product['id'],
                'product_code' => $product['product_code'],
                'name' => $product['name'],
                'description' => $this->stripHtmlTags($product['description'] ?? ''),
                'category_name' => $categoryName,
                'brand_name' => $brandName,
                'images' => $images,
                'main_image' => !empty($images) ? $images[0] : '',
                'price' => $product['price'] ?? '0.00',
                'currency' => 'USD',
                'unit' => '1ku',
                'stock' => $product['stock'] ?? 0,
                'status_text' => $statusText,
                'is_new' => false,
                'models' => [
                    ['id' => $product['id'], 'name' => $product['product_code']]
                ]
            ];

            return $detail;
        }, 3600);

        try {
            if ($detail === null) {
                return $this->error('商品不存在', 404);
            }

            return $this->success($detail);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
