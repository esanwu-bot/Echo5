<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\outer\OAuth2Service;
use think\facade\Log;
use think\Request;
use think\Response;

/**
 * OAuth2认证中间件
 */
class OAuth2Middleware
{
    protected $oauth2Service;
    
    public function __construct()
    {
        $this->oauth2Service = new OAuth2Service();
    }
    
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @param string $scope 需要的权限范围
     * @return Response
     */
    public function handle(Request $request, \Closure $next, string $scope = '')
    {
        try {
            // 获取Authorization头
            $authorization = $request->header('Authorization');
            
            if (empty($authorization)) {
                return $this->unauthorizedResponse('Missing Authorization header');
            }
            
            // 解析Bearer token
            if (!preg_match('/Bearer\s+(\S+)/', $authorization, $matches)) {
                return $this->unauthorizedResponse('Invalid Authorization header format');
            }
            
            $accessToken = $matches[1];
            
            // 验证访问令牌
            $tokenData = $this->oauth2Service->validateAccessToken($accessToken);
            
            if (!$tokenData) {
                return $this->unauthorizedResponse('The access token provided is expired, revoked, malformed, or invalid');
            }
            
            // 验证权限范围
            if (!empty($scope) && !$this->oauth2Service->validateScope($accessToken, $scope)) {
                return $this->forbiddenResponse("Insufficient scope. Required: {$scope}");
            }
            
            // 将令牌信息添加到请求中
            $request->oauth2Token = $tokenData;
            $request->clientId = $tokenData['client_id'];
            $request->scopes = $tokenData['scopes'];
            $request->userId = $tokenData['user_id'] ?? 0;
            
            // 记录访问日志
            Log::info('OAuth2 API access', [
                'client_id' => $tokenData['client_id'],
                'user_id' => $tokenData['user_id'] ?? 0,
                'scopes' => $tokenData['scopes'],
                'path' => $request->pathinfo(),
                'method' => $request->method(),
                'ip' => $request->ip()
            ]);
            
            return $next($request);
            
        } catch (\Exception $e) {
            Log::error('OAuth2 middleware error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->serverErrorResponse('Authentication service error');
        }
    }
    
    /**
     * 返回401未授权响应
     *
     * @param string $description 错误描述
     * @return Response
     */
    protected function unauthorizedResponse(string $description): Response
    {
        return json([
            'error' => 'invalid_token',
            'error_description' => $description
        ], 401)->header([
            'WWW-Authenticate' => 'Bearer realm="api"'
        ]);
    }
    
    /**
     * 返回403禁止访问响应
     *
     * @param string $description 错误描述
     * @return Response
     */
    protected function forbiddenResponse(string $description): Response
    {
        return json([
            'error' => 'insufficient_scope',
            'error_description' => $description
        ], 403);
    }
    
    /**
     * 返回500服务器错误响应
     *
     * @param string $description 错误描述
     * @return Response
     */
    protected function serverErrorResponse(string $description): Response
    {
        return json([
            'error' => 'server_error',
            'error_description' => $description
        ], 500);
    }
}
