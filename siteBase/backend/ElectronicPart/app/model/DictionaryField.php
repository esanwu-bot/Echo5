<?php
namespace app\model;

use think\Model;

class DictionaryField extends Model
{
    // 设置表名
    protected $table = 'sk_dictionary_field';
    
    // 禁用自动时间戳（因为需要手动处理datetime类型）
    protected $autoWriteTimestamp = false;
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'project_id'  => 'int',
        'name'        => 'string',
        'code'        => 'string',
        'type'        => 'string',
        'field_type'  => 'string',
        'data_type'   => 'string',
        'options'     => 'string',
        'default_value' => 'string',
        'description' => 'string',
        'required'    => 'int',
        'sort_order'  => 'int',
        'status'      => 'int',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
        'delete_time' => 'int',
    ];
    
    // 字段类型转换
    protected $type = [
        'id'          => 'integer',
        'project_id'  => 'integer',
        'required'    => 'integer',
        'sort_order'  => 'integer',
        'status'      => 'integer',
        'options'     => 'json',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
        'delete_time' => 'timestamp',
    ];
    
    // 模型事件
    protected static function onBeforeInsert($model)
    {
        $model->create_time = date('Y-m-d H:i:s');
        $model->update_time = date('Y-m-d H:i:s');
    }
    
    protected static function onBeforeUpdate($model)
    {
        $model->update_time = date('Y-m-d H:i:s');
    }
    
    /**
     * 获取字段类型列表
     */
    public static function getFieldTypes()
    {
        return [
            'text' => '文本框',
            'textarea' => '文本域',
            'number' => '数字',
            'select' => '下拉选择',
            'radio' => '单选',
            'checkbox' => '多选',
            'image' => '图片',
            'file' => '文件',
            'date' => '日期',
            'datetime' => '日期时间',
            'boolean' => '布尔值'
        ];
    }
    
    /**
     * 获取数据类型列表
     */
    public static function getDataTypes()
    {
        return [
            'string' => '字符串',
            'integer' => '整数',
            'decimal' => '小数',
            'boolean' => '布尔值',
            'json' => 'JSON',
            'array' => '数组'
        ];
    }
    
    /**
     * 关联项目
     */
    public function project()
    {
        return $this->belongsTo(DictionaryProject::class, 'project_id');
    }
    

}