<?php
namespace app\validate;

use think\Validate;

class DictionaryField extends Validate
{
    protected $rule = [
        'project_id' => 'require|number',
        'name' => 'require|max:100',
        'code' => 'require|regex:/^[a-zA-Z][a-zA-Z0-9_]*$/|max:50',
        'field_type' => 'require|in:text,textarea,number,select,radio,checkbox,date,datetime,image,file',
        'data_type' => 'require|in:string,number,boolean,array,object',
        'is_required' => 'in:0,1',
        'is_unique' => 'in:0,1',
        'sort_order' => 'number',
        'status' => 'in:0,1',
        'min_length' => 'number',
        'max_length' => 'number',
        'min_value' => 'number',
        'max_value' => 'number',
        'regex_pattern' => 'max:500'
    ];
    
    protected $message = [
        'project_id.require' => '项目ID不能为空',
        'project_id.number' => '项目ID必须为数字',
        'name.require' => '字段名称不能为空',
        'name.max' => '字段名称不能超过100个字符',
        'code.require' => '字段代码不能为空',
        'code.regex' => '字段代码只能包含字母、数字和下划线，且必须以字母开头',
        'code.max' => '字段代码不能超过50个字符',
        'field_type.require' => '字段类型不能为空',
        'field_type.in' => '字段类型无效',
        'data_type.require' => '数据类型不能为空',
        'data_type.in' => '数据类型无效',
        'is_required.in' => '是否必填值无效',
        'is_unique.in' => '是否唯一值无效',
        'sort_order.number' => '排序值必须为数字',
        'status.in' => '状态值无效',
        'min_length.number' => '最小长度必须为数字',
        'max_length.number' => '最大长度必须为数字',
        'min_value.number' => '最小值必须为数字',
        'max_value.number' => '最大值必须为数字',
        'regex_pattern.max' => '正则表达式不能超过500个字符'
    ];
    
    protected $scene = [
        'update' => ['name', 'code', 'field_type', 'data_type', 'is_required', 'is_unique', 'sort_order', 'status', 'min_length', 'max_length', 'min_value', 'max_value', 'regex_pattern']
    ];
}
?>