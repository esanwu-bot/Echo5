<?php

namespace app\model;

use think\Model;

class SkAdmin extends Model
{
    protected $table = 'sk_admin';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'last_login_time' => 'datetime',
    ];
    
    // Hidden fields
    protected $hidden = ['password'];
    
    // Get active admins
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
    
    // Find admin by username
    public static function findByUsername($username)
    {
        return self::where('username', $username)->find();
    }

    // Verify password
    public function verifyPassword($password)
    {
        return password_verify($password, $this->password);
    }
    
    // Set password attribute
    public function setPasswordAttr($value)
    {
        return password_hash($value, PASSWORD_DEFAULT);
    }

    // Update last login time
    public function updateLastLogin()
    {
        $this->last_login_time = date('Y-m-d H:i:s');
        return $this->save();
    }
}
