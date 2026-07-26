<?php
namespace app\model\agent;

use think\Model;

class SeoKeyword extends Model
{
    protected $table = 'seo_keywords';
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';
}
