<?php
/**
 * 天启芯科技 - 多语言中间件
 * 更新为 CRMEB 风格：检测 cb-lang 请求头 → Accept-Language → 默认 zh
 * 设置 request->lang 供控制器使用
 */
namespace app\middleware;

use app\service\system\lang\LangTypeService;
use app\service\system\lang\LangCountryService;
use think\facade\Log;

class LanguageMiddleware
{
    public function handle($request, \Closure $next)
    {
        try {
            // ① 优先取请求头 cb-lang（前端主动指定）
            $lang = $request->header('cb-lang');

            // ② 若无，取默认语言
            if (empty($lang)) {
                /** @var LangTypeService $typeService */
                $typeService = app()->make(LangTypeService::class);
                $lang = $typeService->getDefaultFileName();
            }

            // ③ 若无，取浏览器 Accept-Language
            if (empty($lang)) {
                $acceptLang = $request->header('accept-language');
                if ($acceptLang) {
                    $lang = trim(explode(',', $acceptLang)[0]);
                }
            }

            // ④ 兜底中文
            if (empty($lang)) {
                $lang = 'zh-CN';
            }

            // 提取短语言码（如 zh-CN → zh，en-US → en）
            $shortLang = explode('-', $lang)[0];

            // 设置到请求对象
            $request->lang = $shortLang;
            $request->langFile = $lang;

        } catch (\Throwable $e) {
            Log::error('LanguageMiddleware error: ' . $e->getMessage());
            $request->lang = 'zh';
            $request->langFile = 'zh-CN';
        }

        return $next($request);
    }
}
