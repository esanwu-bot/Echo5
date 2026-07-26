<?php
/**
 * AI Provider 接口
 * 兼容 PHP 7.4 的轻量级实现，不依赖 neuron-ai 包
 */
namespace app\agent\provider;

interface AIProviderInterface
{
    /**
     * 发送聊天请求
     *
     * @param array $messages OpenAI 格式的消息数组
     * @param array $tools    可用工具定义数组
     * @return array 响应结果
     */
    public function chat(array $messages, array $tools = []): array;

    /**
     * 流式聊天请求
     *
     * @param array    $messages OpenAI 格式的消息数组
     * @param array    $tools    可用工具定义数组
     * @param callable $callback 每个 token 的回调函数
     * @return array 最终响应结果
     */
    public function chatStream(array $messages, array $tools = [], callable $callback = null): array;

    /**
     * 检查配置是否有效
     *
     * @return bool
     */
    public function isConfigured(): bool;
}
