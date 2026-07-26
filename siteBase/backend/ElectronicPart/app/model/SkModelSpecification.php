<?php

namespace app\model;

use think\Model;

class SkModelSpecification extends Model
{
    protected $table = 'sk_model_specifications';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'id' => 'integer',
        'model_id' => 'integer',
        'sort_order' => 'integer',
        'is_required' => 'boolean',
    ];
    
    // Association with model
    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id');
    }
}