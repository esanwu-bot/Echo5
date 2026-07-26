<?php

namespace app\model;

use think\model\Pivot;

class SkProductSupplier extends Pivot
{
    protected $table = 'sk_product_suppliers';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'id' => 'integer',
        'supplier_id' => 'integer',
        'min_order_quantity' => 'integer',
        'lead_time' => 'integer',
        'is_primary' => 'integer',
        'price' => 'float',
    ];
    
    // Get primary suppliers
    public function scopePrimary($query)
    {
        return $query->where('is_primary', 1);
    }
    
    // Association with product
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }
    
    // Association with supplier
    public function supplier()
    {
        return $this->belongsTo(SkSupplier::class, 'supplier_id');
    }
    
    // Association with model
    public function model()
    {
        return $this->belongsTo(SkProductModel::class, 'model_id');
    }
}