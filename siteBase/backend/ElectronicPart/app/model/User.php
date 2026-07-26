<?php

namespace app\model;

/**
 * User模型类 - 别名到SkUser
 * 用于兼容控制器中的引用
 */
class User extends SkUser
{
    // 字段映射 - 兼容控制器中使用的字段名
    protected $mapping = [
        'created_at' => 'create_time',      // 创建时间映射
        'updated_at' => 'update_time',      // 更新时间映射
        'last_login_at' => 'last_login_time', // 最后登录时间映射
        'nickname' => 'nickname',          // 昵称映射
        'phone' => 'phone',                // 电话映射
        'avatar' => 'avatar',              // 头像映射
        'status' => 'status',              // 状态映射
    ];
    
    // 重写获取器以支持字段映射
    public function __get($name)
    {
        // 如果是映射字段，返回实际字段的值
        if (isset($this->mapping[$name])) {
            return parent::__get($this->mapping[$name]);
        }
        
        return parent::__get($name);
    }
    
    // 重写设置器以支持字段映射
    public function __set(string $name, $value): void
    {
        // 如果是映射字段，设置实际字段
        if (isset($this->mapping[$name])) {
            parent::__set($this->mapping[$name], $value);
            return;
        }
        
        parent::__set($name, $value);
    }
}