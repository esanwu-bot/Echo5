<?php
/**
 * 电子元器件商城 - 业务/商业相关接口
 * 文件说明：包含报价申请与样品申请等业务表单提交接口，供前端用户提交商业请求使用。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use app\model\QuoteRequest;
use app\model\SampleApply;
use think\Request;
use think\Response;
use think\facade\Log;

class BusinessController extends BaseController
{
    /**
     * 提交报价申请
     */
    public function submitQuote(Request $request): Response
    {
        $data = $request->post();
        
        // 验证必填字段
        $validate = [
            'company' => 'require',
            'contact_name' => 'require',
            'email' => 'require|email',
            'phone' => 'require',
            'product_info' => 'require',
            'quantity' => 'require|number',
        ];
        
        foreach ($validate as $field => $rule) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return json(['code' => 400, 'message' => "字段 {$field} 不能为空"]);
            }
        }
        
        try {
            $quote = QuoteRequest::create([
                'user_id' => $request->user_id ?? 0,
                'company' => $data['company'],
                'contact_name' => $data['contact_name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'product_info' => is_array($data['product_info']) ? json_encode($data['product_info']) : $data['product_info'],
                'quantity' => $data['quantity'],
                'message' => $data['message'] ?? '',
                'status' => 'pending',
                'create_time' => time(),
                'update_time' => time()
            ]);
            
            return $this->success(['id' => $quote->id], '报价申请提交成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 提交样品申请
     */
    public function submitSample(Request $request): Response
    {
        $data = $request->post();
        
        // 验证必填字段
        $validate = [
            'company' => 'require',
            'contact_name' => 'require',
            'email' => 'require|email',
            'phone' => 'require',
            'address' => 'require',
            'product_id' => 'require|number',
            'product_name' => 'require',
            'quantity' => 'require|number',
            'purpose' => 'require'
        ];
        
        foreach ($validate as $field => $rule) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return json(['code' => 400, 'message' => "字段 {$field} 不能为空"]);
            }
        }
        
        try {
            $sample = SampleApply::create([
                'user_id' => $request->user_id ?? 0,
                'company' => $data['company'],
                'contact_name' => $data['contact_name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'address' => $data['address'],
                'product_id' => $data['product_id'],
                'product_name' => $data['product_name'],
                'quantity' => $data['quantity'],
                'purpose' => $data['purpose'],
                'status' => 'pending',
                'create_time' => time(),
                'update_time' => time()
            ]);
            
            return $this->success(['id' => $sample->id], '样品申请提交成功');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}