<?php
/**
 * CORS 跨域配置
 *
 * 白名单合并策略：
 * - 默认包含 localhost 开发域名
 * - 生产环境域名通过 .env 的 CORS_ALLOWED_ORIGINS 配置（逗号分隔）
 * - 实际合并后的完整白名单 = 默认值 + 环境变量值
 */

function cors_allowed_origins(): array
{
    $defaults = [
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    $envOrigins = env('CORS_ALLOWED_ORIGINS', '');
    if (!empty($envOrigins)) {
        $parsed = array_map('trim', explode(',', $envOrigins));
        $merged = array_merge($defaults, $parsed);
        return array_values(array_unique($merged));
    }
    return $defaults;
}

return [
    // 允许的源（白名单）- 合并默认值与环境变量中的生产域名
    'allowed_origins' => cors_allowed_origins(),

    // 允许的HTTP方法
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

    // 允许的请求头
    'allowed_headers' => [
        'Origin', 'Content-Type', 'Cookie', 'X-CSRF-TOKEN',
        'Accept', 'Authorization', 'Token', 'X-Requested-With',
        'Accept-Language', 'cb-lang', 'X-Session-Id', 'X-Visitor-Id',
    ],

    // 暴露的响应头
    'exposed_headers' => ['Authorization', 'Token'],

    // 是否允许携带凭证（cookies）
    'supports_credentials' => true,

    // 预检请求缓存时间（秒）
    'max_age' => 1728000,
];
