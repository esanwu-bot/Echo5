<?php
/**
 * Anthropic Claude Provider 实现
 * 使用 Messages API，支持 tools / streaming
 */
namespace app\agent\provider;

use think\facade\Env;
use think\facade\Log;

class AnthropicProvider implements AIProviderInterface
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
    protected $baseUrl = 'https://api.anthropic.com/v1/messages';

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
    protected $timeout = 60;

    public function __construct()
    {
        $this->apiKey      = Env::get('ANTHROPIC_API_KEY', '');
        $this->model       = Env::get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514');
        $this->maxTokens   = (int) Env::get('AGENT_MAX_TOKENS', 4096);
        $this->temperature = (float) Env::get('AGENT_TEMPERATURE', 0.3);
    }

    /**
     * {@inheritdoc}
     */
    public function chat(array $messages, array $tools = []): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'Anthropic API 密钥未配置'];
        }

        $body = [
            'model'       => $this->model,
            'max_tokens'  => $this->maxTokens,
            'temperature' => $this->temperature,
            'messages'    => $this->convertMessages($messages),
        ];

        if (!empty($tools)) {
            $body['tools'] = $this->convertTools($tools);
        }

        try {
            $response = $this->request($body);
            return $this->parseResponse($response);
        } catch (\Exception $e) {
            Log::error('Anthropic chat error: ' . $e->getMessage());
            return ['error' => 'AI 请求失败: ' . $e->getMessage()];
        }
    }

    /**
     * {@inheritdoc}
     */
    public function chatStream(array $messages, array $tools = [], callable $callback = null): array
    {
        if (!$this->isConfigured()) {
            return ['error' => 'Anthropic API 密钥未配置'];
        }

        $body = [
            'model'       => $this->model,
            'max_tokens'  => $this->maxTokens,
            'temperature' => $this->temperature,
            'messages'    => $this->convertMessages($messages),
            'stream'      => true,
        ];

        if (!empty($tools)) {
            $body['tools'] = $this->convertTools($tools);
        }

        try {
            return $this->requestStream($body, $callback);
        } catch (\Exception $e) {
            Log::error('Anthropic stream error: ' . $e->getMessage());
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
     * 发送同步请求
     */
    protected function request(array $body): string
    {
        $ch = curl_init($this->baseUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-api-key: ' . $this->apiKey,
            'anthropic-version: 2023-06-01',
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

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
        $currentTool = null;

        $ch = curl_init($this->baseUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-api-key: ' . $this->apiKey,
            'anthropic-version: 2023-06-01',
        ]);
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$fullText, &$toolCalls, &$currentTool, $callback) {
            $lines = explode("\n", $data);
            foreach ($lines as $line) {
                $line = trim($line);
                if (strpos($line, 'data: ') === 0) {
                    $json = substr($line, 6);
                    if ($json === '[DONE]') {
                        continue;
                    }
                    $event = json_decode($json, true);
                    if (!$event) {
                        continue;
                    }

                    // 处理 content_block_start (tool_use)
                    if (isset($event['type']) && $event['type'] === 'content_block_start' && isset($event['content_block']['type']) && $event['content_block']['type'] === 'tool_use') {
                        $currentTool = [
                            'id'        => $event['content_block']['id'] ?? '',
                            'name'      => $event['content_block']['name'] ?? '',
                            'arguments' => '',
                        ];
                    }

                    // 处理 content_block_delta (tool input_json)
                    if (isset($event['type']) && $event['type'] === 'content_block_delta' && isset($event['delta']['partial_json'])) {
                        if ($currentTool !== null) {
                            $currentTool['arguments'] .= $event['delta']['partial_json'];
                        }
                    }

                    // 处理 content_block_stop (tool 结束)
                    if (isset($event['type']) && $event['type'] === 'content_block_stop' && $currentTool !== null) {
                        $toolCalls[] = [
                            'id'        => $currentTool['id'],
                            'type'      => 'function',
                            'function'  => [
                                'name'      => $currentTool['name'],
                                'arguments' => $currentTool['arguments'],
                            ],
                        ];
                        $currentTool = null;
                    }

                    // 处理文本 token
                    if (isset($event['delta']['text'])) {
                        $text = $event['delta']['text'];
                        $fullText .= $text;
                        if ($callback) {
                            call_user_func($callback, $text);
                        }
                    }
                }
            }
            return strlen($data);
        });

        curl_exec($ch);
        curl_close($ch);

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
            return ['error' => '响应解析失败'];
        }

        if (isset($data['error'])) {
            return ['error' => $data['error']['message'] ?? '未知错误'];
        }

        $content = '';
        $toolCalls = [];

        if (isset($data['content'])) {
            foreach ($data['content'] as $block) {
                if ($block['type'] === 'text') {
                    $content .= $block['text'];
                } elseif ($block['type'] === 'tool_use') {
                    $toolCalls[] = [
                        'id'        => $block['id'] ?? '',
                        'type'      => 'function',
                        'function'  => [
                            'name'      => $block['name'] ?? '',
                            'arguments' => json_encode($block['input'] ?? []),
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
     * 转换消息格式为 Anthropic 格式
     */
    protected function convertMessages(array $messages): array
    {
        $result = [];
        foreach ($messages as $msg) {
            $role = $msg['role'];
            // Anthropic 使用 user/assistant，将 system 转为 user 的特殊处理
            if ($role === 'system') {
                continue; // Anthropic 使用顶层 system 字段
            }
            $result[] = [
                'role'    => $role,
                'content' => $msg['content'],
            ];
        }
        return $result;
    }

    /**
     * 转换工具定义
     */
    protected function convertTools(array $tools): array
    {
        $result = [];
        foreach ($tools as $tool) {
            $result[] = [
                'name'        => $tool['name'],
                'description' => $tool['description'],
                'input_schema'=> $tool['parameters'] ?? ['type' => 'object', 'properties' => []],
            ];
        }
        return $result;
    }
}
