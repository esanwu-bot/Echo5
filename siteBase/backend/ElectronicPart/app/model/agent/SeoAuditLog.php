<?php
namespace app\model\agent;

use think\Model;

class SeoAuditLog extends Model
{
    protected $table = 'seo_audit_logs';
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = false;
}
