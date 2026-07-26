<?php
namespace app\model;

use think\Model;

class DictionaryData extends Model
{
    // 设置表名
    protected $table = 'sk_dictionary_data';
    
    // 禁用自动时间戳（因为需要手动处理datetime类型）
    protected $autoWriteTimestamp = false;
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'project_id'  => 'int',
        'field_values'=> 'string',
        'status'      => 'int',
        'sort_order'  => 'int',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
        'delete_time' => 'int',
    ];
    
    // 字段类型转换
    protected $type = [
        'id'          => 'integer',
        'project_id'  => 'integer',
        'status'      => 'integer',
        'sort_order'  => 'integer',
        'field_values'=> 'json',
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
     * 验证数据
     */
    public static function validateData($projectId, $data)
    {
        // 获取项目的字段定义
        $fields = DictionaryField::where('project_id', $projectId)
            ->where('status', 1)
            ->select();
        
        $errors = [];
        
        foreach ($fields as $field) {
            $fieldCode = $field->code;
            $fieldType = $field->field_type;
            $dataType = $field->data_type;
            $required = $field->required;
            $options = $field->options;
            
            // 检查必填字段
            if ($required && (!isset($data[$fieldCode]) || $data[$fieldCode] === '')) {
                $errors[$fieldCode] = "{$field->name}不能为空";
                continue;
            }
            
            // 如果字段为空且非必填，跳过验证
            if (!isset($data[$fieldCode]) || $data[$fieldCode] === '') {
                continue;
            }
            
            $value = $data[$fieldCode];
            
            // 根据字段类型验证
            switch ($fieldType) {
                case 'number':
                    if (!is_numeric($value)) {
                        $errors[$fieldCode] = "{$field->name}必须是数字";
                    }
                    break;
                    
                case 'select':
                case 'radio':
                    if (is_array($options) && !empty($options['options']) && !in_array($value, $options['options'])) {
                        $errors[$fieldCode] = "{$field->name}的值不在可选范围内";
                    }
                    break;
                    
                case 'checkbox':
                    if (!is_array($value)) {
                        $errors[$fieldCode] = "{$field->name}必须是数组";
                    } elseif (is_array($options) && !empty($options['options'])) {
                        foreach ($value as $val) {
                            if (!in_array($val, $options['options'])) {
                                $errors[$fieldCode] = "{$field->name}的值不在可选范围内";
                                break;
                            }
                        }
                    }
                    break;
                    
                case 'image':
                case 'file':
                    // 这里可以添加文件验证逻辑
                    break;
            }
            
            // 长度验证
            if ($field->min_length && strlen($value) < $field->min_length) {
                $errors[$fieldCode] = "{$field->name}长度不能少于{$field->min_length}个字符";
            }
            
            if ($field->max_length && strlen($value) > $field->max_length) {
                $errors[$fieldCode] = "{$field->name}长度不能超过{$field->max_length}个字符";
            }
            
            // 数值范围验证
            if ($fieldType === 'number') {
                if ($field->min_value !== null && $value < $field->min_value) {
                    $errors[$fieldCode] = "{$field->name}不能小于{$field->min_value}";
                }
                
                if ($field->max_value !== null && $value > $field->max_value) {
                    $errors[$fieldCode] = "{$field->name}不能大于{$field->max_value}";
                }
            }
            
            // 正则验证
            if ($field->regex_pattern && !preg_match($field->regex_pattern, $value)) {
                $errors[$fieldCode] = "{$field->name}格式不正确";
            }
        }
        
        return empty($errors) ? true : $errors;
    }
    
    /**
     * 根据代码获取数据
     */
    public static function getByCode($projectId, $code)
    {
        return self::where('project_id', $projectId)
            ->where('code', $code)
            ->find();
    }
    
    /**
     * 格式化字段值
     */
    public static function formatFieldValues($projectId, $data)
    {
        // 获取项目的字段定义
        $fields = DictionaryField::where('project_id', $projectId)
            ->where('status', 1)
            ->select();
        
        $fieldValues = [];
        
        foreach ($fields as $field) {
            $fieldCode = $field->code;
            $fieldType = $field->field_type;
            $dataType = $field->data_type;
            
            if (isset($data[$fieldCode])) {
                $value = $data[$fieldCode];
                
                // 根据数据类型转换值
                switch ($dataType) {
                    case 'integer':
                        $value = (int)$value;
                        break;
                    case 'decimal':
                        $value = (float)$value;
                        break;
                    case 'boolean':
                        $value = (bool)$value;
                        break;
                    case 'array':
                        if (!is_array($value)) {
                            $value = is_string($value) ? explode(',', $value) : [$value];
                        }
                        break;
                    case 'json':
                        if (!is_array($value)) {
                            $value = is_string($value) ? json_decode($value, true) : [];
                        }
                        break;
                }
                
                $fieldValues[$fieldCode] = $value;
            }
        }
        
        return $fieldValues;
    }
    
    /**
     * 关联项目
     */
    public function project()
    {
        return $this->belongsTo(DictionaryProject::class, 'project_id');
    }
}