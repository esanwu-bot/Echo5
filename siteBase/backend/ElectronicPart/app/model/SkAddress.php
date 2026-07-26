<?php
/**
 * 电子元器件商城 - 地址模型
 * 文件说明：定义用户收货地址数据表结构与关联关系。
 */

namespace app\model;

use think\Model;

class SkAddress extends Model
{
    protected $table = 'sk_address';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 字段类型转换
    protected $type = [
        'user_id' => 'integer',
        'is_default' => 'integer',
    ];

    // 关联用户
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }

    // 关联订单
    public function order()
    {
        return $this->belongsTo(SkOrder::class, 'order_id');
    }
}