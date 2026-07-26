<?php
/**
 * 电子元器件商城 - 支付服务
 * 文件说明：处理与第三方支付平台的交互（微信、支付宝等），并维护支付记录。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */
declare(strict_types=1);

namespace app\service;

use app\model\Order;
use app\model\Payment;
use think\facade\Config;
use think\facade\Log;
use think\Exception;

/**
 * 支付服务类
 */
class PaymentService
{
    /**
     * 创建微信支付订单
     *
     * @param Order $order 订单对象
     * @param array $params 支付参数
     * @return array
     * @throws Exception
     */
    public function createWechatPayment(Order $order, array $params = []): array
    {
        try {
            $config = Config::get('app.wechat');
            
            if (empty($config['app_id']) || empty($config['mch_id'])) {
                throw new Exception('微信支付配置不完整');
            }
            
            // 创建支付记录
            $payment = Payment::create([
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'payment_method' => Payment::METHOD_WECHAT,
                'amount' => $order->total_amount,
                'status' => Payment::STATUS_PENDING,
                'created_at' => time()
            ]);
            
            // 构建微信支付参数
            $paymentData = [
                'appid' => $config['app_id'],
                'mch_id' => $config['mch_id'],
                'nonce_str' => $this->generateNonceStr(),
                'body' => '酒水商城-订单支付',
                'out_trade_no' => $payment->payment_no,
                'total_fee' => (int)($order->total_amount * 100), // 转换为分
                'spbill_create_ip' => request()->ip(),
                'notify_url' => url('api/payment/notify/wechat', [], false, true),
                'trade_type' => $params['trade_type'] ?? 'JSAPI',
                'openid' => $params['openid'] ?? ''
            ];
            
            // 生成签名
            $paymentData['sign'] = $this->generateWechatSign($paymentData, $config['key']);
            
            // 调用微信统一下单接口
            $result = $this->callWechatApi('https://api.mch.weixin.qq.com/pay/unifiedorder', $paymentData);
            
            if ($result['return_code'] !== 'SUCCESS' || $result['result_code'] !== 'SUCCESS') {
                throw new Exception('微信支付下单失败: ' . ($result['err_code_des'] ?? $result['return_msg']));
            }
            
            // 更新支付记录
            $payment->save([
                'third_party_no' => $result['prepay_id'],
                'response_data' => json_encode($result)
            ]);
            
            // 返回前端需要的支付参数
            $jsApiParams = [
                'appId' => $config['app_id'],
                'timeStamp' => (string)time(),
                'nonceStr' => $this->generateNonceStr(),
                'package' => 'prepay_id=' . $result['prepay_id'],
                'signType' => 'MD5'
            ];
            
            $jsApiParams['paySign'] = $this->generateWechatSign($jsApiParams, $config['key']);
            
            return [
                'payment_id' => $payment->id,
                'payment_no' => $payment->payment_no,
                'jsapi_params' => $jsApiParams
            ];
            
        } catch (\Exception $e) {
            Log::error('微信支付创建失败', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * 创建支付宝支付订单
     *
     * @param Order $order 订单对象
     * @param array $params 支付参数
     * @return array
     * @throws Exception
     */
    public function createAlipayPayment(Order $order, array $params = []): array
    {
        try {
            $config = Config::get('app.alipay');
            
            if (empty($config['app_id']) || empty($config['private_key'])) {
                throw new Exception('支付宝配置不完整');
            }
            
            // 创建支付记录
            $payment = Payment::create([
                'order_id' => $order->id,
                'order_no' => $order->order_no,
                'payment_method' => Payment::METHOD_ALIPAY,
                'amount' => $order->total_amount,
                'status' => Payment::STATUS_PENDING,
                'created_at' => time()
            ]);
            
            // 构建支付宝支付参数
            $paymentData = [
                'app_id' => $config['app_id'],
                'method' => 'alipay.trade.app.pay',
                'charset' => 'utf-8',
                'sign_type' => 'RSA2',
                'timestamp' => date('Y-m-d H:i:s'),
                'version' => '1.0',
                'notify_url' => url('api/payment/notify/alipay', [], false, true),
                'biz_content' => json_encode([
                    'out_trade_no' => $payment->payment_no,
                    'total_amount' => $order->total_amount,
                    'subject' => '酒水商城-订单支付',
                    'body' => '订单号: ' . $order->order_no,
                    'timeout_express' => '30m'
                ])
            ];
            
            // 生成签名
            $paymentData['sign'] = $this->generateAlipaySign($paymentData, $config['private_key']);
            
            // 构建支付URL
            $paymentUrl = 'https://openapi.alipay.com/gateway.do?' . http_build_query($paymentData);
            
            // 更新支付记录
            $payment->save([
                'response_data' => json_encode($paymentData)
            ]);
            
            return [
                'payment_id' => $payment->id,
                'payment_no' => $payment->payment_no,
                'payment_url' => $paymentUrl
            ];
            
        } catch (\Exception $e) {
            Log::error('支付宝支付创建失败', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * 处理微信支付回调
     *
     * @param array $data 回调数据
     * @return bool
     */
    public function handleWechatNotify(array $data): bool
    {
        try {
            $config = Config::get('app.wechat');
            
            // 验证签名
            if (!$this->verifyWechatSign($data, $config['key'])) {
                Log::error('微信支付回调签名验证失败', $data);
                return false;
            }
            
            // 检查支付结果
            if ($data['return_code'] !== 'SUCCESS' || $data['result_code'] !== 'SUCCESS') {
                Log::error('微信支付失败', $data);
                return false;
            }
            
            $paymentNo = $data['out_trade_no'];
            $transactionId = $data['transaction_id'];
            $totalFee = $data['total_fee'] / 100; // 转换为 USD 基本单位
            
            // 查找支付记录
            $payment = Payment::where('payment_no', $paymentNo)->find();
            if (!$payment) {
                Log::error('支付记录不存在', ['payment_no' => $paymentNo]);
                return false;
            }
            
            // 检查金额
            if (abs($payment->amount - $totalFee) > 0.01) {
                Log::error('支付金额不匹配', [
                    'expected' => $payment->amount,
                    'actual' => $totalFee
                ]);
                return false;
            }
            
            // 更新支付状态
            $payment->save([
                'status' => Payment::STATUS_SUCCESS,
                'third_party_no' => $transactionId,
                'paid_at' => time(),
                'notify_data' => json_encode($data)
            ]);
            
            // 更新订单状态
            $order = Order::find($payment->order_id);
            if ($order && $order->status == Order::STATUS_PENDING) {
                $order->save([
                    'status' => Order::STATUS_PAID,
                    'paid_at' => time()
                ]);
                
                // 触发订单支付成功事件
                event('OrderPaid', $order);
            }
            
            Log::info('微信支付成功', [
                'payment_no' => $paymentNo,
                'transaction_id' => $transactionId,
                'amount' => $totalFee
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('微信支付回调处理失败', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            
            return false;
        }
    }
    
    /**
     * 处理支付宝支付回调
     *
     * @param array $data 回调数据
     * @return bool
     */
    public function handleAlipayNotify(array $data): bool
    {
        try {
            $config = Config::get('app.alipay');
            
            // 验证签名
            if (!$this->verifyAlipaySign($data, $config['public_key'])) {
                Log::error('支付宝支付回调签名验证失败', $data);
                return false;
            }
            
            // 检查支付结果
            if ($data['trade_status'] !== 'TRADE_SUCCESS' && $data['trade_status'] !== 'TRADE_FINISHED') {
                Log::info('支付宝支付状态异常', $data);
                return false;
            }
            
            $paymentNo = $data['out_trade_no'];
            $tradeNo = $data['trade_no'];
            $totalAmount = (float)$data['total_amount'];
            
            // 查找支付记录
            $payment = Payment::where('payment_no', $paymentNo)->find();
            if (!$payment) {
                Log::error('支付记录不存在', ['payment_no' => $paymentNo]);
                return false;
            }
            
            // 检查金额
            if (abs($payment->amount - $totalAmount) > 0.01) {
                Log::error('支付金额不匹配', [
                    'expected' => $payment->amount,
                    'actual' => $totalAmount
                ]);
                return false;
            }
            
            // 更新支付状态
            $payment->save([
                'status' => Payment::STATUS_SUCCESS,
                'third_party_no' => $tradeNo,
                'paid_at' => time(),
                'notify_data' => json_encode($data)
            ]);
            
            // 更新订单状态
            $order = Order::find($payment->order_id);
            if ($order && $order->status == Order::STATUS_PENDING) {
                $order->save([
                    'status' => Order::STATUS_PAID,
                    'paid_at' => time()
                ]);
                
                // 触发订单支付成功事件
                event('OrderPaid', $order);
            }
            
            Log::info('支付宝支付成功', [
                'payment_no' => $paymentNo,
                'trade_no' => $tradeNo,
                'amount' => $totalAmount
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('支付宝支付回调处理失败', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            
            return false;
        }
    }
    
    /**
     * 查询支付状态
     *
     * @param string $orderNo 订单号
     * @return array
     */
    public function getPaymentStatus(string $orderNo): array
    {
        $order = Order::where('order_no', $orderNo)->find();
        if (!$order) {
            return [
                'status' => 'not_found',
                'message' => '订单不存在'
            ];
        }
        
        $payment = Payment::where('order_id', $order->id)
            ->order('id', 'desc')
            ->find();
        
        if (!$payment) {
            return [
                'status' => 'no_payment',
                'message' => '未找到支付记录'
            ];
        }
        
        return [
            'status' => $payment->getStatusText(),
            'payment_method' => $payment->getMethodText(),
            'amount' => $payment->amount,
            'paid_at' => $payment->paid_at ? date('Y-m-d H:i:s', $payment->paid_at) : null
        ];
    }
    
    /**
     * 生成随机字符串
     */
    protected function generateNonceStr(int $length = 32): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $str = '';
        for ($i = 0; $i < $length; $i++) {
            $str .= substr($chars, random_int(0, strlen($chars) - 1), 1);
        }
        return $str;
    }
    
    /**
     * 生成微信支付签名
     */
    protected function generateWechatSign(array $data, string $key): string
    {
        unset($data['sign']);
        ksort($data);
        
        $string = '';
        foreach ($data as $k => $v) {
            if ($v !== '' && $v !== null) {
                $string .= $k . '=' . $v . '&';
            }
        }
        $string .= 'key=' . $key;
        
        return strtoupper(md5($string));
    }
    
    /**
     * 验证微信支付签名
     */
    protected function verifyWechatSign(array $data, string $key): bool
    {
        $sign = $data['sign'] ?? '';
        return $sign === $this->generateWechatSign($data, $key);
    }
    
    /**
     * 生成支付宝签名
     */
    protected function generateAlipaySign(array $data, string $privateKey): string
    {
        unset($data['sign']);
        ksort($data);
        
        $string = '';
        foreach ($data as $k => $v) {
            if ($v !== '' && $v !== null) {
                $string .= $k . '=' . $v . '&';
            }
        }
        $string = rtrim($string, '&');
        
        $privateKey = "-----BEGIN RSA PRIVATE KEY-----\n" .
            wordwrap($privateKey, 64, "\n", true) .
            "\n-----END RSA PRIVATE KEY-----";
        
        openssl_sign($string, $sign, $privateKey, OPENSSL_ALGO_SHA256);
        
        return base64_encode($sign);
    }
    
    /**
     * 验证支付宝签名
     */
    protected function verifyAlipaySign(array $data, string $publicKey): bool
    {
        $sign = $data['sign'] ?? '';
        unset($data['sign'], $data['sign_type']);
        ksort($data);
        
        $string = '';
        foreach ($data as $k => $v) {
            if ($v !== '' && $v !== null) {
                $string .= $k . '=' . $v . '&';
            }
        }
        $string = rtrim($string, '&');
        
        $publicKey = "-----BEGIN PUBLIC KEY-----\n" .
            wordwrap($publicKey, 64, "\n", true) .
            "\n-----END PUBLIC KEY-----";
        
        return openssl_verify($string, base64_decode($sign), $publicKey, OPENSSL_ALGO_SHA256) === 1;
    }
    
    /**
     * 调用微信API
     */
    protected function callWechatApi(string $url, array $data): array
    {
        $xml = $this->arrayToXml($data);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $xml);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/xml']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('微信API调用失败: HTTP ' . $httpCode);
        }
        
        return $this->xmlToArray($response);
    }
    
    /**
     * 数组转XML
     */
    protected function arrayToXml(array $data): string
    {
        $xml = '<xml>';
        foreach ($data as $key => $value) {
            $xml .= '<' . $key . '>' . $value . '</' . $key . '>';
        }
        $xml .= '</xml>';
        return $xml;
    }
    
    /**
     * XML转数组
     */
    protected function xmlToArray(string $xml): array
    {
        return json_decode(json_encode(simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA)), true);
    }
}