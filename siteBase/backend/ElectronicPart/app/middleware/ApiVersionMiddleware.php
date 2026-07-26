<?php
declare(strict_types=1);

namespace app\middleware;

use think\Request;
use think\Response;
use think\facade\Config;

/**
 * API版本控制中间件
 */
class ApiVersionMiddleware
{
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @return Response
     */
    public function handle(Request $request, \Closure $next)
    {
        // 获取API版本
        $version = $this->getApiVersion($request);
        
        // 验证版本是否支持
        if (!$this->isVersionSupported($version)) {
            return json([
                'error' => 'unsupported_version',
                'error_description' => "API version {$version} is not supported",
                'supported_versions' => $this->getSupportedVersions()
            ], 400);
        }
        
        // 将版本信息添加到请求中
        $request->apiVersion = $version;
        
        // 设置响应头
        $response = $next($request);
        
        if ($response instanceof Response) {
            $response->header([
                'API-Version' => $version,
                'API-Supported-Versions' => implode(', ', $this->getSupportedVersions())
            ]);
        }
        
        return $response;
    }
    
    /**
     * 获取API版本
     *
     * @param Request $request
     * @return string
     */
    protected function getApiVersion(Request $request): string
    {
        // 1. 从URL路径中获取版本 (如: /api/v1/products)
        $pathInfo = $request->pathinfo();
        if (preg_match('/^api\/(v\d+)\//', $pathInfo, $matches)) {
            return $matches[1];
        }
        
        // 2. 从Accept头中获取版本 (如: Accept: application/vnd.api+json;version=1)
        $accept = $request->header('Accept', '');
        if (preg_match('/version=(\d+)/', $accept, $matches)) {
            return 'v' . $matches[1];
        }
        
        // 3. 从自定义头中获取版本 (如: API-Version: v1)
        $apiVersion = $request->header('API-Version', '');
        if (!empty($apiVersion)) {
            return $apiVersion;
        }
        
        // 4. 从查询参数中获取版本 (如: ?version=v1)
        $queryVersion = $request->get('version', '');
        if (!empty($queryVersion)) {
            return $queryVersion;
        }
        
        // 5. 使用默认版本
        return Config::get('app.api_version', 'v1');
    }
    
    /**
     * 检查版本是否支持
     *
     * @param string $version
     * @return bool
     */
    protected function isVersionSupported(string $version): bool
    {
        return in_array($version, $this->getSupportedVersions());
    }
    
    /**
     * 获取支持的版本列表
     *
     * @return array
     */
    protected function getSupportedVersions(): array
    {
        return ['v1', 'v2']; // 可以从配置文件中读取
    }
}