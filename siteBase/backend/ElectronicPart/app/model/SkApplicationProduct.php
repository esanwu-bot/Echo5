<?php

namespace app\model;

use think\model\Pivot;

class SkApplicationProduct extends Pivot
{
    protected $table = 'sk_application_product';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false; // No update_time field
    
    // Type casting
    protected $type = [
        'application_id' => 'integer',
        'product_id' => 'integer',
    ];
}