<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006~2018 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: liu21st <liu21st@gmail.com>
// +----------------------------------------------------------------------
use think\facade\Route;

// 加载前台 API 路由定义
require __DIR__ . '/api.php';

// 后台管理路由统一加 /api 前缀，适配 admin 前端请求
Route::group('api', function () {
    require __DIR__ . '/admin.php';
    require __DIR__ . '/dictionary.php';
    require __DIR__ . '/oauth.php';
});

Route::get('think', function () {
    return 'hello,ThinkPHP6!';
});



