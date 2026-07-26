<?php

namespace app\model;

use app\model\BaseModel;



class SkTraining extends BaseModel
{
    
    protected $table = 'sk_training';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['title', 'description', 'content'];
    protected $i18nModule = 'training';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
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

    // Get active training events
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}