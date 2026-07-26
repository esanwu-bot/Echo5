<?php

namespace app\model;

use think\Model;

class SkSupplier extends Model
{
    protected $table = 'sk_suppliers';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'id' => 'integer',
        'status' => 'integer',
        'rating' => 'integer',
        'lead_time_days' => 'integer',
    ];

    // 输出数组时自动附加 name 访问器字段
    protected $append = ['name'];
    
    // Get active suppliers
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    // Accessor for name (maps to supplier_name)
    public function getNameAttr($value, $data)
    {
        return $data['supplier_name'] ?? '';
    }
    
    // Association with products through product suppliers
    public function products()
    {
        return $this->belongsToMany(SkProduct::class, 'sk_product_suppliers', 'supplier_id', 'product_id');
    }
    
    // Association with product suppliers
    public function productSuppliers()
    {
        return $this->hasMany(SkProductSupplier::class, 'supplier_id');
    }
    
    // Association with models through product suppliers
    public function models()
    {
        return $this->hasManyThrough(
            SkProductModel::class,
            SkProductSupplier::class,
            'supplier_id', // Foreign key on sk_product_suppliers table
            'id', // Foreign key on sk_product_models table
            'id', // Local key on sk_suppliers table
            'model_id' // Local key on sk_product_suppliers table
        );
    }
}