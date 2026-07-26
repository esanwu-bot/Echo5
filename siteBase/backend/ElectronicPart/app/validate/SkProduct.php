<?php
/**
 * 电子元器件商城 - 产品验证器
 * 文件说明：定义产品数据的验证规则、错误提示与验证场景。
 */

namespace app\validate;

use think\Validate;

class SkProduct extends Validate
{
    protected $rule = [
        'category_id' => 'integer',
        'product_code' => 'alphaDash|max:50|unique:sk_product',
        'name' => 'require|max:255',
        'name_en' => 'max:255',
        'name_zh_hant' => 'max:255',
        'package_type' => 'max:50',
        'status' => 'in:0,1',
        'is_new' => 'integer|in:0,1',
        'sort' => 'integer',
        'specs' => 'array'
    ];

    protected $message = [
        'category_id.integer' => '分类ID必须是整数',
        'product_code.alphaDash' => '商品编码只能包含字母、数字、破折号或下划线',
        'product_code.max' => '商品编码不能超过50个字符',
        'product_code.unique' => '商品编码已存在',
        'name.require' => '商品名称不能为空',
        'name.max' => '商品名称不能超过255个字符',
        'name_en.max' => '英文商品名称不能超过255个字符',
        'name_zh_hant.max' => '繁体中文商品名称不能超过255个字符',
        'package_type.max' => '封装类型不能超过50个字符',
        'status.in' => '无效的状态值',
        'is_new.integer' => '是否新品必须是整数',
        'is_new.in' => '是否新品必须是0或1',
        'sort.integer' => '排序值必须是整数',
        'specs.array' => '规格必须是数组'
    ];

    protected $scene = [
        'save' => ['name', 'product_code', 'category_id', 'status', 'is_new', 'sort', 'specs', 'name_en', 'name_zh_hant', 'package_type'],
        'update' => ['name', 'product_code', 'category_id', 'status', 'is_new', 'sort', 'specs', 'name_en', 'name_zh_hant', 'package_type'],
    ];
}