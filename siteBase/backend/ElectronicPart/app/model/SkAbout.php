<?php

namespace app\model;

use app\model\BaseModel;



class SkAbout extends BaseModel
{
    
    protected $table = 'sk_about';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['title', 'content'];
    protected $i18nModule = 'about';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
        'images' => 'json',
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

    // Get active entries
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}