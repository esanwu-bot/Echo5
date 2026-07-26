<?php

namespace app\model;

use think\Model;

class SkJob extends BaseModel
{
    protected $table = 'sk_job';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['job_title'];
    protected $i18nModule = 'job';
    
    // Type casting
    protected $type = [
        'status' => 'integer',
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

    // Get active jobs
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}