<?php

namespace app\controller\admin;
use think\facade\Log;

use app\BaseController;
use app\model\MarketingActivity;
use think\exception\ValidateException;
use think\facade\Db;

class MarketingController extends BaseController
{
    /**
     * 获取营销活动列表
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $page = $params['page'] ?? 1;
            $pageSize = $params['page_size'] ?? 20;
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $type = $params['type'] ?? '';

            $query = MarketingActivity::query();

            // 搜索
            if (!empty($search)) {
                $query->where('name', 'like', '%' . $search . '%');
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('status', $status);
            }

            // 类型筛选
            if (!empty($type)) {
                $query->where('type', $type);
            }

            $total = $query->count();
            $list = $query->page($page, $pageSize)
                         ->order('id', 'desc')
                         ->select();

            return $this->success([
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize
            ]);

        } catch (\Exception $e) {
            Log::error('Get marketing activities error: ' . $e->getMessage());
            return $this->error('获取营销活动列表失败');
        }
    }

    /**
     * 获取活动详情
     */
    public function read($id)
    {
        try {
            $activity = MarketingActivity::find($id);
            if (!$activity) {
                return $this->error('营销活动不存在');
            }

            return $this->success($activity);

        } catch (\Exception $e) {
            Log::error('Get marketing activity detail error: ' . $e->getMessage());
            return $this->error('获取活动详情失败');
        }
    }

    /**
     * 创建营销活动
     */
    public function save()
    {
        try {
            $data = $this->request->param();

            // 验证必填字段
            if (empty($data['name'])) {
                return $this->error('活动名称不能为空');
            }

            if (empty($data['type'])) {
                return $this->error('活动类型不能为空');
            }

            if (empty($data['start_time']) || empty($data['end_time'])) {
                return $this->error('活动时间不能为空');
            }

            // 设置默认值
            if (!isset($data['status'])) {
                $data['status'] = 'draft';
            }

            if (!isset($data['discount_type'])) {
                $data['discount_type'] = 'percentage';
            }

            if (!isset($data['discount_value'])) {
                $data['discount_value'] = 0;
            }

            if (!isset($data['participant_count'])) {
                $data['participant_count'] = 0;
            }

            $activity = MarketingActivity::create($data);

            return $this->success($activity, '营销活动创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Create marketing activity error: ' . $e->getMessage());
            return $this->error('创建营销活动失败');
        }
    }

    /**
     * 更新营销活动
     */
    public function update($id)
    {
        try {
            $activity = MarketingActivity::find($id);
            if (!$activity) {
                return $this->error('营销活动不存在');
            }

            $data = $this->request->param();

            // 移除不需要更新的字段
            unset($data['id'], $data['created_at']);

            $activity->save($data);

            return $this->success($activity, '营销活动更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update marketing activity error: ' . $e->getMessage());
            return $this->error('更新营销活动失败');
        }
    }

    /**
     * 删除营销活动
     */
    public function delete($id)
    {
        try {
            $activity = MarketingActivity::find($id);
            if (!$activity) {
                return $this->error('营销活动不存在');
            }

            // 如果活动正在进行中，不允许删除
            if ($activity->status === 'active') {
                return $this->error('进行中的活动不能删除');
            }

            $activity->delete();

            return $this->success(null, '营销活动删除成功');

        } catch (\Exception $e) {
            Log::error('Delete marketing activity error: ' . $e->getMessage());
            return $this->error('删除营销活动失败');
        }
    }

    /**
     * 获取营销活动统计
     */
    public function statistics()
    {
        try {
            $total = MarketingActivity::count();
            $active = MarketingActivity::where('status', 'active')->count();
            $upcoming = MarketingActivity::where('status', 'upcoming')->count();
            $ended = MarketingActivity::where('status', 'ended')->count();
            $draft = MarketingActivity::where('status', 'draft')->count();
            $paused = MarketingActivity::where('status', 'paused')->count();

            // 参与人数统计
            $totalParticipants = MarketingActivity::sum('participant_count');

            // 本月新增活动
            $thisMonthNew = MarketingActivity::whereTime('created_at', 'month')
                                           ->count();

            // 活动类型分布
            $typeDistribution = MarketingActivity::field('type, count(*) as count')
                                               ->group('type')
                                               ->select()
                                               ->toArray();

            $stats = [
                'total' => $total,
                'active' => $active,
                'upcoming' => $upcoming,
                'ended' => $ended,
                'draft' => $draft,
                'paused' => $paused,
                'total_participants' => $totalParticipants,
                'this_month_new' => $thisMonthNew,
                'type_distribution' => $typeDistribution
            ];

            return $this->success($stats);

        } catch (\Exception $e) {
            Log::error('Get marketing statistics error: ' . $e->getMessage());
            return $this->error('获取统计数据失败');
        }
    }

    /**
     * 更新活动状态
     */
    public function updateStatus($id)
    {
        try {
            $activity = MarketingActivity::find($id);
            if (!$activity) {
                return $this->error('营销活动不存在');
            }

            $status = $this->request->param('status');
            if (empty($status)) {
                return $this->error('状态不能为空');
            }

            $allowedStatuses = ['draft', 'active', 'upcoming', 'ended', 'paused'];
            if (!in_array($status, $allowedStatuses)) {
                return $this->error('无效的状态值');
            }

            $activity->status = $status;
            $activity->save();

            return $this->success($activity, '活动状态更新成功');

        } catch (\Exception $e) {
            Log::error('Update marketing activity status error: ' . $e->getMessage());
            return $this->error('更新活动状态失败');
        }
    }

    /**
     * 批量删除活动
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->param('ids', []);
            if (empty($ids)) {
                return $this->error('请选择要删除的活动');
            }

            // 检查是否有进行中的活动
            $activeCount = MarketingActivity::whereIn('id', $ids)
                                          ->where('status', 'active')
                                          ->count();
            
            if ($activeCount > 0) {
                return $this->error('选中的活动中包含进行中的活动，无法删除');
            }

            MarketingActivity::whereIn('id', $ids)->delete();

            return $this->success(null, '批量删除成功');

        } catch (\Exception $e) {
            Log::error('Batch delete marketing activities error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }
}
