<?php
/**
 * 电子元器件商城 - 语言/翻译管理接口
 * 文件说明：提供语言列表、默认语言及翻译字典查询，用于前端国际化支持。
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkTranslation;
use app\model\system\lang\LangType;
use think\facade\Cache;
use think\Request;
use think\Response;
use think\facade\Log;

class LanguageController extends BaseController
{
    /**
     * 短语言码 → 完整语言码映射（兼容前端 i18next 的 supportedLngs）
     */
    private function resolveLangCode(string $langCode): string
    {
        $map = [
            'zh' => 'zh-CN',
            'en' => 'en-US',
            'ja' => 'ja-JP',
            'ko' => 'ko-KR',
        ];
        return $map[$langCode] ?? $langCode;
    }

    /**
     * 获取所有启用的语言
     * GET /api/v1/languages
     */
    public function index()
    {
        try {
            $cacheKey = 'api_languages_active';
            $languages = Cache::get($cacheKey);
            
            if (!$languages) {
                $rows = LangType::active()
                    ->field('id, file_name, language_name, is_default')
                    ->order('is_default DESC, id ASC')
                    ->select()
                    ->toArray();

                $languages = array_map(function ($item) {
                    return [
                        'id'         => (int)$item['id'],
                        'lang_code'  => $item['file_name'],
                        'lang_name'  => $item['language_name'],
                        'is_default' => (int)$item['is_default'],
                    ];
                }, $rows);

                Cache::set($cacheKey, $languages, 3600);
            }
            
            return $this->success($languages, '成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 根据代码获取语言
     * GET /api/v1/languages/:code
     */
    public function read($code)
    {
        try {
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'language_read_' . $code . '_' . $lang;
            
            $data = Cache::remember($cacheKey, function() use ($code) {
                $resolvedCode = $this->resolveLangCode($code);
                $language = LangType::active()
                    ->where('file_name', $resolvedCode)
                    ->field('id, file_name, language_name, is_default')
                    ->find();

                if (!$language) {
                    return null;
                }

                return [
                    'id'         => (int)$language->id,
                    'lang_code'  => $language->file_name,
                    'lang_name'  => $language->language_name,
                    'is_default' => (int)$language->is_default,
                ];
            }, 3600);
            
            if (!$data) {
                return $this->error('语言不存在', 404);
            }
            
            return $this->success($data, '成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取默认语言
     * GET /api/v1/languages/default
     */
    public function default()
    {
        try {
            // 默认语言全局唯一，缓存键不随请求语言变化
            $cacheKey = 'language_default';

            $data = Cache::remember($cacheKey, function() {
                $language = LangType::active()
                    ->where('is_default', 1)
                    ->field('id, file_name, language_name, is_default')
                    ->find();

                if (!$language) {
                    $language = LangType::active()
                        ->field('id, file_name, language_name, is_default')
                        ->order('id ASC')
                        ->find();
                }

                if (!$language) {
                    return null;
                }

                return [
                    'id'         => (int)$language->id,
                    'lang_code'  => $language->file_name,
                    'lang_name'  => $language->language_name,
                    'is_default' => (int)$language->is_default,
                ];
            }, 3600);
            
            if (!$data) {
                return $this->error('没有可用的语言', 404);
            }
            
            return $this->success($data, '成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取语言的翻译
     * GET /api/v1/translations/:lang_code
     */
    public function translations(Request $request, $langCode): Response
    {
        try {
            $resolvedCode = $this->resolveLangCode($langCode);
            // 语言类型表使用完整码（file_name），翻译表使用完整码
            $language = LangType::active()
                ->where('file_name', $resolvedCode)
                ->find();
            
            if (!$language) {
                return $this->error('语言不存在', 404);
            }
            
            $cacheKey = 'api_translations_' . $resolvedCode;
            $translations = Cache::get($cacheKey);
            
            if (!$translations) {
                $translationRecords = SkTranslation::where('lang_code', $resolvedCode)
                    ->field('trans_key, trans_value')
                    ->select();
                
                $translations = [];
                foreach ($translationRecords as $record) {
                    $translations[$record->trans_key] = $record->trans_value;
                }
                
                Cache::set($cacheKey, $translations, 7200);
            }
            
            return $this->success($translations, '成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}