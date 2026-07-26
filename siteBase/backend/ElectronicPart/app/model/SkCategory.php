<?php
/**
 * 电子元器件商城 - 分类模型
 * 文件说明：定义产品分类数据表结构、关联关系与查询作用域，支持多语言特性。
 */

namespace app\model;

use think\Model;

class SkCategory extends BaseModel
{
    
    protected $table = 'sk_category';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 多语言字段配置（sk_category 无 description 基础字段，仅 name 参与翻译）
    protected $i18nFields = ['name'];
    protected $i18nModule = 'category';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
        'parent_id' => 'integer',
        'level' => 'integer',
        'is_leaf' => 'integer',
        'is_hot' => 'integer',
    ];

    // 关联属性
    public function attributes()
    {
        return $this->hasMany(SkCategoryAttribute::class, 'category_id', 'id');
    }

    // 获取启用分类
    public function scopeActive($query)
    {
        return $this->where('status', 1);
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
}
