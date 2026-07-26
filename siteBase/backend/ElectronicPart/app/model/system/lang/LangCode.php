<?php
/**
 * 天启芯科技 - 语言码表模型
 * 对标 CRMEB eb_lang_code
 * 核心翻译存储：集中管理所有翻译词条
 */
namespace app\model\system\lang;

use think\Model;

class LangCode extends Model
{
    protected $table = 'sk_lang_code';

    protected $autoWriteTimestamp = 'datetime';
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';

    protected $type = [
        'type_id'  => 'integer',
        'is_admin' => 'integer',
    ];

    /**
     * type_id 搜索器
     */
    public function searchTypeIdAttr($query, $value)
    {
        if ($value !== '' && $value !== 0) $query->where('type_id', $value);
    }

    /**
     * code 搜索器
     */
    public function searchCodeAttr($query, $value)
    {
        if ($value !== '') $query->where('code', 'like', '%' . $value . '%');
    }

    /**
     * remarks 搜索器（支持模糊匹配 code、remarks、lang_explain）
     */
    public function searchRemarksAttr($query, $value)
    {
        if ($value !== '') $query->where('remarks|code|lang_explain', 'like', '%' . $value . '%');
    }

    /**
     * is_admin 搜索器
     */
    public function searchIsAdminAttr($query, $value)
    {
        if ($value !== '') $query->where('is_admin', $value);
    }
}
