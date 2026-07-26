<?php

namespace app\model;

use think\Model;
use app\model\SkProduct;

class SkInventory extends BaseModel
{
    protected $table = 'sk_inventory';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'id' => 'integer',
        'storage_location_id' => 'integer',
        'quantity' => 'integer',
        'reserved_quantity' => 'integer',
        'available_quantity' => 'integer',
        'safety_stock' => 'integer',
        'in_transit_stock' => 'integer',
    ];
    
    // Calculate available quantity automatically
    public function setAvailableQuantityAttr($value)
    {
        return $this->quantity - $this->reserved_quantity;
    }
    
    // Association with product
    public function product()
    {
        return $this->belongsTo(SkProduct::class, 'product_id');
    }
    
    // Association with storage location
    public function storageLocation()
    {
        return $this->belongsTo(SkStorageLocation::class, 'storage_location_id');
    }
    
    // Check if stock is below safety level
    public function isBelowSafetyStock()
    {
        return $this->available_quantity < $this->safety_stock;
    }
    
    // Get total available stock across all locations for a product
    public static function getTotalAvailableStock($productId)
    {
        return self::where('product_id', $productId)
            ->sum('available_quantity');
    }

    /**
     * Sync product stock after inventory changes
     */
    public static function onAfterWrite($inventory)
    {
        self::syncProductStock($inventory->product_id);
    }

    public static function onAfterDelete($inventory)
    {
        self::syncProductStock($inventory->product_id);
    }

    protected static function syncProductStock($productId)
    {
        if (!$productId) return;
        
        $totalStock = self::where('product_id', $productId)->sum('quantity');
        SkProduct::where('id', $productId)->update(['stock' => $totalStock]);
    }
}