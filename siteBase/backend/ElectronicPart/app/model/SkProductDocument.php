<?php

namespace app\model;

use think\Model;

class SkProductDocument extends Model
{
    protected $table = 'sk_product_document';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    protected $type = [
        'series_id' => 'integer',
        'model_id' => 'integer',
        'status' => 'integer',
    ];
}
