<?php
namespace app\service;

use think\facade\Env;

/**
 * Google Cloud Translation API 服务
 * 
 * 用于多语言翻译功能
 */
class GoogleTranslateService
{
    /**
     * Google Cloud API Key
     */
    protected $apiKey;
    
    /**
     * API 基础URL
     */
    protected $baseUrl = 'https://translation.googleapis.com/language/translate/v2';
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->apiKey = Env::get('GOOGLE_TRANSLATE_API_KEY', '');
    }
    
    /**
     * 检测文本语言
     *
     * @param string $text 要检测的文本
     * @return array 检测结果
     */
    public function detectLanguage(string $text): array
    {
        if (empty($this->apiKey)) {
            return ['error' => 'Google Translate API Key 未配置'];
        }
        
        $url = $this->baseUrl . '/detect';
        
        $data = [
            'q' => $text,
            'key' => $this->apiKey
        ];
        
        return $this->sendRequest($url, $data);
    }
    
    /**
     * 翻译文本
     *
     * @param string $text 要翻译的文本
     * @param string $targetLang 目标语言代码 (如: 'en', 'zh', 'ja')
     * @param string|null $sourceLang 源语言代码 (可选, 自动检测传 null)
     * @return array 翻译结果
     */
    public function translate(string $text, string $targetLang = 'en', ?string $sourceLang = null): array
    {
        if (empty($this->apiKey)) {
            return ['error' => 'Google Translate API Key 未配置，请在 .env 中设置 GOOGLE_TRANSLATE_API_KEY'];
        }
        
        $url = $this->baseUrl;
        
        $data = [
            'q' => $text,
            'target' => $targetLang,
            'key' => $this->apiKey,
            'format' => 'text'
        ];
        
        // 如果指定了源语言，添加到请求
        if (!empty($sourceLang)) {
            $data['source'] = $sourceLang;
        }
        
        return $this->sendRequest($url, $data);
    }
    
    /**
     * 批量翻译文本
     *
     * @param array $texts 要翻译的文本数组
     * @param string $targetLang 目标语言代码
     * @param string|null $sourceLang 源语言代码
     * @return array 翻译结果
     */
    public function translateBatch(array $texts, string $targetLang = 'en', ?string $sourceLang = null): array
    {
        if (empty($this->apiKey)) {
            return ['error' => 'Google Translate API Key 未配置'];
        }
        
        $url = $this->baseUrl;
        
        $data = [
            'target' => $targetLang,
            'key' => $this->apiKey,
            'format' => 'text'
        ];
        
        // 添加多个 q 参数
        foreach ($texts as $text) {
            $data['q'][] = $text;
        }
        
        if (!empty($sourceLang)) {
            $data['source'] = $sourceLang;
        }
        
        return $this->sendRequest($url, $data);
    }
    
    /**
     * 获取支持的语言列表
     *
     * @param string $targetLang 返回语言名称的语言代码
     * @return array 语言列表
     */
    public function getSupportedLanguages(string $targetLang = 'zh'): array
    {
        if (empty($this->apiKey)) {
            return ['error' => 'Google Translate API Key 未配置'];
        }
        
        $url = 'https://translation.googleapis.com/language/translate/v2/languages';
        
        $params = [
            'key' => $this->apiKey,
            'target' => $targetLang
        ];
        
        $url .= '?' . http_build_query($params);
        
        return $this->sendGetRequest($url);
    }
    
    /**
     * 发送 POST 请求
     *
     * @param string $url 请求URL
     * @param array $data 请求数据
     * @return array 响应结果
     */
    protected function sendRequest(string $url, array $data): array
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($data),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded'
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return ['error' => '请求失败: ' . $error];
        }
        
        if ($httpCode !== 200) {
            return ['error' => 'HTTP 错误: ' . $httpCode, 'response' => $response];
        }
        
        $result = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'JSON 解析失败: ' . json_last_error_msg()];
        }
        
        return $result;
    }
    
    /**
     * 发送 GET 请求
     *
     * @param string $url 请求URL
     * @return array 响应结果
     */
    protected function sendGetRequest(string $url): array
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            return ['error' => '请求失败: ' . $error];
        }
        
        if ($httpCode !== 200) {
            return ['error' => 'HTTP 错误: ' . $httpCode];
        }
        
        $result = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'JSON 解析失败: ' . json_last_error_msg()];
        }
        
        return $result;
    }
    
    /**
     * 检查 API Key 是否已配置
     *
     * @return bool
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }
    
    /**
     * 获取 API Key (脱敏显示)
     *
     * @return string
     */
    public function getMaskedApiKey(): string
    {
        if (empty($this->apiKey)) {
            return '未配置';
        }
        
        $length = strlen($this->apiKey);
        if ($length <= 8) {
            return '***';
        }
        
        return substr($this->apiKey, 0, 4) . str_repeat('*', $length - 8) . substr($this->apiKey, -4);
    }
}
