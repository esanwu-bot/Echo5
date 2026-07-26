<?php
// +----------------------------------------------------------------------
// | 应用设置
// +----------------------------------------------------------------------

return [
    // 应用地址
    'app_host'         => env('app.host', ''),
    // 应用的命名空间
    'app_namespace'    => '',
    // 是否启用路由
    'with_route'       => true,
    // 默认应用
    'default_app'      => 'index',
    // 默认时区
    'default_timezone' => 'Asia/Shanghai',

    // 应用调试模式
    'app_debug'        => (bool) env('app_debug', false),

    // 应用映射（自动多应用模式有效）
    'app_map'          => [],
    // 域名绑定（自动多应用模式有效）
    'domain_bind'      => [],
    // 禁止URL访问的应用列表（自动多应用模式有效）
    'deny_app_list'    => [],

    // 异常页面的模板文件
    'exception_tmpl'   => app()->getThinkPath() . 'tpl/think_exception.tpl',

    // 错误显示信息,非调试模式有效
    'error_message'    => '页面错误！请稍后再试～',
    // 显示错误信息
    'show_error_msg'   => false,

    // JWT配置（统一使用 JWT_KEY 环境变量，与 config/jwt.php 一致）
    'jwt_key'          => env('JWT_KEY', null),
    'jwt_expire'       => env('JWT_EXPIRE', 86400 * 30), // 30天
    'jwt_issuer'       => env('JWT_ISSUER', 'semiconductor-api'),
    'jwt_audience'     => env('JWT_AUDIENCE', 'semiconductor-client'),

    // 短信配置
    'sms_provider'     => env('sms.provider', 'aliyun'),
    'sms_access_key'   => env('sms.access_key', ''),
    'sms_access_secret' => env('sms.access_secret', ''),
    'sms_sign_name'    => env('sms.sign_name', '天启芯'),
    'sms_template_code' => env('sms.template_code', 'SMS_123456789'),

    // 微信小程序配置
    'wechat_appid'     => env('wechat.appid', ''),
    'wechat_secret'    => env('wechat.secret', ''),
];
