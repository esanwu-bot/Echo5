<?php
/**
 * 电子元器件商城 - 外部 OAuth2 服务
 * 文件说明：实现 OAuth2 授权流程（客户端凭证、刷新令牌、撤销等），用于对外 API 授权。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service\outer;

use think\facade\Cache;
use think\facade\Config;
use think\Exception;

class OAuth2Service
{
    protected $config;
    
    public function __construct()
    {
        $this->config = Config::get('oauth2', []);
    }
    
    /**
     * 客户端凭证授权
     *
     * @param string $clientId
     * @param string $clientSecret
     * @return array
     * @throws Exception
     */
    public function clientCredentialsGrant(string $clientId, string $clientSecret): array
    {
        // 验证客户端
        $client = $this->validateClient($clientId, $clientSecret);
        
        if (!$client) {
            throw new Exception('无效的客户端凭证');
        }
        
        // 检查授权类型
        if (!in_array('client_credentials', $client['grant_types'])) {
            throw new Exception('客户端不支持此授权类型');
        }
        
        // 生成访问令牌
        $accessToken = $this->generateAccessToken();
        $refreshToken = $this->generateRefreshToken();
        
        $tokenData = [
            'access_token' => $accessToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->config['token_lifetime'] ?? 3600,
            'refresh_token' => $refreshToken,
            'scope' => implode(' ', $client['scopes'])
        ];
        
        // 存储令牌信息
        $this->storeTokenInfo($accessToken, [
            'client_id' => $clientId,
            'scope' => $client['scopes'],
            'exp' => time() + ($this->config['token_lifetime'] ?? 3600),
            'active' => true
        ]);
        
        $this->storeRefreshToken($refreshToken, [
            'client_id' => $clientId,
            'access_token' => $accessToken,
            'exp' => time() + ($this->config['refresh_token_lifetime'] ?? 86400 * 30)
        ]);
        
        return $tokenData;
    }
    
    /**
     * 刷新令牌授权
     *
     * @param string $refreshToken
     * @param string $clientId
     * @param string $clientSecret
     * @return array
     * @throws Exception
     */
    public function refreshTokenGrant(string $refreshToken, string $clientId, string $clientSecret): array
    {
        // 验证客户端
        $client = $this->validateClient($clientId, $clientSecret);
        
        if (!$client) {
            throw new Exception('无效的客户端凭证');
        }
        
        // 验证刷新令牌
        $refreshTokenInfo = $this->getRefreshTokenInfo($refreshToken);
        
        if (!$refreshTokenInfo || $refreshTokenInfo['client_id'] !== $clientId) {
            throw new Exception('无效的刷新令牌');
        }
        
        if ($refreshTokenInfo['exp'] < time()) {
            throw new Exception('刷新令牌已过期');
        }
        
        // 撤销旧的访问令牌
        $this->revokeAccessToken($refreshTokenInfo['access_token']);
        
        // 生成新的访问令牌
        $newAccessToken = $this->generateAccessToken();
        $newRefreshToken = $this->generateRefreshToken();
        
        $tokenData = [
            'access_token' => $newAccessToken,
            'token_type' => 'Bearer',
            'expires_in' => $this->config['token_lifetime'] ?? 3600,
            'refresh_token' => $newRefreshToken,
            'scope' => implode(' ', $client['scopes'])
        ];
        
        // 存储新令牌信息
        $this->storeTokenInfo($newAccessToken, [
            'client_id' => $clientId,
            'scope' => $client['scopes'],
            'exp' => time() + ($this->config['token_lifetime'] ?? 3600),
            'active' => true
        ]);
        
        // 撤销旧的刷新令牌并存储新的
        $this->revokeRefreshToken($refreshToken);
        $this->storeRefreshToken($newRefreshToken, [
            'client_id' => $clientId,
            'access_token' => $newAccessToken,
            'exp' => time() + ($this->config['refresh_token_lifetime'] ?? 86400 * 30)
        ]);
        
        return $tokenData;
    }
    
    /**
     * 撤销令牌
     *
     * @param string $token
     * @param string $clientId
     * @param string $clientSecret
     * @throws Exception
     */
    public function revokeToken(string $token, string $clientId, string $clientSecret): void
    {
        // 验证客户端
        $client = $this->validateClient($clientId, $clientSecret);
        
        if (!$client) {
            throw new Exception('无效的客户端凭证');
        }
        
        // 尝试撤销访问令牌
        $tokenInfo = $this->getTokenInfo($token);
        if ($tokenInfo && $tokenInfo['client_id'] === $clientId) {
            $this->revokeAccessToken($token);
            return;
        }
        
        // 尝试撤销刷新令牌
        $refreshTokenInfo = $this->getRefreshTokenInfo($token);
        if ($refreshTokenInfo && $refreshTokenInfo['client_id'] === $clientId) {
            $this->revokeRefreshToken($token);
            // 同时撤销关联的访问令牌
            if (isset($refreshTokenInfo['access_token'])) {
                $this->revokeAccessToken($refreshTokenInfo['access_token']);
            }
            return;
        }
        
        throw new Exception('令牌不存在或无权撤销');
    }
    
    /**
     * 令牌内省
     *
     * @param string $token
     * @param string $clientId
     * @param string $clientSecret
     * @return array
     * @throws Exception
     */
    public function introspectToken(string $token, string $clientId, string $clientSecret): array
    {
        // 验证客户端
        $client = $this->validateClient($clientId, $clientSecret);
        
        if (!$client) {
            throw new Exception('无效的客户端凭证');
        }
        
        $tokenInfo = $this->getTokenInfo($token);
        
        if (!$tokenInfo) {
            return ['active' => false];
        }
        
        return [
            'active' => $tokenInfo['active'] && $tokenInfo['exp'] > time(),
            'client_id' => $tokenInfo['client_id'],
            'scope' => $tokenInfo['scope'],
            'exp' => $tokenInfo['exp']
        ];
    }
    
    /**
     * 验证访问令牌
     *
     * @param string $accessToken
     * @return array|null
     */
    public function validateAccessToken(string $accessToken): ?array
    {
        return $this->getTokenInfo($accessToken);
    }
    
    /**
     * 验证客户端
     *
     * @param string $clientId
     * @param string $clientSecret
     * @return array|null
     */
    protected function validateClient(string $clientId, string $clientSecret): ?array
    {
        $clients = $this->config['clients'] ?? [];
        
        foreach ($clients as $client) {
            if ($client['client_id'] === $clientId && $client['client_secret'] === $clientSecret) {
                return $client;
            }
        }
        
        return null;
    }
    
    /**
     * 生成访问令牌
     *
     * @return string
     */
    protected function generateAccessToken(): string
    {
        return 'at_' . bin2hex(random_bytes(32));
    }
    
    /**
     * 生成刷新令牌
     *
     * @return string
     */
    protected function generateRefreshToken(): string
    {
        return 'rt_' . bin2hex(random_bytes(32));
    }
    
    /**
     * 存储令牌信息
     *
     * @param string $token
     * @param array $info
     */
    protected function storeTokenInfo(string $token, array $info): void
    {
        $key = 'oauth2:access_token:' . $token;
        $ttl = $info['exp'] - time();
        Cache::set($key, $info, $ttl);
    }
    
    /**
     * 获取令牌信息
     *
     * @param string $token
     * @return array|null
     */
    protected function getTokenInfo(string $token): ?array
    {
        $key = 'oauth2:access_token:' . $token;
        return Cache::get($key);
    }
    
    /**
     * 撤销访问令牌
     *
     * @param string $token
     */
    protected function revokeAccessToken(string $token): void
    {
        $key = 'oauth2:access_token:' . $token;
        Cache::delete($key);
    }
    
    /**
     * 存储刷新令牌
     *
     * @param string $token
     * @param array $info
     */
    protected function storeRefreshToken(string $token, array $info): void
    {
        $key = 'oauth2:refresh_token:' . $token;
        $ttl = $info['exp'] - time();
        Cache::set($key, $info, $ttl);
    }
    
    /**
     * 获取刷新令牌信息
     *
     * @param string $token
     * @return array|null
     */
    protected function getRefreshTokenInfo(string $token): ?array
    {
        $key = 'oauth2:refresh_token:' . $token;
        return Cache::get($key);
    }
    
    /**
     * 撤销刷新令牌
     *
     * @param string $token
     */
    protected function revokeRefreshToken(string $token): void
    {
        $key = 'oauth2:refresh_token:' . $token;
        Cache::delete($key);
    }
}