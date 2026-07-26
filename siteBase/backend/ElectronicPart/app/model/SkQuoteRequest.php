<?php

namespace app\model;

use think\Model;

class SkQuoteRequest extends Model
{
    protected $table = 'sk_quote_request';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'user_id' => 'integer',
        'quantity' => 'integer',
        'product_info' => 'json',
        'reply_time' => 'datetime',
    ];

    // Association with user
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }
}