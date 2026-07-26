<?php
/**
 * 电子元器件商城 - 用户模型
 * 文件说明：定义用户数据表结构、关联关系与业务方法。
 */

namespace app\model;

use think\Model;

class SkUser extends Model
{
    protected $table = 'sk_user';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
    ];

    // 隐藏字段
    protected $hidden = ['password'];

    // 获取活跃用户
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    // 根据用户名查找用户
    public static function findByUsername($username)
    {
        return self::where('username', $username)->find();
    }
}