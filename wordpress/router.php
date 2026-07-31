<?php
/**
 * WordPress PHP 内置服务器 router
 *
 * 用法：php -S 0.0.0.0:8001 -t . router.php
 *
 * 规则：
 *   - 静态文件（.css/.js/.png/.jpg/.gif/.ico/.woff/.woff2/.ttf/.svg/.eot）
 *     直接返回，由 PHP 内置服务器处理（return false）
 *   - 已存在的 PHP 文件（wp-login.php / wp-admin/*.php / wp-cron.php 等）
 *     直接返回，由内置服务器执行
 *   - 其他所有请求（pretty permalink / REST API / wp-admin 子路由）
 *     转交 index.php 入口
 */

$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

if ($uri !== '/' && is_file($file)) {
    // 已存在的实际文件（含 wp-login.php / wp-admin/*.php）
    // 让 PHP 内置服务器按原路径执行
    return false;
}

// pretty permalink / REST API / 任何虚拟路径 → 走 WP 入口
require __DIR__ . '/index.php';
