<?php
/**
 * Agent 基类
 * 兼容 PHP 7.4 的轻量级 AI Agent 实现
 */
namespace app\agent;

use app\agent\provider\AIProviderInterface;
use think\facade\Log;

abstract class Agent
{
    /**
     * @var AIProviderInterface
     */
    protected $provider;

    /**
     * @var Tool[] 注册的工具列表
     */
    protected $tools = [];

    /**
     * @var int 最大工具调用轮次
     */
    protected $maxToolRounds = 5;

    /**
     * @var string 当前语言
     */
    protected $lang = 'zh';

    /**
     * 构造函数
     *
     * @param string|null $model 动态指定的模型名
     * @param string $lang 语言代码
     */
    public function __construct(?string $model = null, string $lang = 'zh')
    {
        $this->lang = $lang;
        $this->provider = $this->createProvider($model);
        $this->tools = $this->registerTools();
    }

    /**
     * 创建 AI Provider
     *
     * @param string|null $model 动态指定的模型名
     * @return AIProviderInterface
     */
    abstract protected function createProvider(?string $model = null): AIProviderInterface;

    /**
     * 系统指令
     *
     * @return string
     */
    abstract protected function instructions(): string;

    /**
     * 注册工具
     *
     * @return Tool[]
     */
    abstract protected function registerTools(): array;

    /**
     * 运行 Agent（同步）
     *
     * @param string $userMessage 用户消息
     * @param array  $history     历史消息
     * @return array 结果
     */
    public function run(string $userMessage, array $history = []): array
    {
        if (!$this->provider->isConfigured()) {
            return [
                'success' => false,
                'error'   => 'AI Provider 未配置，请检查 .env 中的 API 密钥',
            ];
        }

        $messages = $this->buildMessages($userMessage, $history);
        $toolDefs = $this->buildToolDefinitions();

        $round = 0;
        while ($round < $this->maxToolRounds) {
            $round++;
            Log::info("Agent 工具调用轮次: {$round}");

            $response = $this->provider->chat($messages, $toolDefs);

            if (isset($response['error'])) {
                return ['success' => false, 'error' => $response['error']];
            }

            $content = $response['content'] ?? '';
            $toolCalls = $response['tool_calls'] ?? [];

            // 没有工具调用，直接返回最终回复
            if (empty($toolCalls)) {
                return [
                    'success' => true,
                    'content' => $content,
                    'tool_calls' => [],
                ];
            }

            // 将 assistant 回复加入消息历史
            $messages[] = [
                'role'    => 'assistant',
                'content' => $content,
                'tool_calls' => $toolCalls,
            ];

            // 执行工具调用
            foreach ($toolCalls as $toolCall) {
                $result = $this->executeTool($toolCall);
                $messages[] = [
                    'role'       => 'tool',
                    'tool_call_id'=> $toolCall['id'] ?? '',
                    'name'       => $toolCall['function']['name'] ?? '',
                    'content'    => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        return [
            'success' => true,
            'content' => $content,
            'tool_calls' => $toolCalls,
            'note'    => '达到最大工具调用轮次限制',
        ];
    }

    /**
     * 运行 Agent（流式）
     *
     * @param string   $userMessage 用户消息
     * @param array    $history     历史消息
     * @param callable $onToken     每个 token 的回调
     * @return array
     */
    public function runStream(string $userMessage, array $history = [], callable $onToken = null): array
    {
        if (!$this->provider->isConfigured()) {
            return [
                'success' => false,
                'error'   => 'AI Provider 未配置，请检查 .env 中的 API 密钥',
            ];
        }

        $messages = $this->buildMessages($userMessage, $history);
        $toolDefs = $this->buildToolDefinitions();

        $round = 0;
        while ($round < $this->maxToolRounds) {
            $round++;
            Log::info("Agent 流式工具调用轮次: {$round}");

            $response = $this->provider->chatStream($messages, $toolDefs, $onToken);

            if (isset($response['error'])) {
                return ['success' => false, 'error' => $response['error']];
            }

            $content = $response['content'] ?? '';
            $toolCalls = $response['tool_calls'] ?? [];

            if (empty($toolCalls)) {
                return [
                    'success' => true,
                    'content' => $content,
                ];
            }

            $messages[] = [
                'role'    => 'assistant',
                'content' => $content,
                'tool_calls' => $toolCalls,
            ];

            foreach ($toolCalls as $toolCall) {
                $result = $this->executeTool($toolCall);
                $messages[] = [
                    'role'       => 'tool',
                    'tool_call_id'=> $toolCall['id'] ?? '',
                    'name'       => $toolCall['function']['name'] ?? '',
                    'content'    => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        return [
            'success' => true,
            'content' => $content,
            'note'    => '达到最大工具调用轮次限制',
        ];
    }

    /**
     * 构建消息数组
     */
    protected function buildMessages(string $userMessage, array $history): array
    {
        $messages = [];

        // 系统指令
        $instructions = $this->instructions();
        if (!empty($instructions)) {
            $messages[] = [
                'role'    => 'system',
                'content' => $instructions,
            ];
        }

        // 历史消息
        foreach ($history as $msg) {
            $messages[] = [
                'role'    => $msg['role'] ?? 'user',
                'content' => $msg['content'] ?? '',
            ];
        }

        // 用户当前消息 - 添加语言标记前缀
        $langPrefixMap = [
            'zh' => '',
            'en' => '[Reply in English] ',
            'ja' => '[日本語で返信してください] ',
            'ko' => '[한국어로 답변해 주세요] ',
        ];
        $langPrefix = $langPrefixMap[$this->lang] ?? '';
        
        $messages[] = [
            'role'    => 'user',
            'content' => $langPrefix . $userMessage,
        ];

        return $messages;
    }

    /**
     * 构建工具定义数组
     */
    protected function buildToolDefinitions(): array
    {
        $defs = [];
        foreach ($this->tools as $tool) {
            $defs[] = $tool->toArray();
        }
        return $defs;
    }

    /**
     * 执行工具调用
     */
    protected function executeTool(array $toolCall): array
    {
        $name = $toolCall['function']['name'] ?? '';
        $argsJson = $toolCall['function']['arguments'] ?? '{}';
        $args = json_decode($argsJson, true);
        if (!is_array($args)) {
            $args = [];
        }

        if (!isset($this->tools[$name])) {
            Log::warning("Agent 工具未找到: {$name}");
            return ['error' => "工具 {$name} 未注册"];
        }

        try {
            Log::info("Agent 执行工具: {$name}", $args);
            $result = $this->tools[$name]->execute($args);
            Log::info("Agent 工具结果: {$name}", ['result' => $result]);
            return ['success' => true, 'data' => $result];
        } catch (\Throwable $e) {
            Log::error("Agent 工具执行失败: {$name} - " . $e->getMessage());
            return ['error' => '工具执行失败: ' . $e->getMessage()];
        }
    }
}
