<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\Certificate;
use think\exception\ValidateException;
use think\facade\Log;

class CertificateController extends BaseController
{
    /**
     * 获取资质证书列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;

        $query = Certificate::where([]);
        if (!empty($params['keyword'])) {
            $query->where('cert_name|description', 'like', '%' . $params['keyword'] . '%');
        }
        $total = $query->count();
        $list = $query->order('sort', 'asc')->order('id', 'desc')->page($page, $limit)->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取资质证书详情
     */
    public function read($id)
    {
        $cert = Certificate::find($id);
        if (!$cert) return $this->error('证书不存在', 404);
        return $this->success($cert);
    }

    /**
     * 创建资质证书
     */
    public function save()
    {
        try {
            $data = $this->request->param();
            $cert = Certificate::create($data);
            return $this->success($cert, '创建成功');
        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error('Create cert error: ' . $e->getMessage());
            return $this->error('创建失败');
        }
    }

    /**
     * 更新资质证书
     */
    public function update($id)
    {
        try {
            $cert = Certificate::find($id);
            if (!$cert) return $this->error('证书不存在', 404);
            $data = $this->request->param();
            $cert->save($data);
            return $this->success($cert, '更新成功');
        } catch (\Exception $e) {
            Log::error('Update cert error: ' . $e->getMessage());
            return $this->error('更新失败');
        }
    }

    /**
     * 删除资质证书
     */
    public function delete($id)
    {
        try {
            $cert = Certificate::find($id);
            if (!$cert) return $this->error('证书不存在', 404);
            $cert->delete();
            return $this->success(null, '删除成功');
        } catch (\Exception $e) {
            Log::error('Delete cert error: ' . $e->getMessage());
            return $this->error('删除失败');
        }
    }

    /**
     * 批量删除资质证书
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的证书');
            }
            Certificate::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete certs error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }
}
