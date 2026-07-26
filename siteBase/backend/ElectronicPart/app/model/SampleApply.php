<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class SampleApply extends Model
{
    protected $table = 'sk_sample_apply';
    
    protected $pk = 'id';
    
    // 设置字段信息
    protected $schema = [
        'id' => 'int',
        'user_id' => 'int',
        'company' => 'string',
        'contact_name' => 'string',
        'email' => 'string',
        'phone' => 'string',
        'address' => 'string',
        'product_id' => 'int',
        'product_name' => 'string',
        'quantity' => 'int',
        'purpose' => 'string',
        'status' => 'string',
        'tracking_number' => 'string',
        'reply_content' => 'text',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = false;
    
    // 状态文本
    public function getStatusTextAttr($value, $data)
    {
        $status = [
            'pending' => '待处理',
            'approved' => '已批准',
            'shipped' => '已发货',
            'delivered' => '已送达',
            'rejected' => '已拒绝'
        ];
        return $status[$data['status']] ?? '未知';
    }
}