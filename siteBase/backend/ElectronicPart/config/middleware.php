<?php
// 中间件配置
return [
    // 别名或分组
    'alias'    => [
        'cors' => app\middleware\Cors::class,
        'auth' => app\middleware\AuthMiddleware::class,
        'admin_auth' => app\middleware\AdminAuthMiddleware::class,
        'agent_auth'  => app\middleware\AgentAuthMiddleware::class,
        'oauth2'      => app\middleware\OAuth2Middleware::class,
        'rate_limit'  => app\middleware\RateLimitMiddleware::class,
    ],
    // 优先级设置，此数组中的中间件会按照数组中的顺序优先执行
    'priority' => [],
];
