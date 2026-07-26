<?php
/**
 * 电子元器件商城 - 认证服务
 * 文件说明：负责用户认证、Token 管理与注册/登录逻辑（JWT）。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service;

use app\model\SkUser;
use think\facade\Cache;
use think\facade\Log;
use think\Exception;

/**
 * 认证服务类
 */
class AuthService
{
    protected $tokenExpire = 7200; // 2小时
    
    /**
     * 用户登录
     *
     * @param string $username 用户名或手机号
     * @param string $password 密码
     * @return array
     * @throws Exception
     */
    public function login(string $username, string $password): array
    {
        // 查找用户
        $user = SkUser::where('username', $username)
            ->whereOr('email', $username)
            ->whereOr('phone', $username)
            ->find();
        
        if (!$user) {
            throw new Exception('用户不存在');
        }
        
        if ($user->status != 1) {
            throw new Exception('用户已被禁用');
        }
        
        // 验证密码
        if (!password_verify($password, $user->password)) {
            throw new Exception('密码错误');
        }
        
        // 生成Token
        $token = $this->generateToken($user);
        
        return [
            'token' => $token,
            'user' => $user->hidden(['password'])->toArray()
        ];
    }
    
    /**
     * 用户注册
     *
     * @param array $userData 用户数据
     * @return array
     * @throws Exception
     */
    public function register(array $userData): array
    {
        // 调试信息：输出邮箱参数
        Log::info('Checking email existence', ['email' => $userData['email']]);
        
        // 修复：使用count()而不是find()来检查邮箱是否已存在，避免查询结果异常
        $emailCount = SkUser::where('email', '=', $userData['email'])->count();
        Log::info('Email count result', ['count' => $emailCount]);
        
        // 检查邮箱是否已存在
        if ($emailCount > 0) {
            throw new Exception('邮箱已被注册');
        }
        
        // 检查手机号是否已存在
        $phoneToCheck = $userData['phone'] ?? '';
        if ($phoneToCheck) {
            Log::info('Checking phone existence', ['phone' => $phoneToCheck]);
            $phoneCount = SkUser::where('phone', '=', $phoneToCheck)->count();
            if ($phoneCount > 0) {
                throw new Exception('手机号已注册，当前手机号：' . $phoneToCheck);
            }
        }
        
        // 生成用户名（如果未提供）
        if (empty($userData['username'])) {
            // 使用email生成用户名，确保非空
            $baseUsername = $userData['email'] ? str_replace(['@', '.'], ['_', '_'], $userData['email']) : 'user_' . time();
            $username = $baseUsername;
        } else {
            $username = $userData['username'];
        }
        
        // 检查生成的用户名是否已存在，确保唯一性
        $originalUsername = $username;
        $counter = 1;
        while (SkUser::where('username', $username)->count() > 0) {
            $username = $originalUsername . '_' . $counter++;
        }
        
        // 创建用户
        $user = SkUser::create([
            'username' => $username,
            'email' => $userData['email'],
            'password' => password_hash($userData['password'], PASSWORD_DEFAULT),
            'company' => $userData['company'] ?? NULL,
            'contact_name' => $userData['contact_name'] ?? NULL,
            'phone' => $userData['phone'] ?? NULL,
            'country' => $userData['country'] ?? NULL,
            'position' => $userData['position'] ?? NULL,
            'status' => 1
        ]);
        
        // 生成Token
        $token = $this->generateToken($user);
        
        return [
            'token' => $token,
            'user' => $user->hidden(['password'])->toArray()
        ];
    }
    
    /**
     * 手机号登录
     *
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return array
     * @throws Exception
     */
    public function loginBySms(string $phone, string $code): array
    {
        // 验证短信验证码
        if (!$this->verifySmsCode($phone, $code, 'login')) {
            throw new Exception('验证码错误或已过期');
        }
        
        // 查找用户
        $user = SkUser::where('phone', $phone)->find();
        
        if (!$user) {
            throw new Exception('用户不存在');
        }
        
        if ($user->status != 1) {
            throw new Exception('用户已被禁用');
        }
        
        // 生成Token
        $token = $this->generateToken($user);
        
        return [
            'token' => $token,
            'user' => $user->hidden(['password'])->toArray()
        ];
    }
    
    /**
     * 发送短信验证码
     *
     * @param string $phone 手机号
     * @param string $type 类型
     * @return array
     * @throws Exception
     */
    public function sendSmsCode(string $phone, string $type): array
    {
        // 检查发送频率限制
        $cacheKey = "sms_limit:{$phone}";
        if (Cache::get($cacheKey)) {
            throw new Exception('发送过于频繁，请稍后再试');
        }
        
        // 使用密码学安全的随机函数生成验证码
        $code = str_pad((string)random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        
        // 存储验证码
        $smsKey = "sms_code:{$phone}:{$type}";
        Cache::set($smsKey, $code, 300); // 5分钟有效期
        
        // 设置发送频率限制
        Cache::set($cacheKey, 1, 60); // 1分钟内不能重复发送
        
        // 这里应该调用短信服务商API发送短信
        // 记录日志时不包含验证码
        Log::info("发送短信验证码", [
            'phone' => $phone,
            'type' => $type
        ]);
        
        // 响应中不返回验证码，任何环境都不返回
        return [
            'message' => '验证码发送成功'
        ];
    }
    
    /**
     * 验证短信验证码
     *
     * @param string $phone 手机号
     * @param string $code 验证码
     * @param string $type 类型
     * @return bool
     */
    public function verifySmsCode(string $phone, string $code, string $type = 'login'): bool
    {
        $smsKey = "sms_code:{$phone}:{$type}";
        $cachedCode = Cache::get($smsKey);
        
        if (!$cachedCode || $cachedCode !== $code) {
            return false;
        }
        
        // 验证成功后删除验证码
        Cache::delete($smsKey);
        
        return true;
    }
    
    /**
     * 生成JWT Token
     *
     * @param SkUser $user 用户对象
     * @return string
     */
    public function generateToken(SkUser $user): string
    {
        // 使用配置文件中的iss和aud，与AdminAuthMiddleware保持一致
        $payload = [
            'iss' => config('jwt.issuer'), // 签发者
            'aud' => config('jwt.audience'), // 接收者
            'iat' => time(), // 签发时间
            'exp' => time() + $this->tokenExpire, // 过期时间
            'user_id' => $user->id,
            'username' => $user->username
        ];
        
        return JwtService::encode($payload);
    }
    
    /**
     * 验证JWT Token
     *
     * @param string $token Token
     * @return array
     * @throws Exception
     */
    public function verifyToken(string $token): array
    {
        try {
            // 移除Bearer前缀
            $token = JwtService::getTokenFromHeader($token) ?? $token;
            
            $decoded = JwtService::decode($token);
            
            return [
                'user_id' => $decoded->user_id,
                'username' => $decoded->username,
                'exp' => $decoded->exp
            ];
            
        } catch (\Exception $e) {
            throw new Exception('Token无效或已过期');
        }
    }
    
    /**
     * 刷新Token
     *
     * @param string $token 原Token
     * @return array
     * @throws Exception
     */
    public function refreshToken(string $token): array
    {
        $tokenData = $this->verifyToken($token);
        
        // 检查Token是否即将过期（剩余时间少于30分钟）
        if ($tokenData['exp'] - time() > 1800) {
            throw new Exception('Token尚未到刷新时间');
        }
        
        $user = SkUser::find($tokenData['user_id']);
        if (!$user || $user->status != 1) {
            throw new Exception('用户不存在或已被禁用');
        }
        
        // 生成新Token
        $newToken = $this->generateToken($user);
        
        return [
            'token' => $newToken,
            'user' => $user->hidden(['password'])->toArray()
        ];
    }
    
    /**
     * 微信小程序登录
     *
     * @param string $code 微信登录code
     * @param array $userInfo 用户信息（可选）
     * @return array
     * @throws Exception
     */
    public function loginByWechat(string $code, array $userInfo = []): array
    {
        // 简化实现，返回错误
        throw new Exception('微信登录功能暂未实现');
    }
    
    /**
     * 用户登出
     *
     * @param string $token Token
     * @return bool
     */
    public function logout(string $token): bool
    {
        try {
            // 将token加入黑名单
            $tokenData = $this->verifyToken($token);
            // 使用SHA-256替代MD5生成缓存key
            $blacklistKey = "token_blacklist:" . hash('sha256', $token);
            Cache::set($blacklistKey, 1, $tokenData['exp'] - time());
            
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * 检查Token是否在黑名单中
     *
     * @param string $token Token
     * @return bool
     */
    public function isTokenBlacklisted(string $token): bool
    {
        // 使用SHA-256替代MD5生成缓存key
        $blacklistKey = "token_blacklist:" . hash('sha256', $token);
        return Cache::get($blacklistKey) !== null;
    }
}
