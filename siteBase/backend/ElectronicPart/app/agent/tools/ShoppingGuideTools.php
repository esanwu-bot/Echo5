<?php
/**
 * 电子元器件商城 - 导购工具集
 * 文件说明：提供导购Agent所需的业务工具方法，包括产品搜索、库存查询、报价计算等。
 */
namespace app\agent\tools;

use think\facade\Cache;
use think\facade\Db;

/**
 * 导购工具集
 * 封装导购业务相关的数据查询和处理逻辑
 *
 * @package app\agent\tools
 */
class ShoppingGuideTools
{
    /**
     * 缓存前缀
     */
    const CACHE_PREFIX = 'guide:';

    /**
     * 缓存时间（秒）
     */
    const CACHE_TTL_PRODUCT = 3600;      // 产品信息缓存1小时
    const CACHE_TTL_STOCK = 300;         // 库存信息缓存5分钟
    const CACHE_TTL_CATEGORY = 7200;     // 分类信息缓存2小时

    // ========== 产品搜索工具 ==========

    /**
     * 搜索产品
     * 支持型号精确匹配、关键词模糊搜索、分类筛选、品牌筛选
     *
     * @access public
     * @param array $args 搜索参数
     * @return array
     */
    public function searchProducts(array $args): array
    {
        $keyword = $args['keyword'] ?? '';
        $categoryId = $args['category_id'] ?? 0;
        $brandId = $args['brand_id'] ?? 0;
        $limit = $args['limit'] ?? 10;
        $orderBy = $args['order_by'] ?? 'views';

        // 验证排序字段
        $allowedOrderBy = ['views', 'price', 'stock', 'created_at'];
        if (!in_array($orderBy, $allowedOrderBy)) {
            $orderBy = 'views';
        }

        $query = Db::name('product')
            ->alias('p')
            ->leftJoin('brands b', 'p.brand_id = b.id')
            ->leftJoin('category c', 'p.category_fk_id = c.id')
            ->where('p.is_on_sale', 1)
            ->field('p.id, p.product_code, p.name, p.model_number, p.brand, p.brand_id, 
                     p.price, p.stock, p.package_type, p.image_url, p.datasheet_url,
                     p.views, p.is_new, c.name as category_name');

        // 关键词搜索（型号精确匹配或名称模糊匹配）
        if (!empty($keyword)) {
            $query->where(function($q) use ($keyword) {
                $q->where('p.product_code', 'like', "%{$keyword}%")
                  ->whereOr('p.model_number', 'like', "%{$keyword}%")
                  ->whereOr('p.name', 'like', "%{$keyword}%")
                  ->whereOr('p.brand', 'like', "%{$keyword}%");
            });
        }

        // 分类筛选
        if ($categoryId > 0) {
            $query->where('p.category_fk_id', $categoryId);
        }

        // 品牌筛选
        if ($brandId > 0) {
            $query->where('p.brand_id', $brandId);
        }

        // 排序
        $orderDirection = ($orderBy === 'price') ? 'asc' : 'desc';
        $query->order("p.{$orderBy}", $orderDirection);

        // 分页
        $products = $query->limit($limit)->select()->toArray();

        return [
            'success' => true,
            'total' => count($products),
            'products' => $products,
        ];
    }

    /**
     * 获取产品详情
     * 返回产品完整信息，包括规格参数、图片、描述、特性
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function getProductDetail(array $args): array
    {
        $productId = $args['product_id'] ?? 0;
        if ($productId <= 0) {
            return ['success' => false, 'error' => '产品ID无效'];
        }

        // 尝试从缓存获取
        $cacheKey = self::CACHE_PREFIX . 'product:' . $productId;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        // 查询产品基本信息
        $product = Db::name('product')
            ->alias('p')
            ->leftJoin('brands b', 'p.brand_id = b.id')
            ->leftJoin('category c', 'p.category_fk_id = c.id')
            ->where('p.id', $productId)
            ->field('p.*, b.name as brand_name, c.name as category_name')
            ->find();

        if (!$product) {
            return ['success' => false, 'error' => '产品不存在'];
        }

        // 查询产品规格参数
        $specs = Db::name('product_spec')
            ->where('product_id', $productId)
            ->select()
            ->toArray();

        // 查询产品属性
        $attributes = Db::name('product_attribute')
            ->alias('pa')
            ->leftJoin('attribute a', 'pa.attribute_id = a.id')
            ->where('pa.product_id', $productId)
            ->field('pa.value, a.name, a.code, a.unit')
            ->select()
            ->toArray();

        // 查询阶梯价格
        $priceBreaks = Db::name('product_price_break')
            ->where('product_id', $productId)
            ->order('min_quantity', 'asc')
            ->select()
            ->toArray();

        $result = [
            'success' => true,
            'product' => $product,
            'specs' => $specs,
            'attributes' => $attributes,
            'price_breaks' => $priceBreaks,
        ];

        // 缓存结果
        Cache::set($cacheKey, $result, self::CACHE_TTL_PRODUCT);

        return $result;
    }

    /**
     * 参数化搜索
     * 根据技术参数筛选产品
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function parametricSearch(array $args): array
    {
        $categoryId = $args['category_id'] ?? 0;
        $paramsJson = $args['params'] ?? '{}';
        $limit = $args['limit'] ?? 20;

        // 解析参数条件
        $params = json_decode($paramsJson, true);
        if (!is_array($params)) {
            $params = [];
        }

        $query = Db::name('product')
            ->alias('p')
            ->where('p.is_on_sale', 1)
            ->field('p.id, p.product_code, p.name, p.model_number, p.brand, 
                     p.price, p.stock, p.package_type, p.image_url');

        // 分类筛选
        if ($categoryId > 0) {
            $query->where('p.category_fk_id', $categoryId);
        }

        // 根据参数条件筛选（基于产品属性表）
        if (!empty($params)) {
            foreach ($params as $attrCode => $value) {
                $query->whereExists(function($q) use ($attrCode, $value) {
                    $q->table('sk_product_attribute')
                      ->alias('pa')
                      ->leftJoin('sk_attribute a', 'pa.attribute_id = a.id')
                      ->where('pa.product_id', Db::raw('p.id'))
                      ->where('a.code', $attrCode)
                      ->where('pa.value', 'like', "%{$value}%");
                });
            }
        }

        $products = $query->limit($limit)->select()->toArray();

        return [
            'success' => true,
            'total' => count($products),
            'products' => $products,
            'filters' => $params,
        ];
    }

    /**
     * 获取分类树
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function getCategories(array $args): array
    {
        $parentId = $args['parent_id'] ?? 0;

        // 尝试从缓存获取
        $cacheKey = self::CACHE_PREFIX . 'categories:' . $parentId;
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $categories = Db::name('category')
            ->where('parent_id', $parentId)
            ->where('status', 1)
            ->order('sort', 'asc')
            ->field('id, parent_id, name, icon, code, level, is_leaf')
            ->select()
            ->toArray();

        // 递归获取子分类
        foreach ($categories as &$cat) {
            if ($cat['is_leaf'] == 0) {
                $cat['children'] = $this->getCategories(['parent_id' => $cat['id']])['categories'];
            }
        }

        $result = [
            'success' => true,
            'categories' => $categories,
        ];

        Cache::set($cacheKey, $result, self::CACHE_TTL_CATEGORY);

        return $result;
    }

    /**
     * 获取热门/新品产品
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function getPopularProducts(array $args): array
    {
        $type = $args['type'] ?? 'hot';
        $limit = $args['limit'] ?? 10;

        $query = Db::name('product')
            ->where('is_on_sale', 1)
            ->field('id, product_code, name, model_number, brand, price, stock, package_type, image_url, views');

        if ($type === 'hot') {
            $query->order('views', 'desc');
        } elseif ($type === 'new') {
            $query->where('is_new', 1)->order('created_at', 'desc');
        }

        $products = $query->limit($limit)->select()->toArray();

        return [
            'success' => true,
            'type' => $type,
            'products' => $products,
        ];
    }

    // ========== 库存与报价工具 ==========

    /**
     * 查询库存
     * 支持单品和批量查询
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function checkStock(array $args): array
    {
        $productIdsStr = $args['product_ids'] ?? '';
        if (empty($productIdsStr)) {
            return ['success' => false, 'error' => '产品ID不能为空'];
        }

        $productIds = array_map('intval', explode(',', $productIdsStr));
        $productIds = array_filter($productIds, function($id) {
            return $id > 0;
        });

        if (empty($productIds)) {
            return ['success' => false, 'error' => '产品ID无效'];
        }

        // 查询产品库存
        $products = Db::name('product')
            ->whereIn('id', $productIds)
            ->field('id, product_code, name, model_number, stock, normally_stocked')
            ->select()
            ->toArray();

        // 查询库存明细（如果有库存表）
        $inventoryData = Db::name('inventory')
            ->whereIn('product_id', $productIds)
            ->field('product_id, quantity, available_quantity, safety_stock')
            ->select()
            ->toArray();

        $inventoryMap = [];
        foreach ($inventoryData as $inv) {
            $inventoryMap[$inv['product_id']] = $inv;
        }

        $result = [];
        foreach ($products as $product) {
            $inv = $inventoryMap[$product['id']] ?? null;
            $result[] = [
                'product_id' => $product['id'],
                'product_code' => $product['product_code'],
                'name' => $product['name'],
                'model_number' => $product['model_number'],
                'stock' => $product['stock'],
                'available_quantity' => $inv['available_quantity'] ?? $product['stock'],
                'safety_stock' => $inv['safety_stock'] ?? 0,
                'is_low_stock' => $inv ? ($inv['available_quantity'] <= ($inv['safety_stock'] ?? 0)) : ($product['stock'] <= 10),
                'normally_stocked' => $product['normally_stocked'],
            ];
        }

        return [
            'success' => true,
            'total' => count($result),
            'items' => $result,
        ];
    }

    /**
     * 获取价格
     * 返回产品价格及阶梯报价
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function getPrice(array $args): array
    {
        $productId = $args['product_id'] ?? 0;
        $quantity = $args['quantity'] ?? 1;

        if ($productId <= 0) {
            return ['success' => false, 'error' => '产品ID无效'];
        }

        // 查询产品基本信息
        $product = Db::name('product')
            ->where('id', $productId)
            ->field('id, product_code, name, model_number, price, brand')
            ->find();

        if (!$product) {
            return ['success' => false, 'error' => '产品不存在'];
        }

        // 查询阶梯价格
        $priceBreaks = Db::name('product_price_break')
            ->where('product_id', $productId)
            ->order('min_quantity', 'asc')
            ->select()
            ->toArray();

        // 计算当前数量对应的价格
        $currentPrice = $product['price'];
        foreach ($priceBreaks as $break) {
            if ($quantity >= $break['min_quantity']) {
                $currentPrice = $break['price'];
            }
        }

        return [
            'success' => true,
            'product' => $product,
            'current_price' => $currentPrice,
            'quantity' => $quantity,
            'price_breaks' => $priceBreaks,
        ];
    }

    /**
     * 批量报价
     * 批量获取多个产品的报价信息
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function batchQuote(array $args): array
    {
        $itemsJson = $args['items'] ?? '[]';
        $items = json_decode($itemsJson, true);

        if (!is_array($items) || empty($items)) {
            return ['success' => false, 'error' => '产品清单无效'];
        }

        $results = [];
        $totalAmount = 0;

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? 0;
            $quantity = $item['quantity'] ?? 1;

            if ($productId <= 0) {
                continue;
            }

            // 获取价格信息
            $priceInfo = $this->getPrice([
                'product_id' => $productId,
                'quantity' => $quantity,
            ]);

            if ($priceInfo['success']) {
                $subtotal = $priceInfo['current_price'] * $quantity;
                $totalAmount += $subtotal;

                $results[] = [
                    'product_id' => $productId,
                    'product_code' => $priceInfo['product']['product_code'],
                    'name' => $priceInfo['product']['name'],
                    'quantity' => $quantity,
                    'unit_price' => $priceInfo['current_price'],
                    'subtotal' => $subtotal,
                ];
            }
        }

        return [
            'success' => true,
            'items' => $results,
            'total_amount' => $totalAmount,
            'item_count' => count($results),
        ];
    }

    /**
     * 创建询价请求
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function createQuoteRequest(array $args): array
    {
        $productsJson = $args['products'] ?? '[]';
        $contactName = $args['contact_name'] ?? '';
        $contactPhone = $args['contact_phone'] ?? '';
        $contactEmail = $args['contact_email'] ?? '';
        $company = $args['company'] ?? '';
        $remark = $args['remark'] ?? '';

        if (empty($contactName) || empty($contactPhone)) {
            return ['success' => false, 'error' => '联系人和电话为必填项'];
        }

        $products = json_decode($productsJson, true);
        if (!is_array($products) || empty($products)) {
            return ['success' => false, 'error' => '产品清单无效'];
        }

        // 创建询价请求记录
        $quoteId = Db::name('quote_request')->insertGetId([
            'contact_name' => $contactName,
            'contact_phone' => $contactPhone,
            'contact_email' => $contactEmail,
            'company' => $company,
            'products' => json_encode($products, JSON_UNESCAPED_UNICODE),
            'remark' => $remark,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'success' => true,
            'quote_id' => $quoteId,
            'message' => '询价请求已提交，我们会尽快与您联系',
        ];
    }

    // ========== 替代与对比工具 ==========

    /**
     * 推荐替代产品
     * 基于参数相似度推荐兼容替代型号
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function recommendAlternative(array $args): array
    {
        $productId = $args['product_id'] ?? 0;
        $productCode = $args['product_code'] ?? '';
        $limit = $args['limit'] ?? 5;

        // 获取原产品信息
        $original = null;
        if ($productId > 0) {
            $original = Db::name('product')->where('id', $productId)->find();
        } elseif (!empty($productCode)) {
            $original = Db::name('product')->where('product_code', $productCode)->find();
        }

        if (!$original) {
            return ['success' => false, 'error' => '原产品不存在'];
        }

        // 查找同分类下的替代产品
        $candidates = Db::name('product')
            ->where('category_fk_id', $original['category_fk_id'])
            ->where('id', '<>', $original['id'])
            ->where('is_on_sale', 1)
            ->where('stock', '>', 0)
            ->when($original['package_type'], function($q) use ($original) {
                $q->where('package_type', $original['package_type']);
            })
            ->limit(10)
            ->select()
            ->toArray();

        // 计算匹配度评分
        $scored = [];
        foreach ($candidates as $candidate) {
            $score = 0;

            // 封装匹配 +40分
            if ($candidate['package_type'] === $original['package_type']) {
                $score += 40;
            }

            // 引脚数相同 +20分
            if ($candidate['pin_count'] == $original['pin_count']) {
                $score += 20;
            }

            // 品牌相同 +10分
            if ($candidate['brand_id'] == $original['brand_id']) {
                $score += 10;
            }

            // 库存充足 +10分
            if ($candidate['stock'] > 100) {
                $score += 10;
            }

            // 价格更低 +10分
            if ($candidate['price'] < $original['price']) {
                $score += 10;
            }

            $candidate['match_score'] = $score;
            $candidate['match_reason'] = $this->buildMatchReason($original, $candidate);
            $scored[] = $candidate;
        }

        // 按评分排序
        usort($scored, function($a, $b) {
            return $b['match_score'] - $a['match_score'];
        });

        $result = array_slice($scored, 0, $limit);

        return [
            'success' => true,
            'original' => [
                'id' => $original['id'],
                'product_code' => $original['product_code'],
                'name' => $original['name'],
                'package_type' => $original['package_type'],
            ],
            'alternatives' => $result,
        ];
    }

    /**
     * 构建匹配原因说明
     *
     * @access private
     * @param array $original 原产品
     * @param array $candidate 候选产品
     * @return string
     */
    private function buildMatchReason(array $original, array $candidate): string
    {
        $reasons = [];

        if ($candidate['package_type'] === $original['package_type']) {
            $reasons[] = '封装相同';
        }

        if ($candidate['pin_count'] == $original['pin_count']) {
            $reasons[] = '引脚数相同';
        }

        if ($candidate['brand_id'] == $original['brand_id']) {
            $reasons[] = '同品牌';
        }

        if ($candidate['price'] < $original['price']) {
            $reasons[] = '价格更低';
        }

        return implode('、', $reasons) ?: '参数相近';
    }

    /**
     * 产品对比
     * 对比多个产品的参数差异
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function compareProducts(array $args): array
    {
        $productIdsStr = $args['product_ids'] ?? '';
        if (empty($productIdsStr)) {
            return ['success' => false, 'error' => '产品ID不能为空'];
        }

        $productIds = array_map('intval', explode(',', $productIdsStr));
        $productIds = array_filter($productIds, function($id) {
            return $id > 0;
        });

        if (count($productIds) < 2) {
            return ['success' => false, 'error' => '至少需要2个产品进行对比'];
        }

        if (count($productIds) > 5) {
            $productIds = array_slice($productIds, 0, 5);
        }

        // 查询产品基本信息
        $products = Db::name('product')
            ->whereIn('id', $productIds)
            ->field('id, product_code, name, model_number, brand, price, stock, 
                     package_type, pin_count, operating_voltage, operating_temperature')
            ->select()
            ->toArray();

        // 查询产品属性
        $attributes = Db::name('product_attribute')
            ->alias('pa')
            ->leftJoin('attribute a', 'pa.attribute_id = a.id')
            ->whereIn('pa.product_id', $productIds)
            ->field('pa.product_id, pa.value, a.name, a.code')
            ->select()
            ->toArray();

        // 按产品ID分组属性
        $attrMap = [];
        foreach ($attributes as $attr) {
            $attrMap[$attr['product_id']][$attr['code']] = [
                'name' => $attr['name'],
                'value' => $attr['value'],
            ];
        }

        // 构建对比数据
        $compareData = [];
        foreach ($products as $product) {
            $compareData[] = [
                'id' => $product['id'],
                'product_code' => $product['product_code'],
                'name' => $product['name'],
                'model_number' => $product['model_number'],
                'brand' => $product['brand'],
                'price' => $product['price'],
                'stock' => $product['stock'],
                'package_type' => $product['package_type'],
                'pin_count' => $product['pin_count'],
                'operating_voltage' => $product['operating_voltage'],
                'operating_temperature' => $product['operating_temperature'],
                'attributes' => $attrMap[$product['id']] ?? [],
            ];
        }

        return [
            'success' => true,
            'products' => $compareData,
        ];
    }

    // ========== 样品与文档工具 ==========

    /**
     * 样品申请
     * 创建样品申请记录
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function applySample(array $args): array
    {
        $productId = $args['product_id'] ?? 0;
        $quantity = $args['quantity'] ?? 1;
        $contactName = $args['contact_name'] ?? '';
        $contactPhone = $args['contact_phone'] ?? '';
        $contactEmail = $args['contact_email'] ?? '';
        $company = $args['company'] ?? '';
        $purpose = $args['purpose'] ?? '';

        if ($productId <= 0) {
            return ['success' => false, 'error' => '产品ID无效'];
        }

        if (empty($contactName) || empty($contactPhone)) {
            return ['success' => false, 'error' => '联系人和电话为必填项'];
        }

        // 检查产品是否存在
        $product = Db::name('product')->where('id', $productId)->find();
        if (!$product) {
            return ['success' => false, 'error' => '产品不存在'];
        }

        // 创建样品申请记录
        $sampleId = Db::name('sample_apply')->insertGetId([
            'product_id' => $productId,
            'quantity' => $quantity,
            'contact_name' => $contactName,
            'contact_phone' => $contactPhone,
            'contact_email' => $contactEmail,
            'company' => $company,
            'purpose' => $purpose,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'success' => true,
            'sample_id' => $sampleId,
            'message' => '样品申请已提交，我们会尽快审核并联系您',
        ];
    }

    /**
     * 获取数据手册
     * 查询产品的数据手册URL
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function getDocument(array $args): array
    {
        $productId = $args['product_id'] ?? 0;

        if ($productId <= 0) {
            return ['success' => false, 'error' => '产品ID无效'];
        }

        $product = Db::name('product')
            ->where('id', $productId)
            ->field('id, product_code, name, model_number, datasheet_url')
            ->find();

        if (!$product) {
            return ['success' => false, 'error' => '产品不存在'];
        }

        if (empty($product['datasheet_url'])) {
            // 尝试从文档表查找
            $doc = Db::name('document')
                ->where('product_id', $productId)
                ->where('type', 'datasheet')
                ->find();

            if ($doc) {
                $product['datasheet_url'] = $doc['url'];
            }
        }

        return [
            'success' => true,
            'product' => $product,
            'has_datasheet' => !empty($product['datasheet_url']),
        ];
    }

    /**
     * 搜索技术文档
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function searchDocuments(array $args): array
    {
        $keyword = $args['keyword'] ?? '';
        $type = $args['type'] ?? '';
        $limit = $args['limit'] ?? 10;

        if (empty($keyword)) {
            return ['success' => false, 'error' => '搜索关键词不能为空'];
        }

        $query = Db::name('document')
            ->where('status', 1)
            ->field('id, title, type, url, description, created_at');

        if (!empty($keyword)) {
            $query->where('title', 'like', "%{$keyword}%");
        }

        if (!empty($type)) {
            $query->where('type', $type);
        }

        $documents = $query->order('created_at', 'desc')
            ->limit($limit)
            ->select()
            ->toArray();

        return [
            'success' => true,
            'total' => count($documents),
            'documents' => $documents,
        ];
    }

    // ========== 应用方案工具 ==========

    /**
     * 应用方案匹配
     * 根据应用场景推荐产品
     *
     * @access public
     * @param array $args 参数
     * @return array
     */
    public function matchApplication(array $args): array
    {
        $keyword = $args['keyword'] ?? '';
        $limit = $args['limit'] ?? 10;

        if (empty($keyword)) {
            return ['success' => false, 'error' => '应用场景关键词不能为空'];
        }

        // 查找匹配的应用方案
        $applications = Db::name('application')
            ->where('status', 1)
            ->where('name', 'like', "%{$keyword}%")
            ->field('id, name, description')
            ->limit(5)
            ->select()
            ->toArray();

        if (empty($applications)) {
            return [
                'success' => true,
                'applications' => [],
                'products' => [],
                'message' => '未找到匹配的应用方案，请尝试其他关键词',
            ];
        }

        // 获取应用方案关联的产品
        $applicationIds = array_column($applications, 'id');
        $productLinks = Db::name('application_product')
            ->whereIn('application_id', $applicationIds)
            ->field('application_id, product_id')
            ->select()
            ->toArray();

        $productIds = array_unique(array_column($productLinks, 'product_id'));

        if (empty($productIds)) {
            return [
                'success' => true,
                'applications' => $applications,
                'products' => [],
            ];
        }

        // 查询产品详情
        $products = Db::name('product')
            ->whereIn('id', $productIds)
            ->where('is_on_sale', 1)
            ->field('id, product_code, name, model_number, brand, price, stock, package_type, image_url')
            ->limit($limit)
            ->select()
            ->toArray();

        return [
            'success' => true,
            'applications' => $applications,
            'products' => $products,
        ];
    }
}
