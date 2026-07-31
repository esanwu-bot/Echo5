<?php
/**
 * Plugin Name: Hutian Dev – WC REST Basic Auth over HTTP
 * Description: dev only · 让 WooCommerce REST API 在 HTTP 下也接受 ck/cs Basic Auth
 *              （WC 11.x 默认仅 HTTPS 接受 Basic Auth，dev 环境 PHP 内置服务器无 SSL）
 *              生产环境必须用真 HTTPS，禁用此 mu-plugin。
 *
 * 原理：WC 11.x 的 WC_REST_Authentication::authenticate() 注册在 determine_current_user
 *       priority=15。本插件 priority=14 先跑，从 PHP_AUTH_USER/PW 解析 ck/cs，查
 *       woocommerce_api_keys 表验证，匹配则返回 user_id，让 WC 跳过自己的鉴权。
 *
 * 仅当以下条件全满足才生效：
 *   1. 是 REST 请求（rest_request 判断）
 *   2. 请求路径含 /wc/v
 *   3. PHP_AUTH_USER 以 ck_ 开头（WC API key 标识）
 *   4. DB 查到匹配的 key 且 secret 验证通过
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('determine_current_user', 'hutian_dev_wc_basic_auth_over_http', 14);

function hutian_dev_wc_basic_auth_over_http($user_id) {
    // 已鉴权 → 跳过
    if ($user_id) {
        return $user_id;
    }

    // 仅 REST 请求
    if (!defined('REST_REQUEST') || !REST_REQUEST) {
        return $user_id;
    }

    // 取 Basic Auth 头
    $ck = isset($_SERVER['PHP_AUTH_USER']) ? $_SERVER['PHP_AUTH_USER'] : '';
    $cs = isset($_SERVER['PHP_AUTH_PW'])   ? $_SERVER['PHP_AUTH_PW']   : '';

    if (empty($ck) || empty($cs) || strpos($ck, 'ck_') !== 0) {
        return $user_id;
    }

    // 查 woocommerce_api_keys 表
    global $wpdb;
    $table = $wpdb->prefix . 'woocommerce_api_keys';

    // WC 存储的是 consumer_key 的 hash，用 wc_api_hash() 算
    $hashed_key = function_exists('wc_api_hash') ? wc_api_hash($ck) : hash('md5', $ck);

    $row = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT user_id, consumer_secret, permissions FROM {$table} WHERE consumer_key = %s LIMIT 1",
            $hashed_key
        ),
        ARRAY_A
    );

    if (!$row) {
        return $user_id;
    }

    // 验证 secret（WC 11.x 明文存）
    if (!hash_equals($row['consumer_secret'], $cs)) {
        return $user_id;
    }

    // 用 WC API key 的 user_id 作为当前用户
    $new_user_id = (int) $row['user_id'];

    // 把 user 拉成 WP_User，确保后续 current_user_can 正确
    $u = get_userdata($new_user_id);
    if ($u && $u->exists()) {
        // 标记 dev auth method（供日志/调试）
        if (!defined('HUTIAN_DEV_AUTH_METHOD')) {
            define('HUTIAN_DEV_AUTH_METHOD', 'basic-over-http');
        }
        return $new_user_id;
    }

    return $user_id;
}
