<?php
namespace app\middleware;

use app\service\LogService;
use think\Response;

class RequestLog
{
    public function handle($request, \Closure $next)
    {
        // 记录请求开始时间
        $startTime = microtime(true);
        
        // 继续执行请求
        $response = $next($request);
        
        // 记录请求日志
        $this->logRequest($request, $response, $startTime);
        
        return $response;
    }

    /**
     * 记录请求日志
     */
    protected function logRequest($request, $response, $startTime)
    {
        $executionTime = round(microtime(true) - $startTime, 3);
        
        $logData = [
            'method' => $request->method(),
            'url' => $request->url(true),
            'ip' => $request->ip(),
            'user_agent' => $request->server('HTTP_USER_AGENT', ''),
            'status_code' => $response->getCode(),
            'execution_time' => $executionTime . 's',
            'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . 'MB',
        ];

        // 根据执行时间记录不同级别的日志
        if ($executionTime > 3) {
            LogService::error('Slow Request', $logData, 'performance');
        } elseif ($executionTime > 1) {
            LogService::debug('Normal Request', $logData);
        }

        // 记录5xx错误
        if ($response->getCode() >= 500) {
            LogService::error('Server Error', $logData, 'http');
        }
    }
}