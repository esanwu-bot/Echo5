<?php
// 全局中间件定义文件
return [
    // CORS跨域中间件
    \app\middleware\Cors::class,
    // 请求日志中间件
    \app\middleware\RequestLog::class,
    // 多语言中间件
    \app\middleware\LanguageMiddleware::class,
    // 入参自动 Trim 中间件（递归去除所有 string 入参首尾空格）
    \app\middleware\InputSanitize::class,
    // 全局请求缓存
    // \think\middleware\CheckRequestCache::class,
    // 多语言加载（ThinkPHP 内置，加载 PHP 语言包）
    \think\middleware\LoadLangPack::class,
    // Session初始化
    // \think\middleware\SessionInit::class
];
