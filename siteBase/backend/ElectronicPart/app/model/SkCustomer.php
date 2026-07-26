<?php

namespace app\model;

use think\Model;

class SkCustomer extends Model
{
    protected $table = 'sk_customer';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
    ];

    // Get active customers
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}