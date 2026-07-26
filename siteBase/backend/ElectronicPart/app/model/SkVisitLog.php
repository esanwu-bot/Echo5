<?php

namespace app\model;

use think\Model;

class SkVisitLog extends Model
{
    protected $table = 'sk_visit_log';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false;
    
    // Type casting
    protected $type = [
        'user_id' => 'integer',
    ];

    // Association with user
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }
}