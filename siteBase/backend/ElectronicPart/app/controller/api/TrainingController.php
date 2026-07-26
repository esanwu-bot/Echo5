<?php
/**
 * 电子元器件商城 - 培训/活动接口
 * 文件说明：提供公司培训或活动的列表与详情，为前端活动页面提供数据支持。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\BaseController;
use app\model\Training;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 培训活动API控制器
 * @package app\controller\api
 */
class TrainingController extends BaseController
{
    /**
     * 培训活动列表
     */
    public function index(Request $request): Response
    {
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);

        $lang = $request->lang ?? 'zh';
        $cacheKey = 'training_index_' . $lang . '_p' . $page . '_l' . $limit;

        $result = Cache::remember($cacheKey, function () use ($page, $limit) {
            $query = Training::where('status', 1)
                ->order('start_time', 'desc');

            $total = (clone $query)->count();
            $trainings = $query->page($page, $limit)->select();

            // 本地化培训数据
            $localizedFields = ['title', 'description', 'content'];
            $trainingList = $this->localizeCollection($trainings, $localizedFields);

            return [
                'list' => $trainingList,
                'total' => $total,
            ];
        }, 3600);

        try {
            return $this->paginate($result['list'], $result['total'], $page, $limit);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 培训活动详情
     */
    public function read(Request $request, $id): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'training_read_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $training = Training::find($id);

            if (!$training) {
                return null;
            }

            // 本地化培训数据
            $localizedFields = ['title', 'description', 'content'];
            $trainingData = $this->localizeItem($training, $localizedFields);

            return $trainingData;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('培训活动不存在', 404);
            }

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
