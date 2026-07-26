<?php
/**
 * 电子元器件商城 - 后台认证控制器
 * 文件说明：后台管理员认证（登录）、JWT 生成与会话管理。
 */

namespace app\controller\admin;

use app\BaseController;
use app\model\SkAdmin;
use app\model\SkRole;
use think\Request;
use think\facade\Config;
use think\facade\Log;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
class AuthController extends BaseController
{
    /**
     * 管理员登录
     */
    public function login(Request $request)
    {
        try {
            $data = $request->param();
            
            // 验证参数
            if (empty($data['username']) || empty($data['password'])) {
                return $this->error('用户名和密码不能为空');
            }
            
            $username = $data['username'];
            $password = $data['password'];
            
            // 按用户名查找管理员
            $admin = SkAdmin::findByUsername($username);
            
            if (!$admin || $admin->status !== 1) {
                return $this->error('用户名或密码错误');
            }
            
            // 验证密码
            if (!$admin->verifyPassword($password)) {
                return $this->error('用户名或密码错误');
            }
            
            // 更新最后登录时间
            $admin->updateLastLogin();
            
            // 获取角色信息
            $role = SkRole::find($admin->role_id);
            
            // 构建管理员信息
            $adminInfo = [
                'id' => $admin->id,
                'username' => $admin->username,
                'real_name' => $admin->real_name,
                'email' => $admin->email,
                'role' => $role ? $role->role_name : 'guest',
                'permissions' => $role ? $role->permissions : [],
            ];
            
            // 生成JWT令牌
            $key = Config::get('jwt.key');
            $issuer = Config::get('jwt.issuer');
            $audience = Config::get('jwt.audience');
            $expire = Config::get('jwt.expire');

            $payload = [
                'iss' => $issuer,
                'aud' => $audience,
                'iat' => time(),
                'exp' => time() + $expire,
                'data' => [
                    'admin_id' => $admin->id,
                    'username' => $admin->username,
                    'role' => $adminInfo['role'],
                ]
            ];
            
            $token = JWT::encode($payload, $key, 'HS256');
            
            return $this->success([
                'token' => $token,
                'admin' => $adminInfo,
                'expires_in' => $expire
            ], '登录成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取管理员信息
     */
    public function profile(Request $request)
    {
        try {
            // admin_id由AdminAuthMiddleware中间件注入到请求中
            $adminId = $request->admin_id;

            if (!$adminId) {
                 return $this->error('未授权', 401);
            }
            
            // 从数据库获取管理员信息
            $admin = SkAdmin::find($adminId);
            
            if (!$admin || $admin->status !== 1) {
                return $this->error('管理员不存在或已被禁用', 404);
            }

            // 获取角色信息
            $role = SkRole::find($admin->role_id);
            
            return $this->success([
                'id' => $admin->id,
                'username' => $admin->username,
                'real_name' => $admin->real_name,
                'email' => $admin->email,
                'phone' => $admin->phone,
                'role' => $role ? $role->role_name : 'guest',
                'permissions' => $role ? $role->permissions : [],
                'last_login_time' => $admin->last_login_time
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 管理员退出登录
     */
    public function logout(Request $request)
    {
        // JWT是无状态的，客户端应丢弃令牌
        return $this->success(null, '退出登录成功');
    }
}