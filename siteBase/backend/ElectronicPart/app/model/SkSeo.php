<?php

namespace app\model;

use think\Model;

class SkSeo extends Model
{
    protected $table = 'sk_seo';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'page_id' => 'integer',
    ];
}