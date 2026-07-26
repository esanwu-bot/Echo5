<?php
/**
 * 数据分析工具集
 * 所有工具方法返回数组，供 Agent 消费
 */
namespace app\agent\tools;

use think\facade\Db;
use think\facade\Cache;

class AnalyticsTools
{
    const CACHE_TTL = 3600;
    const CACHE_PREFIX = 'analytics:';

    // ==================== 产品分析 ====================

    /**
     * 查询产品信息
     */
    public function searchProducts(array $args): array
    {
        $categoryId = (int) ($args['category_id'] ?? 0);
        $brandId    = (int) ($args['brand_id'] ?? 0);
        $limit      = (int) ($args['limit'] ?? 10);
        $orderBy    = $args['order_by'] ?? 'views';

        $cacheKey = self::CACHE_PREFIX . 'products:' . md5(json_encode($args));
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $query = Db::table('sk_product')
            ->alias('p')
            ->field('p.id, p.name, p.product_code, p.price, p.stock, p.views, p.status, p.is_new, p.created_at, b.brand_name, c.name as category_name')
            ->leftJoin('sk_brands b', 'p.brand_id = b.id')
            ->leftJoin('sk_category c', 'p.category_id = c.id')
            ->where('p.status', 1);

        if ($categoryId > 0) {
            $query->where('p.category_id', $categoryId);
        }
        if ($brandId > 0) {
            $query->where('p.brand_id', $brandId);
        }

        $allowedOrders = ['views' => 'p.views DESC', 'price' => 'p.price DESC', 'created_at' => 'p.created_at DESC'];
        $query->orderRaw($allowedOrders[$orderBy] ?? 'p.views DESC');
        $query->limit($limit);

        $list = $query->select()->toArray();

        // 统计
        $totalProducts = Db::table('sk_product')->where('status', 1)->count();
        $newProducts = Db::table('sk_product')->where('status', 1)->where('is_new', 1)->count();
        $hotProducts = Db::table('sk_product')->where('status', 1)->where('is_on_sale', 1)->count();

        $result = [
            'total' => (int) $totalProducts,
            'new_count' => (int) $newProducts,
            'hot_count' => (int) $hotProducts,
            'list' => $list,
        ];

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 销售分析 ====================

    /**
     * 分析销售数据
     */
    public function analyzeSales(array $args): array
    {
        $period  = $args['period'] ?? '30d';
        $metric  = $args['metric'] ?? 'trend';

        $days = ['7d' => 7, '30d' => 30, '90d' => 90, '1y' => 365][$period] ?? 30;
        $startDate = date('Y-m-d', strtotime("-{$days} days"));

        $cacheKey = self::CACHE_PREFIX . 'sales:' . $period . ':' . $metric;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $result = [];

        if ($metric === 'trend') {
            // 按天统计订单数和销售额
            $trend = Db::table('sk_order')
                ->where('create_time', '>=', $startDate)
                ->field("DATE(create_time) as date, COUNT(*) as order_count, SUM(total_amount) as total_amount")
                ->group('date')
                ->order('date')
                ->select()
                ->toArray();
            $result = ['trend' => $trend];
        } elseif ($metric === 'status') {
            $status = Db::table('sk_order')
                ->field('status, COUNT(*) as count')
                ->where('create_time', '>=', $startDate)
                ->group('status')
                ->select()
                ->toArray();
            $result = ['status_distribution' => $status];
        } elseif ($metric === 'average_order') {
            $avg = Db::table('sk_order')
                ->where('create_time', '>=', $startDate)
                ->field('AVG(total_amount) as avg_amount, COUNT(*) as total_orders')
                ->find();
            $result = [
                'average_order_amount' => round((float) ($avg['avg_amount'] ?? 0), 2),
                'total_orders' => (int) ($avg['total_orders'] ?? 0),
            ];
        }

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 客户分析 ====================

    /**
     * 分析客户数据
     */
    public function analyzeCustomers(array $args): array
    {
        $period = $args['period'] ?? '30d';
        $metric = $args['metric'] ?? 'growth';
        $days = ['7d' => 7, '30d' => 30, '90d' => 90][$period] ?? 30;
        $startDate = date('Y-m-d', strtotime("-{$days} days"));

        $cacheKey = self::CACHE_PREFIX . 'customers:' . $period . ':' . $metric;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $result = [];

        if ($metric === 'growth') {
            $growth = Db::table('sk_customer')
                ->where('create_time', '>=', $startDate)
                ->field("DATE(create_time) as date, COUNT(*) as count")
                ->group('date')
                ->order('date')
                ->select()
                ->toArray();
            $total = Db::table('sk_customer')->count();
            $new = Db::table('sk_customer')->where('create_time', '>=', $startDate)->count();
            $result = ['total' => (int) $total, 'new' => (int) $new, 'growth' => $growth];
        } elseif ($metric === 'region') {
            $regions = Db::table('sk_customer')
                ->field('country, COUNT(*) as count')
                ->whereNotNull('country')
                ->group('country')
                ->order('count', 'desc')
                ->limit(10)
                ->select()
                ->toArray();
            $result = ['regions' => $regions];
        }

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 库存分析 ====================

    /**
     * 分析库存数据
     */
    public function analyzeInventory(array $args): array
    {
        $threshold = (int) ($args['threshold'] ?? 10);

        $cacheKey = self::CACHE_PREFIX . 'inventory:' . $threshold;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $warning = Db::table('sk_product')
            ->field('id, name, product_code, stock')
            ->where('status', 1)
            ->where('stock', '<=', $threshold)
            ->where('stock', '>', 0)
            ->order('stock', 'asc')
            ->limit(20)
            ->select()
            ->toArray();

        $outOfStock = Db::table('sk_product')
            ->where('status', 1)
            ->where('stock', '<=', 0)
            ->count();

        $totalStock = Db::table('sk_product')
            ->where('status', 1)
            ->sum('stock');

        $result = [
            'warning_list' => $warning,
            'out_of_stock_count' => (int) $outOfStock,
            'total_stock' => (int) $totalStock,
            'threshold' => $threshold,
        ];

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 内容分析 ====================

    /**
     * 分析内容运营数据
     */
    public function analyzeContent(array $args): array
    {
        $type   = $args['type'] ?? 'article';
        $metric = $args['metric'] ?? 'count';

        $cacheKey = self::CACHE_PREFIX . 'content:' . $type . ':' . $metric;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $tableMap = [
            'article' => 'sk_article',
            'news'    => 'sk_news',
            'banner'  => 'sk_banner',
            'faq'     => 'sk_faq',
            'training'=> 'sk_training',
        ];

        $table = $tableMap[$type] ?? 'sk_article';
        $result = [];

        if ($metric === 'count') {
            $total = Db::table($table)->where('status', 1)->count();
            $recent = Db::table($table)
                ->where('status', 1)
                ->where('create_time', '>=', date('Y-m-d', strtotime('-30 days')))
                ->count();
            $result = ['total' => (int) $total, 'recent_30d' => (int) $recent];
        }

        if ($type === 'banner' && $metric === 'views') {
            $banners = Db::table('sk_banner')
                ->where('status', 1)
                ->field('title, position, views')
                ->order('views', 'desc')
                ->limit(10)
                ->select()
                ->toArray();
            $result = ['banners' => $banners];
        }

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 翻译分析 ====================

    /**
     * 分析多语言翻译数据
     */
    public function analyzeTranslation(array $args): array
    {
        $langCode = $args['lang_code'] ?? 'all';
        $metric   = $args['metric'] ?? 'coverage';

        $cacheKey = self::CACHE_PREFIX . 'translation:' . $langCode . ':' . $metric;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $result = [];

        if ($metric === 'coverage') {
            // 各模块的翻译覆盖率
            $modules = Db::table('sk_translation')
                ->where('lang_code', 'zh-CN')
                ->field('module, COUNT(*) as total')
                ->group('module')
                ->select()
                ->toArray();

            $coverage = [];
            foreach ($modules as $mod) {
                $module = $mod['module'] ?: 'ui';
                $totalZh = (int) $mod['total'];
                $translated = Db::table('sk_translation')
                    ->where('module', $module)
                    ->where('lang_code', '<>', 'zh-CN')
                    ->where('is_translated', 1)
                    ->count();
                $coverage[] = [
                    'module' => $module,
                    'total_zh' => $totalZh,
                    'translated' => $translated,
                    'coverage' => $totalZh > 0 ? round($translated / $totalZh * 100, 2) : 0,
                ];
            }
            $result = ['coverage' => $coverage];
        } elseif ($metric === 'pending') {
            $pending = Db::table('sk_translation')
                ->where('lang_code', 'zh-CN')
                ->where('is_translated', 0)
                ->count();
            $result = ['pending_count' => (int) $pending];
        }

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 图表生成 ====================

    /**
     * 生成 ECharts 图表配置
     */
    public function generateChart(array $args): array
    {
        $chartType = $args['chart_type'] ?? 'bar';
        $title     = $args['title'] ?? '';
        $dataJson  = $args['data'] ?? '[]';
        $xAxis     = $args['x_axis'] ?? 'name';
        $yAxis     = $args['y_axis'] ?? 'value';

        $data = json_decode($dataJson, true);
        if (!is_array($data)) {
            $data = [];
        }

        $option = [
            'title' => ['text' => $title, 'left' => 'center'],
            'tooltip' => ['trigger' => 'axis'],
            'legend' => ['bottom' => 0],
        ];

        if ($chartType === 'pie') {
            $option['series'] = [[
                'type' => 'pie',
                'radius' => '50%',
                'data' => array_map(function ($item) use ($xAxis, $yAxis) {
                    return ['name' => $item[$xAxis] ?? '', 'value' => $item[$yAxis] ?? 0];
                }, $data),
            ]];
        } elseif ($chartType === 'table') {
            return ['type' => 'table', 'title' => $title, 'data' => $data];
        } else {
            $option['xAxis'] = ['type' => 'category', 'data' => array_column($data, $xAxis)];
            $option['yAxis'] = ['type' => 'value'];
            $option['series'] = [[
                'type' => $chartType,
                'data' => array_column($data, $yAxis),
            ]];
        }

        return ['chart_type' => $chartType, 'option' => $option];
    }

    // ==================== 综合报告 ====================

    /**
     * 生成综合报告
     */
    public function generateReport(array $args): array
    {
        $reportType = $args['report_type'] ?? 'daily';
        $period     = $args['period'] ?? '7d';

        $cacheKey = self::CACHE_PREFIX . 'report:' . $reportType . ':' . $period;
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $report = [
            'type' => $reportType,
            'period' => $period,
            'generated_at' => date('Y-m-d H:i:s'),
        ];

        if ($reportType === 'daily' || $reportType === 'weekly') {
            $report['products'] = $this->searchProducts(['limit' => 5, 'order_by' => 'views']);
            $report['sales'] = $this->analyzeSales(['period' => $period, 'metric' => 'trend']);
            $report['customers'] = $this->analyzeCustomers(['period' => $period, 'metric' => 'growth']);
            $report['inventory'] = $this->analyzeInventory(['threshold' => 10]);
            $report['translation'] = $this->analyzeTranslation(['metric' => 'pending']);
        } elseif ($reportType === 'product') {
            $report['products'] = $this->searchProducts(['limit' => 20]);
            $report['inventory'] = $this->analyzeInventory([]);
        } elseif ($reportType === 'translation') {
            $report['coverage'] = $this->analyzeTranslation(['metric' => 'coverage']);
            $report['pending'] = $this->analyzeTranslation(['metric' => 'pending']);
        }

        Cache::set($cacheKey, $report, self::CACHE_TTL);
        return $report;
    }

    // ==================== 系统分析 ====================

    /**
     * 分析系统运营数据
     */
    public function analyzeSystem(array $args): array
    {
        $metric = $args['metric'] ?? 'logs';
        $limit  = (int) ($args['limit'] ?? 20);

        $result = [];

        if ($metric === 'logs') {
            $logs = Db::table('sk_admin_log')
                ->field('action, COUNT(*) as count')
                ->group('action')
                ->order('count', 'desc')
                ->limit($limit)
                ->select()
                ->toArray();
            $result = ['logs' => $logs];
        } elseif ($metric === 'config') {
            $configs = Db::table('sk_config')
                ->field('config_key, config_value, description')
                ->limit($limit)
                ->select()
                ->toArray();
            $result = ['configs' => $configs];
        } elseif ($metric === 'dictionary') {
            $projects = Db::table('sk_dictionary_project')
                ->where('status', 1)
                ->count();
            $fields = Db::table('sk_dictionary_field')
                ->count();
            $data = Db::table('sk_dictionary_data')
                ->count();
            $result = ['projects' => $projects, 'fields' => $fields, 'data' => $data];
        }

        return $result;
    }
}
