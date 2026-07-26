<?php
/**
 * 电子元器件商城 - 报价请求管理（后台）
 * 文件说明：提供后台查看与管理前端提交的报价请求（报价单）的接口。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkQuoteRequest;
use think\exception\ValidateException;
use think\facade\Log;

class QuoteRequestController extends BaseController
{
    /**
     * 获取询价请求列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkQuoteRequest::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('customer_name|customer_email|company_name', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('created_at', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取询价请求详情
     */
    public function read($id)
    {
        $request = SkQuoteRequest::find($id);
        if (!$request) {
            return $this->error('Quote request not found');
        }
        return $this->success($request);
    }

    /**
     * 更新询价请求（添加报价并变更状态）
     */
    public function update($id)
    {
        try {
            $request = SkQuoteRequest::find($id);
            if (!$request) {
                return $this->error('Quote request not found');
            }

            $data = $this->request->param();
            
            // 处理报价操作
            if (isset($data['quote_price']) && $data['status'] == 1) {
                $data['quoted_at'] = date('Y-m-d H:i:s');
            }

            $request->save($data);
            return $this->success($request, 'Quote request updated successfully');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除询价请求
     */
    public function delete($id)
    {
        try {
            $request = SkQuoteRequest::find($id);
            if (!$request) {
                return $this->error('Quote request not found');
            }

            $request->delete();
            return $this->success(null, 'Quote request deleted successfully');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
