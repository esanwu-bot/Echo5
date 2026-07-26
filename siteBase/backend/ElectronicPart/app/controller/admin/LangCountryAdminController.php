<?php
/**
 * 天启芯科技 - 浏览器语言映射管理 API（后台）
 * 对标 CRMEB adminapi/controller/v1/setting/LangCountry
 */
namespace app\controller\admin;

use app\controller\BaseController;
use app\service\system\lang\LangCountryService;

class LangCountryAdminController extends BaseController
{
    protected $service;

    public function __construct(\think\App $app, LangCountryService $service)
    {
        parent::__construct($app);
        $this->service = $service;
    }

    /**
     * 地区语言映射列表
     * 获取语言国家列表 (GET /admin/lang_countries)
     */
    public function index()
    {
        try {
            $where = $this->request->get();
            // 移除分页参数，避免传入模型 where 条件导致 SQL 错误
            unset($where['page'], $where['limit']);
            $result = $this->service->getList($where);
            return $this->success($result);
        } catch (\Exception $e) {
            $this->logError('获取地区映射列表失败', ['error' => $e->getMessage()]);
            return $this->error('获取地区映射列表失败');
        }
    }

    /**
     * 地区映射详情
     * 获取语言国家详情 (GET /admin/lang_countries/:id)
     */
    public function read($id)
    {
        try {
            $item = $this->service->getDao()->get($id);
            if (!$item) return $this->error('数据不存在', 404);
            return $this->success($item->toArray());
        } catch (\Exception $e) {
            return $this->error('获取详情失败');
        }
    }

    /**
     * 新增地区映射
     * 创建语言国家 (POST /admin/lang_countries)
     */
    public function save()
    {
        try {
            $data = $this->request->post();
            
            $this->validate($data, [
                'code' => 'require',
                'name' => 'require',
            ], [
                'code.require' => '语言识别码不能为空',
                'name.require' => '地区名称不能为空',
            ]);

            $this->service->save(0, [
                'code'    => $data['code'],
                'name'    => $data['name'],
                'type_id' => $data['type_id'] ?? 0,
            ]);

            return $this->success([], '添加成功');
        } catch (\Exception $e) {
            return $this->error($e->getMessage() ?: '添加失败');
        }
    }

    /**
     * 更新地区映射
     * 更新语言国家 (PUT /admin/lang_countries/:id)
     */
    public function update($id)
    {
        try {
            $data = $this->request->put();

            $item = $this->service->getDao()->get($id);
            if (!$item) return $this->error('数据不存在', 404);

            $this->service->save((int)$id, [
                'code'    => $data['code'] ?? $item->code,
                'name'    => $data['name'] ?? $item->name,
                'type_id' => $data['type_id'] ?? $item->type_id,
            ]);

            return $this->success([], '更新成功');
        } catch (\Exception $e) {
            return $this->error('更新失败');
        }
    }

    /**
     * 删除地区映射
     * 删除语言国家 (DELETE /admin/lang_countries/:id)
     */
    public function delete($id)
    {
        try {
            $this->service->delete((int)$id);
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            return $this->error('删除失败');
        }
    }

    /**
     * 批量删除地区映射
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的地区映射');
            }
            $failed = [];
            foreach ($ids as $id) {
                try {
                    $this->service->delete((int)$id);
                } catch (\Exception $e) {
                    $failed[] = $id;
                }
            }
            if (!empty($failed)) {
                return $this->success(null, '部分删除成功，' . count($failed) . ' 条失败');
            }
            return $this->success([], '批量删除成功');
        } catch (\Exception $e) {
            return $this->error('批量删除失败');
        }
    }

    /**
     * 切换状态
     * 更新语言国家状态 (PUT /admin/lang_countries/:id/status)
     */
    public function updateStatus($id)
    {
        try {
            $data = $this->request->put();
            $status = isset($data['status']) ? (int)$data['status'] : null;
            if ($status === null || !in_array($status, [0, 1], true)) {
                return $this->error('状态值无效');
            }

            $item = $this->service->getDao()->get($id);
            if (!$item) return $this->error('数据不存在', 404);

            $this->service->updateStatus((int)$id, $status);
            return $this->success([], '更新状态成功');
        } catch (\Exception $e) {
            return $this->error('更新状态失败');
        }
    }
}
