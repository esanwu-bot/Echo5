<?php

declare(strict_types=1);

namespace app\middleware;

use think\Request;
use think\Response;
use think\facade\Cache;

/**
 * API 请求频率限制中间件
 * 支持 IP 限流 + VisitorId 限流双模式，游客也能用但有额度控制
 */
class RateLimitMiddleware
{
    /**
     * 各接口限流配置 [key => [limit, period_seconds]]
     */
    protected $limits = [
        'guide/chat'        => [20, 60],   // 每分钟最多 20 次
        'guide/chat/stream' => [10, 60],   // 每分钟最多 10 次（SSE 长连接成本高）
        'guide/quick-search' => [30, 60],  // 每分钟最多 30 次
        'guide/quote'       => [5, 60],    // 询价更严格
        'guide/sample'      => [3, 60],    // 样品申请最严格
        'default'           => [60, 60],
    ];

    public function handle(Request $request, \Closure $next): Response
    {
        $path     = $request->pathinfo();
        $routeKey = $this->matchRoute($path);

        // 不在限流列表的路由直接放行
        if ($routeKey === null) {
            return $next($request);
        }

        [$limit, $period] = $this->limits[$routeKey] ?? $this->limits['default'];

        // 获取限流标识：优先用 user_id，其次 visitor_id，最后 IP
        $identifier = $this->getIdentifier($request);
        $cacheKey   = "rate_limit:{$routeKey}:{$identifier}";

        $current = (int) Cache::get($cacheKey, 0);

        if ($current >= $limit) {
            $retryAfter = max(1, $period - ((int) microtime(true) % $period));

            $body = [
                'code'    => 429,
                'message' => "请求过于频繁，请 {$retryAfter} 秒后再试",
                'data'    => [
                    'retry_after' => $retryAfter,
                    'limit'       => $limit,
                    'period'      => $period,
                ],
            ];

            // SSE 接口返回 JSON 错误（因为此时连接尚未建立 SSE 流）
            return json($body, 429, [
                'Retry-After'           => (string) $retryAfter,
                'X-RateLimit-Limit'     => (string) $limit,
                'X-RateLimit-Remaining' => '0',
            ]);
        }

        // 原子递增计数（ThinkPHP Cache 无原子 incr，用 set 覆盖，够用即可）
        Cache::set($cacheKey, $current + 1, $period);

        /** @var Response $response */
        $response = $next($request);

        // 附加限流信息到响应头
        $remaining = max(0, $limit - $current - 1);
        $response->header([
            'X-RateLimit-Limit'     => (string) $limit,
            'X-RateLimit-Remaining' => (string) $remaining,
        ]);

        return $response;
    }

    /**
     * 获取限流标识：登录用户用 user_id，游客用 visitor_id，兜底用 IP
     */
    protected function getIdentifier(Request $request): string
    {
        // 优先 JWT 中的 user_id（登录用户）
        if (!empty($request->userId)) {
            return 'user:' . $request->userId;
        }

        // 其次 visitor_id（前端生成，存 localStorage 带上）
        $visitorId = $request->header('X-Visitor-Id');
        if ($visitorId) {
            return 'visitor:' . md5($visitorId);
        }

        // 最后兜底用 IP
        return 'ip:' . $request->ip();
    }

    /**
     * 匹配路由到限流规则
     */
    protected function matchRoute(string $path): ?string
    {
        foreach (array_keys($this->limits) as $route) {
            if (strpos($path, $route) !== false) {
                return $route;
            }
        }
        return null;
    }
}
