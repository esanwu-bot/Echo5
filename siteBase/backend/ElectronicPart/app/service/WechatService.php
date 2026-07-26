<?php
/**
 * 电子元器件商城 - 微信服务
 * 文件说明：封装微信小程序/公众号相关接口（登录、获取手机号、access_token 管理）。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service;

use think\facade\Config;
use think\facade\Log;
use think\Exception;

class WechatService
{
    protected $appId;
    protected $secret;
    protected $baseUrl = 'https://api.weixin.qq.com';
    
    public function __construct()
    {
        $this->appId = Config::get('wechat.appid', env('WECHAT_APPID', ''));
        $this->secret = Config::get('wechat.secret', env('WECHAT_SECRET', ''));
        
        if (empty($this->appId) || empty($this->secret)) {
            throw new Exception('微信配置信息不完整');
        }
    }
    
    /**
     * 通过code获取openid和session_key
     *
     * @param string $code 微信登录code
     * @return array
     * @throws Exception
     */
    public static function getOpenidByCode(string $code): array
    {
        $instance = new static();
        return $instance->jscode2session($code);
    }
    
    /**
     * 登录凭证校验
     *
     * @param string $code 微信登录code
     * @return array
     * @throws Exception
     */
    public function jscode2session(string $code): array
    {
        $url = $this->baseUrl . '/sns/jscode2session';
        $params = [
            'appid' => $this->appId,
            'secret' => $this->secret,
            'js_code' => $code,
            'grant_type' => 'authorization_code'
        ];
        
        $fullUrl = $url . '?' . http_build_query($params);
        
        try {
            $result = $this->curlGet($fullUrl);
            
            if (isset($result['errcode']) && $result['errcode'] !== 0) {
                Log::error('微信登录失败', [
                    'code' => $code,
                    'error' => $result
                ]);
                
                throw new Exception('微信登录失败: ' . ($result['errmsg'] ?? '未知错误'));
            }
            
            if (empty($result['openid'])) {
                throw new Exception('获取openid失败');
            }
            
            return [
                'openid' => $result['openid'],
                'session_key' => $result['session_key'] ?? '',
                'unionid' => $result['unionid'] ?? ''
            ];
            
        } catch (\Exception $e) {
            Log::error('微信API调用失败', [
                'code' => $code,
                'error' => $e->getMessage()
            ]);
            
            throw new Exception('微信服务调用失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取access_token
     *
     * @return string
     * @throws Exception
     */
    public function getAccessToken(): string
    {
        $cacheKey = "wechat_access_token:{$this->appId}";
        $accessToken = cache($cacheKey);
        
        if ($accessToken) {
            return $accessToken;
        }
        
        $url = $this->baseUrl . '/cgi-bin/token';
        $params = [
            'appid' => $this->appId,
            'secret' => $this->secret,
            'grant_type' => 'client_credential'
        ];
        
        $fullUrl = $url . '?' . http_build_query($params);
        
        try {
            $result = $this->curlGet($fullUrl);
            
            if (isset($result['errcode']) && $result['errcode'] !== 0) {
                throw new Exception('获取access_token失败: ' . ($result['errmsg'] ?? '未知错误'));
            }
            
            $accessToken = $result['access_token'];
            $expiresIn = $result['expires_in'] ?? 7200;
            
            // 缓存access_token，提前5分钟过期
            cache($cacheKey, $accessToken, $expiresIn - 300);
            
            return $accessToken;
            
        } catch (\Exception $e) {
            Log::error('获取微信access_token失败', [
                'error' => $e->getMessage()
            ]);
            
            throw new Exception('获取access_token失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取用户手机号
     *
     * @param string $code 手机号获取code
     * @return array
     * @throws Exception
     */
    public function getPhoneNumber(string $code): array
    {
        $accessToken = $this->getAccessToken();
        $url = $this->baseUrl . '/wxa/business/getuserphonenumber';
        
        $fullUrl = $url . '?access_token=' . urlencode($accessToken);
        $postData = json_encode(['code' => $code]);
        
        try {
            $result = $this->curlPost($fullUrl, $postData);
            
            if (isset($result['errcode']) && $result['errcode'] !== 0) {
                throw new Exception('获取手机号失败: ' . ($result['errmsg'] ?? '未知错误'));
            }
            
            return $result['phone_info'] ?? [];
            
        } catch (\Exception $e) {
            Log::error('获取微信用户手机号失败', [
                'code' => $code,
                'error' => $e->getMessage()
            ]);
            
            throw new Exception('获取手机号失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 发送订阅消息
     *
     * @param string $openid 用户openid
     * @param string $templateId 模板ID
     * @param array $data 模板数据
     * @param string $page 跳转页面
     * @return bool
     * @throws Exception
     */
    public function sendSubscribeMessage(string $openid, string $templateId, array $data, string $page = ''): bool
    {
        $accessToken = $this->getAccessToken();
        $url = $this->baseUrl . '/cgi-bin/message/subscribe/send';
        
        $fullUrl = $url . '?access_token=' . urlencode($accessToken);
        
        $messageData = [
            'touser' => $openid,
            'template_id' => $templateId,
            'data' => $data
        ];
        
        if (!empty($page)) {
            $messageData['page'] = $page;
        }
        
        $postData = json_encode($messageData);
        
        try {
            $result = $this->curlPost($fullUrl, $postData);
            
            if (isset($result['errcode']) && $result['errcode'] !== 0) {
                Log::error('发送订阅消息失败', [
                    'openid' => $openid,
                    'template_id' => $templateId,
                    'error' => $result
                ]);
                
                return false;
            }
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('发送微信订阅消息失败', [
                'openid' => $openid,
                'template_id' => $templateId,
                'error' => $e->getMessage()
            ]);
            
            throw new Exception('发送订阅消息失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 生成小程序码
     *
     * @param string $path 页面路径
     * @param array $params 页面参数
     * @param int $width 二维码宽度
     * @return string
     * @throws Exception
     */
    public function createWxacode(string $path, array $params = [], int $width = 430): string
    {
        $accessToken = $this->getAccessToken();
        $url = $this->baseUrl . '/wxa/getwxacode';
        
        $fullUrl = $url . '?access_token=' . urlencode($accessToken);
        
        // 构建完整路径
        $queryString = http_build_query($params);
        $fullPath = $path . (!empty($queryString) ? '?' . $queryString : '');
        
        $postData = json_encode([
            'path' => $fullPath,
            'width' => $width
        ]);
        
        try {
            $result = $this->curlPost($fullUrl, $postData, true);
            
            // 检查是否是JSON错误响应
            if (substr($result, 0, 1) === '{') {
                $errorResult = json_decode($result, true);
                if (isset($errorResult['errcode'])) {
                    throw new Exception('生成小程序码失败: ' . ($errorResult['errmsg'] ?? '未知错误'));
                }
            }
            
            // 返回二进制图片数据
            return $result;
            
        } catch (\Exception $e) {
            Log::error('生成微信小程序码失败', [
                'path' => $path,
                'error' => $e->getMessage()
            ]);
            
            throw new Exception('生成小程序码失败: ' . $e->getMessage());
        }
    }
    
    /**
     * cURL GET请求
     *
     * @param string $url 请求URL
     * @param int $timeout 超时时间（秒）
     * @return array
     * @throws Exception
     */
    private function curlGet(string $url, int $timeout = 10): array
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response === false) {
            throw new Exception('cURL请求失败: ' . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception('HTTP请求失败，状态码: ' . $httpCode);
        }
        
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON解析失败: ' . json_last_error_msg());
        }
        
        return $result;
    }
    
    /**
     * cURL POST请求
     *
     * @param string $url 请求URL
     * @param string $data POST数据
     * @param bool $returnRaw 是否返回原始数据（用于二进制数据）
     * @return mixed
     * @throws Exception
     */
    private function curlPost(string $url, string $data, bool $returnRaw = false)
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($data)
            ],
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response === false) {
            throw new Exception('cURL请求失败: ' . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception('HTTP请求失败，状态码: ' . $httpCode);
        }
        
        if ($returnRaw) {
            return $response;
        }
        
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON解析失败: ' . json_last_error_msg());
        }
        
        return $result;
    }
}
