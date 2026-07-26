<?php

namespace app\model;

use think\Model;

class SkCategoryAttribute extends Model
{
    protected $table = 'sk_category_attribute';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false;
    
    // Type casting
    protected $type = [
        'is_required' => 'integer',
        'is_filter' => 'integer',
        'sort_order' => 'integer',
        'category_id' => 'integer',
        'attribute_id' => 'integer',
    ];
    
    // Relationships
    public function category()
    {
        return $this->belongsTo(SkCategory::class, 'category_id', 'id');
    }
    
    public function attribute()
    {
        return $this->belongsTo(SkAttribute::class, 'attribute_id', 'id');
    }
}