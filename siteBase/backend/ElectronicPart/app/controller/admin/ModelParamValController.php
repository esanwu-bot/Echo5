<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkModelParamVal;
use app\model\SkProductModel;
use think\facade\Db;
use think\facade\Log;

class ModelParamValController extends BaseController
{
    /**
     * 型号参数值列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;

        $query = SkModelParamVal::with(['param' => function($q) {
            $q->field('id, name, code, unit');
        }]);

        if (!empty($params['model_id'])) {
            $query->where('model_id', $params['model_id']);
        }
        if (!empty($params['param_id'])) {
            $query->where('param_id', $params['param_id']);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 读取
     */
    public function read($id)
    {
        $item = SkModelParamVal::with('param')->find($id);
        if (!$item) {
            return $this->error('记录不存在');
        }
        return $this->success($item);
    }

    /**
     * 按型号获取所有参数
     */
    public function getByModel($modelId)
    {
        $items = SkModelParamVal::with(['param' => function($q) {
            $q->field('id, name, code, unit, type, data_type');
        }])
            ->where('model_id', $modelId)
            ->select();

        return $this->success($items);
    }

    /**
     * 新增/批量保存型号参数
     */
    public function save()
    {
        $data = $this->request->post();

        if (isset($data['model_id']) && isset($data['params']) && is_array($data['params'])) {
            return $this->batchSave($data['model_id'], $data['params']);
        }

        $validate = $this->validate($data, [
            'model_id' => 'require|integer',
            'param_id' => 'require|integer',
            'value' => 'require',
        ]);

        if ($validate !== true) {
            return $this->error($validate);
        }

        try {
            SkModelParamVal::create($data);
            return $this->success([], '添加成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('添加失败');
        }
    }

    /**
     * 批量保存型号参数
     */
    private function batchSave($modelId, array $params)
    {
        $model = SkProductModel::find($modelId);
        if (!$model) {
            return $this->error('型号不存在');
        }

        Db::startTrans();
        try {
            SkModelParamVal::where('model_id', $modelId)->delete();

            $rows = [];
            foreach ($params as $param) {
                if (empty($param['param_id']) || !isset($param['value'])) {
                    continue;
                }
                $rows[] = [
                    'model_id' => $modelId,
                    'param_id' => $param['param_id'],
                    'value' => $param['value'],
                    'value_numeric' => $param['value_numeric'] ?? null,
                ];
            }

            if (!empty($rows)) {
                (new SkModelParamVal())->saveAll($rows);
            }

            Db::commit();
            return $this->success([], '保存成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage());
            return $this->error('保存失败');
        }
    }

    /**
     * 更新
     */
    public function update($id)
    {
        $item = SkModelParamVal::find($id);
        if (!$item) {
            return $this->error('记录不存在');
        }

        try {
            $item->save($this->request->put());
            return $this->success([], '更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('更新失败');
        }
    }

    /**
     * 删除
     */
    public function delete($id)
    {
        $item = SkModelParamVal::find($id);
        if (!$item) {
            return $this->error('记录不存在');
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
