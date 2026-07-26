<?php

namespace app\controller\admin;

use app\BaseController;
use app\model\SkProductPriceBreak;
use app\validate\ProductPriceBreak;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class PriceBreakController extends BaseController
{
    /**
     * 获取价格区间列表
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $data = SkProductPriceBreak::getList($params);
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '获取价格区间列表失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 获取价格区间详情
     */
    public function read($id)
    {
        try {
            $priceBreak = SkProductPriceBreak::find($id);
            
            if (!$priceBreak) {
                return json([
                    'code' => 404,
                    'message' => '价格区间不存在'
                ], 404);
            }
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $priceBreak
            ]);
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '获取价格区间详情失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 创建价格区间
     */
    public function save()
    {
        Db::startTrans();
        try {
            // 验证数据
            $data = $this->request->post();
            validate(ProductPriceBreak::class)->scene('create')->check($data);
            
            // 检查价格区间是否已存在
            $exists = SkProductPriceBreak::checkExists($data['product_id'], $data['quantity']);
            if ($exists) {
                return json([
                    'code' => 400,
                    'message' => '该商品的该数量区间已存在'
                ], 400);
            }
            
            // 创建价格区间
            $priceBreak = new SkProductPriceBreak();
            $priceBreak->save($data);
            
            Db::commit();
            
            return json([
                'code' => 200,
                'message' => '创建成功',
                'data' => $priceBreak
            ]);
        } catch (ValidateException $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 400,
                'message' => '服务器内部错误，请稍后重试'
            ], 400);
        } catch (\Exception $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '创建价格区间失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 更新价格区间
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $priceBreak = SkProductPriceBreak::find($id);
            if (!$priceBreak) {
                return json([
                    'code' => 404,
                    'message' => '价格区间不存在'
                ], 404);
            }
            
            // 验证数据
            $data = $this->request->put();
            validate(ProductPriceBreak::class)->scene('update')->check($data);
            
            // 如果更新了数量，检查是否已存在
            if (!empty($data['quantity'])) {
                $exists = SkProductPriceBreak::checkExists(
                    $priceBreak->product_id,
                    $data['quantity'],
                    $id
                );
                if ($exists) {
                    return json([
                        'code' => 400,
                        'message' => '该商品的该数量区间已存在'
                    ], 400);
                }
            }
            
            // 更新价格区间
            $priceBreak->save($data);
            
            Db::commit();
            
            return json([
                'code' => 200,
                'message' => '更新成功',
                'data' => $priceBreak
            ]);
        } catch (ValidateException $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 400,
                'message' => '服务器内部错误，请稍后重试'
            ], 400);
        } catch (\Exception $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '更新价格区间失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 删除价格区间
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $priceBreak = SkProductPriceBreak::find($id);
            if (!$priceBreak) {
                return json([
                    'code' => 404,
                    'message' => '价格区间不存在'
                ], 404);
            }
            
            // 删除价格区间
            $priceBreak->delete();
            
            Db::commit();
            
            return json([
                'code' => 200,
                'message' => '删除成功'
            ]);
        } catch (\Exception $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '删除价格区间失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 获取商品的价格区间列表
     */
    public function byProduct($productId)
    {
        try {
            $priceBreaks = SkProductPriceBreak::getByProductId($productId);
            
            return json([
                'code' => 200,
                'message' => 'success',
                'data' => $priceBreaks
            ]);
        } catch (\Exception $e) {Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '获取商品价格区间失败：' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 批量删除价格区间
     */
    public function batchDelete()
    {
        Db::startTrans();
        try {
            $data = $this->request->delete();
            
            if (empty($data['ids'])) {
                return json([
                    'code' => 400,
                    'message' => '请选择要删除的价格区间'
                ], 400);
            }
            
            $ids = is_array($data['ids']) ? $data['ids'] : explode(',', $data['ids']);
            
            SkProductPriceBreak::whereIn('id', $ids)->delete();
            
            Db::commit();
            
            return json([
                'code' => 200,
                'message' => '批量删除成功'
            ]);
        } catch (\Exception $e) {
            Db::rollback();Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            
            return json([
                'code' => 500,
                'message' => '批量删除失败：' . $e->getMessage()
            ], 500);
        }
    }
}
