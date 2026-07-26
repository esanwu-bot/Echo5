<?php

namespace app\model;

use think\Model;

/**
 * Address模型类
 * 收货地址模型
 */
class Address extends Model
{
    protected $table = 'addresses';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // Type casting
    protected $type = [
        'user_id' => 'integer',
        'is_default' => 'integer',
    ];
    
    // Association with user
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
    /**
     * Set as default address
     */
    public function setAsDefault()
    {
        // Unset all other addresses for this user
        self::where('user_id', $this->user_id)
            ->where('id', '<>', $this->id)
            ->update(['is_default' => 0]);
            
        // Set this address as default
        $this->is_default = 1;
        $this->save();
    }
}