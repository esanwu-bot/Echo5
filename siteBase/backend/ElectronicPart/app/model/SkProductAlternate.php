<?php

namespace app\model;

use think\Model;

class SkProductAlternate extends Model
{
    protected $table = 'sk_product_alternate';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    protected $type = [
        'model_id' => 'integer',
        'alternate_model_id' => 'integer',
        'similarity_score' => 'float',
        'status' => 'integer',
    ];

    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id', 'id');
    }

    public function alternateModel()
    {
        return $this->belongsTo(SkProductModel::class, 'alternate_model_id', 'id');
    }
}
