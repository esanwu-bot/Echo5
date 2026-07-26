<?php
/**
 * OpenAI 兼容 Provider 实现
 * 支持 Kimi、CodeBuddy、DeepSeek 等兼容 OpenAI API 的服务
 */
namespace app\agent\provider;

use think\facade\Env;
use think\facade\Log;

class OpenAICompatibleProvider implements AIProviderInterface
{
    /**
     * @var string API 密钥
     */
    protected $apiKey;

    /**
     * @var string 模型 ID
     */
    protected $model;

    /**
     * @var string API 基础地址
     */
    protected $baseUrl;

    /**
     * @var int 最大 token 数
     */
    protected $maxTokens = 4096;

    /**
     * @var float 温度
     */
    protected $temperature = 0.3;

    /**
     * @var int 超时时间（秒）
     */
    protected $timeout = 120;

    /**
     * 可用模型列表
     */
    const AVAILABLE_MODELS = [
        'deepseek-v4-flash' => [
            'label' => 'DeepSeek V4 Flash',
            'name' => 'DeepSeek V4 Flash',
            'provider' => 'codebuddy',
            'temperature' => 0.3,
        ],
        'hy3-preview' => [
            'label' => 'Hy3 Preview',
            'name' => 'Hy3 Preview',
            'provider' => 'codebuddy',
            'temperature' => 0.3,
        ],
        'kimi-k2.5' => [
            'label' => 'Kimi K2.5',
            'name' => 'Kimi K2.5',
            'provider' => 'codebuddy',
            'temperature' => 1,  // Kimi K2.5 要求 temperature=1
        ],
    ];

    /**
     * 构造函数，支持传入动态模型名
     *
     * @param string|null $dynamicModel 动态指定的模型名
     */
    public function __construct(?string $dynamicModel = null)
    {
        // 如果传入了动态模型名，直接使用
        if ($dynamicModel && isset(self::AVAILABLE_MODELS[$dynamicModel])) {
            $modelConfig = self::AVAILABLE_MODELS[$dynamicModel];
            $provider = $modelConfig['provider'];
            $this->model = $dynamicModel;
            $this->temperature = $modelConfig['temperature'];
        } else {
            // 从 .env 读取默认配置
            $provider = Env::get('LLM_PROVIDER', 'codebuddy');
            $this->model = Env::get('LLM_MODEL', 'deepseek-v4-flash');
            $this->temperature = (float) Env::get('AGENT_TEMPERATURE', 0.3);
        }

        // 根据 provider 读取 API Key 和 Base URL
        if ($provider === 'kimi') {
            $this->apiKey = Env::get('KIMI_API_KEY', '');
            $this->baseUrl = Env::get('KIMI_API_BASE', 'https://api.kimi.com/coding/v1');
        } else {
            $this->apiKey = Env::get('CODEBUDDY_API_KEY', '');
            $this->baseUrl = Env::get('CODEBUDDY_API_BASE', 'https://tokenhub.tencentmaas.com/v1');
        }

        $this->maxTokens = (int) Env::get('AGENT_MAX_TOKENS', 4096);

        // 确保 baseUrl 以 /chat/completions 结尾
        if (substr($this->baseUrl, -1) === '/') {
            $this->baseUrl = substr($this->baseUrl, 0, -1);
        }
        if (strpos($this->baseUrl, '/chat/completions') === false) {
            $this->baseUrl .= '/chat/completions';
        }
    }

    /**
     * 获取可用模型列表
     */
    public static function getAvailableModels(): array
    {
        $models = [];
        foreach (self::AVAILABLE_MODELS as $id => $config) {
            $models[] = [
                'id' => $id,
                'name' => $config['name'] ?? $config['label'],
                'label' => $config['label'],
                'provider' => $config['provider'],
            ];
        }
        return $models;
    }

    /**
     * {@inheritdoc}
     */
    public function chat(array $messages, array $tools = []): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'API 密钥未配置，请检查 .env 中的 CODEBUDDY_API_KEY'];
        }

        $body = [
            'model'       => $this->model,
            'max_tokens'  => $this->maxTokens,
            'temperature' => $this->temperature,
            'messages'    => $messages,
        ];

        if (!empty($tools)) {
            $body['tools'] = $this->convertTools($tools);
            $body['tool_choice'] = 'auto';
        }

        try {
            Log::info('OpenAICompatible chat request', ['model' => $this->model, 'url' => $this->baseUrl]);
            $response = $this->request($body);
            return $this->parseResponse($response);
        } catch (\Exception $e) {
            Log::error('OpenAICompatible chat error: ' . $e->getMessage());
            return ['error' => 'AI 请求失败: ' . $e->getMessage()];
        }
    }

    /**
     * {@inheritdoc}
     */
    public function chatStream(array $messages, array $tools = [], callable $callback = null): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'API 密钥未配置，请检查 .env 中的 CODEBUDDY_API_KEY'];
        }

        $body = [
            'model'       => $this->model,
            'max_tokens'  => $this->maxTokens,
            'temperature' => $this->temperature,
            'messages'    => $messages,
            'stream'      => true,
        ];

        if (!empty($tools)) {
            $body['tools'] = $this->convertTools($tools);
            $body['tool_choice'] = 'auto';
        }

        try {
            Log::info('OpenAICompatible stream request', ['model' => $this->model, 'url' => $this->baseUrl]);
            return $this->requestStream($body, $callback);
        } catch (\Exception $e) {
            Log::error('OpenAICompatible stream error: ' . $e->getMessage());
            return ['error' => 'AI 流式请求失败: ' . $e->getMessage()];
        }
    }

    /**
     * {@inheritdoc}
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * 获取当前模型名
     */
    public function getModel(): string
    {
        return $this->model;
    }

    /**
     * 发送同步请求
     */
    protected function request(array $body): string
    {
        $ch = curl_init($this->baseUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException('CURL Error: ' . $error);
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException('HTTP ' . $httpCode . ': ' . $response);
        }

        return $response;
    }

    /**
     * 发送流式请求
     */
    protected function requestStream(array $body, callable $callback = null): array
    {
        $fullText = '';
        $toolCalls = [];
        $toolCallIndex = -1;

        $ch = curl_init($this->baseUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ]);
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$fullText, &$toolCalls, &$toolCallIndex, $callback) {
            $lines = explode("\n", $data);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) {
                    continue;
                }

                // 处理 SSE 格式
                if (strpos($line, 'data: ') === 0) {
                    $json = substr($line, 6);
                    if ($json === '[DONE]') {
                        continue;
                    }

                    $event = json_decode($json, true);
                    if (!$event) {
                        continue;
                    }

                    // 处理 tool_calls
                    if (isset($event['choices'][0]['delta']['tool_calls'])) {
                        foreach ($event['choices'][0]['delta']['tool_calls'] as $tc) {
                            $index = $tc['index'] ?? 0;
                            if (!isset($toolCalls[$index])) {
                                $toolCalls[$index] = [
                                    'id' => $tc['id'] ?? '',
                                    'type' => 'function',
                                    'function' => [
                                        'name' => $tc['function']['name'] ?? '',
                                        'arguments' => $tc['function']['arguments'] ?? '',
                                    ],
                                ];
                            } else {
                                // 追加参数
                                if (isset($tc['function']['arguments'])) {
                                    $toolCalls[$index]['function']['arguments'] .= $tc['function']['arguments'];
                                }
                            }
                        }
                    }

                    // 处理文本 token
                    if (isset($event['choices'][0]['delta']['content'])) {
                        $text = $event['choices'][0]['delta']['content'];
                        if ($text !== null && $text !== '') {
                            $fullText .= $text;
                            if ($callback) {
                                call_user_func($callback, $text);
                            }
                        }
                    }
                }
            }
            return strlen($data);
        });

        curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException('CURL Error: ' . $error);
        }

        // 重新索引 toolCalls
        $toolCalls = array_values($toolCalls);

        return [
            'content'   => $fullText,
            'tool_calls'=> $toolCalls,
        ];
    }

    /**
     * 解析响应
     */
    protected function parseResponse(string $response): array
    {
        $data = json_decode($response, true);
        if (!$data) {
            return ['error' => '响应解析失败: ' . json_last_error_msg()];
        }

        if (isset($data['error'])) {
            return ['error' => $data['error']['message'] ?? '未知错误'];
        }

        $content = '';
        $toolCalls = [];

        if (isset($data['choices'][0]['message'])) {
            $message = $data['choices'][0]['message'];
            $content = $message['content'] ?? '';

            if (isset($message['tool_calls'])) {
                foreach ($message['tool_calls'] as $tc) {
                    $toolCalls[] = [
                        'id'        => $tc['id'] ?? '',
                        'type'      => 'function',
                        'function'  => [
                            'name'      => $tc['function']['name'] ?? '',
                            'arguments' => $tc['function']['arguments'] ?? '{}',
                        ],
                    ];
                }
            }
        }

        return [
            'content'    => $content,
            'tool_calls' => $toolCalls,
            'usage'      => $data['usage'] ?? [],
        ];
    }

    /**
     * 转换工具定义为 OpenAI 格式
     */
    protected function convertTools(array $tools): array
    {
        $result = [];
        foreach ($tools as $tool) {
            $result[] = [
                'type' => 'function',
                'function' => [
                    'name'        => $tool['name'],
                    'description' => $tool['description'],
                    'parameters'  => $tool['parameters'] ?? ['type' => 'object', 'properties' => []],
                ],
            ];
        }
        return $result;
    }
}
