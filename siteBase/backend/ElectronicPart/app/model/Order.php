<?php

namespace app\model;

/**
 * Order模型类 - 别名到SkOrder
 * 用于兼容控制器中的引用
 */
class Order extends SkOrder
{
    // 订单状态常量
    const STATUS_PENDING = 1;      // 待付款
    const STATUS_PAID = 2;         // 待发货
    const STATUS_SHIPPED = 3;      // 待收货
    const STATUS_COMPLETED = 4;     // 已完成
    const STATUS_CANCELLED = 5;     // 已取消
    
    // 支付状态常量
    const PAYMENT_STATUS_PENDING = 1;  // 待支付
    const PAYMENT_STATUS_PAID = 2;     // 已支付
    const PAYMENT_STATUS_REFUNDED = 3; // 已退款
    
    // 支付方式常量
    const PAYMENT_METHOD_WECHAT = 1;   // 微信支付
    const PAYMENT_METHOD_ALIPAY = 2;   // 支付宝
    const PAYMENT_METHOD_BALANCE = 3;   // 余额支付
    
    // 配送方式常量
    const DELIVERY_METHOD_STANDARD = 1;  // 标准配送
    const DELIVERY_METHOD_EXPRESS = 2;   // 次日达
    const DELIVERY_METHOD_SAME_DAY = 3;  // 当日达
    
    // 字段映射 - 兼容控制器中使用的字段名
    protected $mapping = [
        'total_price' => 'total_amount',    // 总价映射
        'created_at' => 'create_time',      // 创建时间映射
        'updated_at' => 'update_time',      // 更新时间映射
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
    
    // 重写查询作用域以支持字段映射
    public static function whereTime($field, $op, $value = null)
    {
        // 如果是映射字段，使用实际字段名
        $mapping = (new static())->mapping;
        if (isset($mapping[$field])) {
            $field = $mapping[$field];
        }

        return parent::whereTime($field, $op, $value);
    }
    
    // 生成订单号
    public static function generateOrderNo()
    {
        return date('YmdHis') . rand(1000, 9999);
    }
    
    // 支付方法
    public function pay()
    {
        $this->status = self::STATUS_PAID;
        $this->payment_status = self::PAYMENT_STATUS_PAID;
        $this->paid_at = date('Y-m-d H:i:s');
        return $this->save();
    }
    
    // 取消方法
    public function cancel($reason = '')
    {
        $this->status = self::STATUS_CANCELLED;
        $this->cancel_reason = $reason;
        $this->cancelled_at = date('Y-m-d H:i:s');
        return $this->save();
    }
    
    // 获取状态颜色
    public function getStatusColorAttr($value, $data)
    {
        $colorMap = [
            self::STATUS_PENDING => 'warning',
            self::STATUS_PAID => 'processing',
            self::STATUS_SHIPPED => 'primary',
            self::STATUS_COMPLETED => 'success',
            self::STATUS_CANCELLED => 'danger'
        ];
        
        return $colorMap[$data['status']] ?? 'default';
    }
}