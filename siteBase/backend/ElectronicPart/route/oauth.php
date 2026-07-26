<?php
use think\facade\Route;

// OAuth2认证路由
Route::group('oauth', function () {
    // 获取授权码
    Route::get('authorize', 'oauth.AuthController/authorize');
    
    // 获取访问令牌
    Route::post('token', 'oauth.AuthController/token');
    
    // 撤销令牌
    Route::post('revoke', 'oauth.AuthController/revoke');
    
    // 获取客户端信息
    Route::get('client', 'oauth.AuthController/clientInfo');
});