<?php
/**
 * 电子元器件商城 - 样品申请管理（后台）
 * 文件说明：管理用户提交的样品申请，提供列表、详情与状态更新接口，供后台审核与发货使用。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkSampleApply;
use think\exception\ValidateException;
use think\facade\Log;

class SampleApplyController extends BaseController
{
    /**
     * 获取样品申请列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkSampleApply::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('contact_name|email|company', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
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
     * 获取样品申请详情
     */
    public function read($id)
    {
        $application = SkSampleApply::find($id);
        if (!$application) {
            return $this->error('样品申请不存在');
        }
        return $this->success($application);
    }

    /**
     * 更新样品申请（审批、驳回、标记已发货）
     */
    public function update($id)
    {
        try {
            $application = SkSampleApply::find($id);
            if (!$application) {
                return $this->error('样品申请不存在');
            }

            $data = $this->request->param();
            
            // 处理状态变更和回复
            if (isset($data['status'])) {
                // 如果状态是数字（来自旧UI），将其映射为字符串
                if (is_numeric($data['status'])) {
                    $statusMap = [
                        0 => 'pending',
                        1 => 'approved',
                        2 => 'shipping',
                        3 => 'refuse'
                    ];
                    $data['status'] = $statusMap[$data['status']] ?? 'pending';
                }
            }

            $application->save($data);
            return $this->success($application, '样品申请更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除样品申请
     */
    public function delete($id)
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
}
