<?php
/**
 * 电子元器件商城 - JWT 服务
 * 文件说明：生成、解析和验证 JWT 令牌，用于用户鉴权与会话管理。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use think\facade\Config;
use think\exception\ValidateException;

class JwtService
{
    /**
     * 生成JWT令牌
     * @param array $payload 载荷数据
     * @return string
     */
    public static function encode(array $payload): string
    {
        $key = Config::get('jwt.key');
        $expire = Config::get('jwt.expire', 86400 * 30);

        if (empty($key)) {
            throw new \RuntimeException('JWT key is not configured');
        }

        $defaultPayload = [
            'iss' => Config::get('jwt.issuer', 'ElectronicPart'),
            'aud' => Config::get('jwt.audience', 'semiconductor-client'),
            'iat' => time(),
            'exp' => time() + $expire,
        ];

        $payload = array_merge($defaultPayload, $payload);

        return JWT::encode($payload, $key, 'HS256');
    }
    
    /**
     * 解析JWT令牌
     * @param string $token JWT令牌
     * @return object
     * @throws ValidateException
     */
    public static function decode(string $token): object
    {
        try {
            $key = Config::get('jwt.key');
            if (empty($key)) {
                throw new \RuntimeException('JWT key is not configured');
            }
            return JWT::decode($token, new Key($key, 'HS256'));
        } catch (\Exception $e) {
            throw new ValidateException('Invalid token: ' . $e->getMessage());
        }
    }
    
    /**
     * 验证JWT令牌
     * @param string $token JWT令牌
     * @return bool
     */
    public static function verify(string $token): bool
    {
        try {
            self::decode($token);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * 从请求头获取令牌
     * @param string $header Authorization头
     * @return string|null
     */
    public static function getTokenFromHeader(string $header): ?string
    {
        if (empty($header)) {
            return null;
        }
        
        // 移除 'Bearer ' 前缀
        if (strpos($header, 'Bearer ') === 0) {
            return substr($header, 7);
        }
        
        return $header;
    }
    
    /**
     * 获取令牌中的用户ID
     * @param string $token JWT令牌
     * @return int|null
     */
    public static function getUserId(string $token): ?int
    {
        try {
            $decoded = self::decode($token);
            return $decoded->user_id ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }
}