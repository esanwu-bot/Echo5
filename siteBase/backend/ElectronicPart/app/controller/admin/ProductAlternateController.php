<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProductAlternate;
use app\model\SkProductModel;
use think\facade\Db;
use think\facade\Log;

class ProductAlternateController extends BaseController
{
    /**
     * 替代型号列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;

        $query = SkProductAlternate::with([
            'model' => function($q) { $q->field('id, model_code, model_name'); },
            'alternateModel' => function($q) { $q->field('id, model_code, model_name, package_type'); }
        ]);

        if (!empty($params['model_id'])) {
            $query->where('model_id', $params['model_id']);
        }
        if (!empty($params['match_type'])) {
            $query->where('match_type', $params['match_type']);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 读取单个替代关系
     */
    public function read($id)
    {
        $item = SkProductAlternate::with([
            'model' => function($q) { $q->field('id, model_code, model_name'); },
            'alternateModel' => function($q) { $q->field('id, model_code, model_name'); }
        ])->find($id);

        if (!$item) {
            return $this->error('替代关系不存在');
        }
        return $this->success($item);
    }

    /**
     * 新增替代关系
     */
    public function save()
    {
        $data = $this->request->post();

        $validate = $this->validate($data, [
            'model_id' => 'require|integer',
            'alternate_model_id' => 'require|integer',
            'match_type' => 'require|in:DIRECT,FUNCTIONAL',
        ]);

        if ($validate !== true) {
            return $this->error($validate);
        }

        if ($data['model_id'] == $data['alternate_model_id']) {
            return $this->error('原型号和替代型号不能相同');
        }

        $exists = SkProductAlternate::where('model_id', $data['model_id'])
            ->where('alternate_model_id', $data['alternate_model_id'])
            ->find();
        if ($exists) {
            return $this->error('该替代关系已存在');
        }

        try {
            SkProductAlternate::create($data);
            return $this->success([], '添加成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('添加失败');
        }
    }

    /**
     * 更新替代关系
     */
    public function update($id)
    {
        $item = SkProductAlternate::find($id);
        if (!$item) {
            return $this->error('替代关系不存在');
        }

        $data = $this->request->put();
        try {
            $item->save($data);
            return $this->success([], '更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('更新失败');
        }
    }

    /**
     * 删除替代关系
     */
    public function delete($id)
    {
        $item = SkProductAlternate::find($id);
        if (!$item) {
            return $this->error('替代关系不存在');
        }

        try {
            $item->delete();
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('删除失败');
        }
    }
}
