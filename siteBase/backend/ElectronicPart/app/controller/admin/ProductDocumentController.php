<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProductDocument;
use think\facade\Log;

class ProductDocumentController extends BaseController
{
    /**
     * 产品文档列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;

        $query = SkProductDocument::order('id', 'desc');

        if (!empty($params['series_id'])) {
            $query->where('series_id', $params['series_id']);
        }
        if (!empty($params['model_id'])) {
            $query->where('model_id', $params['model_id']);
        }
        if (!empty($params['doc_type'])) {
            $query->where('doc_type', $params['doc_type']);
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 读取单个文档
     */
    public function read($id)
    {
        $item = SkProductDocument::find($id);
        if (!$item) {
            return $this->error('文档不存在');
        }
        return $this->success($item);
    }

    /**
     * 新增文档
     */
    public function save()
    {
        $data = $this->request->post();

        $validate = $this->validate($data, [
            'title' => 'require',
            'file_url' => 'require',
            'doc_type' => 'require|in:datasheet,application_note,reference_design,cad_model,certification,soldering_guide',
        ]);

        if ($validate !== true) {
            return $this->error($validate);
        }

        try {
            SkProductDocument::create($data);
            return $this->success([], '添加成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('添加失败');
        }
    }

    /**
     * 更新文档
     */
    public function update($id)
    {
        $item = SkProductDocument::find($id);
        if (!$item) {
            return $this->error('文档不存在');
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
     * 删除文档
     */
    public function delete($id)
    {
        $item = SkProductDocument::find($id);
        if (!$item) {
            return $this->error('文档不存在');
        }

        try {
            $item->delete();
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('删除失败');
        }
    }

    /**
     * 批量删除
     */
    public function batchDelete()
    {
        $ids = $this->request->post('ids');
        if (empty($ids)) {
            return $this->error('请选择要删除的文档');
        }

        try {
            SkProductDocument::destroy($ids);
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return $this->error('删除失败');
        }
    }
}
