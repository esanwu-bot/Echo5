<?php
/**
 * 电子元器件商城 - 品牌模型
 * 文件说明：定义产品品牌数据表结构、关联关系与属性访问器，支持多语言特性。
 */

namespace app\model;

use app\model\BaseModel;


class SkBrand extends BaseModel
{
    
    protected $table = 'sk_brands';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = false;

    // 多语言字段配置（brand_name 和 description 走 sk_translation 表）
    protected $i18nFields = ['brand_name', 'description'];
    protected $i18nModule = 'brand';

    // 字段类型转换
    protected $type = [
        'id' => 'integer',
    ];

    // 名称获取器（将 name 虚拟属性映射到 brand_name 数据库字段）
    public function getNameAttr($value, $data)
    {
        return $data['brand_name'] ?? '';
    }

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
     * @deprecated 旧版 MultiLanguageTrait 兼容方法，新版本请使用 I18nService::mapData
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

    // 关联产品
    public function products()
    {
        return $this->hasMany(SkProduct::class, 'brand_id');
    }
}
