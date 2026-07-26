<?php
namespace app\validate;

use think\Validate;

class DictionaryData extends Validate
{
    protected $rule = [
        'project_id' => 'require|number',
        'title' => 'require|max:200',
        'code' => 'require|regex:/^[a-zA-Z][a-zA-Z0-9_]*$/|max:50',
        'sort_order' => 'number',
        'status' => 'in:0,1'
    ];
    
    protected $message = [
        'project_id.require' => '项目ID不能为空',
        'project_id.number' => '项目ID必须为数字',
        'title.require' => '数据标题不能为空',
        'title.max' => '数据标题不能超过200个字符',
        'code.require' => '数据代码不能为空',
        'code.regex' => '数据代码只能包含字母、数字和下划线，且必须以字母开头',
        'code.max' => '数据代码不能超过50个字符',
        'sort_order.number' => '排序值必须为数字',
        'status.in' => '状态值无效'
    ];
    
    protected $scene = [
        'update' => ['title', 'code', 'sort_order', 'status']
    ];
}
?>