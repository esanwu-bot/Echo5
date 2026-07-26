<?php

namespace app\model;

use think\Model;

class Admin extends Model
{
    // 设置表名
    protected $name = 'admins';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    
    // 定义时间戳字段名
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'username'    => 'string',
        'password'    => 'string',
        'nickname'    => 'string',
        'email'       => 'string',
        'avatar'      => 'string',
        'role'        => 'string',
        'status'      => 'int',
        'last_login_at' => 'datetime',
        'last_login_ip'  => 'string',
        'created_by'  => 'int',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];
    
    // 设置隐藏字段
    protected $hidden = [
        'password'
    ];
    
    // 设置字段类型转换
    protected $type = [
        'status' => 'boolean',
        'created_by' => 'integer',
        'last_login_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}