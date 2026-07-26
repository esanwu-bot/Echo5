<?php

namespace app\model;

use app\model\BaseModel;


class SkAttribute extends BaseModel
{
    
    protected $table = 'sk_attribute';
    
    // Auto-timestamp
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 多语言字段配置
    protected $i18nFields = ['name'];
    protected $i18nModule = 'attribute';
    
    // Type casting
    protected $type = [
        'is_system' => 'integer',
        'status' => 'integer',
        'sort_order' => 'integer',
    ];
    
    // JSON fields
    protected $json = ['options'];
    protected $jsonAssoc = true;
    
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
    
    /**
     * @deprecated 旧版字段后缀翻译，已废弃。新版本请使用 I18nService::mapData
     */
    public function getLocalizedName(string $lang): string
    {
        return $this->getLocalizedField('name', $lang);
    }

    /**
     * @deprecated 旧版字段后缀翻译，已废弃。新版本请使用 I18nService::mapData
     */
    public function getLocalizedField(string $field, string $lang = 'zh')
    {
        $data = method_exists($this, 'getData') ? $this->getData() : [];
        $fallback = $data[$field] ?? ($this->$field ?? '');

        if (function_exists('getLangValueByTableField')) {
            return getLangValueByTableField($this->table, $field, (int)$this->id, $fallback);
        }

        return $fallback;
    }
    
    /**
     * Get categories that use this attribute
     */
    public function categories()
    {
        return $this->belongsToMany(
            SkCategory::class,
            SkCategoryAttribute::class,
            'category_id',
            'attribute_id'
        );
    }
}
