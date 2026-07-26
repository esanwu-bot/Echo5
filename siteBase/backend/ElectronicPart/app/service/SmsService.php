<?php
/**
 * 电子元器件商城 - 短信服务
 * 文件说明：封装短信发送与验证码管理（频率控制、缓存、验证），用于注册/登录及通知场景。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service;

use think\facade\Config;
use think\facade\Cache;
use think\exception\ValidateException;

class SmsService
{
    /**
     * 发送短信验证码
     * @param string $phone 手机号
     * @return bool
     * @throws ValidateException
     */
    public static function sendCode(string $phone): bool
    {
        // 验证手机号格式
        if (!self::validatePhone($phone)) {
            throw new ValidateException('Invalid phone number format');
        }
        
        // 检查发送频率限制
        if (self::isRateLimited($phone)) {
            throw new ValidateException('SMS sending too frequently, please try again later');
        }
        
        // 生成验证码
        $code = self::generateCode();
        
        // 存储验证码到缓存
        self::storeCode($phone, $code);
        
        // 发送短信
        return self::sendSms($phone, $code);
    }
    
    /**
     * 验证短信验证码
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return bool
     */
    public static function verifyCode(string $phone, string $code): bool
    {
        $cacheKey = "sms_code:{$phone}";
        $storedCode = Cache::get($cacheKey);
        
        if (!$storedCode || $storedCode !== $code) {
            return false;
        }
        
        // 验证成功后删除验证码
        Cache::delete($cacheKey);
        
        return true;
    }
    
    /**
     * 验证手机号格式
     * @param string $phone 手机号
     * @return bool
     */
    private static function validatePhone(string $phone): bool
    {
        return preg_match('/^1[3-9]\d{9}$/', $phone);
    }
    
    /**
     * 检查发送频率限制
     * @param string $phone 手机号
     * @return bool
     */
    private static function isRateLimited(string $phone): bool
    {
        $rateLimitKey = "sms_rate_limit:{$phone}";
        $lastSendTime = Cache::get($rateLimitKey);
        
        if ($lastSendTime && (time() - $lastSendTime) < 60) {
            return true; // 1分钟内只能发送一次
        }
        
        return false;
    }
    
    /**
     * 生成验证码
     * @return string
     */
    private static function generateCode(): string
    {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    /**
     * 存储验证码到缓存
     * @param string $phone 手机号
     * @param string $code 验证码
     */
    private static function storeCode(string $phone, string $code): void
    {
        $cacheKey = "sms_code:{$phone}";
        Cache::set($cacheKey, $code, 300); // 5分钟有效期
        
        // 设置发送频率限制
        $rateLimitKey = "sms_rate_limit:{$phone}";
        Cache::set($rateLimitKey, time(), 60); // 1分钟限制
    }
    
    /**
     * 发送短信
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return bool
     */
    private static function sendSms(string $phone, string $code): bool
    {
        $provider = Config::get('app.sms_provider', 'mock');
        
        switch ($provider) {
            case 'aliyun':
                return self::sendAliyunSms($phone, $code);
            case 'tencent':
                return self::sendTencentSms($phone, $code);
            default:
                // 开发环境使用模拟发送
                return self::mockSendSms($phone, $code);
        }
    }
    
    /**
     * 阿里云短信发送
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return bool
     */
    private static function sendAliyunSms(string $phone, string $code): bool
    {
        // TODO: 集成阿里云短信SDK
        // 这里需要根据阿里云短信服务的SDK进行实现
        
        $accessKey = Config::get('app.sms_access_key');
        $accessSecret = Config::get('app.sms_access_secret');
        $signName = Config::get('app.sms_sign_name');
        $templateCode = Config::get('app.sms_template_code');
        
        if (empty($accessKey) || empty($accessSecret)) {
            // 配置不完整，使用模拟发送
            return self::mockSendSms($phone, $code);
        }
        
        // 实际的阿里云短信发送逻辑
        // ...
        
        return true;
    }
    
    /**
     * 腾讯云短信发送
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return bool
     */
    private static function sendTencentSms(string $phone, string $code): bool
    {
        // TODO: 集成腾讯云短信SDK
        return self::mockSendSms($phone, $code);
    }
    
    /**
     * 模拟短信发送（开发环境使用）
     * @param string $phone 手机号
     * @param string $code 验证码
     * @return bool
     */
    private static function mockSendSms(string $phone, string $code): bool
    {
        // 开发环境仅记录发送动作，不记录验证码明文
        Log::info("Mock SMS sent - Phone: {$phone}");

        return true;
    }
}