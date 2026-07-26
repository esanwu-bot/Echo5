<?php
/**
 * 翻译工具类
 * 对火山翻译服务做轻量封装，便于控制器、任务和命令统一调用。
 */

namespace app\utils;

use app\service\VolcTranslateService;

class Translate
{
    protected VolcTranslateService $service;

    public function __construct(?VolcTranslateService $service = null)
    {
        $this->service = $service ?: new VolcTranslateService();
    }

    public function isConfigured(): bool
    {
        return $this->service->isConfigured();
    }

    public function text(string $text, string $targetLang, string $sourceLang = 'zh'): array
    {
        return $this->service->translate($text, $targetLang, $sourceLang);
    }

    public function batch(array $texts, string $targetLang, string $sourceLang = 'zh'): array
    {
        return $this->service->translateBatch($texts, $targetLang, $sourceLang);
    }
}
