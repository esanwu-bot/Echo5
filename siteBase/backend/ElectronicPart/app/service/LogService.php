<?php
/**
 * 电子元器件商城 - 日志服务
 * 文件说明：统一记录错误、SQL、调试及 API 请求日志，便于排查与监控。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service;

use think\facade\Log;

class LogService
{
    /**
     * 记录错误日志
     */
    public static function error($message, array $context = [], string $module = '')
    {
        $logData = [
            'module' => $module ?: self::getModuleName(),
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => request()->ip(),
            'url' => request()->url(true),
            'user_agent' => request()->server('HTTP_USER_AGENT', ''),
            'context' => $context
        ];

        Log::channel('error')->error($message, $logData);
    }

    /**
     * 记录SQL日志
     */
    public static function sql($sql, $time, $connection = 'mysql')
    {
        $logData = [
            'sql' => $sql,
            'time' => $time,
            'connection' => $connection,
            'timestamp' => date('Y-m-d H:i:s'),
        ];

        Log::channel('sql')->info('SQL Query', $logData);
    }

    /**
     * 记录调试信息
     */
    public static function debug($message, array $context = [])
    {
        $logData = array_merge([
            'timestamp' => date('Y-m-d H:i:s'),
            'memory' => round(memory_get_usage() / 1024 / 1024, 2) . 'MB',
        ], $context);

        Log::channel('debug')->debug($message, $logData);
    }

    /**
     * 记录API请求日志
     */
    public static function api($requestData, $responseData, $time)
    {
        $logData = [
            'request' => $requestData,
            'response' => $responseData,
            'execution_time' => $time . 's',
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => request()->ip(),
        ];

        Log::info('API Request', $logData);
    }

    /**
     * 获取模块名称
     */
    private static function getModuleName()
    {
        $path = request()->pathinfo();
        $parts = explode('/', $path);
        return $parts[0] ?? 'unknown';
    }

    /**
     * 清理过期日志文件
     */
    public static function clearExpiredLogs($days = 30)
    {
        $logPath = app()->getRuntimePath() . 'log';
        self::deleteOldFiles($logPath, $days);
    }

    /**
     * 删除过期文件
     */
    private static function deleteOldFiles($directory, $days)
    {
        if (!is_dir($directory)) return;

        $files = scandir($directory);
        $time = time() - ($days * 24 * 60 * 60);

        foreach ($files as $file) {
            if ($file == '.' || $file == '..') continue;
            
            $filePath = $directory . DIRECTORY_SEPARATOR . $file;
            if (is_file($filePath)) {
                if (filemtime($filePath) < $time) {
                    unlink($filePath);
                }
            } elseif (is_dir($filePath)) {
                self::deleteOldFiles($filePath, $days);
            }
        }
    }
}