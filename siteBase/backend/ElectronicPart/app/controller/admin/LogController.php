<?php

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use think\exception\ValidateException;
use think\facade\Validate;
use think\facade\Db;

class LogController extends BaseController
{
    /**
     * 获取操作日志列表
     */
    public function index()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100',
                'level' => 'in:,info,warning,error',
                'start_date' => 'date',
                'end_date' => 'date'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间',
                'level.in' => '日志级别不正确',
                'start_date.date' => '开始日期格式不正确',
                'end_date.date' => '结束日期格式不正确'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $keyword = trim($params['keyword'] ?? '');
            $level = $params['level'] ?? '';
            $startDate = $params['start_date'] ?? '';
            $endDate = $params['end_date'] ?? '';

            // 这里模拟日志数据，实际项目中应该从日志表或文件中读取
            $logs = $this->getSystemLogs($page, $limit, $keyword, $level, $startDate, $endDate);

            return $this->success($logs);

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Get logs error: ' . $e->getMessage());
            return $this->error('获取日志列表失败');
        }
    }

    /**
     * 获取日志详情
     */
    public function read($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('日志ID无效');
            }

            // 这里模拟获取日志详情
            $log = $this->getLogDetail($id);
            
            if (!$log) {
                return $this->error('日志不存在');
            }

            return $this->success($log);

        } catch (\Exception $e) {
            Log::error('Get log detail error: ' . $e->getMessage());
            return $this->error('获取日志详情失败');
        }
    }

    /**
     * 清空日志
     */
    public function clear()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'level' => 'in:,info,warning,error',
                'days' => 'integer|>=:1'
            ])->message([
                'level.in' => '日志级别不正确',
                'days.integer' => '天数必须是整数'
            ]);

            $params = $this->request->param();
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $level = $params['level'] ?? '';
            $days = $params['days'] ?? 30;

            // 清空指定条件的日志
            $clearedCount = $this->clearSystemLogs($level, $days);

            return $this->success([
                'cleared_count' => $clearedCount
            ], "成功清空 {$clearedCount} 条日志");

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Clear logs error: ' . $e->getMessage());
            return $this->error('清空日志失败');
        }
    }

    /**
     * 获取系统日志（模拟数据）
     */
    private function getSystemLogs($page, $limit, $keyword = '', $level = '', $startDate = '', $endDate = '')
    {
        // 模拟日志数据
        $allLogs = [
            [
                'id' => 1,
                'level' => 'info',
                'message' => '用户登录成功',
                'context' => [
                    'user_id' => 1,
                    'username' => 'admin',
                    'ip' => '192.168.1.100',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ],
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 hour'))
            ],
            [
                'id' => 2,
                'level' => 'warning',
                'message' => '商品库存不足',
                'context' => [
                    'product_id' => 10,
                    'product_name' => '茅台酒',
                    'current_stock' => 5,
                    'threshold' => 10
                ],
                'created_at' => date('Y-m-d H:i:s', strtotime('-2 hours'))
            ],
            [
                'id' => 3,
                'level' => 'error',
                'message' => '支付接口调用失败',
                'context' => [
                    'order_id' => 100,
                    'payment_method' => 'wechat',
                    'error_code' => 'INVALID_REQUEST',
                    'error_message' => '参数错误'
                ],
                'created_at' => date('Y-m-d H:i:s', strtotime('-3 hours'))
            ],
            [
                'id' => 4,
                'level' => 'info',
                'message' => '订单创建成功',
                'context' => [
                    'order_id' => 101,
                    'user_id' => 5,
                    'total_amount' => 299.00
                ],
                'created_at' => date('Y-m-d H:i:s', strtotime('-4 hours'))
            ],
            [
                'id' => 5,
                'level' => 'warning',
                'message' => '登录失败次数过多',
                'context' => [
                    'ip' => '192.168.1.200',
                    'attempts' => 5,
                    'locked_until' => date('Y-m-d H:i:s', strtotime('+5 minutes'))
                ],
                'created_at' => date('Y-m-d H:i:s', strtotime('-5 hours'))
            ]
        ];

        // 筛选日志
        $filteredLogs = array_filter($allLogs, function($log) use ($keyword, $level, $startDate, $endDate) {
            // 关键词筛选
            if (!empty($keyword)) {
                if (strpos($log['message'], $keyword) === false) {
                    return false;
                }
            }

            // 级别筛选
            if (!empty($level) && $log['level'] !== $level) {
                return false;
            }

            // 日期筛选
            if (!empty($startDate) && $log['created_at'] < $startDate) {
                return false;
            }
            if (!empty($endDate) && $log['created_at'] > $endDate . ' 23:59:59') {
                return false;
            }

            return true;
        });

        // 分页
        $total = count($filteredLogs);
        $offset = ($page - 1) * $limit;
        $logs = array_slice($filteredLogs, $offset, $limit);

        // 格式化日志数据
        $logList = array_map(function($log) {
            return [
                'id' => $log['id'],
                'level' => $log['level'],
                'level_text' => $this->getLevelText($log['level']),
                'level_color' => $this->getLevelColor($log['level']),
                'message' => $log['message'],
                'context' => $log['context'],
                'context_summary' => $this->getContextSummary($log['context']),
                'created_at' => $log['created_at'],
                'time_ago' => $this->timeAgo($log['created_at'])
            ];
        }, $logs);

        return [
            'list' => $logList,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
    }

    /**
     * 获取日志详情（模拟数据）
     */
    private function getLogDetail($id)
    {
        // 模拟获取日志详情
        $logs = [
            1 => [
                'id' => 1,
                'level' => 'info',
                'message' => '用户登录成功',
                'context' => [
                    'user_id' => 1,
                    'username' => 'admin',
                    'ip' => '192.168.1.100',
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'session_id' => 'sess_123456789',
                    'login_time' => date('Y-m-d H:i:s')
                ],
                'stack_trace' => null,
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 hour'))
            ]
        ];

        $log = $logs[$id] ?? null;
        if (!$log) {
            return null;
        }

        return [
            'id' => $log['id'],
            'level' => $log['level'],
            'level_text' => $this->getLevelText($log['level']),
            'level_color' => $this->getLevelColor($log['level']),
            'message' => $log['message'],
            'context' => $log['context'],
            'stack_trace' => $log['stack_trace'],
            'created_at' => $log['created_at'],
            'time_ago' => $this->timeAgo($log['created_at'])
        ];
    }

    /**
     * 清空系统日志（模拟操作）
     */
    private function clearSystemLogs($level = '', $days = 30)
    {
        // 这里应该实际清空日志文件或数据库记录
        // 模拟返回清空的数量
        return rand(50, 200);
    }

    /**
     * 获取级别文本
     */
    private function getLevelText($level)
    {
        $levelMap = [
            'info' => '信息',
            'warning' => '警告',
            'error' => '错误',
            'debug' => '调试'
        ];

        return $levelMap[$level] ?? '未知';
    }

    /**
     * 获取级别颜色
     */
    private function getLevelColor($level)
    {
        $colorMap = [
            'info' => 'blue',
            'warning' => 'orange',
            'error' => 'red',
            'debug' => 'gray'
        ];

        return $colorMap[$level] ?? 'gray';
    }

    /**
     * 获取上下文摘要
     */
    private function getContextSummary($context)
    {
        if (empty($context)) {
            return '';
        }

        $summary = [];
        foreach ($context as $key => $value) {
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value);
            }
            $summary[] = "{$key}: {$value}";
            if (count($summary) >= 3) {
                break;
            }
        }

        return implode(', ', $summary);
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
}