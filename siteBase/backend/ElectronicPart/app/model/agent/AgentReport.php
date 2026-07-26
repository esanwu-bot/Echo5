<?php
namespace app\model\agent;

use think\Model;

class AgentReport extends Model
{
    protected $table = 'agent_reports';
    protected $autoWriteTimestamp = true;
    protected $createTime = 'created_at';
    protected $updateTime = false;

    protected $type = [
        'data_json'     => 'json',
        'chart_options' => 'json',
    ];
}
