<?php
/**
 * 电子元器件商城 - 邮件服务
 * 文件说明：封装邮件发送功能（SMTP/第三方），用于通知、注册与订单邮件。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class MailService
{
    protected $mail;
    protected $config;
    
    public function __construct()
    {
        $this->mail = new PHPMailer(true);
        $this->config = [
            'type' => env('MAIL_TYPE', 'smtp'),
            'host' => env('MAIL_SMTP_HOST', ''),
            'port' => env('MAIL_SMTP_PORT', 587),
            'user' => env('MAIL_SMTP_USER', ''),
            'pass' => env('MAIL_SMTP_PASS', ''),
            'from_email' => env('MAIL_FROM_EMAIL', ''),
            'from_name' => env('MAIL_FROM_NAME', '酒水商城'),
        ];
    }
    
    public function sendEmail(string $to, string $subject, string $body): bool
    {
        try {
            $this->mail->isSMTP();
            $this->mail->Host = $this->config['host'];
            $this->mail->SMTPAuth = true;
            $this->mail->Username = $this->config['user'];
            $this->mail->Password = $this->config['pass'];
            $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mail->Port = $this->config['port'];
            $this->mail->CharSet = 'UTF-8';
            
            $this->mail->setFrom($this->config['from_email'], $this->config['from_name']);
            $this->mail->addAddress($to);
            $this->mail->isHTML(true);
            $this->mail->Subject = $subject;
            $this->mail->Body = $body;
            $this->mail->AltBody = strip_tags($body);
            
            $this->mail->send();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}