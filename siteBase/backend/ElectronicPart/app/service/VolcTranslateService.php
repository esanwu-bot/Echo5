<?php
namespace app\service;

use think\facade\Env;
use Volc\Base\V4Curl;

/**
 * 火山引擎翻译内部客户端
 * 
 * 继承 V4Curl，实现翻译服务专用配置
 */
class VolcTranslateClient extends V4Curl
{
    protected function getConfig(string $region = '')
    {
        return [
            'host' => 'https://translate.volcengineapi.com',
            'config' => [
                'timeout' => 10.0,
                'headers' => [
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ],
                'v4_credentials' => [
                    'region' => 'cn-north-1',
                    'service' => 'translate',
                ],
            ],
        ];
    }

    protected $apiList = [
        'TranslateText' => [
            'url' => '/',
            'method' => 'post',
            'config' => [
                'query' => [
                    'Action' => 'TranslateText',
                    'Version' => '2020-06-01',
                ],
            ],
        ],
    ];
}

/**
 * 火山引擎翻译 API 服务
 * 
 * 使用官方 SDK: volcengine/volc-sdk-php
 * 文档: https://www.volcengine.com/docs/4640/65067
 */
class VolcTranslateService
{
    /**
     * @var VolcTranslateClient
     */
    protected $client;
    
    /**
     * Access Key ID
     */
    protected $accessKeyId;
    
    /**
     * Secret Access Key
     */
    protected $secretKey;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->accessKeyId = Env::get('VOLC_ACCESS_KEY_ID', '');
        $this->secretKey = Env::get('VOLC_SECRET_ACCESS_KEY', '');
        
        if ($this->isConfigured()) {
            $this->initClient();
        }
    }
    
    /**
     * 初始化火山引擎客户端
     */
    protected function initClient()
    {
        $this->client = new VolcTranslateClient('cn-north-1');
        $this->client->setAccessKey($this->accessKeyId);
        $this->client->setSecretKey($this->secretKey);
    }
    
    /**
     * 翻译文本
     *
     * @param string $text 要翻译的文本
     * @param string $targetLang 目标语言代码 (如: 'en', 'ja', 'ko')
     * @param string|null $sourceLang 源语言代码 (可选, 自动检测传 null 或 'auto')
     * @return array 翻译结果
     */
    public function translate(string $text, string $targetLang = 'en', ?string $sourceLang = null): array
    {
        if (!$this->isConfigured()) {
            return ['error' => '火山引擎 API 密钥未配置'];
        }
        
        try {
            $body = [
                'TargetLanguage' => $targetLang,
                'TextList' => [$text]
            ];
            
            if (!empty($sourceLang) && $sourceLang !== 'auto') {
                $body['SourceLanguage'] = $sourceLang;
            }
            
            $response = $this->client->request('TranslateText', [
                'json' => $body,
                'verify' => false,
            ]);
            
            if ($response === null) {
                return ['error' => 'API 请求失败，响应为空'];
            }
            
            $content = $response->getBody()->getContents();
            return $this->parseResponse($content);
        } catch (\Exception $e) {
            return ['error' => '翻译失败: ' . $e->getMessage()];
        }
    }
    
    /**
     * 批量翻译
     *
     * @param array $texts 文本数组
     * @param string $targetLang 目标语言
     * @param string|null $sourceLang 源语言
     * @return array
     */
    public function translateBatch(array $texts, string $targetLang = 'en', ?string $sourceLang = null): array
    {
        if (!$this->isConfigured()) {
            return ['error' => '火山引擎 API 密钥未配置'];
        }
        
        try {
            $body = [
                'TargetLanguage' => $targetLang,
                'TextList' => $texts
            ];
            
            if (!empty($sourceLang) && $sourceLang !== 'auto') {
                $body['SourceLanguage'] = $sourceLang;
            }
            
            $response = $this->client->request('TranslateText', [
                'json' => $body,
                'verify' => false,
            ]);
            
            if ($response === null) {
                return ['error' => 'API 请求失败，响应为空'];
            }
            
            $content = $response->getBody()->getContents();
            return $this->parseResponse($content);
        } catch (\Exception $e) {
            return ['error' => '批量翻译失败: ' . $e->getMessage()];
        }
    }
    
    /**
     * 语言检测
     *
     * @param string $text 要检测的文本
     * @return array
     */
    public function detectLanguage(string $text): array
    {
        if (!$this->isConfigured()) {
            return ['error' => '火山引擎 API 密钥未配置'];
        }
        
        try {
            // 火山引擎通过翻译接口返回源语言
            $result = $this->translate($text, 'en');
            
            if (isset($result['error'])) {
                return $result;
            }
            
            // 提取检测到的语言
            if (isset($result['TranslationList'][0]['DetectedSourceLanguage'])) {
                return [
                    'success' => true,
                    'language' => $result['TranslationList'][0]['DetectedSourceLanguage'],
                    'text' => $text
                ];
            }
            
            return ['error' => '无法检测语言'];
        } catch (\Exception $e) {
            return ['error' => '语言检测失败: ' . $e->getMessage()];
        }
    }
    
    /**
     * 获取支持的语言列表
     *
     * @return array
     */
    public function getSupportedLanguages(): array
    {
        if (!$this->isConfigured()) {
            return ['error' => '火山引擎 API 密钥未配置'];
        }
        
        // 火山引擎支持的主要语言
        return [
            'success' => true,
            'languages' => [
                ['code' => 'zh', 'name' => '中文（简体）'],
                ['code' => 'zh-Hant', 'name' => '中文（繁体）'],
                ['code' => 'en', 'name' => '英语'],
                ['code' => 'ja', 'name' => '日语'],
                ['code' => 'ko', 'name' => '韩语'],
                ['code' => 'fr', 'name' => '法语'],
                ['code' => 'de', 'name' => '德语'],
                ['code' => 'es', 'name' => '西班牙语'],
                ['code' => 'ru', 'name' => '俄语'],
                ['code' => 'it', 'name' => '意大利语'],
                ['code' => 'pt', 'name' => '葡萄牙语'],
                ['code' => 'ar', 'name' => '阿拉伯语'],
                ['code' => 'th', 'name' => '泰语'],
                ['code' => 'vi', 'name' => '越南语'],
                ['code' => 'id', 'name' => '印尼语'],
                ['code' => 'ms', 'name' => '马来语'],
                ['code' => 'tr', 'name' => '土耳其语'],
                ['code' => 'pl', 'name' => '波兰语'],
                ['code' => 'nl', 'name' => '荷兰语'],
                ['code' => 'sv', 'name' => '瑞典语'],
            ]
        ];
    }
    
    /**
     * 解析 API 响应
     *
     * @param string $response
     * @return array
     */
    protected function parseResponse(string $response): array
    {
        $data = json_decode($response, true);
        
        if ($data === null) {
            return ['error' => '响应解析失败', 'raw' => $response];
        }
        
        // 检查错误
        if (isset($data['ResponseMetadata']['Error'])) {
            return [
                'error' => $data['ResponseMetadata']['Error']['Message'] ?? 'API 错误',
                'code' => $data['ResponseMetadata']['Error']['Code'] ?? 'Unknown'
            ];
        }
        
        // 提取翻译结果
        if (isset($data['TranslationList'])) {
            return [
                'success' => true,
                'TranslationList' => $data['TranslationList'],
                'SourceLanguage' => $data['SourceLanguage'] ?? 'auto'
            ];
        }
        
        return ['success' => true, 'raw' => $data];
    }
    
    /**
     * 检查是否已配置
     *
     * @return bool
     */
    public function isConfigured(): bool
    {
        return !empty($this->accessKeyId) && !empty($this->secretKey);
    }
    
    /**
     * 获取脱敏的 Access Key
     *
     * @return string
     */
    public function getMaskedAccessKey(): string
    {
        if (empty($this->accessKeyId)) {
            return '未配置';
        }
        $len = strlen($this->accessKeyId);
        if ($len <= 8) {
            return '***';
        }
        return substr($this->accessKeyId, 0, 4) . str_repeat('*', $len - 8) . substr($this->accessKeyId, -4);
    }
}
