<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkSupplier;
use app\model\SkProductSupplier;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class SupplierController extends BaseController
{
    /**
     * 获取供应商列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkSupplier::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('supplier_name|contact_person|contact_phone|contact_email', 'like', '%' . $keyword . '%');
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取供应商详情
     */
    public function read($id)
    {
        $supplier = SkSupplier::with(['products', 'productSuppliers', 'models'])->find($id);
        if (!$supplier) {
            return $this->error('供应商不存在');
        }
        return $this->success($supplier);
    }

    /**
     * 创建新供应商
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->request->param();
            
            // 验证必填字段
            if (empty($data['supplier_name'])) {
                return $this->error('供应商名称不能为空');
            }
            
            // 检查供应商名称是否已存在
            if (SkSupplier::where('supplier_name', $data['supplier_name'])->find()) {
                return $this->error('供应商名称已存在');
            }
            
            // 设置默认值
            $data['status'] = $data['status'] ?? 1;
            $data['is_active'] = $data['is_active'] ?? 1;
            $data['sort'] = $data['sort'] ?? 0;
            
            $supplier = SkSupplier::create($data);
            
            Db::commit();
            return $this->success($supplier, '供应商创建成功');
            
        } catch (ValidateException $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新供应商
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $supplier = SkSupplier::find($id);
            if (!$supplier) {
                return $this->error('供应商不存在');
            }
            
            $data = $this->request->param();
            
            // 检查供应商名称是否已存在（排除当前供应商）
            if (!empty($data['supplier_name']) && 
                $data['supplier_name'] !== $supplier->supplier_name && 
                SkSupplier::where('supplier_name', $data['supplier_name'])->find()) {
                return $this->error('供应商名称已存在');
            }
            
            $supplier->save($data);
            
            Db::commit();
            return $this->success($supplier, '供应商更新成功');
            
        } catch (ValidateException $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除供应商
     */
    public function batchDelete()
    {
        Db::startTrans();
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的供应商');
            }
            SkProductSupplier::whereIn('supplier_id', $ids)->delete();
            SkSupplier::destroy($ids);
            Db::commit();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除供应商
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $supplier = SkSupplier::find($id);
            if (!$supplier) {
                return $this->error('供应商不存在');
            }
            
            // 检查供应商是否关联了任何商品
            if ($supplier->productSuppliers()->count() > 0) {
                return $this->error('无法删除与产品关联的供应商');
            }
            
            // 删除供应商
            $supplier->delete();
            
            Db::commit();
            return $this->success([], '供应商删除成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取有效供应商
     */
    public function getActive()
    {
        $suppliers = SkSupplier::order('id', 'desc')
                              ->select();
        
        return $this->success($suppliers);
    }
}