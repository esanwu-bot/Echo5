<?php

namespace app\model;

use app\model\BaseModel;


class SkCertificate extends BaseModel
{
    protected $table = 'sk_certificate';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['cert_name', 'description'];
    protected $i18nModule = 'certificate';
    
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

    // Get active certificates
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}