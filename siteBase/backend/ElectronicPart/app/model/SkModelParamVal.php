<?php

namespace app\model;

use think\Model;

class SkModelParamVal extends Model
{
    protected $table = 'sk_model_param_val';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    protected $type = [
        'model_id' => 'integer',
        'param_id' => 'integer',
        'value_numeric' => 'float',
    ];

    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id', 'id');
    }

    public function param()
    {
        return $this->belongsTo(SkAttribute::class, 'param_id', 'id');
    }
}
