<?php
/**
 * 天启芯科技 - 语言类型管理 API（后台）
 * 对标 CRMEB adminapi/controller/v1/setting/LangType
 */
namespace app\controller\admin;

use app\controller\BaseController;
use app\service\system\lang\LangTypeService;
use think\facade\Cache;

class LangTypeAdminController extends BaseController
{
    protected $service;

    public function __construct(\think\App $app, LangTypeService $service)
    {
        parent::__construct($app);
        $this->service = $service;
    }

    /**
     * 语言类型列表
     * 获取语言类型列表 (GET /admin/lang_types)
     */
    public function index()
    {
        try {
            $where = [
                'is_del' => 0,
            ];
            $result = $this->service->getList($where);
            return $this->success($result);
        } catch (\Exception $e) {
            $this->logError('Get lang types error: ' . $e->getMessage());
            return $this->error('获取语言列表失败');
        }
    }

    /**
     * 语言类型详情
     * 获取语言类型详情 (GET /admin/lang_types/:id)
     */
    public function read($id)
    {
        try {
            $type = $this->service->getDao()->get($id);
            if (!$type) return $this->error('语言不存在', 404);
            return $this->success($type->toArray());
        } catch (\Exception $e) {
            return $this->error('获取语言详情失败');
        }
    }

    /**
     * 新增语言类型
     * 创建语言类型 (POST /admin/lang_types)
     */
    public function save()
    {
        try {
            $data = $this->request->post();
            
            $this->validate($data, [
                'language_name' => 'require',
                'file_name'     => 'require',
            ], [
                'language_name.require' => '语言名称不能为空',
                'file_name.require'     => '语言标识不能为空',
            ]);

            $this->service->save([
                'language_name' => $data['language_name'],
                'file_name'     => $data['file_name'],
                'is_default'    => $data['is_default'] ?? 0,
                'status'        => $data['status'] ?? 1,
            ]);

            return $this->success([], '创建语言成功');
        } catch (\Exception $e) {
            $this->logError('Create lang type error: ' . $e->getMessage());
            return $this->error($e->getMessage() ?: '创建语言失败');
        }
    }

    /**
     * 更新语言类型
     * 更新语言类型 (PUT /admin/lang_types/:id)
     */
    public function update($id)
    {
        try {
            $data = $this->request->put();

            $type = $this->service->getDao()->get($id);
            if (!$type) return $this->error('语言不存在', 404);

            $this->service->save([
                'id'            => (int)$id,
                'language_name' => $data['language_name'] ?? $type->language_name,
                'file_name'     => $data['file_name'] ?? $type->file_name,
                'is_default'    => $data['is_default'] ?? $type->is_default,
                'status'        => $data['status'] ?? $type->status,
            ]);

            return $this->success([], '更新语言成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '更新语言失败');
        }
    }

    /**
     * 删除语言类型（软删除）
     * 删除语言类型 (DELETE /admin/lang_types/:id)
     */
    public function delete($id)
    {
        try {
            $type = $this->service->getDao()->get($id);
            if (!$type) return $this->error('语言不存在', 404);

            if ($type->is_default == 1) {
                return $this->error('不能删除默认语言');
            }

            $this->service->delete((int)$id);
            return $this->success([], '删除语言成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '删除语言失败');
        }
    }

    /**
     * 切换语言状态
     * 更新语言类型状态 (PUT /admin/lang_types/:id/status)
     */
    public function updateStatus($id)
    {
        try {
            $type = $this->service->getDao()->get($id);
            if (!$type) return $this->error('语言不存在', 404);

            if ($type->is_default == 1 && $type->status == 1) {
                return $this->error('不能禁用默认语言');
            }

            $newStatus = $type->status == 1 ? 0 : 1;
            $this->service->updateStatus((int)$id, $newStatus);
            return $this->success([], '更新状态成功');
        } catch (\Exception $e) {
            return $this->error('更新状态失败');
        }
    }

    /**
     * 设置为默认语言
     * 设置默认语言类型 (PUT /admin/lang_types/:id/set-default)
     */
    public function setDefault($id)
    {
        try {
            $type = $this->service->getDao()->get($id);
            if (!$type) return $this->error('语言不存在', 404);

            $this->service->save([
                'id'         => (int)$id,
                'is_default' => 1,
                'status'     => 1,
            ]);

            return $this->success([], '设置默认语言成功');
        } catch (\Exception $e) {
            return $this->error('设置默认语言失败');
        }
    }
}
