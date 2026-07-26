<?php

namespace app\model;

use think\Model;

class SkArticleCategory extends BaseModel
{
    protected $table = 'sk_article_category';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['name'];
    protected $i18nModule = 'article_category';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
        'parent_id' => 'integer',
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

    // Get active categories
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}