<?php

namespace app\model;

use app\model\BaseModel;



/**
 * SkDocument模型类
 * 文档管理模型
 */
class SkDocument extends BaseModel
{
    
    protected $table = 'sk_document';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['title', 'content'];
    protected $i18nModule = 'document';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
    ];
    
    public static function onAfterInsert($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    public static function onAfterUpdate($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    public static function onAfterDelete($model): void
    {
        \app\service\I18nService::deleteModel($model);
    }
    
    // 获取有效的文档
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
    
    // 按分类获取文档
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }
}