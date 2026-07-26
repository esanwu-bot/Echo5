<?php
namespace app\model;

use think\Model;

class DictionaryFieldOption extends Model
{
    // 设置表名
    protected $table = 'sk_dictionary_field_options';
    
    // 自动时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'field_id'    => 'int',
        'label'       => 'string',
        'value'       => 'string',
        'sort_order'  => 'int',
        'status'      => 'int',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];
    
    // 字段类型转换
    protected $type = [
        'id'          => 'integer',
        'field_id'    => 'integer',
        'sort_order'  => 'integer',
        'status'      => 'integer',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];
    
    /**
     * 关联字段
     */
    public function field()
    {
        return $this->belongsTo(DictionaryField::class, 'field_id');
    }
}