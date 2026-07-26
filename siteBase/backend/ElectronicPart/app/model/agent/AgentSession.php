<?php
/**
 * 电子元器件商城 - Agent会话模型
 * 文件说明：定义agent_sessions数据表结构、关联关系与业务方法。
 * 数据表：agent_sessions
 */
namespace app\model\agent;

use think\Model;

/**
 * Agent会话模型
 * 支持导购Agent和数据分析Agent的会话管理
 *
 * @package app\model\agent
 */
class AgentSession extends Model
{
    /**
     * 数据表名
     * @var string
     */
    protected $table = 'agent_sessions';

    /**
     * 自动时间戳
     * @var bool
     */
    protected $autoWriteTimestamp = true;

    /**
     * 创建时间字段
     * @var string
     */
    protected $createTime = 'created_at';

    /**
     * 更新时间字段
     * @var string
     */
    protected $updateTime = 'updated_at';

    /**
     * 类型转换
     * @var array
     */
    protected $type = [
        'messages' => 'json',
    ];

    /**
     * 会话类型常量
     */
    const TYPE_GUIDE = 'guide';           // 导购助手
    const TYPE_ANALYTICS = 'analytics';   // 数据分析

    /**
     * 创建新会话
     *
     * @access public
     * @param string $type 会话类型：guide/analytics
     * @param int $userId 用户ID（可选）
     * @return self
     */
    public static function createSession(string $type = self::TYPE_ANALYTICS, int $userId = 0): self
    {
        $session = new self();
        $session->session_id = bin2hex(random_bytes(16));
        $session->type = $type;
        $session->title = '新对话';
        $session->user_id = $userId;
        $session->messages = [];
        $session->save();
        return $session;
    }

    /**
     * 添加消息
     *
     * @access public
     * @param string $role 角色：user/assistant/tool
     * @param string $content 消息内容
     * @param array $extra 额外信息
     * @return void
     */
    public function addMessage(string $role, string $content, array $extra = []): void
    {
        $messages = $this->messages ?: [];
        $msg = array_merge([
            'role'      => $role,
            'content'   => $content,
            'timestamp' => time(),
        ], $extra);
        $messages[] = $msg;
        $this->messages = $messages;
        $this->save();
    }

    /**
     * 更新标题
     *
     * @access public
     * @param string $title 会话标题
     * @return void
     */
    public function updateTitle(string $title): void
    {
        $this->title = mb_substr($title, 0, 64);
        $this->save();
    }

    /**
     * 获取消息数量
     *
     * @access public
     * @return int
     */
    public function getMessageCount(): int
    {
        return count($this->messages ?: []);
    }

    /**
     * 清空消息
     *
     * @access public
     * @return void
     */
    public function clearMessages(): void
    {
        $this->messages = [];
        $this->save();
    }

    /**
     * 获取最后一条消息
     *
     * @access public
     * @return array|null
     */
    public function getLastMessage(): ?array
    {
        $messages = $this->messages ?: [];
        return !empty($messages) ? end($messages) : null;
    }

    /**
     * 检查是否为导购会话
     *
     * @access public
     * @return bool
     */
    public function isGuideSession(): bool
    {
        return $this->type === self::TYPE_GUIDE;
    }

    /**
     * 检查是否为数据分析会话
     *
     * @access public
     * @return bool
     */
    public function isAnalyticsSession(): bool
    {
        return $this->type === self::TYPE_ANALYTICS;
    }
}
