<?php
/**
 * 电子元器件商城 - 商务申请管理（后台）
 * 文件说明：管理报价申请与样品申请，提供后台列表、详情与状态更新接口。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkQuoteRequest;
use app\model\SkSampleApply;
use think\exception\ValidateException;
use think\facade\Log;

class BusinessApplicationController extends BaseController
{
    /**
     * 获取询价请求列表
     */
    public function getQuoteRequests()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkQuoteRequest::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('company|contact_name|email|product_info', 'like', '%' . $keyword . '%');
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('create_time', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取样品申请列表
     */
    public function getSampleApplications()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkSampleApply::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('company|contact_name|email|product_name', 'like', '%' . $keyword . '%');
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('create_time', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取询价请求详情
     */
    public function getQuoteRequest($id)
    {
        $request = SkQuoteRequest::find($id);
        if (!$request) {
            return $this->error('报价申请不存在');
        }
        return $this->success($request);
    }

    /**
     * 获取样品申请详情
     */
    public function getSampleApplication($id)
    {
        $application = SkSampleApply::find($id);
        if (!$application) {
            return $this->error('样品申请不存在');
        }
        return $this->success($application);
    }

    /**
     * 更新询价请求状态
     */
    public function updateQuoteRequest($id)
    {
        try {
            $request = SkQuoteRequest::find($id);
            if (!$request) {
                return $this->error('报价申请不存在');
            }

            $data = $this->request->param();
            $data['reply_time'] = date('Y-m-d H:i:s');

            $request->save($data);

            return $this->success($request, '报价申请更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新样品申请状态
     */
    public function updateSampleApplication($id)
    {
        try {
            $application = SkSampleApply::find($id);
            if (!$application) {
                return $this->error('样品申请不存在');
            }

            $data = $this->request->param();
            $data['reply_time'] = date('Y-m-d H:i:s');

            $application->save($data);

            return $this->success($application, '样品申请更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除询价请求
     */
    public function deleteQuoteRequest($id)
    {
        try {
            $request = SkQuoteRequest::find($id);
            if (!$request) {
                return $this->error('报价申请不存在');
            }

            $request->delete();
            return $this->success(null, '报价申请删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除样品申请
     */
    public function deleteSampleApplication($id)
    {
        try {
            $application = SkSampleApply::find($id);
            if (!$application) {
                return $this->error('样品申请不存在');
            }

            $application->delete();
            return $this->success(null, '样品申请删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除报价申请
     */
    public function batchDeleteQuotes()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的报价申请');
            }
            SkQuoteRequest::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 批量删除样品申请
     */
    public function batchDeleteSamples()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的样品申请');
            }
            SkSampleApply::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 获取业务申请统计
     */
    public function getStatistics()
    {
        $quoteStats = [
            'total' => SkQuoteRequest::count(),
            'pending' => SkQuoteRequest::where('status', 'pending')->count(),
            'replied' => SkQuoteRequest::where('status', 'replied')->count(),
            'approved' => SkQuoteRequest::where('status', 'approved')->count(),
        ];

        $sampleStats = [
            'total' => SkSampleApply::count(),
            'pending' => SkSampleApply::where('status', 'pending')->count(),
            'approved' => SkSampleApply::where('status', 'approved')->count(),
            'shipping' => SkSampleApply::where('status', 'shipping')->count(),
            'completed' => SkSampleApply::where('status', 'completed')->count(),
        ];

        $data = [
            'quotes' => $quoteStats,
            'samples' => $sampleStats,
        ];

        return $this->success($data);
    }

    /**
     * 批量更新询价请求状态
     */
    public function batchUpdateQuoteStatus()
    {
        try {
            $ids = $this->request->param('ids', []);
            
            // 确保ids是数组
            if (is_string($ids)) {
                $ids = explode(',', $ids);
            }
            
            $status = $this->request->param('status');
            $replyContent = $this->request->param('reply_content', '');

            if (empty($ids) || empty($status)) {
                return $this->error('缺少必填参数');
            }

            $updateData = [
                'status' => $status,
                'reply_time' => date('Y-m-d H:i:s')
            ];

            if (!empty($replyContent)) {
                $updateData['reply_content'] = $replyContent;
            }

            $result = SkQuoteRequest::whereIn('id', $ids)->update($updateData);

            return $this->success(['affected_rows' => $result], '报价申请更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量更新样品申请状态
     */
    public function batchUpdateSampleStatus()
    {
        try {
            $ids = $this->request->param('ids', []);
            
            // 确保ids是数组
            if (is_string($ids)) {
                $ids = explode(',', $ids);
            }
            
            $status = $this->request->param('status');
            $replyContent = $this->request->param('reply_content', '');
            $trackingNumber = $this->request->param('tracking_number', '');

            if (empty($ids) || empty($status)) {
                return $this->error('缺少必填参数');
            }

            $updateData = [
                'status' => $status,
                'reply_time' => date('Y-m-d H:i:s')
            ];

            if (!empty($replyContent)) {
                $updateData['reply_content'] = $replyContent;
            }

            if (!empty($trackingNumber)) {
                $updateData['tracking_number'] = $trackingNumber;
            }

            $result = SkSampleApply::whereIn('id', $ids)->update($updateData);

            return $this->success(['affected_rows' => $result], '样品申请更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
