<?php
/**
 * 电子元器件商城 - 支付接口（前台）
 * 文件说明：处理微信/其他支付渠道的支付创建与回调，负责订单支付流程的集成。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\BaseController;
use app\model\Order;
use app\service\PaymentService;
use think\Response;
use think\exception\ValidateException;
use think\facade\Log;

/**
 * 支付API控制器
 * @package app\controller\api
 */
class PaymentController extends BaseController
{
    protected $paymentService;
    
    public function __construct()
    {
        parent::__construct(app());
        $this->paymentService = new PaymentService();
    }
    
    /**
     * 微信支付
     */
    public function wechat(): Response
    {
        try {
            $userId = $this->request->userId;
            $params = $this->request->post();
            
            // 验证参数
            $this->validate($params, [
                'order_no|订单号' => 'require',
                'trade_type|交易类型' => 'in:JSAPI,APP,NATIVE',
                'openid|用户标识' => 'requireIf:trade_type,JSAPI'
            ]);
            
            // 获取订单
            $order = Order::where('order_no', $params['order_no'])
                ->where('user_id', $userId)
                ->find();
            
            if (!$order) {
                return $this->error('订单不存在', 404);
            }
            
            // 检查订单状态
            if ($order->status != Order::STATUS_PENDING) {
                return $this->error('订单状态不允许支付', 400);
            }
            
            // 创建微信支付
            $result = $this->paymentService->createWechatPayment($order, $params);
            
            return $this->success($result, '支付创建成功');
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error('微信支付创建失败', [
                'user_id' => $userId ?? 0,
                'params' => $params ?? [],
                'error' => $e->getMessage()
            ]);
            
            return $this->error('支付创建失败', 500);
        }
    }
    
    /**
     * 支付宝支付
     */
    public function alipay(): Response
    {
        try {
            $userId = $this->request->userId;
            $params = $this->request->post();
            
            // 验证参数
            $this->validate($params, [
                'order_no|订单号' => 'require'
            ]);
            
            // 获取订单
            $order = Order::where('order_no', $params['order_no'])
                ->where('user_id', $userId)
                ->find();
            
            if (!$order) {
                return $this->error('订单不存在', 404);
            }
            
            // 检查订单状态
            if ($order->status != Order::STATUS_PENDING) {
                return $this->error('订单状态不允许支付', 400);
            }
            
            // 创建支付宝支付
            $result = $this->paymentService->createAlipayPayment($order, $params);
            
            return $this->success($result, '支付创建成功');
            
        } catch (ValidateException $e) {
            return json([
                'code' => 400,
                'message' => $e->getError()
            ], 400);
        } catch (\Exception $e) {
            Log::error('支付宝支付创建失败', [
                'user_id' => $userId ?? 0,
                'params' => $params ?? [],
                'error' => $e->getMessage()
            ]);
            
            return $this->error('支付创建失败', 500);
        }
    }
    
    /**
     * 微信支付回调
     */
    public function wechatNotify(): Response
    {
        try {
            $xmlData = file_get_contents('php://input');
            $data = $this->xmlToArray($xmlData);
            
            Log::info('微信支付回调', $data);
            
            $result = $this->paymentService->handleWechatNotify($data);
            
            if ($result) {
                return response('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
                    ->contentType('text/xml');
            } else {
                return response('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[FAIL]]></return_msg></xml>')
                    ->contentType('text/xml');
            }
            
        } catch (\Exception $e) {
            Log::error('微信支付回调处理失败', [
                'error' => $e->getMessage()
            ]);
            
            return response('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[FAIL]]></return_msg></xml>')
                ->contentType('text/xml');
        }
    }
    
    /**
     * 支付宝支付回调
     */
    public function alipayNotify(): Response
    {
        try {
            $data = $this->request->post();
            
            Log::info('支付宝支付回调', $data);
            
            $result = $this->paymentService->handleAlipayNotify($data);
            
            if ($result) {
                return response('success');
            } else {
                return response('fail');
            }
            
        } catch (\Exception $e) {
            Log::error('支付宝支付回调处理失败', [
                'error' => $e->getMessage()
            ]);
            
            return response('fail');
        }
    }
    
    /**
     * 查询支付状态
     */
    public function status(string $orderNo): Response
    {
        try {
            $userId = $this->request->userId;
            
            // 验证订单归属
            $order = Order::where('order_no', $orderNo)
                ->where('user_id', $userId)
                ->find();
            
            if (!$order) {
                return $this->error('订单不存在', 404);
            }
            
            $result = $this->paymentService->getPaymentStatus($orderNo);
            
            return $this->success($result, '查询成功');
            
        } catch (\Exception $e) {
            Log::error('支付状态查询失败', [
                'order_no' => $orderNo,
                'user_id' => $userId ?? 0,
                'error' => $e->getMessage()
            ]);
            
            return $this->error('查询失败', 500);
        }
    }
    
    /**
     * XML转数组
     */
    protected function xmlToArray(string $xml): array
    {
        return json_decode(json_encode(simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA)), true);
    }
}