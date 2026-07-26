<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProductSupplier;
use app\model\SkProduct;
use app\model\SkSupplier;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class ProductSupplierController extends BaseController
{
    /**
     * 获取商品供应商关联列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkProductSupplier::with(['product', 'supplier']);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where(function($q) use ($keyword) {
                $q->whereHas('product', function($pq) use ($keyword) {
                    $pq->where('name|product_code', 'like', '%' . $keyword . '%');
                })->orWhereHas('supplier', function($sq) use ($keyword) {
                    $sq->where('name|contact_person|email', 'like', '%' . $keyword . '%');
                });
            });
        }

        if (!empty($params['product_id'])) {
            $query->where('product_id', $params['product_id']);
        }

        if (!empty($params['supplier_id'])) {
            $query->where('supplier_id', $params['supplier_id']);
        }

        if (isset($params['is_primary']) && $params['is_primary'] !== '') {
            $query->where('is_primary', $params['is_primary']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取商品供应商关联详情
     */
    public function read($id)
    {
        $productSupplier = SkProductSupplier::with(['product', 'supplier'])->find($id);
        if (!$productSupplier) {
            return $this->error('产品供应商关联不存在');
        }
        return $this->success($productSupplier);
    }

    /**
     * 创建商品供应商关联
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->request->param();
            
            // 验证必填字段
            if (empty($data['product_id'])) {
                return $this->error('产品ID为必填项');
            }
            if (empty($data['supplier_id'])) {
                return $this->error('供应商ID为必填项');
            }
            if (empty($data['min_order_quantity'])) {
                $data['min_order_quantity'] = 1;
            }
            
            // 检查商品是否存在
            if (!SkProduct::find($data['product_id'])) {
                return $this->error('产品不存在');
            }
            
            // 检查供应商是否存在
            if (!SkSupplier::find($data['supplier_id'])) {
                return $this->error('供应商不存在');
            }
            
            // 检查关联是否已存在
            if (SkProductSupplier::where('product_id', $data['product_id'])
                               ->where('supplier_id', $data['supplier_id'])
                               ->find()) {
                return $this->error('产品供应商关联已存在');
            }
            
            // 设置默认值
            $data['status'] = $data['status'] ?? 1;
            $data['is_primary'] = $data['is_primary'] ?? 0;
            
            $productSupplier = SkProductSupplier::create($data);
            
            Db::commit();
            return $this->success($productSupplier, '产品供应商关联创建成功');
            
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
     * 更新商品供应商关联
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $productSupplier = SkProductSupplier::find($id);
            if (!$productSupplier) {
                return $this->error('产品供应商关联不存在');
            }
            
            $data = $this->request->param();
            
            // 如果商品或供应商发生变更则验证
            if (isset($data['product_id']) && $data['product_id'] !== $productSupplier->product_id) {
                if (!SkProduct::find($data['product_id'])) {
                    return $this->error('产品不存在');
                }
            }
            
            if (isset($data['supplier_id']) && $data['supplier_id'] !== $productSupplier->supplier_id) {
                if (!SkSupplier::find($data['supplier_id'])) {
                    return $this->error('供应商不存在');
                }
                
                // 检查新关联是否已存在
                if (SkProductSupplier::where('product_id', $data['product_id'])
                                   ->where('supplier_id', $data['supplier_id'])
                                   ->where('id', '<>', $id)
                                   ->find()) {
                    return $this->error('产品供应商关联已存在');
                }
            }
            
            $productSupplier->save($data);
            
            Db::commit();
            return $this->success($productSupplier, '产品供应商关联更新成功');
            
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
     * 批量删除产品供应商关联
     */
    public function batchDelete()
    {
        Db::startTrans();
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的关联');
            }
            SkProductSupplier::destroy($ids);
            Db::commit();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除商品供应商关联
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $productSupplier = SkProductSupplier::find($id);
            if (!$productSupplier) {
                return $this->error('产品供应商关联不存在');
            }
            
            // 删除关联
            $productSupplier->delete();
            
            Db::commit();
            return $this->success([], '产品供应商关联删除成功');
            
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取指定商品的供应商
     */
    public function getByProduct($productId)
    {
        $suppliers = SkProductSupplier::with('supplier')
                                     ->where('product_id', $productId)
                                     ->where('status', 1)
                                     ->order('is_primary', 'desc')
                                     ->order('id', 'desc')
                                     ->select();
        
        return $this->success($suppliers);
    }

    /**
     * 获取指定供应商的商品
     */
    public function getBySupplier($supplierId)
    {
        $products = SkProductSupplier::with('product')
                                     ->where('supplier_id', $supplierId)
                                     ->where('status', 1)
                                     ->order('is_primary', 'desc')
                                     ->order('id', 'desc')
                                     ->select();
        
        return $this->success($products);
    }
}