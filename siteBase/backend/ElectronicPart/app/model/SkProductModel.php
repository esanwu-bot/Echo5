<?php
/**
 * 电子元器件商城 - 产品型号模型
 * 文件说明：定义产品型号(SKU)数据表结构、关联关系与业务方法。
 * 数据表：sk_product_models
 */

namespace app\model;

use app\model\BaseModel;


/**
 * 产品型号(SKU)模型
 * @package app\model
 */
class SkProductModel extends BaseModel
{
    protected $table = 'sk_product_models';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    // 多语言字段配置
    protected $i18nFields = ['model_name', 'description'];
    protected $i18nModule = 'model';

    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'brand_id' => 'integer',
        'category_id' => 'integer',
        'series_id' => 'integer',
        'status' => 'integer',
        'sort' => 'integer',
        'pin_count' => 'integer',
        'stock' => 'integer',
        'safety_stock' => 'integer',
        'in_transit_stock' => 'integer',
        'normally_stocked' => 'integer',
        'moq' => 'integer',
        'lead_time' => 'integer',
        'pricing_unit_price' => 'float',
        'pricing_currency' => 'string',
    ];

    // 获取启用型号
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * 插入后同步多语言词条
     */
    public static function onAfterInsert($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    /**
     * 更新后同步多语言词条
     */
    public static function onAfterUpdate($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    /**
     * 删除后清理多语言词条
     */
    public static function onAfterDelete($model): void
    {
        \app\service\I18nService::deleteModel($model);
    }

    // 关联品牌
    public function brand()
    {
        return $this->belongsTo(SkBrand::class, 'brand_id');
    }

    // 关联分类
    public function category()
    {
        return $this->belongsTo(SkCategory::class, 'category_id');
    }

    // 关联产品系列 (SPU，实际指向 sk_product 表)
    public function series()
    {
        return $this->belongsTo(SkProduct::class, 'series_id');
    }

    // 关联规格
    public function specifications()
    {
        return $this->hasMany(SkModelSpecification::class, 'model_id');
    }

    // 关联型号参数值
    public function paramValues()
    {
        return $this->hasMany(SkModelParamVal::class, 'model_id');
    }

    // 关联供应商
    public function suppliers()
    {
        return $this->hasManyThrough(
            SkSupplier::class,
            SkProductSupplier::class,
            'model_id',
            'id',
            'id',
            'supplier_id'
        );
    }
}
