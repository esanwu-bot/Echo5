<?php
/**
 * 电子元器件商城 - 跨域中间件
 * 文件说明：处理跨域请求，设置 CORS 响应头，支持预检请求。
 */

namespace app\middleware;

use Closure;
use think\Request;
use think\Response;

class Cors
{
    /**
     * 处理请求
     *
     * @param Request $request
     * @param Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // CORS白名单配置 - 建议移到config/cors.php中
        $allowedOrigins = config('cors.allowed_origins', [
            'http://localhost:3000',
            'http://localhost:3001',
        ]);

        $origin = $request->header('origin');
        
        // Origin不在白名单中时不设置CORS头，浏览器将拒绝跨域请求
        if (!in_array($origin, $allowedOrigins)) {
            // 处理预检请求但拒绝跨域
            if ($request->method(true) == 'OPTIONS') {
                return Response::create('', 'html', 403);
            }
            return $next($request);
        }
        
        // 处理预检请求
        if ($request->method(true) == 'OPTIONS') {
            $response = Response::create('', 'html', 200);
        } else {
            $response = $next($request);
        }

        // 设置 CORS 头 - 动态允许来源（兼容 credentials）
        $allowedHeaders = config('cors.allowed_headers', []);
        $allowedHeadersStr = implode(', ', $allowedHeaders);

        $exposedHeaders = config('cors.exposed_headers', []);
        $exposedHeadersStr = implode(', ', $exposedHeaders);

        $allowedMethods = config('cors.allowed_methods', []);
        $allowedMethodsStr = implode(', ', $allowedMethods);

        $response->header([
            'Access-Control-Allow-Origin'      => $origin,
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Allow-Methods'     => $allowedMethodsStr,
            'Access-Control-Allow-Headers'     => $allowedHeadersStr,
            'Access-Control-Expose-Headers'    => $exposedHeadersStr,
            'Access-Control-Max-Age'           => config('cors.max_age', 1728000),
        ]);

        return $response;
    }
}
