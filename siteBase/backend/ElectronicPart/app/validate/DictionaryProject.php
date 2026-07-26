<?php
namespace app\validate;

use think\Validate;

class DictionaryProject extends Validate
{
    protected $rule = [
        'name' => 'require|max:100',
        'code' => 'require|regex:/^[a-zA-Z][a-zA-Z0-9_]*$/|max:50',
        'description' => 'max:500',
        'sort_order' => 'number',
        'status' => 'in:0,1'
    ];
    
    protected $message = [
        'name.require' => '项目名称不能为空',
        'name.max' => '项目名称不能超过100个字符',
        'code.require' => '项目代码不能为空',
        'code.regex' => '项目代码只能包含字母、数字和下划线，且必须以字母开头',
        'code.max' => '项目代码不能超过50个字符',
        'description.max' => '项目描述不能超过500个字符',
        'sort_order.number' => '排序值必须为数字',
        'status.in' => '状态值无效'
    ];
    
    protected $scene = [
        'update' => ['name', 'code', 'description', 'sort_order', 'status']
    ];
}
?>