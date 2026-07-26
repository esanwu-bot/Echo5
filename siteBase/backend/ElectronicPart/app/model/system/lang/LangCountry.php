<?php
/**
 * 天启芯科技 - 浏览器语言映射模型
 * 对标 CRMEB eb_lang_country
 */
namespace app\model\system\lang;

use think\Model;

class LangCountry extends Model
{
    protected $table = 'sk_lang_country';

    protected $type = [
        'type_id' => 'integer',
        'status'  => 'integer',
    ];

    /**
     * type_id 搜索器
     */
    public function searchTypeIdAttr($query, $value)
    {
        if ($value !== '') $query->where('type_id', $value);
    }

    /**
     * status 搜索器
     */
    public function searchStatusAttr($query, $value)
    {
        if ($value !== '') $query->where('status', $value);
    }

    /**
     * code/name 关键词搜索器
     */
    public function searchKeywordAttr($query, $value)
    {
        if ($value !== '') $query->where('name|code', 'like', '%' . $value . '%');
    }
}
