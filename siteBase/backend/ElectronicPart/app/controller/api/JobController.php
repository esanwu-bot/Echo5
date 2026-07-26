<?php
/**
 * 电子元器件商城 - 招聘/职位接口
 * 文件说明：提供职位列表、详情与简历投递接口，供公司招聘页面使用。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use app\model\Job;
use app\model\JobApplication;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

class JobController extends BaseController
{
    /**
     * 招聘职位列表
     */
    public function index(Request $request): Response
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);

        $lang = $request->lang ?? 'zh';
        $cacheKey = 'job_index_' . $lang . '_p' . $page . '_l' . $limit;

        $data = Cache::remember($cacheKey, function () use ($page, $limit) {
            $jobs = Job::where('status', 1)
                ->order('create_time', 'desc')
                ->paginate([
                    'list_rows' => $limit,
                    'page' => $page
                ]);

            return $jobs->items();
        }, 3600);

        try {
            return $this->success([
                'list' => $data,
                'timestamp' => time(),
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 职位详情
     */
    public function read(Request $request, $id): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'job_read_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $job = Job::find($id);

            if (!$job) {
                return null;
            }

            return $job;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('职位不存在', 404);
            }

            $jobData = is_object($data) && method_exists($data, 'toArray') ? $data->toArray() : (array)$data;
            $jobData['timestamp'] = time();
            return $this->success($jobData);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 提交简历
     */
    public function apply(Request $request, $id): Response
    {
        $data = $request->post();

        // 验证必填字段
        $required = ['name', 'email', 'phone'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return json(['code' => 400, 'message' => "字段 {$field} 不能为空"]);
            }
        }

        try {
            // 检查职位是否存在
            $job = Job::find($id);
            if (!$job) {
                return $this->error('职位不存在', 404);
            }

            $application = JobApplication::create([
                'job_id' => $id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'resume_url' => $data['resume_url'] ?? '',
                'cover_letter' => $data['cover_letter'] ?? '',
                'status' => 'pending',
                'create_time' => time(),
                'update_time' => time()
            ]);

            return $this->success(['id' => $application->id], '简历提交成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
