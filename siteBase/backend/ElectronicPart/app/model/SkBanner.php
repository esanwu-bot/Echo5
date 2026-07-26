<?php
/**
 * 电子元器件商城 - 横幅/Banner 模型
 * 文件说明：定义横幅数据表结构、查询作用域与业务常量，支持多语言特性。
 */

namespace app\model;

use app\model\BaseModel;


class SkBanner extends BaseModel
{
    
    protected $table = 'sk_banner';
    
    // 多语言字段配置
    protected $i18nFields = ['title', 'subtitle', 'description'];
    protected $i18nModule = 'banner';
    
    // 设置字段信息
    protected $schema = [
        'id'          => 'int',
        'title'       => 'string',
        'subtitle'    => 'string',
        'image'       => 'string',
        'link'        => 'string',
        'position'    => 'string',
        'description' => 'string',
        'sort'        => 'int',
        'status'      => 'int',
        'start_time'  => 'int',
        'end_time'    => 'int',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];
    
    // 自动时间戳
    protected $autoWriteTimestamp = 'datetime';
    
    // 状态常量
    const STATUS_DISABLED = 0;
    const STATUS_ENABLED = 1;
    
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
     * 获取启用的横幅
     */
    public function scopeEnabled($query)
    {
        return $query->where('status', self::STATUS_ENABLED);
    }
    
    /**
     * 按位置筛选
     */
    public function scopePosition($query, $position)
    {
        return $query->where('position', $position);
    }
    
    /**
     * 按排序获取
     */
    public function scopeSorted($query)
    {
        return $query->order('sort', 'asc')->order('id', 'desc');
    }
    
    /**
     * 检查是否在有效时间内
     */
    public function scopeActive($query)
    {
        $currentTime = time();
        return $query->where(function($q) use ($currentTime) {
            $q->whereNull('start_time')
              ->whereOr('start_time', '<=', $currentTime);
        })->where(function($q) use ($currentTime) {
            $q->whereNull('end_time')
              ->whereOr('end_time', '>=', $currentTime);
        });
    }
}