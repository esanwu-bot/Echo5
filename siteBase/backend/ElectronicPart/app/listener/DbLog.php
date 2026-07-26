<?php
namespace app\listener;

use think\facade\Log;
use app\service\LogService;

class DbLog
{
    public function handle($event)
    {
        if (isset($event->sql)) {
            // 记录SQL执行日志
            LogService::sql($event->sql, $event->time, $event->connection);
        }
    }
}