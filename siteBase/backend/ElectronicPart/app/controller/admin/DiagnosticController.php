<?php
/**
 * 电子元器件商城 - 诊断控制器
 * 文件说明：用于调试和诊断系统问题
 */

namespace app\controller\admin;

use app\BaseController;
use think\Request;
use think\facade\Config;
use think\facade\Env;
use think\facade\Log;

class DiagnosticController extends BaseController
{
    /**
     * 检查 JWT 配置
     */
    public function jwtConfig(Request $request)
    {
        // 只允许本地或开发环境访问
        $ip = $request->ip();
        if (!in_array($ip, ['127.0.0.1', 'localhost', '::1'])) {
            return json(['code' => 403, 'message' => 'Forbidden'], 403);
        }

        $config = [
            'key' => substr(Config::get('jwt.key'), 0, 10) . '... (masked)',
            'key_length' => strlen(Config::get('jwt.key')),
            'expire' => Config::get('jwt.expire'),
            'issuer' => Config::get('jwt.issuer'),
            'audience' => Config::get('jwt.audience'),
        ];

        $env = [
            'JWT_KEY' => substr(Env::get('JWT_KEY', 'NOT_SET'), 0, 10) . '...',
            'JWT_EXPIRE' => Env::get('JWT_EXPIRE', 'NOT_SET'),
            'JWT_ISSUER' => Env::get('JWT_ISSUER', 'NOT_SET'),
            'JWT_AUDIENCE' => Env::get('JWT_AUDIENCE', 'NOT_SET'),
        ];

        return json([
            'code' => 200,
            'message' => 'JWT Config',
            'data' => [
                'runtime_config' => $config,
                'env_values' => $env,
                'env_file_exists' => file_exists(root_path() . '.env'),
            ]
        ]);
    }

    /**
     * 解析并验证 Token
     */
    public function validateToken(Request $request)
    {
        // 只允许本地或开发环境访问
        $ip = $request->ip();
        if (!in_array($ip, ['127.0.0.1', 'localhost', '::1'])) {
            return json(['code' => 403, 'message' => 'Forbidden'], 403);
        }

        $token = $request->param('token');
        if (!$token) {
            return json(['code' => 400, 'message' => 'Token required'], 400);
        }

        try {
            $key = Config::get('jwt.key');
            $issuer = Config::get('jwt.issuer');
            $audience = Config::get('jwt.audience');

            // 手动解码（不验证签名）
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return json(['code' => 400, 'message' => 'Invalid token format'], 400);
            }

            $header = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0])), true);
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);

            $result = [
                'decoded_header' => $header,
                'decoded_payload' => $payload,
                'runtime_issuer' => $issuer,
                'runtime_audience' => $audience,
                'issuer_match' => ($payload['iss'] ?? null) === $issuer,
                'audience_match' => ($payload['aud'] ?? null) === $audience,
                'is_expired' => isset($payload['exp']) ? time() > $payload['exp'] : null,
                'exp_time' => isset($payload['exp']) ? date('Y-m-d H:i:s', $payload['exp']) : null,
            ];

            return json([
                'code' => 200,
                'message' => 'Token analysis',
                'data' => $result
            ]);

        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '服务器内部错误，请稍后重试',
            ], 500);
        }
    }
}
