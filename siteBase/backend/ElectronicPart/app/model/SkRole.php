<?php

namespace app\model;

use think\Model;

class SkRole extends Model
{
    protected $table = 'sk_role';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'permissions' => 'json',
    ];
    
    // Get active roles
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}