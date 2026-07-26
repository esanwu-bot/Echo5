<?php
/**
 * 电子元器件商城 - 分类验证器
 * 文件说明：定义分类数据的验证规则、错误提示与验证场景。
 */

namespace app\validate;

use think\Validate;

class SkCategory extends Validate
{
    protected $rule = [
        'name' => 'require|max:100',
        'name_en' => 'max:100',
        'name_zh_hant' => 'max:100',
        'slug' => 'alphaDash|max:100',
        'parent_id' => 'integer',
        'sort' => 'integer',
        'status' => 'in:0,1',
        'is_hot' => 'in:0,1',
    ];

    protected $message = [
        'name.require' => '分类名称必填',
        'name.max' => '分类名称不能超过 100 个字符',
        'name_en.max' => '英文分类名称不能超过 100 个字符',
        'name_zh_hant.max' => '繁体中文分类名称不能超过 100 个字符',
        'slug.alphaDash' => '标识只能包含字母、数字、破折号或下划线',
        'slug.max' => '标识不能超过 100 个字符',
        'parent_id.integer' => '父分类 ID 必须是整数',
        'sort.integer' => '排序值必须是整数',
        'status.in' => '无效的状态值',
        'is_hot.in' => '无效的热门状态值',
    ];

    protected $scene = [
        'save' => ['name', 'slug', 'parent_id', 'sort', 'status', 'name_en', 'name_zh_hant', 'is_hot'],
        'update' => ['name', 'slug', 'parent_id', 'sort', 'status', 'name_en', 'name_zh_hant', 'is_hot'],
    ];
}