<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\AuthService;
use think\Request;
use think\Response;

/**
 * 认证中间件
 */
class AuthMiddleware
{
    protected $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
    }
    
    /**
     * 处理请求
     *
     * @param Request $request
     * @param \Closure $next
     * @return Response
     */
    public function handle(Request $request, \Closure $next): Response
    {
        // 获取Token
        $token = $request->header('Authorization');
        
        if (empty($token)) {
            return json([
                'code' => 401,
                'message' => '请先登录'
            ], 401);
        }
        
        try {
            // 验证Token
            $tokenData = $this->authService->verifyToken($token);
            
            // 检查Token是否在黑名单中
            if ($this->authService->isTokenBlacklisted($token)) {
                return json([
                    'code' => 401,
                    'message' => 'Token已失效，请重新登录'
                ], 401);
            }
            
            // 将用户信息添加到请求中
            $request->userId = $tokenData['user_id'];
            $request->username = $tokenData['username'];
            
            return $next($request);
            
        } catch (\Exception $e) {
            return json([
                'code' => 401,
                'message' => $e->getMessage()
            ], 401);
        }
    }
}