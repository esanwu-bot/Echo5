<?php

namespace app\model;

use think\Model;

/**
 * 留言模型
 */
class SkMessage extends Model
{
    protected $table = 'sk_message';
    
    // 设置字段信息
    protected $schema = [
        'id'         => 'int',
        'name'       => 'string',
        'email'      => 'string',
        'phone'      => 'string',
        'company'    => 'string',
        'subject'    => 'string',
        'content'    => 'string',
        'type'       => 'string',
        'status'     => 'string',
        'reply_content' => 'string',
        'reply_time' => 'int',
        'create_time'=> 'int',
        'update_time'=> 'int',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'int';
    
    // 状态常量
    const STATUS_PENDING = 'pending';
    const STATUS_REPLIED = 'replied';
    const STATUS_CLOSED = 'closed';
    
    /**
     * 类型常量
     */
    const TYPE_GENERAL = 'general';
    const TYPE_BUSINESS = 'business';
    const TYPE_TECHNICAL = 'technical';
    
    /**
     * 获取待回复的留言
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }
    
    /**
     * 按创建时间倒序
     */
    public function scopeLatest($query)
    {
        return $query->order('create_time', 'desc');
    }
}