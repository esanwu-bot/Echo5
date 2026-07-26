<?php
/**
 * 电子元器件商城 - 翻译配置管理（后台）
 * 文件说明：提供火山引擎翻译 API 的 Access Key 配置接口，保存时写入 .env 文件
 */

namespace app\controller\admin;

use app\controller\BaseController;
use think\facade\Env;
use think\facade\Log;

class TranslateConfigController extends BaseController
{
    /**
     * 获取火山引擎API配置
     * 获取翻译配置 (GET /admin/translate-config)
     */
    public function index()
    {
        try {
            $accessKeyId = Env::get('VOLC_ACCESS_KEY_ID', '');
            $secretKey = Env::get('VOLC_SECRET_ACCESS_KEY', '');

            return $this->success([
                'volc_access_key_id' => $this->maskKey($accessKeyId),
                'volc_secret_access_key' => $this->maskKey($secretKey),
                'is_configured' => !empty($accessKeyId) && !empty($secretKey),
                'config_time' => '',
            ]);

        } catch (\Exception $e) {
            $this->logError('Get translate config error: ' . $e->getMessage());
            return $this->error('获取配置失败');
        }
    }

    /**
     * 更新火山引擎API配置（写入.env）
     * 更新翻译配置 (PUT /admin/translate-config)
     */
    public function update()
    {
        try {
            $data = $this->request->put();

            // 验证
            $this->validate($data, [
                'volc_access_key_id' => 'require',
                'volc_secret_access_key' => 'require',
            ], [
                'volc_access_key_id.require' => 'Access Key ID 不能为空',
                'volc_secret_access_key.require' => 'Secret Access Key 不能为空',
            ]);

            $envFile = app()->getRootPath() . '.env';

            // 更新.env文件
            $this->updateEnvFile($envFile, [
                'VOLC_ACCESS_KEY_ID' => trim($data['volc_access_key_id']),
                'VOLC_SECRET_ACCESS_KEY' => trim($data['volc_secret_access_key']),
            ]);

            return $this->success([], '配置保存成功');

        } catch (\Exception $e) {
            $this->logError('Update translate config error: ' . $e->getMessage());
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 脱敏密钥
     */
    private function maskKey(string $key): string
    {
        if (empty($key)) {
            return '';
        }
        $len = strlen($key);
        if ($len <= 8) {
            return '***';
        }
        return substr($key, 0, 4) . str_repeat('*', $len - 8) . substr($key, -4);
    }

    /**
     * 更新.env文件值
     */
    private function updateEnvFile(string $envFile, array $updates): void
    {
        if (!file_exists($envFile)) {
            throw new \Exception('.env file not found');
        }

        $content = file_get_contents($envFile);
        $lines = explode("\n", $content);
        $updatedKeys = [];

        foreach ($lines as &$line) {
            $trimmed = trim($line);
            foreach ($updates as $key => $value) {
                if (preg_match('/^' . preg_quote($key, '/') . '\s*=/', $trimmed)) {
                    $indent = substr($line, 0, strpos($line, $trimmed));
                    $comment = '';
                    // 保留行内注释（如有）
                    if (preg_match('/\s+#.*$/', $trimmed, $m)) {
                        $comment = $m[0];
                    }
                    $line = $indent . $key . ' = ' . $value . $comment;
                    $updatedKeys[$key] = true;
                }
            }
        }
        unset($line);

        // 添加缺失的键
        foreach ($updates as $key => $value) {
            if (!isset($updatedKeys[$key])) {
                $lines[] = $key . ' = ' . $value;
            }
        }

        file_put_contents($envFile, implode("\n", $lines));
    }
}
