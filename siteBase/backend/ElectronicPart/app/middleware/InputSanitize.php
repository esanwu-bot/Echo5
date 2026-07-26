<?php
/**
 * 天启芯科技 - 入参自动 Trim 中间件
 *
 * 对所有 HTTP 请求的 string 类型入参递归执行 trim()，去除首尾空格。
 * 排除密码类敏感字段（不做 trim），确保全局一致、不再遗漏。
 *
 * 执行时机：LanguageMiddleware 之后，Controller 之前
 *
 * @package app\middleware
 */
namespace app\middleware;

use think\facade\Log;

class InputSanitize
{
    /**
     * 不做 trim 的字段名集合（密码、密钥类）
     * 密码可能以空格开头/结尾，trim 会改变用户意图
     */
    protected const SKIP_FIELDS = [
        'password',
        'old_password',
        'new_password',
        'confirm_password',
        'secret',
        'client_secret',
        'api_key',
        'token',
        'access_token',
        'refresh_token',
    ];

    /**
     * 中间件入口
     *
     * 设计要点：
     * - 本中间件位于 Pipeline 最前端（Cors→RequestLog→Language→InputSanitize→...）
     * - TP6 的 param() 会缓存合并结果到 $mergeParam 属性
     * - 由于前序中间件均不调用 param()，当 Controller 首次调用 param() 时，
     *   TP6 会从当前 GET/POST/Route 重建合并数组，自动得到已消毒的干净数据
     */
    public function handle($request, \Closure $next)
    {
        try {
            // 1. 消毒 GET 参数（查询字符串）
            $get = $request->get();
            if (is_array($get)) {
                $get = $this->recursiveTrim($get);
                $request->withGet($get);
            }

            // 2. 消毒 POST 参数（表单/JSON body）
            $post = $request->post();
            if (is_array($post)) {
                $post = $this->recursiveTrim($post);
                $request->withPost($post);
            }

            // 3. 消毒 route 参数（路径参数，如 /product/:id）
            //    路径参数通常不含空格，但为完整性覆盖
            $route = $request->route();
            if (is_array($route)) {
                $request->withRoute($this->recursiveTrim($route));
            }

        } catch (\Throwable $e) {
            // 消毒失败不应阻断请求，静默降级
            Log::warning('InputSanitize middleware error: ' . $e->getMessage());
        }

        return $next($request);
    }

    /**
     * 递归 trim 数组中的全部字符串值
     *
     * @param array $data 待消毒数据
     * @return array
     */
    private function recursiveTrim(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // 跳过密码/密钥类字段
                if (!in_array((string)$key, self::SKIP_FIELDS, true)) {
                    $trimmed = trim($value);
                    // 仅在确实发生变化时才赋值（减少不必要的引用变更）
                    if ($trimmed !== $value) {
                        $data[$key] = $trimmed;
                    }
                }
            } elseif (is_array($value)) {
                $data[$key] = $this->recursiveTrim($value);
            }
            // 其他类型（int/float/bool/null）保持原样
        }
        return $data;
    }
}
