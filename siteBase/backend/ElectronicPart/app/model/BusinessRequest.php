<?php

namespace app\model;

use think\Model;

/**
 * 商务申请模型
 */
class BusinessRequest extends Model
{
    protected $table = 'sk_quote_request';
    
    // 设置字段信息
    protected $schema = [
        'id'            => 'int',
        'user_id'       => 'int',
        'company'       => 'string',
        'contact_name'  => 'string',
        'email'         => 'string',
        'phone'         => 'string',
        'product_info'  => 'string',
        'quantity'      => 'int',
        'message'       => 'string',
        'status'        => 'string',
        'reply_content' => 'string',
        'reply_time'    => 'int',
        'create_time'   => 'int',
        'update_time'   => 'int',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'int';
    
    // 状态常量
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_REJECTED = 'rejected';
    
    /**
     * 获取待处理的申请
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
    
    /**
     * 关联用户
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}