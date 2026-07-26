<?php
/**
 * 电子元器件商城 - 仪表盘（后台）
 * 文件说明：提供后台统计数据与仪表盘视图所需的接口（订单、销售、库存概览）。
 */

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\Order;
use app\model\Product;
use app\model\User;
use app\model\OrderItem;
use app\model\Category;
use app\model\SkInquiry;
use app\model\SkQuoteRequest;
use app\model\SkSampleApply;
use app\service\OrderService;
use think\facade\Cache;
use think\facade\Db;

class DashboardController extends BaseController
{
    /**
     * 获取仪表盘统计数据
     */
    public function index()
    {
        try {
            // 尝试从缓存获取
            $cacheKey = 'dashboard_stats';
            $dashboardData = Cache::get($cacheKey);
            
            if (!$dashboardData) {
                $dashboardData = $this->generateDashboardData();
                // 缓存5分钟
                Cache::set($cacheKey, $dashboardData, 300);
            }

            return $this->success($dashboardData);

        } catch (\Exception $e) {
            Log::error('Get dashboard data error: ' . $e->getMessage());
            return $this->error('获取仪表盘数据失败');
        }
    }

    /**
     * 生成仪表盘数据
     */
    private function generateDashboardData()
    {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $thisMonth = date('Y-m');
        $lastMonth = date('Y-m', strtotime('-1 month'));
        
        // 今日统计
        $todayOrders = Order::whereTime('created_at', $today)->count();
        $todayRevenue = Order::whereTime('created_at', $today)
                           ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                           ->sum('total_price');
        $todayUsers = User::whereTime('created_at', $today)->count();
        
        // 昨日统计
        $yesterdayOrders = Order::whereTime('created_at', $yesterday)->count();
        $yesterdayRevenue = Order::whereTime('created_at', $yesterday)
                                ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                ->sum('total_price');
        $yesterdayUsers = User::whereTime('created_at', $yesterday)->count();
        
        // 待处理订单
        $pendingOrders = Order::where('status', Order::STATUS_PENDING)->count();
        $paidOrders = Order::where('status', Order::STATUS_PAID)->count();
        $shippingOrders = Order::where('status', Order::STATUS_SHIPPED)->count();
        
        // 库存预警
        $lowStockProducts = Product::where('stock', '<=', 10)
                                  ->where('status', 1)
                                  ->count();
        $outOfStockProducts = Product::where('stock', '<=', 0)
                                    ->where('status', 1)
                                    ->count();
        
        // 商品统计
        $totalProducts = Product::count();
        $activeProducts = Product::where('status', 1)->count();
        $totalCategories = Category::count();
        $activeCategories = Category::where('status', 1)->count();
        
        // 用户统计
        $totalUsers = User::count();
        $activeUsers = User::where('status', 1)->count();
        
        // 计算增长率
        $orderGrowth = $this->calculateGrowth($todayOrders, $yesterdayOrders);
        $revenueGrowth = $this->calculateGrowth($todayRevenue, $yesterdayRevenue);
        $userGrowth = $this->calculateGrowth($todayUsers, $yesterdayUsers);
        
        // 获取最近订单
        $recentOrders = $this->getRecentOrders(10);
        
        // 获取热销商品
        $topProducts = $this->getTopSellingProducts(5);
        
        // 获取库存预警商品
        $lowStockList = $this->getLowStockProducts(5);
        
        // 获取订单状态分布
        $orderStatusStats = $this->getOrderStatusStats();
        
        // 获取销售趋势
        $salesTrend = $this->getSalesTrend(7);

        // 业务申请总量统计（仪表盘顶部卡片）
        $totalInquiries = SkInquiry::count();
        $totalQuoteRequests = SkQuoteRequest::count();
        $totalSampleApplications = SkSampleApply::count();

        return [
            'stats' => [
                'inquiries' => [
                    'label' => '历史询盘',
                    'value' => $totalInquiries,
                    'icon' => 'users',
                ],
                'quote_requests' => [
                    'label' => '报价申请',
                    'value' => $totalQuoteRequests,
                    'icon' => 'file-text',
                ],
                'sample_applications' => [
                    'label' => '样品申请',
                    'value' => $totalSampleApplications,
                    'icon' => 'package',
                ],
            ],
            'overview' => [
                'today_orders' => [
                    'value' => $todayOrders,
                    'growth' => $orderGrowth,
                    'label' => '今日订单',
                    'icon' => 'shopping-cart'
                ],
                'today_revenue' => [
                    'value' => $todayRevenue,
                    'formatted_value' => '$' . number_format($todayRevenue, 2) . ' USD',
                    'growth' => $revenueGrowth,
                    'label' => '今日销售额',
                    'icon' => 'dollar-sign'
                ],
                'today_users' => [
                    'value' => $todayUsers,
                    'growth' => $userGrowth,
                    'label' => '今日新用户',
                    'icon' => 'users'
                ],
                'low_stock_alerts' => [
                    'value' => $lowStockProducts,
                    'growth' => 0,
                    'label' => '库存预警',
                    'icon' => 'alert-triangle',
                    'color' => 'warning'
                ]
            ],
            'orders' => [
                'pending' => $pendingOrders,
                'paid' => $paidOrders,
                'shipping' => $shippingOrders,
                'status_stats' => $orderStatusStats
            ],
            'inventory' => [
                'total_products' => $totalProducts,
                'active_products' => $activeProducts,
                'low_stock' => $lowStockProducts,
                'out_of_stock' => $outOfStockProducts,
                'low_stock_list' => $lowStockList
            ],
            'users' => [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'today_new' => $todayUsers
            ],
            'categories' => [
                'total_categories' => $totalCategories,
                'active_categories' => $activeCategories
            ],
            'recent_orders' => $recentOrders,
            'top_products' => $topProducts,
            'sales_trend' => $salesTrend
        ];
    }

    /**
     * 获取最近订单
     */
    private function getRecentOrders($limit = 10)
    {
        return Order::with(['user', 'orderItems'])
                   ->order('id', 'desc')
                   ->limit($limit)
                   ->select()
                   ->map(function($order) {
                       return [
                           'id' => $order->id,
                           'order_no' => $order->order_no,
                           'customer' => [
                               'id' => $order->user->id ?? 0,
                               'nickname' => $order->user->nickname ?? '未知用户',
                               'phone' => $order->user->phone ?? ''
                           ],
                           'total_price' => $order->total_price,
                           'formatted_price' => '$' . number_format($order->total_price, 2) . ' USD',
                           'status' => $order->status,
                           'status_text' => $order->status_text,
                           'status_color' => $order->status_color,
                           'items_count' => $order->orderItems->count(),
                           'main_product' => $this->getMainProduct($order->id),
                           'created_at' => $order->created_at,
                           'time_ago' => $this->timeAgo($order->created_at)
                       ];
                   });
    }

    /**
     * 获取订单主要商品
     */
    private function getMainProduct($orderId)
    {
        $orderItem = OrderItem::where('order_id', $orderId)
                             ->order('total_price', 'desc')
                             ->first();
        
        return $orderItem ? $orderItem->product_name : '未知商品';
    }

    /**
     * 获取热销商品
     */
    private function getTopSellingProducts($limit = 5)
    {
        $startDate = date('Y-m-d', strtotime('-30 days'));
        
        return OrderItem::alias('oi')
                       ->join('orders o', 'oi.order_id = o.id')
                       ->join('products p', 'oi.product_id = p.id')
                       ->where('o.created_at', '>=', $startDate)
                       ->whereIn('o.status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                       ->group('oi.product_id')
                       ->order('total_quantity', 'desc')
                       ->limit($limit)
                       ->field([
                           'oi.product_id',
                           'oi.product_name',
                           'p.main_image',
                           'p.price',
                           'p.stock',
                           'SUM(oi.quantity) as total_quantity',
                           'SUM(oi.total_price) as total_revenue',
                           'COUNT(DISTINCT o.id) as order_count'
                       ])
                       ->select()
                       ->map(function($item, $index) {
                           return [
                               'rank' => $index + 1,
                               'product_id' => $item['product_id'],
                               'product_name' => $item['product_name'],
                               'main_image' => $item['main_image'] ?: '',
                               'price' => $item['price'],
                               'stock' => $item['stock'],
                               'total_quantity' => $item['total_quantity'],
                               'total_revenue' => $item['total_revenue'],
                               'formatted_revenue' => '$' . number_format($item['total_revenue'], 2) . ' USD',
                               'order_count' => $item['order_count'],
                               'avg_quantity' => round($item['total_quantity'] / $item['order_count'], 2)
                           ];
                       });
    }

    /**
     * 获取库存预警商品
     */
    private function getLowStockProducts($limit = 5)
    {
        return Product::where('status', 1)
                     ->where('stock', '>', 0)
                     ->where('stock', '<=', 10)
                     ->order('stock', 'asc')
                     ->limit($limit)
                     ->select()
                     ->map(function($product) {
                         return [
                             'id' => $product->id,
                             'name' => $product->name,
                             'main_image' => $product->main_image ?: '',
                             'price' => $product->price,
                             'stock' => $product->stock,
                             'stock_status' => $product->getStockStatus(),
                             'stock_status_text' => $product->stock_status_text,
                             'sales_count' => $product->sales_count
                         ];
                     });
    }

    /**
     * 获取订单状态统计
     */
    private function getOrderStatusStats()
    {
        $stats = Order::selectRaw('status, COUNT(*) as count')
                     ->groupBy('status')
                     ->get()
                     ->keyBy('status');

        $statusMap = [
            Order::STATUS_PENDING => '待付款',
            Order::STATUS_PAID => '已付款',
            Order::STATUS_SHIPPED => '已发货',
            Order::STATUS_COMPLETED => '已完成',
            Order::STATUS_CANCELLED => '已取消'
        ];

        $result = [];
        foreach ($statusMap as $status => $text) {
            $result[] = [
                'status' => $status,
                'status_text' => $text,
                'count' => $stats->get($status)->count ?? 0,
                'percentage' => 0 // 将在前端计算
            ];
        }

        return $result;
    }

    /**
     * 获取销售趋势
     */
    private function getSalesTrend($days = 7)
    {
        $data = [];
        
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            
            $orders = Order::whereTime('created_at', $date)->count();
            $revenue = Order::whereTime('created_at', $date)
                          ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                          ->sum('total_price');
            
            $data[] = [
                'date' => $date,
                'date_formatted' => date('m/d', strtotime($date)),
                'orders' => $orders,
                'revenue' => $revenue,
                'formatted_revenue' => '$' . number_format($revenue, 2) . ' USD'
            ];
        }
        
        return $data;
    }

    /**
     * 计算增长率
     */
    private function calculateGrowth($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        
        return round(($current - $previous) / $previous * 100, 1);
    }

    /**
     * 计算时间差
     */
    private function timeAgo($datetime)
    {
        $time = time() - strtotime($datetime);
        
        if ($time < 60) {
            return '刚刚';
        } elseif ($time < 3600) {
            return floor($time / 60) . '分钟前';
        } elseif ($time < 86400) {
            return floor($time / 3600) . '小时前';
        } elseif ($time < 2592000) {
            return floor($time / 86400) . '天前';
        } else {
            return date('Y-m-d', strtotime($datetime));
        }
    }

    /**
     * 获取销售图表数据
     */
    public function salesChart()
    {
        try {
            $days = min($this->request->param('days', 7), 30);
            $type = $this->request->param('type', 'revenue'); // revenue, orders, users
            
            $data = [];
            
            for ($i = $days - 1; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-{$i} days"));
                
                switch ($type) {
                    case 'orders':
                        $value = Order::whereTime('created_at', $date)->count();
                        break;
                    case 'users':
                        $value = User::whereTime('created_at', $date)->count();
                        break;
                    case 'revenue':
                    default:
                        $value = Order::whereTime('created_at', $date)
                                    ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                    ->sum('total_price');
                        break;
                }
                
                $data[] = [
                    'date' => $date,
                    'date_formatted' => date('m/d', strtotime($date)),
                    'value' => $value,
                    'formatted_value' => $type === 'revenue' ? '$' . number_format($value, 2) . ' USD' : $value
                ];
            }
            
            return $this->success($data);

        } catch (\Exception $e) {
            Log::error('Get sales chart error: ' . $e->getMessage());
            return $this->error('获取销售图表数据失败');
        }
    }

    /**
     * 获取详细统计数据
     */
    public function statistics()
    {
        try {
            $stats = OrderService::getOrderStatistics();
            
            // 添加更多统计数据
            $stats['products'] = [
                'total' => Product::count(),
                'active' => Product::where('status', 1)->count(),
                'low_stock' => Product::where('stock', '<=', 10)->where('status', 1)->count(),
                'out_of_stock' => Product::where('stock', '<=', 0)->where('status', 1)->count()
            ];
            
            $stats['users'] = [
                'total' => User::count(),
                'active' => User::where('status', 1)->count(),
                'today_new' => User::whereTime('created_at', date('Y-m-d'))->count()
            ];
            
            $stats['categories'] = [
                'total' => Category::count(),
                'active' => Category::where('status', 1)->count()
            ];
            
            return $this->success($stats);

        } catch (\Exception $e) {
            Log::error('Get statistics error: ' . $e->getMessage());
            return $this->error('获取统计数据失败');
        }
    }

    /**
     * 获取实时数据
     */
    public function realtime()
    {
        try {
            $data = [
                'current_time' => date('Y-m-d H:i:s'),
                'pending_orders' => Order::where('status', Order::STATUS_PENDING)->count(),
                'processing_orders' => Order::where('status', Order::STATUS_PAID)->count(),
                'shipping_orders' => Order::where('status', Order::STATUS_SHIPPED)->count(),
                'low_stock_alerts' => Product::where('stock', '<=', 10)->where('status', 1)->count(),
                'today_orders' => Order::whereTime('created_at', date('Y-m-d'))->count(),
                'today_revenue' => Order::whereTime('created_at', date('Y-m-d'))
                                      ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_SHIPPED, Order::STATUS_COMPLETED])
                                      ->sum('total_price'),
                'online_users' => User::where('last_login_at', '>=', date('Y-m-d H:i:s', strtotime('-30 minutes')))->count()
            ];
            
            return $this->success($data);

        } catch (\Exception $e) {
            Log::error('Get realtime data error: ' . $e->getMessage());
            return $this->error('获取实时数据失败');
        }
    }
}