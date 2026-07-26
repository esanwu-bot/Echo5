<?php
/**
 * 电子元器件商城 - 管理员认证中间件
 * 文件说明：验证管理员 JWT Token，检查签发者与接收者，验证管理员状态和权限，将管理员信息注入请求。
 */

namespace app\middleware;

use think\Request;
use think\Response;
use think\facade\Config;
use think\facade\Log;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use app\model\SkAdmin;
use app\model\SkRole;

class AdminAuthMiddleware
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
        // 获取 Authorization 请求头
        $authorization = $request->header('Authorization');

        if (!$authorization) {
            return json([
                'code' => 401,
                'message' => '缺少认证信息',
                'data' => null
            ], 401);
        }

        // 解析 Bearer Token
        if (!preg_match('/Bearer\s+(.*)$/i', $authorization, $matches)) {
            return json([
                'code' => 401,
                'message' => '认证格式无效',
                'data' => null
            ], 401);
        }

        $token = $matches[1];

        try {
            // 验证 JWT Token
            $key = Config::get('jwt.key');
            if (empty($key)) {
                throw new \Exception('JWT密钥未配置');
            }
            
            $decoded = JWT::decode($token, new Key($key, 'HS256'));

            // 检查签发者与接收者
            $issuer = Config::get('jwt.issuer');
            $audience = Config::get('jwt.audience');

            if ($decoded->iss !== $issuer || $decoded->aud !== $audience) {
                Log::error('Token issuer/audience mismatch', [
                    'token_iss' => $decoded->iss ?? 'null',
                    'config_iss' => $issuer,
                    'token_aud' => $decoded->aud ?? 'null',
                    'config_aud' => $audience,
                ]);
                return json([
                    'code' => 401,
                    'message' => '无效的 Token 签发者或接收者 (token_iss: ' . ($decoded->iss ?? 'null') . ', config_iss: ' . $issuer . ')',
                    'data' => null
                ], 401);
            }

            // 验证管理员存在性和状态
            $adminId = $decoded->data->admin_id ?? null;
            if (!$adminId) {
                return json([
                    'code' => 401,
                    'message' => 'Token 中缺少管理员信息',
                    'data' => null
                ], 401);
            }

            // 查询管理员信息
            $admin = SkAdmin::find($adminId);
            if (!$admin) {
                Log::warning('AdminAuthMiddleware: 管理员不存在', ['admin_id' => $adminId]);
                return json([
                    'code' => 401,
                    'message' => '管理员不存在',
                    'data' => null
                ], 401);
            }

            // 检查管理员状态
            if ($admin->status != 1) {
                Log::warning('AdminAuthMiddleware: 管理员已被禁用', ['admin_id' => $adminId]);
                return json([
                    'code' => 403,
                    'message' => '账号已被禁用，请联系超级管理员',
                    'data' => null
                ], 403);
            }

            // 检查管理员角色是否存在且有效
            $roleId = $admin->role_id ?? null;
            if ($roleId) {
                $role = SkRole::find($roleId);
                if (!$role || $role->status != 1) {
                    Log::warning('AdminAuthMiddleware: 管理员角色无效', [
                        'admin_id' => $adminId,
                        'role_id' => $roleId
                    ]);
                    return json([
                        'code' => 403,
                        'message' => '角色无效或已被禁用',
                        'data' => null
                    ], 403);
                }
                
                // 将角色权限信息存入请求
                $request->admin_permissions = $role->permissions ?? [];
            }

            // 将管理员信息存入请求
            $request->admin_id = $adminId;
            $request->admin_info = $decoded->data;
            $request->admin_model = $admin;

        } catch (\Firebase\JWT\ExpiredException $e) {
            return json([
                'code' => 401,
                'message' => 'Token 已过期',
                'data' => null
            ], 401);
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            return json([
                'code' => 401,
                'message' => 'Token 签名无效',
                'data' => null
            ], 401);
        } catch (\Exception $e) {
            Log::error('AdminAuthMiddleware: Token 验证失败', [
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
                'trace' => $e->getTraceAsString(),
                'token_preview' => substr($token, 0, 50) . '...'
            ]);
            return json([
                'code' => 401,
                'message' => 'Token 验证失败: ' . $e->getMessage(),
                'data' => null
            ], 401);
        }

        return $next($request);
    }
}
