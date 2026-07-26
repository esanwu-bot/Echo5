<?php

namespace app\model;

use think\Model;

class SkLanguage extends Model
{
    protected $table = 'sk_language';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'is_default' => 'integer',
    ];

    // Get active languages
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}