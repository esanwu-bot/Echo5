<?php

namespace app\model;

use think\Model;

class SkSampleApply extends Model
{
    protected $table = 'sk_sample_apply';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'user_id' => 'integer',
        'product_id' => 'integer',
        'quantity' => 'integer',
    ];

    // Association with user
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }

    // Association with product
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }
}