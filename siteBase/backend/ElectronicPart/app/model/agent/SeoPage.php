<?php
namespace app\model\agent;

use think\Model;

class SeoPage extends Model
{
    protected $table = 'seo_pages';
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = 'updated_at';

    protected $type = [
        'schema_json' => 'json',
    ];
}
