<?php

namespace app\model;

use think\Model;

class SkProductSpec extends Model
{
    protected $table = 'sk_product_spec';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = false; // No update_time field in this table
    
    // Type casting
    protected $type = [
        'sort' => 'integer',
        'product_id' => 'string',
        'spec_id' => 'integer',
        'sort_order' => 'integer',
    ];

    // Association with product
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }

    // Association to specification definition (normalized)
    public function specDefinition()
    {
        return $this->belongsTo(SkSpecificationDefinition::class, 'spec_id');
    }
}