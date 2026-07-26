<?php

namespace app\model;

use think\Model;

class SkProductSpecification extends Model
{
    protected $table = 'sk_product_specification';
    protected $pk = 'id';
    protected $dateFormat = 'Y-m-d H:i:s';
    
    // 关联产品
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id', 'id');
    }
}
