<?php
/**
 * 电子元器件商城 - API 消息翻译服务
 * 文件说明：为 API 控制器提供多语言提示词翻译功能
 * 备注：根据前台语言头自动返回对应语言的提示词
 */

declare(strict_types=1);

namespace app\service;

use think\facade\Cache;
use think\facade\Db;
use think\facade\Log;

class ApiMessageTranslator
{
    /**
     * 缓存前缀
     */
    const CACHE_PREFIX = 'api_msg:';

    /**
     * 缓存有效期（1小时）
     */
    const CACHE_TTL = 3600;

    /**
     * 默认语言
     */
    const DEFAULT_LANG = 'zh-CN';

    /**
     * 翻译 API 提示词
     *
     * @access public
     * @param string $message  中文提示词（作为翻译键）
     * @param string $langCode 目标语言代码（如 en-US, ja-JP, ko-KR）
     * @param string $module   模块标识（可选，用于限定查询范围）
     * @return string 翻译后的文本，找不到翻译时返回原文
     */
    public function translate(string $message, string $langCode, string $module = ''): string
    {
        // 中文直接返回
        if ($langCode === 'zh-CN' || $langCode === 'zh') {
            return $message;
        }

        // 标准化语言代码
        $langCode = $this->normalizeLangCode($langCode);

        // 尝试从缓存获取
        $cacheKey = $this->buildCacheKey($message, $langCode, $module);
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        // 从数据库查询翻译
        $translation = $this->getTranslationFromDb($message, $langCode, $module);

        if ($translation) {
            // 缓存结果
            Cache::set($cacheKey, $translation, self::CACHE_TTL);
            return $translation;
        }

        // 找不到翻译，返回原文
        return $message;
    }

    /**
     * 批量翻译多个提示词
     *
     * @access public
     * @param array  $messages 中文提示词数组
     * @param string $langCode 目标语言代码
     * @param string $module   模块标识（可选）
     * @return array 翻译后的文本数组 [原文 => 译文]
     */
    public function translateBatch(array $messages, string $langCode, string $module = ''): array
    {
        if ($langCode === 'zh-CN' || $langCode === 'zh') {
            return array_combine($messages, $messages);
        }

        $langCode = $this->normalizeLangCode($langCode);
        $result = [];
        $missing = [];

        // 先查缓存
        foreach ($messages as $msg) {
            $cacheKey = $this->buildCacheKey($msg, $langCode, $module);
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                $result[$msg] = $cached;
            } else {
                $result[$msg] = $msg; // 默认返回原文
                $missing[] = $msg;
            }
        }

        // 批量查询数据库
        if (!empty($missing)) {
            $translations = $this->getTranslationsFromDb($missing, $langCode, $module);
            foreach ($translations as $msg => $trans) {
                $result[$msg] = $trans;
                // 缓存结果
                $cacheKey = $this->buildCacheKey($msg, $langCode, $module);
                Cache::set($cacheKey, $trans, self::CACHE_TTL);
            }
        }

        return $result;
    }

    /**
     * 根据请求对象自动翻译
     *
     * @access public
     * @param string       $message 中文提示词
     * @param \think\Request $request 请求对象
     * @param string       $module  模块标识（可选）
     * @return string 翻译后的文本
     */
    public function trans(string $message, $request, string $module = ''): string
    {
        $langCode = $this->detectLangCode($request);
        return $this->translate($message, $langCode, $module);
    }

    /**
     * 从数据库查询单条翻译
     *
     * @access private
     * @param string $message  中文提示词
     * @param string $langCode 目标语言代码
     * @param string $module   模块标识（可选）
     * @return string|null 翻译文本或 null
     */
    private function getTranslationFromDb(string $message, string $langCode, string $module = ''): ?string
    {
        try {
            $query = Db::table('sk_translation')
                ->where('lang_code', $langCode)
                ->where('trans_key', $message)
                ->where('type', 1); // 只查询 API 响应文本 (type=1)

            if ($module) {
                $query->where('module', $module);
            }

            $result = $query->value('trans_value');

            return $result ?: null;
        } catch (\Throwable $e) {
            Log::error('ApiMessageTranslator getTranslationFromDb error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 从数据库批量查询翻译
     *
     * @access private
     * @param array  $messages 中文提示词数组
     * @param string $langCode 目标语言代码
     * @param string $module   模块标识（可选）
     * @return array 翻译结果 [原文 => 译文]
     */
    private function getTranslationsFromDb(array $messages, string $langCode, string $module = ''): array
    {
        try {
            $query = Db::table('sk_translation')
                ->where('lang_code', $langCode)
                ->whereIn('trans_key', $messages)
                ->where('type', 1); // 只查询 API 响应文本 (type=1)

            if ($module) {
                $query->where('module', $module);
            }

            return $query->column('trans_value', 'trans_key');
        } catch (\Throwable $e) {
            Log::error('ApiMessageTranslator getTranslationsFromDb error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * 检测请求的语言代码
     *
     * @access private
     * @param \think\Request $request 请求对象
     * @return string 语言代码
     */
    private function detectLangCode($request): string
    {
        // 优先读取 X-Language 请求头
        $lang = $request->header('X-Language');
        if ($lang) {
            return $this->normalizeLangCode($lang);
        }

        // 其次读取 cb-lang（本系统前端使用）
        $lang = $request->header('cb-lang');
        if ($lang) {
            return $this->normalizeLangCode($lang);
        }

        // 最后读取 Accept-Language
        $acceptLang = $request->header('accept-language');
        if ($acceptLang) {
            $parts = explode(',', $acceptLang);
            return $this->normalizeLangCode(trim($parts[0]));
        }

        return self::DEFAULT_LANG;
    }

    /**
     * 标准化语言代码
     *
     * @access private
     * @param string $lang 原始语言代码
     * @return string 标准化后的语言代码
     */
    private function normalizeLangCode(string $lang): string
    {
        $lang = strtolower(str_replace('_', '-', $lang));
        $map = [
            'zh'      => 'zh-CN',
            'zh-cn'   => 'zh-CN',
            'zh-hans' => 'zh-CN',
            'en'      => 'en-US',
            'en-us'   => 'en-US',
            'en-gb'   => 'en-US',
            'ja'      => 'ja-JP',
            'jp'      => 'ja-JP',
            'ko'      => 'ko-KR',
            'kr'      => 'ko-KR',
        ];
        return $map[$lang] ?? $lang;
    }

    /**
     * 构建缓存键
     *
     * @access private
     * @param string $message  中文提示词
     * @param string $langCode 语言代码
     * @param string $module   模块标识
     * @return string 缓存键
     */
    private function buildCacheKey(string $message, string $langCode, string $module = ''): string
    {
        $key = self::CACHE_PREFIX . $langCode . ':' . md5($message);
        if ($module) {
            $key .= ':' . $module;
        }
        return $key;
    }

    /**
     * 清除翻译缓存
     *
     * @access public
     * @param string $message  中文提示词（可选，为空则清除所有）
     * @param string $langCode 语言代码（可选）
     * @param string $module   模块标识（可选）
     * @return void
     */
    public function clearCache(string $message = '', string $langCode = '', string $module = ''): void
    {
        if ($message && $langCode) {
            $cacheKey = $this->buildCacheKey($message, $langCode, $module);
            Cache::delete($cacheKey);
        } else {
            // 清除所有 API 消息缓存
            // 注意：这里假设使用支持标签或前缀删除的缓存驱动
            Cache::tag('api_msg')->clear();
        }
    }
}
