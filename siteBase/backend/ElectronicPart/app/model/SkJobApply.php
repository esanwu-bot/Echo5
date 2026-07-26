<?php

namespace app\model;

use think\Model;

class SkJobApply extends Model
{
    protected $table = 'sk_job_apply';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'job_id' => 'integer',
    ];

    // Association with job
    public function job()
    {
        return $this->belongsTo(SkJob::class, 'job_id');
    }
}