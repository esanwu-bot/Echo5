<?php

namespace app\middleware;

use think\Request;
use think\Response;
use think\facade\Config;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * 代理商认证中间件
 */
class AgentAuthMiddleware
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
        // 获取Authorization头
        $authorization = $request->header('Authorization');
        
        if (!$authorization) {
            return json([
                'code' => 401,
                'message' => '缺少认证信息',
                'data' => null,
                'timestamp' => time()
            ], 401);
        }
        
        // 解析Bearer Token
        if (!preg_match('/Bearer\s+(.*)$/i', $authorization, $matches)) {
            return json([
                'code' => 401,
                'message' => '认证格式错误',
                'data' => null,
                'timestamp' => time()
            ], 401);
        }
        
        $token = $matches[1];
        
        try {
            // 验证JWT Token
            $key = Config::get('jwt.key', '');
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // 检查是否为代理商用户
            if (!isset($decoded->type) || $decoded->type !== 'agent') {
                return json([
                    'code' => 403,
                    'message' => '权限不足',
                    'data' => null,
                    'timestamp' => time()
                ], 403);
            }
            
            // 检查token是否过期
            if (isset($decoded->exp) && $decoded->exp < time()) {
                return json([
                    'code' => 401,
                    'message' => 'Token已过期',
                    'data' => null,
                    'timestamp' => time()
                ], 401);
            }
            
            // 将用户信息存储到请求中
            $request->userId = $decoded->user_id ?? null;
            $request->agentId = $decoded->agent_id ?? null;
            $request->userInfo = $decoded;
            
        } catch (\Exception $e) {
            return json([
                'code' => 401,
                'message' => 'Token验证失败：' . $e->getMessage(),
                'data' => null,
                'timestamp' => time()
            ], 401);
        }
        
        return $next($request);
    }
}