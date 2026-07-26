<?php

namespace app\model;

use think\Model;

class SkProductAttribute extends Model
{
    protected $table = 'sk_product_attribute';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'product_id' => 'integer',
        'attribute_id' => 'integer',
        'numeric_value' => 'float',
    ];
    
    /**
     * Get the product that owns this attribute
     */
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id', 'id');
    }
    
    /**
     * Get the attribute definition
     */
    public function attribute()
    {
        return $this->belongsTo(SkAttribute::class, 'attribute_id', 'id');
    }
}
