<?php
declare (strict_types = 1);

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\Job;
use app\model\JobApplication;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class JobController extends BaseController
{
    /**
     * 职位列表
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $page = $params['page'] ?? 1;
            $limit = $params['pageSize'] ?? $params['limit'] ?? 20;
            $keyword = $params['keyword'] ?? '';
            $department = $params['department'] ?? '';
            $location = $params['location'] ?? '';
            $status = $params['status'] ?? '';
            $jobType = $params['job_type'] ?? '';

            $query = Job::where([]);

            // 关键词搜索
            if (!empty($keyword)) {
                $query->where('job_title|requirements|responsibilities', 'like', '%' . $keyword . '%');
            }

            // 部门筛选
            if (!empty($department)) {
                $query->where('department', $department);
            }

            // 地点筛选
            if (!empty($location)) {
                $query->where('location', $location);
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('status', $status);
            }

            // 工作类型筛选
            if (!empty($jobType)) {
                $query->where('job_type', $jobType);
            }

            $total = $query->count();
            $list = $query->order('create_time', 'desc')
                         ->page($page, $limit)
                         ->select();

            return $this->paginate($list, $total, $page, $limit);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 职位详情
     */
    public function read($id)
    {
        try {
            $job = Job::find($id);
            if (!$job) {
                return $this->error('职位不存在');
            }

            // 获取申请数量
            $applicationCount = JobApplication::where('job_id', $id)->count();
            $job->application_count = $applicationCount;

            return $this->success($job);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 创建职位
     */
    public function save()
    {
        try {
            $data = $this->request->param();
            
            // 数据验证
            $this->validate($data, [
                'job_title' => 'require|max:255',
                'department' => 'require|max:100',
                'location' => 'require|max:100',
                'job_type' => 'require|in:全职,兼职,合同工,实习',
                'requirements' => 'require',
                'responsibilities' => 'require',
                'status' => 'in:active,inactive'
            ], [
                'job_title.require' => '职位名称不能为空',
                'job_title.max' => '职位名称不能超过255个字符',
                'department.require' => '部门不能为空',
                'department.max' => '部门名称不能超过100个字符',
                'location.require' => '工作地点不能为空',
                'location.max' => '工作地点不能超过100个字符',
                'job_type.require' => '工作类型不能为空',
                'job_type.in' => '工作类型必须是全职、兼职、合同工或实习',
                'requirements.require' => '职位要求不能为空',
                'responsibilities.require' => '工作职责不能为空',
                'status.in' => '状态必须是active或inactive'
            ]);

            // 标准化状态字段
            if (isset($data['status'])) {
                $data['status'] = in_array($data['status'], ['active', 1, '1', true], true) ? 1 : 0;
            }

            // 设置时间戳
            $data['create_time'] = time();
            $data['update_time'] = time();

            $job = Job::create($data);
            return $this->success($job, '职位创建成功');
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新职位
     */
    public function update($id)
    {
        try {
            $job = Job::find($id);
            if (!$job) {
                return $this->error('职位不存在');
            }

            $data = $this->request->param();
            
            // 数据验证
            $this->validate($data, [
                'job_title' => 'max:255',
                'department' => 'max:100',
                'location' => 'max:100',
                'job_type' => 'in:全职,兼职,合同工,实习',
                'status' => 'in:active,inactive'
            ], [
                'job_title.max' => '职位名称不能超过255个字符',
                'department.max' => '部门名称不能超过100个字符',
                'location.max' => '工作地点不能超过100个字符',
                'job_type.in' => '工作类型必须是全职、兼职、合同工或实习',
                'status.in' => '状态必须是active或inactive'
            ]);

            // 标准化状态字段
            if (isset($data['status'])) {
                $data['status'] = in_array($data['status'], ['active', 1, '1', true], true) ? 1 : 0;
            }

            // 设置更新时间
            $data['update_time'] = time();

            $job->save($data);
            return $this->success($job, '职位更新成功');
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除职位
     */
    public function delete($id)
    {
        try {
            $job = Job::find($id);
            if (!$job) {
                return $this->error('职位不存在');
            }

            // 检查是否有关联的申请记录
            $applicationCount = JobApplication::where('job_id', $id)->count();
            if ($applicationCount > 0) {
                return $this->error('该职位已有申请记录，无法删除');
            }

            $job->delete();
            return $this->success(null, '职位删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量操作
     */
    public function batch()
    {
        try {
            $params = $this->request->param();
            $action = $params['action'] ?? '';
            $ids = $params['ids'] ?? [];

            if (empty($action) || empty($ids)) {
                return $this->error('参数错误');
            }

            // 验证ID
            if (!is_array($ids)) {
                return $this->error('ids参数必须是数组');
            }

            if ($action === 'delete') {
                // 检查是否有关联的申请记录
                $applicationCount = JobApplication::whereIn('job_id', $ids)->count();
                if ($applicationCount > 0) {
                    return $this->error('选中的职位中存在已申请记录，无法删除');
                }

                Job::whereIn('id', $ids)->delete();
                return $this->success(null, '批量删除成功');
            } elseif ($action === 'active' || $action === 'inactive') {
                Job::whereIn('id', $ids)->update([
                    'status' => $action,
                    'update_time' => time()
                ]);
                return $this->success(null, '批量更新状态成功');
            } else {
                return $this->error('不支持的操作');
            }
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 职位申请列表
     */
    public function applications()
    {
        try {
            $params = $this->request->param();
            $page = $params['page'] ?? 1;
            $limit = $params['pageSize'] ?? $params['limit'] ?? 20;
            $jobId = $params['job_id'] ?? '';
            $status = $params['status'] ?? '';
            $keyword = $params['keyword'] ?? '';

            $query = JobApplication::alias('ja')
                                   ->join('sk_job j', 'ja.job_id = j.id')
                                   ->field('ja.*, j.job_title, j.department, j.location');

            // 职位筛选
            if (!empty($jobId)) {
                $query->where('ja.job_id', $jobId);
            }

            // 状态筛选
            if ($status !== '') {
                $query->where('ja.status', $status);
            }

            // 关键词搜索
            if (!empty($keyword)) {
                $query->where('ja.name|ja.email|ja.phone|j.job_title', 'like', '%' . $keyword . '%');
            }

            $total = $query->count();
            $list = $query->order('ja.create_time', 'desc')
                          ->page($page, $limit)
                          ->select();

            return $this->paginate($list, $total, $page, $limit);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 申请详情
     */
    public function applicationDetail($id)
    {
        try {
            $application = JobApplication::alias('ja')
                                         ->join('sk_job j', 'ja.job_id = j.id')
                                         ->field('ja.*, j.job_title, j.department, j.location')
                                         ->where('ja.id', $id)
                                         ->find();
            
            if (!$application) {
                return $this->error('申请记录不存在');
            }

            return $this->success($application);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新申请状态
     */
    public function updateApplication($id)
    {
        try {
            $application = JobApplication::find($id);
            if (!$application) {
                return $this->error('申请记录不存在');
            }

            $data = $this->request->param();
            
            // 数据验证
            $this->validate($data, [
                'status' => 'require|in:pending,interviewed,hired,rejected'
            ], [
                'status.require' => '状态不能为空',
                'status.in' => '状态必须是pending、interviewed、hired或rejected'
            ]);

            // 设置更新时间
            $data['update_time'] = time();

            $application->save($data);
            return $this->success($application, '申请状态更新成功');
        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除申请记录
     */
    public function deleteApplication($id)
    {
        try {
            $application = JobApplication::find($id);
            if (!$application) {
                return $this->error('申请记录不存在');
            }

            $application->delete();
            return $this->success(null, '申请记录删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取职位统计数据
     */
    public function statistics()
    {
        try {
            // 总职位数
            $totalJobs = Job::count();
            // 活跃职位数
            $activeJobs = Job::where('status', 'active')->count();
            // 总申请数
            $totalApplications = JobApplication::count();
            
            // 按状态统计申请数
            $applicationByStatus = JobApplication::field('status, COUNT(*) as count')
                                                  ->group('status')
                                                  ->select();
            
            // 最近30天申请趋势
            $thirtyDaysAgo = strtotime('-30 days');
            $recentApplications = JobApplication::where('create_time', '>=', $thirtyDaysAgo)
                                              ->field('FROM_UNIXTIME(create_time, "%Y-%m-%d") as date, COUNT(*) as count')
                                              ->group('FROM_UNIXTIME(create_time, "%Y-%m-%d")')
                                              ->order('date', 'asc')
                                              ->select();

            // 按部门统计申请数
            $applicationsByDepartment = Db::table('sk_job_apply')
                                         ->alias('ja')
                                         ->join('sk_job j', 'ja.job_id = j.id')
                                         ->field('j.department, COUNT(*) as count')
                                         ->group('j.department')
                                         ->order('count', 'desc')
                                         ->select();

            $data = [
                'total_jobs' => $totalJobs,
                'active_jobs' => $activeJobs,
                'total_applications' => $totalApplications,
                'application_by_status' => $applicationByStatus,
                'recent_applications' => $recentApplications,
                'applications_by_department' => $applicationsByDepartment
            ];

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}