<?php

namespace app\model;

use think\Model;

class SkStatistics extends Model
{
    protected $table = 'sk_statistics';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false;
    
    // Type casting
    protected $type = [
        'date' => 'date',
        'page_views' => 'integer',
        'unique_visitors' => 'integer',
        'product_views' => 'integer',
        'quote_requests' => 'integer',
        'sample_applies' => 'integer',
    ];
}