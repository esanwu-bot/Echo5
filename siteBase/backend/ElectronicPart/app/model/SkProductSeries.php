<?php
/**
 * 电子元器件商城 - 产品系列模型
 * 文件说明：定义产品系列（SPU）数据表结构、关联关系与业务方法。
 * 数据表：sk_product_series
 */

namespace app\model;

use think\Model;

/**
 * 产品系列（SPU）模型
 *
 * @package app\model
 */
class SkProductSeries extends Model
{
    protected $table = 'sk_product_series';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 字段类型转换
    protected $type = [
        'id' => 'integer',
        'category_id' => 'integer',
        'brand_id' => 'integer',
        'status' => 'integer',
        'sort' => 'integer',
        'is_new' => 'integer',
    ];

    /**
     * 获取启用系列
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * 获取新品系列
     */
    public function scopeNew($query)
    {
        return $query->where('is_new', 1);
    }

    /**
     * 关联分类
     */
    public function category()
    {
        return $this->belongsTo(SkCategory::class, 'category_id');
    }

    /**
     * 关联品牌
     */
    public function brand()
    {
        return $this->belongsTo(SkBrand::class, 'brand_id');
    }

    /**
     * 关联型号列表
     */
    public function models()
    {
        return $this->hasMany(SkProductModel::class, 'series_id');
    }

    /**
     * 关联产品(SPU条目)
     */
    public function products()
    {
        return $this->hasMany(SkProduct::class, 'series_id');
    }
}
