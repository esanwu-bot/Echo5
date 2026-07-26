<?php
/**
 * 天启芯科技 - 语言类型模型
 * 对标 CRMEB eb_lang_type
 */
namespace app\model\system\lang;

use think\Model;

class LangType extends Model
{
    protected $table = 'sk_lang_type';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    protected $type = [
        'status'     => 'integer',
        'is_default' => 'integer',
        'is_del'     => 'integer',
    ];

    /**
     * is_del 搜索器
     */
    public function searchIsDelAttr($query, $value)
    {
        if ($value !== '') $query->where('is_del', $value);
    }

    /**
     * status 搜索器
     */
    public function searchStatusAttr($query, $value)
    {
        if ($value !== '') $query->where('status', $value);
    }

    /**
     * 只查启用的语言
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1)->where('is_del', 0);
    }
}
