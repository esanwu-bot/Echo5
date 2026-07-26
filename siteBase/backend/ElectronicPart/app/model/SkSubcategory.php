<?php

namespace app\model;

use think\Model;

class SkSubcategory extends Model
{
    protected $table = 'sk_subcategory';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = false;

    protected $type = [
        'id' => 'integer',
        'category_id' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(SkCategory::class, 'category_id');
    }
}
