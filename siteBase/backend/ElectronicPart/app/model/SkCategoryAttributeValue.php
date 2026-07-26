<?php

namespace app\model;

use think\Model;

class SkCategoryAttributeValue extends Model
{
    protected $table = 'sk_category_attribute_values';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false;
    
    // Type casting
    protected $type = [
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
