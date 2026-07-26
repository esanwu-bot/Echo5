<?php
/**
 * 电子元器件商城 - 应用/用途模型
 * 文件说明：定义产品应用场景数据表结构、关联关系与查询作用域。
 */

namespace app\model;

use app\model\BaseModel;


class SkApplication extends BaseModel
{
    protected $table = 'sk_application';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 多语言字段配置
    protected $i18nFields = ['title', 'description', 'content'];
    protected $i18nModule = 'application';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
        'sort' => 'integer',
        'category_id' => 'integer',
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

    // 获取启用应用
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    // 关联产品（多对多）
    public function products()
    {
        return $this->belongsToMany(SkProduct::class, SkApplicationProduct::class, 'product_id', 'application_id');
    }

    // 关联分类
    public function category()
    {
        return $this->belongsTo(SkApplicationCategory::class, 'category_id', 'id');
    }
}