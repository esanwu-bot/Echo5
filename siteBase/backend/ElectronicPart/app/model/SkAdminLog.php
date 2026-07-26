<?php

namespace app\model;

use think\Model;

class SkAdminLog extends Model
{
    protected $table = 'sk_admin_log';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false;
    
    // Type casting
    protected $type = [
        'admin_id' => 'integer',
    ];

    // Association with admin
    public function admin()
    {
        return $this->belongsTo(SkAdmin::class, 'admin_id');
    }
}