<?php

namespace app\model;

use think\Model;

class SkTranslation extends Model
{
    protected $table = 'sk_translation';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
}