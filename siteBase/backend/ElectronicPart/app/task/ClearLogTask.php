<?php
namespace app\task;

use think\facade\Log;
use app\service\LogService;

class ClearLogTask
{
    public function run()
    {
        try {
            // 清理30天前的日志文件
            LogService::clearExpiredLogs(30);
            
            Log::info('Log cleanup task executed successfully');
        } catch (\Exception $e) {
            Log::error('Log cleanup task failed: ' . $e->getMessage());
        }
    }
}