<?php

namespace app\validate;

use think\Validate;

class ProductPriceBreak extends Validate
{
    protected $rule = [
        'product_id' => 'require|string',
        'quantity' => 'require|integer|min:1',
        'price' => 'require|numeric|min:0',
    ];
    
    protected $message = [
        'product_id.require' => '商品ID不能为空',
        'product_id.string' => '商品ID必须是字符串',
        'quantity.require' => '数量不能为空',
        'quantity.integer' => '数量必须是整数',
        'quantity.min' => '数量必须大于0',
        'price.require' => '价格不能为空',
        'price.numeric' => '价格必须是数字',
        'price.min' => '价格不能为负数',
    ];
    
    protected $scene = [
        'create' => ['product_id', 'quantity', 'price'],
        'update' => ['quantity', 'price'],
    ];
}
