<?php
/**
 * 业务词条异步翻译队列任务
 *
 * 接收业务模块词条信息，调用火山引擎翻译 API 批量翻译为目标语言，
 * 并将结果写入 sk_translation 表。
 */

namespace app\jobs;

use app\service\I18nService;
use app\service\VolcTranslateService;
use think\facade\Log;

class BusinessTranslateJob
{
    /**
     * 目标语言列表
     */
    protected $targetLangs = ['en-US', 'ja-JP', 'ko-KR'];

    /**
     * 火山引擎语言代码映射
     */
    protected $volcLangMap = [
        'en-US' => 'en',
        'ja-JP' => 'ja',
        'ko-KR' => 'ko',
    ];

    /**
     * 队列任务处理入口
     *
     * @param mixed $job  队列任务对象（think-queue 传入）
     * @param array $data 任务数据
     */
    public function fire($job, array $data): void
    {
        $module = $data['module'] ?? '';
        $businessId = (int)($data['business_id'] ?? 0);
        $field = $data['field'] ?? '';
        $defaultValue = $data['default_value'] ?? '';

        if (empty($module) || $businessId <= 0 || empty($field) || empty($defaultValue)) {
            Log::warning('BusinessTranslateJob 参数不完整，删除任务', $data);
            $this->deleteJob($job);
            return;
        }

        try {
            /** @var VolcTranslateService $volcService */
            $volcService = app(VolcTranslateService::class);
            /** @var I18nService $i18nService */
            $i18nService = app(I18nService::class);

            if (!$volcService->isConfigured()) {
                Log::error('BusinessTranslateJob 火山引擎未配置，删除任务');
                $this->deleteJob($job);
                return;
            }

            foreach ($this->targetLangs as $langCode) {
                $volcLang = $this->volcLangMap[$langCode] ?? 'en';

                // 检查是否已存在人工翻译（不覆盖）
                $existing = \think\facade\Db::table('sk_translation')
                    ->where('module', $module)
                    ->where('business_id', $businessId)
                    ->where('field', $field)
                    ->where('lang_code', $langCode)
                    ->find();

                if ($existing && (int)$existing['is_auto'] === 0) {
                    continue; // 跳过人工翻译
                }

                $result = $volcService->translate($defaultValue, $volcLang, 'zh');

                if (isset($result['error'])) {
                    Log::error("BusinessTranslateJob 翻译失败 [{$langCode}]: " . $result['error'], $data);
                    continue;
                }

                $translatedText = $result['TranslationList'][0]['Translation'] ?? '';
                if (empty($translatedText)) {
                    Log::warning("BusinessTranslateJob 翻译结果为空 [{$langCode}]", $data);
                    continue;
                }

                $i18nService->saveTranslation($module, $businessId, $field, $langCode, $translatedText, true);

                // 火山引擎 QPS 限制，适当延时
                usleep(100000); // 100ms
            }

            Log::info("BusinessTranslateJob 翻译完成: {$module}:{$field}:{$businessId}");
            $this->deleteJob($job);

        } catch (\Throwable $e) {
            Log::error('BusinessTranslateJob 异常: ' . $e->getMessage(), [
                'data' => $data,
                'trace' => $e->getTraceAsString(),
            ]);

            // 重试 3 次后删除
            if ($job && method_exists($job, 'attempts') && $job->attempts() >= 3) {
                Log::error("BusinessTranslateJob 重试 3 次失败，删除任务: {$module}:{$field}:{$businessId}");
                $this->deleteJob($job);
            } elseif ($job && method_exists($job, 'release')) {
                $job->release(60); // 1 分钟后重试
            }
        }
    }

    /**
     * 安全删除队列任务
     *
     * @param mixed $job
     */
    protected function deleteJob($job): void
    {
        if ($job && method_exists($job, 'delete')) {
            $job->delete();
        }
    }
}
