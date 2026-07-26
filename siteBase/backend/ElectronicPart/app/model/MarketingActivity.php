<?php

namespace app\model;

use think\Model;

class MarketingActivity extends Model
{
    protected $name = 'marketing_activity';

    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    // 类型定义
    const TYPE_DISCOUNT = 'discount';      // 折扣活动
    const TYPE_COUPON = 'coupon';         // 优惠券
    const TYPE_GIFT = 'gift';             // 赠品活动
    const TYPE_BUNDLE = 'bundle';         // 套餐优惠
    const TYPE_FLASH = 'flash';           // 限时抢购

    // 状态定义
    const STATUS_DRAFT = 'draft';         // 草稿
    const STATUS_ACTIVE = 'active';       // 进行中
    const STATUS_UPCOMING = 'upcoming';   // 未开始
    const STATUS_ENDED = 'ended';         // 已结束
    const STATUS_PAUSED = 'paused';       // 已暂停

    // 字段设置
    protected $schema = [
        'id'                => 'int',
        'name'              => 'string',
        'type'              => 'string',
        'discount_type'     => 'string',
        'discount_value'    => 'float',
        'status'            => 'string',
        'start_time'        => 'datetime',
        'end_time'          => 'datetime',
        'participant_count' => 'int',
        'description'       => 'text',
        'rules'             => 'text',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];

    // JSON字段
    protected $json = ['rules'];
    protected $jsonAssoc = true;

    // 获取状态文本
    public function getStatusTextAttr($value, $data)
    {
        $statusMap = [
            self::STATUS_DRAFT => '草稿',
            self::STATUS_ACTIVE => '进行中',
            self::STATUS_UPCOMING => '未开始',
            self::STATUS_ENDED => '已结束',
            self::STATUS_PAUSED => '已暂停',
        ];

        return $statusMap[$data['status']] ?? '未知';
    }

    // 获取类型文本
    public function getTypeTextAttr($value, $data)
    {
        $typeMap = [
            self::TYPE_DISCOUNT => '折扣活动',
            self::TYPE_COUPON => '优惠券',
            self::TYPE_GIFT => '赠品活动',
            self::TYPE_BUNDLE => '套餐优惠',
            self::TYPE_FLASH => '限时抢购',
        ];

        return $typeMap[$data['type']] ?? '未知';
    }

    // 自动判断活动状态
    public function checkStatus()
    {
        $now = time();
        $startTime = strtotime($this->start_time);
        $endTime = strtotime($this->end_time);

        if ($this->status === self::STATUS_PAUSED || $this->status === self::STATUS_DRAFT) {
            return;
        }

        if ($now < $startTime) {
            $this->status = self::STATUS_UPCOMING;
        } elseif ($now >= $startTime && $now <= $endTime) {
            $this->status = self::STATUS_ACTIVE;
        } elseif ($now > $endTime) {
            $this->status = self::STATUS_ENDED;
        }

        $this->save();
    }
}
