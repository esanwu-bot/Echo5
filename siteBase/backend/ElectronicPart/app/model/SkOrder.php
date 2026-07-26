<?php
/**
 * 电子元器件商城 - 订单模型
 * 文件说明：定义订单数据表结构、关联关系与状态管理方法。
 */

namespace app\model;

use think\Model;

class SkOrder extends Model
{
    protected $table = 'sk_order';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 字段类型转换
    protected $type = [
        'user_id' => 'integer',
        'products' => 'json',
        'total_amount' => 'float',
    ];

    // 关联用户
    public function user()
    {
        return $this->belongsTo(SkUser::class, 'user_id');
    }

    // 关联订单项
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    // 关联地址
    public function address()
    {
        return $this->hasOne(SkAddress::class, 'order_id');
    }

    // 状态文本获取器
    public function getStatusTextAttr($value, $data)
    {
        $statusMap = [
            1 => '待付款',
            2 => '待发货',
            3 => '待收货',
            4 => '已完成',
            5 => '已取消'
        ];

        return $statusMap[$data['status']] ?? '未知状态';
    }

    // 更新状态并记录时间戳
    public function updateStatus($status, $extraData = [])
    {
        $this->status = $status;

        // 根据状态更新时间戳
        switch ($status) {
            case 2: // 已付款
                $this->paid_at = date('Y-m-d H:i:s');
                break;
            case 3: // 已发货
                $this->shipped_at = date('Y-m-d H:i:s');
                break;
            case 4: // 已完成
                $this->completed_at = date('Y-m-d H:i:s');
                break;
        }

        // 应用额外数据
        foreach ($extraData as $key => $value) {
            $this->$key = $value;
        }

        return $this->save();
    }
}