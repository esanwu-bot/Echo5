<?php
/**
 * 电子元器件商城 - FAQ/常见问题模型
 * 文件说明：定义常见问题数据表结构、查询作用域与业务常量，支持多语言特性。
 */

namespace app\model;

use app\model\BaseModel;


class SkFaq extends BaseModel
{
    
    protected $table = 'sk_faq';

    // 多语言字段配置
    protected $i18nFields = ['question', 'answer'];
    protected $i18nModule = 'faq';

    // 字段信息
    protected $schema = [
        'id'          => 'int',
        'question'    => 'string',
        'answer'      => 'string',
        'category'    => 'string',
        'product_id'  => 'int',
        'is_hot'      => 'int',
        'sort'        => 'int',
        'status'      => 'int',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';

    // 状态常量
    const STATUS_DISABLED = 0;
    const STATUS_ENABLED = 1;

    // 热门常量
    const HOT_NO = 0;
    const HOT_YES = 1;
    
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
     * 获取启用的FAQ
     */
    public function scopeEnabled($query)
    {
        return $query->where('status', self::STATUS_ENABLED);
    }
    
    /**
     * 获取热门FAQ
     */
    public function scopeHot($query)
    {
        return $query->where('is_hot', self::HOT_YES);
    }
    
    /**
     * 按分类筛选
     */
    public function scopeCategory($query, $category)
    {
        return $query->where('category', $category);
    }
    
    /**
     * 按产品筛选
     */
    public function scopeProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }
    
    /**
     * 按排序获取
     */
    public function scopeSorted($query)
    {
        return $query->order('sort', 'asc')->order('id', 'desc');
    }
    
    /**
     * 关键词搜索
     */
    public function scopeKeyword($query, $keyword)
    {
        return $query->where('question|answer', 'like', '%' . $keyword . '%');
    }
}