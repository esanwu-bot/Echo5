<?php

namespace app\model;

use think\Model;

/**
 * OrderItem模型类
 * 订单项模型
 */
class OrderItem extends Model
{
    protected $table = 'sk_order_item';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'order_id' => 'integer',
        'product_id' => 'integer',
        'quantity' => 'integer',
        'price' => 'float',
        'total' => 'float',
        'total_price' => 'float',
        'product_name' => 'string',
        'product_image' => 'string',
    ];
    
    // Association with order
    public function order()
    {
        return $this->belongsTo(SkOrder::class, 'order_id');
    }
    
    // Association with product
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }
    
    // 计算总价
    public function getTotalAttribute()
    {
        return ($this->price ?? 0) * ($this->quantity ?? 1);
    }
}