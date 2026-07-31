<?php
/**
 * Plugin Name: Hutian Dev - WP/WC REST Basic Auth over HTTP
 * Description: dev only. WP REST (posts/media) + WooCommerce REST Basic Auth over HTTP.
 *              Production must use real HTTPS, disable this mu-plugin.
 */
if (!defined('ABSPATH')) { exit; }

add_filter('determine_current_user', 'hutian_dev_rest_basic_auth_over_http', 14);

function hutian_dev_rest_basic_auth_over_http($user_id) {
    if ($user_id) { return $user_id; }
    if (!defined('REST_REQUEST') || !REST_REQUEST) { return $user_id; }

    $bu = isset($_SERVER['PHP_AUTH_USER']) ? $_SERVER['PHP_AUTH_USER'] : '';
    $bp = isset($_SERVER['PHP_AUTH_PW'])   ? $_SERVER['PHP_AUTH_PW']   : '';
    if (empty($bu) || empty($bp)) { return $user_id; }

    global $wpdb;

    // Branch 1: WooCommerce API key (ck_/cs_)
    if (strpos($bu, 'ck_') === 0) {
        $table = $wpdb->prefix . 'woocommerce_api_keys';
        $hashed_key = function_exists('wc_api_hash') ? wc_api_hash($bu) : hash_hmac('sha256', $bu, 'wc-api');
        $row = $wpdb->get_row($wpdb->prepare("SELECT user_id, consumer_secret FROM {$table} WHERE consumer_key = %s LIMIT 1", $hashed_key), ARRAY_A);
        if ($row && hash_equals($row['consumer_secret'], $bp)) {
            $uid = (int) $row['user_id'];
            $u = get_userdata($uid);
            if ($u && $u->exists()) {
                if (!defined('HUTIAN_DEV_AUTH_METHOD')) { define('HUTIAN_DEV_AUTH_METHOD', 'wc-api-key'); }
                return $uid;
            }
        }
        return $user_id;
    }

    // Branch 2: WP dev Application Password (user_login:dev_token)
    if (defined('HUTIAN_DEV_APP_PASSWORD') && HUTIAN_DEV_APP_PASSWORD) {
        $user = get_user_by('login', $bu);
        if ($user && $user->exists() && hash_equals(HUTIAN_DEV_APP_PASSWORD, $bp)) {
            if (!defined('HUTIAN_DEV_AUTH_METHOD')) { define('HUTIAN_DEV_AUTH_METHOD', 'dev-app-password'); }
            return $user->ID;
        }
    }

    return $user_id;
}
