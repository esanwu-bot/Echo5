<?php
/**
 * 电子元器件商城 - 定时任务控制器
 * 文件说明：提供宝塔等面板配置的定时任务API接口，包括规格摘要缓存刷新等。
 * 安全机制：通过 cron_secret 配置项进行密钥验证。
 */

namespace app\controller\api;

use app\controller\BaseController;
use think\facade\Log;
use think\facade\Config;

class CronController extends BaseController
{
    /**
     * 验证定时任务密钥
     *
     * @access protected
     * @return bool
     */
    protected function validateSecret(): bool
    {
        $secret = Config::get('cron.secret', '');
        if (empty($secret)) {
            Log::warning('定时任务密钥未配置，请在 config/cron.php 中设置 secret');
            return false;
        }

        $requestSecret = $this->request->param('secret', '');
        if (empty($requestSecret)) {
            $requestSecret = $this->request->header('X-Cron-Secret', '');
        }

        if (empty($requestSecret) || $requestSecret !== $secret) {
            Log::warning('定时任务密钥验证失败，IP: ' . $this->request->ip());
            return false;
        }

        return true;
    }

    /**
     * 刷新规格摘要缓存（供宝塔定时任务调用）
     * GET /api/v1/cron/refresh-spec-summary?secret=xxx
     *
     * @access public
     * @return \think\response\Json
     */
    public function refreshSpecSummary()
    {
        if (!$this->validateSecret()) {
            return $this->error('密钥验证失败', 403);
        }

        $startTime = microtime(true);

        try {
            $command = new \app\command\RefreshSpecSummaryCommand();
            $input = new \think\console\Input();
            $output = new \think\console\Output();

            ob_start();
            $exitCode = $command->run($input, $output);
            $log = ob_get_clean();

            $duration = round(microtime(true) - $startTime, 2);

            Log::info("定时任务：刷新spec_summary完成，退出码:{$exitCode}，耗时:{$duration}秒");

            return $this->success([
                'exit_code' => $exitCode,
                'duration'  => $duration,
                'log'       => $log,
            ], '规格摘要缓存刷新完成');
        } catch (\Exception $e) {
            $duration = round(microtime(true) - $startTime, 2);
            Log::error('定时任务：刷新spec_summary失败: ' . $e->getMessage());

            return $this->error('刷新失败：' . $e->getMessage(), 500);
        }
    }
}
