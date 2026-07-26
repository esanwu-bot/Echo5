<?php
/**
 * 电子元器件商城 - 新闻模型
 * 文件说明：定义新闻/资讯数据表结构、关联关系与查询作用域，支持多语言特性。
 */

namespace app\model;

use think\Model;

class SkNews extends BaseModel
{
    
    protected $table = 'sk_news';

    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    // 多语言字段配置
    protected $i18nFields = ['title', 'summary', 'content'];
    protected $i18nModule = 'news';

    // 字段类型转换
    protected $type = [
        'status' => 'integer',
        'views' => 'integer',
        'publish_time' => 'datetime',
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

    // 获取启用新闻
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }
}