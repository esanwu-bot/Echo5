<?php

namespace app\controller\admin;

use app\BaseController;
use app\model\User;
use app\model\Order;
use app\model\OrderItem;
use app\model\Product;
use think\Request;
use think\facade\Db;
use think\facade\Log;

/**
 * 复购分析控制器
 */
class RepurchaseAnalysisController extends BaseController
{
    /**
     * 获取复购率概览
     */
    public function overview(Request $request)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // 总用户数
            $totalUsers = User::where('created_time', 'between', [$startDate, $endDate])
                             ->count();
            
            // 有购买行为的用户数
            $purchasedUsers = User::alias('u')
                                 ->join('orders o', 'u.id = o.user_id')
                                 ->where('u.created_time', 'between', [$startDate, $endDate])
                                 ->where('o.status', 'completed')
                                 ->group('u.id')
                                 ->count();
            
            // 复购用户数（购买次数>=2）
            $repurchaseUsers = User::alias('u')
                                  ->join('orders o', 'u.id = o.user_id')
                                  ->where('u.created_time', 'between', [$startDate, $endDate])
                                  ->where('o.status', 'completed')
                                  ->group('u.id')
                                  ->having('count(o.id) >= 2')
                                  ->count();
            
            // 计算复购率
            $repurchaseRate = $purchasedUsers > 0 ? round(($repurchaseUsers / $purchasedUsers) * 100, 2) : 0;
            $purchaseRate = $totalUsers > 0 ? round(($purchasedUsers / $totalUsers) * 100, 2) : 0;
            
            // 平均订单价值
            $avgOrderValue = Order::where('created_time', 'between', [$startDate, $endDate])
                                  ->where('status', 'completed')
                                  ->avg('total_amount') ?: 0;
            
            // 复购用户平均订单价值
            $repurchaseAvgOrderValue = Order::alias('o')
                                           ->join('(' . $this->getRepurchaseUsersSubquery($startDate, $endDate) . ') ru', 'o.user_id = ru.user_id')
                                           ->where('o.created_time', 'between', [$startDate, $endDate])
                                           ->where('o.status', 'completed')
                                           ->avg('o.total_amount') ?: 0;
            
            return $this->success([
                'total_users' => $totalUsers,
                'purchased_users' => $purchasedUsers,
                'repurchase_users' => $repurchaseUsers,
                'repurchase_rate' => $repurchaseRate,
                'purchase_rate' => $purchaseRate,
                'avg_order_value' => round($avgOrderValue, 2),
                'repurchase_avg_order_value' => round($repurchaseAvgOrderValue, 2),
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取复购趋势数据
     */
    public function trend(Request $request)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            $period = $params['period'] ?? 'day'; // day, week, month
            
            $dateFormat = $this->getDateFormat($period);
            $groupBy = $this->getGroupBy($period);
            
            // 获取趋势数据
            $trendData = Db::query("
                SELECT 
                    {$dateFormat} as date_period,
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT CASE WHEN order_count >= 1 THEN u.id END) as purchased_users,
                    COUNT(DISTINCT CASE WHEN order_count >= 2 THEN u.id END) as repurchase_users,
                    ROUND(
                        COUNT(DISTINCT CASE WHEN order_count >= 2 THEN u.id END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT CASE WHEN order_count >= 1 THEN u.id END), 0), 2
                    ) as repurchase_rate
                FROM users u
                LEFT JOIN (
                    SELECT 
                        user_id,
                        {$dateFormat} as order_date,
                        COUNT(*) as order_count
                    FROM orders 
                    WHERE created_time BETWEEN '{$startDate}' AND '{$endDate}'
                    AND status = 'completed'
                    GROUP BY user_id, {$groupBy}
                ) o ON u.id = o.user_id AND {$dateFormat} = o.order_date
                WHERE u.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                GROUP BY {$groupBy}
                ORDER BY date_period
            ");
            
            return $this->success($trendData);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取用户复购行为分析
     */
    public function userBehavior(Request $request)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // 按购买次数分组统计
            $purchaseFrequency = Db::query("
                SELECT 
                    CASE 
                        WHEN order_count = 1 THEN '1次'
                        WHEN order_count = 2 THEN '2次'
                        WHEN order_count = 3 THEN '3次'
                        WHEN order_count BETWEEN 4 AND 5 THEN '4-5次'
                        WHEN order_count BETWEEN 6 AND 10 THEN '6-10次'
                        ELSE '10次以上'
                    END as frequency_range,
                    COUNT(*) as user_count,
                    ROUND(AVG(total_amount), 2) as avg_amount,
                    ROUND(SUM(total_amount), 2) as total_amount
                FROM (
                    SELECT 
                        u.id,
                        COUNT(o.id) as order_count,
                        SUM(o.total_amount) as total_amount
                    FROM users u
                    JOIN orders o ON u.id = o.user_id
                    WHERE o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                    AND o.status = 'completed'
                    GROUP BY u.id
                ) user_orders
                GROUP BY 
                    CASE 
                        WHEN order_count = 1 THEN '1次'
                        WHEN order_count = 2 THEN '2次'
                        WHEN order_count = 3 THEN '3次'
                        WHEN order_count BETWEEN 4 AND 5 THEN '4-5次'
                        WHEN order_count BETWEEN 6 AND 10 THEN '6-10次'
                        ELSE '10次以上'
                    END
                ORDER BY 
                    CASE 
                        WHEN frequency_range = '1次' THEN 1
                        WHEN frequency_range = '2次' THEN 2
                        WHEN frequency_range = '3次' THEN 3
                        WHEN frequency_range = '4-5次' THEN 4
                        WHEN frequency_range = '6-10次' THEN 5
                        ELSE 6
                    END
            ");
            
            // 复购间隔分析
            $repurchaseInterval = Db::query("
                SELECT 
                    CASE 
                        WHEN avg_interval <= 7 THEN '7天内'
                        WHEN avg_interval <= 30 THEN '8-30天'
                        WHEN avg_interval <= 90 THEN '31-90天'
                        WHEN avg_interval <= 180 THEN '91-180天'
                        ELSE '180天以上'
                    END as interval_range,
                    COUNT(*) as user_count
                FROM (
                    SELECT 
                        user_id,
                        AVG(DATEDIFF(next_order_date, order_date)) as avg_interval
                    FROM (
                        SELECT 
                            user_id,
                            created_time as order_date,
                            LEAD(created_time) OVER (PARTITION BY user_id ORDER BY created_time) as next_order_date
                        FROM orders
                        WHERE created_time BETWEEN '{$startDate}' AND '{$endDate}'
                        AND status = 'completed'
                    ) order_intervals
                    WHERE next_order_date IS NOT NULL
                    GROUP BY user_id
                ) user_intervals
                GROUP BY 
                    CASE 
                        WHEN avg_interval <= 7 THEN '7天内'
                        WHEN avg_interval <= 30 THEN '8-30天'
                        WHEN avg_interval <= 90 THEN '31-90天'
                        WHEN avg_interval <= 180 THEN '91-180天'
                        ELSE '180天以上'
                    END
                ORDER BY 
                    CASE 
                        WHEN interval_range = '7天内' THEN 1
                        WHEN interval_range = '8-30天' THEN 2
                        WHEN interval_range = '31-90天' THEN 3
                        WHEN interval_range = '91-180天' THEN 4
                        ELSE 5
                    END
            ");
            
            return $this->success([
                'purchase_frequency' => $purchaseFrequency,
                'repurchase_interval' => $repurchaseInterval
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取商品复购分析
     */
    public function productAnalysis(Request $request)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $offset = ($page - 1) * $limit;
            
            // 商品复购率分析
            $productRepurchase = Db::query("
                SELECT 
                    p.id,
                    p.name as product_name,
                    p.image as product_image,
                    p.price,
                    COUNT(DISTINCT oi.order_id) as total_orders,
                    COUNT(DISTINCT o.user_id) as total_users,
                    COUNT(DISTINCT CASE WHEN user_order_count >= 2 THEN o.user_id END) as repurchase_users,
                    ROUND(
                        COUNT(DISTINCT CASE WHEN user_order_count >= 2 THEN o.user_id END) * 100.0 / 
                        NULLIF(COUNT(DISTINCT o.user_id), 0), 2
                    ) as repurchase_rate,
                    SUM(oi.quantity) as total_quantity,
                    ROUND(SUM(oi.quantity * oi.price), 2) as total_amount
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                JOIN (
                    SELECT 
                        oi2.product_id,
                        o2.user_id,
                        COUNT(DISTINCT o2.id) as user_order_count
                    FROM order_items oi2
                    JOIN orders o2 ON oi2.order_id = o2.id
                    WHERE o2.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                    AND o2.status = 'completed'
                    GROUP BY oi2.product_id, o2.user_id
                ) user_product_orders ON p.id = user_product_orders.product_id AND o.user_id = user_product_orders.user_id
                WHERE o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND o.status = 'completed'
                GROUP BY p.id, p.name, p.image, p.price
                HAVING total_users >= 2
                ORDER BY repurchase_rate DESC, total_amount DESC
                LIMIT {$limit} OFFSET {$offset}
            ");
            
            // 获取总数
            $total = Db::query("
                SELECT COUNT(DISTINCT p.id) as total
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND o.status = 'completed'
                GROUP BY p.id
                HAVING COUNT(DISTINCT o.user_id) >= 2
            ");
            
            $totalCount = count($total);
            
            return $this->success([
                'list' => $productRepurchase,
                'pagination' => [
                    'total' => $totalCount,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($totalCount / $limit)
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取复购用户列表
     */
    public function repurchaseUsers(Request $request)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $offset = ($page - 1) * $limit;
            
            // 获取复购用户详细信息
            $repurchaseUsers = Db::query("
                SELECT 
                    u.id,
                    u.username,
                    u.phone,
                    u.email,
                    u.created_time as register_time,
                    COUNT(o.id) as order_count,
                    ROUND(SUM(o.total_amount), 2) as total_amount,
                    ROUND(AVG(o.total_amount), 2) as avg_order_amount,
                    MIN(o.created_time) as first_order_time,
                    MAX(o.created_time) as last_order_time,
                    DATEDIFF(MAX(o.created_time), MIN(o.created_time)) as purchase_span_days,
                    ROUND(
                        DATEDIFF(MAX(o.created_time), MIN(o.created_time)) / NULLIF(COUNT(o.id) - 1, 0), 1
                    ) as avg_purchase_interval
                FROM users u
                JOIN orders o ON u.id = o.user_id
                WHERE o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND o.status = 'completed'
                GROUP BY u.id, u.username, u.phone, u.email, u.created_time
                HAVING order_count >= 2
                ORDER BY total_amount DESC, order_count DESC
                LIMIT {$limit} OFFSET {$offset}
            ");
            
            // 获取总数
            $totalCount = Db::query("
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                JOIN orders o ON u.id = o.user_id
                WHERE o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND o.status = 'completed'
                GROUP BY u.id
                HAVING COUNT(o.id) >= 2
            ")[0]['total'] ?? 0;
            
            return $this->success([
                'list' => $repurchaseUsers,
                'pagination' => [
                    'total' => $totalCount,
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($totalCount / $limit)
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取用户复购详情
     */
    public function userDetail(Request $request, $userId)
    {
        try {
            $params = $request->param();
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            // 用户基本信息
            $user = User::find($userId);
            if (!$user) {
                return $this->error('用户不存在');
            }
            
            // 用户订单统计
            $orderStats = Db::query("
                SELECT 
                    COUNT(*) as order_count,
                    ROUND(SUM(total_amount), 2) as total_amount,
                    ROUND(AVG(total_amount), 2) as avg_amount,
                    MIN(created_time) as first_order_time,
                    MAX(created_time) as last_order_time
                FROM orders
                WHERE user_id = {$userId}
                AND created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND status = 'completed'
            ")[0];
            
            // 用户订单列表
            $orders = Db::query("
                SELECT 
                    o.id,
                    o.order_no,
                    o.total_amount,
                    o.created_time,
                    o.status,
                    COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = {$userId}
                AND o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                GROUP BY o.id, o.order_no, o.total_amount, o.created_time, o.status
                ORDER BY o.created_time DESC
            ");
            
            // 用户购买的商品分析
            $productAnalysis = Db::query("
                SELECT 
                    p.id,
                    p.name as product_name,
                    p.image as product_image,
                    COUNT(DISTINCT o.id) as order_count,
                    SUM(oi.quantity) as total_quantity,
                    ROUND(SUM(oi.quantity * oi.price), 2) as total_amount,
                    MIN(o.created_time) as first_purchase_time,
                    MAX(o.created_time) as last_purchase_time
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = {$userId}
                AND o.created_time BETWEEN '{$startDate}' AND '{$endDate}'
                AND o.status = 'completed'
                GROUP BY p.id, p.name, p.image
                ORDER BY total_amount DESC
            ");
            
            return $this->success([
                'user' => $user,
                'order_stats' => $orderStats,
                'orders' => $orders,
                'product_analysis' => $productAnalysis
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 导出复购分析报告
     */
    public function export(Request $request)
    {
        try {
            $params = $request->param();
            $type = $params['type'] ?? 'overview'; // overview, users, products
            $startDate = $params['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $params['end_date'] ?? date('Y-m-d');
            
            $data = [];
            $filename = '';
            
            switch ($type) {
                case 'overview':
                    $data = $this->getOverviewExportData($startDate, $endDate);
                    $filename = "复购率概览_{$startDate}_{$endDate}.csv";
                    break;
                case 'users':
                    $data = $this->getUsersExportData($startDate, $endDate);
                    $filename = "复购用户列表_{$startDate}_{$endDate}.csv";
                    break;
                case 'products':
                    $data = $this->getProductsExportData($startDate, $endDate);
                    $filename = "商品复购分析_{$startDate}_{$endDate}.csv";
                    break;
                default:
                    return $this->error('不支持的导出类型');
            }
            
            return $this->success([
                'download_url' => $this->generateCsvFile($data, $filename),
                'filename' => $filename
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取复购用户子查询
     */
    private function getRepurchaseUsersSubquery($startDate, $endDate)
    {
        return "SELECT user_id FROM orders WHERE created_time BETWEEN '{$startDate}' AND '{$endDate}' AND status = 'completed' GROUP BY user_id HAVING COUNT(*) >= 2";
    }
    
    /**
     * 获取日期格式
     */
    private function getDateFormat($period)
    {
        switch ($period) {
            case 'week':
                return "DATE_FORMAT(created_time, '%Y-%u')";
            case 'month':
                return "DATE_FORMAT(created_time, '%Y-%m')";
            default:
                return "DATE(created_time)";
        }
    }
    
    /**
     * 获取分组字段
     */
    private function getGroupBy($period)
    {
        switch ($period) {
            case 'week':
                return "YEAR(created_time), WEEK(created_time)";
            case 'month':
                return "YEAR(created_time), MONTH(created_time)";
            default:
                return "DATE(created_time)";
        }
    }
    
    /**
     * 获取概览导出数据
     */
    private function getOverviewExportData($startDate, $endDate)
    {
        // 实现概览数据导出逻辑
        return [];
    }
    
    /**
     * 获取用户导出数据
     */
    private function getUsersExportData($startDate, $endDate)
    {
        // 实现用户数据导出逻辑
        return [];
    }
    
    /**
     * 获取商品导出数据
     */
    private function getProductsExportData($startDate, $endDate)
    {
        // 实现商品数据导出逻辑
        return [];
    }
    
    /**
     * 生成CSV文件
     */
    private function generateCsvFile($data, $filename)
    {
        // 实现CSV文件生成逻辑
        return '/exports/' . $filename;
    }
}