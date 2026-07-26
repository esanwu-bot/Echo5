<?php
namespace app\model;

use think\Model;

class DictionaryProject extends Model
{
    // 设置表名
    protected $table = 'sk_dictionary_project';
    
    // 禁用自动时间戳（因为create_time是int类型，update_time是datetime类型）
    protected $autoWriteTimestamp = false;
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'name'        => 'string',
        'code'        => 'string',
        'description' => 'string',
        'status'      => 'int',
        'sort_order'  => 'int',
        'create_time' => 'int',
        'update_time' => 'datetime',
    ];
    
    // 字段类型转换
    protected $type = [
        'id'          => 'integer',
        'status'      => 'integer',
        'sort_order'  => 'integer',
        'create_time' => 'timestamp',
        'update_time' => 'datetime',
    ];
    
    // 模型事件
    protected static function onBeforeInsert($model)
    {
        $model->create_time = time();
        $model->update_time = date('Y-m-d H:i:s');
    }
    
    protected static function onBeforeUpdate($model)
    {
        $model->update_time = date('Y-m-d H:i:s');
    }
    
    /**
     * 获取项目列表
     */
    public static function getList($params = [])
    {
        $query = self::where('status', 1);
        
        // 按名称搜索
        if (!empty($params['name'])) {
            $query->whereLike('name', '%' . $params['name'] . '%');
        }
        
        // 按代码搜索
        if (!empty($params['code'])) {
            $query->whereLike('code', '%' . $params['code'] . '%');
        }
        
        return $query->order('sort_order', 'asc')
            ->order('id', 'desc')
            ->select();
    }
    
    /**
     * 根据代码获取项目
     */
    public static function getByCode($code)
    {
        return self::where('code', $code)
            ->where('status', 1)
            ->find();
    }
    
    /**
     * 关联字段
     */
    public function fields()
    {
        return $this->hasMany(DictionaryField::class, 'project_id')
            ->where('status', 1)
            ->order('sort_order', 'asc')
            ->order('id', 'asc');
    }
}