<?php
declare (strict_types = 1);

namespace app\model;

use think\Model;

class QuoteRequest extends Model
{
    protected $table = 'sk_quote_request';
    
    protected $pk = 'id';
    
    // 设置字段信息
    protected $schema = [
        'id' => 'int',
        'user_id' => 'int',
        'company' => 'string',
        'contact_name' => 'string',
        'email' => 'string',
        'phone' => 'string',
        'product_info' => 'text',
        'quantity' => 'int',
        'message' => 'text',
        'status' => 'string',
        'reply_content' => 'text',
        'reply_time' => 'int',
        'create_time' => 'int',
        'update_time' => 'int'
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = false;
    
    // JSON字段
    protected $json = ['product_info'];
    
    // 状态文本
    public function getStatusTextAttr($value, $data)
    {
        $status = [
            'pending' => '待处理',
            'processing' => '处理中',
            'completed' => '已完成',
            'rejected' => '已拒绝'
        ];
        return $status[$data['status']] ?? '未知';
    }
}