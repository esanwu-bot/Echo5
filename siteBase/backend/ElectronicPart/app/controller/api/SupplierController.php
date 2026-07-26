<?php
/**
 * 电子元器件商城 - 供应商管理接口
 * 文件说明：提供供应商列表、详情与 CRUD 接口，用于后台或系统间供应商管理。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkSupplier;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 供应商管理API控制器
 * @package app\controller\api
 */
class SupplierController extends BaseController
{
    /**
     * 获取供应商列表
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();

            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $keyword = trim((string)($params['keyword'] ?? ''));
            $status = (int)($params['status'] ?? -1);

            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'supplier_index_' . $lang . '_p' . $page . '_l' . $limit . '_k' . $keyword . '_s' . $status;

            $data = Cache::remember($cacheKey, function () use ($page, $limit, $keyword, $status) {
                $query = SkSupplier::order('created_at', 'desc');

                if ($keyword !== '') {
                    $query->whereLike('supplier_code|name|contact_person|contact_phone|contact_email', "%{$keyword}%");
                }

                if ($status >= 0) {
                    $query->where('status', $status);
                }

                $total = (clone $query)->count();
                $list = $query->page($page, $limit)->select()->toArray();

                return [
                    'total' => $total,
                    'list' => $list,
                    'page' => $page,
                    'limit' => $limit
                ];
            }, 3600);

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取供应商详情
     */
    public function read(string $id): Response
    {
        $lang = $this->request->lang ?? 'zh';
        $cacheKey = 'supplier_read_' . $id . '_' . $lang;

        $data = Cache::remember($cacheKey, function () use ($id) {
            $supplier = SkSupplier::find($id);

            if (!$supplier) {
                return null;
            }

            return $supplier;
        }, 3600);

        try {
            if ($data === null) {
                return $this->error('供应商不存在', 404);
            }

            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 创建供应商
     */
    public function save(): Response
    {
        try {
            $data = $this->request->post();

            // 验证数据
            $validate = $this->validate($data, [
                'supplier_code' => 'require|unique:sk_suppliers',
                'name' => 'require',
                'contact_person' => 'require',
                'contact_phone' => 'require',
                'contact_email' => 'require|email',
            ]);

            if (true !== $validate) {
                return $this->error($validate, 400);
            }

            $supplier = SkSupplier::create($data);

            return $this->success($supplier, '供应商创建成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新供应商
     */
    public function update(int $id): Response
    {
        try {
            $supplier = SkSupplier::find($id);

            if (!$supplier) {
                return $this->error('供应商不存在', 404);
            }

            $data = $this->request->put();

            // 验证数据
            $validate = $this->validate($data, [
                'supplier_code' => 'require|unique:sk_suppliers,supplier_code,' . $id,
                'name' => 'require',
                'contact_person' => 'require',
                'contact_phone' => 'require',
                'contact_email' => 'require|email',
            ]);

            if (true !== $validate) {
                return $this->error($validate, 400);
            }

            $supplier->save($data);

            return $this->success($supplier, '供应商更新成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 删除供应商
     */
    public function delete(int $id): Response
    {
        try {
            $supplier = SkSupplier::find($id);

            if (!$supplier) {
                return $this->error('供应商不存在', 404);
            }

            // 检查是否有产品关联
            if ($supplier->products()->count() > 0) {
                return $this->error('该供应商下有产品关联，无法删除', 400);
            }

            $supplier->delete();

            return $this->success([], '供应商删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
