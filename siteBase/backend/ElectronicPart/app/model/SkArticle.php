<?php
/**
 * 电子元器件商城 - 文章模型
 * 文件说明：定义文章/资讯数据表结构、关联关系与查询作用域，支持多语言特性。
 */

namespace app\model;

use app\model\BaseModel;


class SkArticle extends BaseModel
{
    
    protected $table = 'sk_article';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 多语言字段配置
    protected $i18nFields = ['title', 'summary', 'content'];
    protected $i18nModule = 'article';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
        'views' => 'integer',
        'category_id' => 'integer',
        'publish_time' => 'datetime',
    ];

    protected static function onAfterInsert($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    protected static function onAfterUpdate($model): void
    {
        \app\service\I18nService::syncModel($model);
    }

    protected static function onAfterDelete($model): void
    {
        \app\service\I18nService::deleteModel($model);
    }

    // 获取启用文章
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    // 关联分类
    public function category()
    {
        return $this->belongsTo(SkArticleCategory::class, 'category_id');
    }
}