<?php

namespace app\model;

use think\Model;

class SkStorageLocation extends Model
{
    protected $table = 'sk_storage_locations';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'id' => 'integer',
        'parent_id' => 'integer',
        'capacity' => 'integer',
        'status' => 'integer',
    ];
    
    // Get active storage locations
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
    
    // Get root locations (no parent)
    public function scopeRoot($query)
    {
        return $query->where('parent_id', 0);
    }
    
    // Association with parent location
    public function parent()
    {
        return $this->belongsTo(SkStorageLocation::class, 'parent_id');
    }
    
    // Association with child locations
    public function children()
    {
        return $this->hasMany(SkStorageLocation::class, 'parent_id');
    }
    
    // Association with inventory
    public function inventory()
    {
        return $this->hasMany(SkInventory::class, 'storage_location_id');
    }
}