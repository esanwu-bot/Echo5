<?php
/**
 * 多语言批量翻译任务
 * 作为 CRMEB 风格批量翻译的任务壳，便于后续接入 think-queue 或其他异步调度。
 */

namespace app\jobs;

use app\service\system\lang\LangCodeService;
use think\facade\Log;

class TranslateJob
{
    /**
     * @param array{type_id:int,file_name:string} $payload
     */
    public function fire($job, array $payload): void
    {
        try {
            /** @var LangCodeService $service */
            $service = app()->make(LangCodeService::class);
            $service->batchTranslate((int)($payload['type_id'] ?? 0), (string)($payload['file_name'] ?? ''));

            if ($job && method_exists($job, 'delete')) {
                $job->delete();
            }
        } catch (\Throwable $e) {
            Log::error('TranslateJob failed: ' . $e->getMessage(), ['payload' => $payload]);

            if ($job && method_exists($job, 'attempts') && method_exists($job, 'release')) {
                if ($job->attempts() < 3) {
                    $job->release(30);
                    return;
                }
            }

            if ($job && method_exists($job, 'delete')) {
                $job->delete();
            }
        }
    }
}
