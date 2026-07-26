<?php
/**
 * 电子元器件商城 - 应用/用途管理（后台）
 * 文件说明：管理应用场景与其关联产品，支持图片上传与后台维护操作。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkApplication;
use app\model\SkApplicationProduct;
use app\model\SkProduct;
use app\service\UploadService;
use think\exception\ValidateException;
use think\exception\ClassNotFoundException;
use think\facade\Db;
use think\facade\Log;

class ApplicationController extends BaseController
{
    /**
     * 获取应用领域列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkApplication::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('title|description|content', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['category_id'])) {
            $query->where('category_id', $params['category_id']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->with(['category'])
                     ->order('sort', 'asc')
                     ->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        $baseUrl = $this->getWebsiteUrl();
        
        // 获取每个应用的商品数量并处理图片URL
        foreach ($list as &$application) {
            $application['product_count'] = SkApplicationProduct::where('application_id', $application['id'])->count();
            $application['cover_image'] = $this->getFullUrl($application['cover_image'], $baseUrl);
        }

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取应用详情
     */
    public function read($id)
    {
        $application = SkApplication::with(['category'])->find($id);

        if (!$application) {
            return $this->error('应用不存在');
        }

        $baseUrl = $this->getWebsiteUrl();
        $applicationData = $application->toArray();
        $applicationData['cover_image'] = $this->getFullUrl($applicationData['cover_image'] ?? '', $baseUrl);

        // 获取关联商品
        $productIds = SkApplicationProduct::where('application_id', $id)->column('product_id');
        $products = [];
        if (!empty($productIds)) {
            $products = SkProduct::whereIn('id', $productIds)
                                ->field('id, name, product_code')
                                ->select();
        }
        $applicationData['products'] = $products;

        return $this->success($applicationData);
    }

    /**
     * 创建新应用领域
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkApplication.save');

            $products = $data['products'] ?? [];
            unset($data['products']);

            $application = SkApplication::create($data);

            // 关联商品
            if (!empty($products)) {
                $this->associateProducts($application->id, $products);
            }

            Db::commit();
            
            $baseUrl = $this->getWebsiteUrl();
            $applicationData = $application->toArray();
            $applicationData['cover_image'] = $this->getFullUrl($applicationData['cover_image'] ?? '', $baseUrl);
            
            return $this->success($applicationData, '应用创建成功');

        } catch (ValidateException $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新应用领域
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $application = SkApplication::find($id);
            if (!$application) {
                return $this->error('应用不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkApplication.update');

            $products = $data['products'] ?? null;
            unset($data['products']);

            $application->save($data);

            // 更新商品关联
            if (is_array($products)) {
                // 首先删除现有关联
                SkApplicationProduct::where('application_id', $id)->delete();

                // 然后创建新关联
                if (!empty($products)) {
                    $this->associateProducts($id, $products);
                }
            }

            Db::commit();
            
            $baseUrl = $this->getWebsiteUrl();
            $applicationData = $application->toArray();
            $applicationData['cover_image'] = $this->getFullUrl($applicationData['cover_image'] ?? '', $baseUrl);
            
            return $this->success($applicationData, '应用更新成功');

        } catch (ValidateException $e) {
            Db::rollback();
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除应用领域
     */
    public function batchDelete()
    {
        Db::startTrans();
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的应用');
            }
            foreach ($ids as $id) {
                SkApplicationProduct::where('application_id', $id)->delete();
                SkApplication::destroy($id);
            }
            Db::commit();
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除应用领域
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $application = SkApplication::find($id);
            if (!$application) {
                return $this->error('应用不存在');
            }

            // 删除关联商品
            SkApplicationProduct::where('application_id', $id)->delete();

            // 删除应用
            $application->delete();

            Db::commit();
            return $this->success(null, '应用删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新应用状态
     */
    public function updateStatus($id)
    {
        try {
            $application = SkApplication::find($id);
            if (!$application) {
                return $this->error('应用不存在');
            }

            $status = $this->request->param('status', 0);
            $application->status = $status;
            $application->save();

            $baseUrl = $this->getWebsiteUrl();
            $applicationData = $application->toArray();
            $applicationData['cover_image'] = $this->getFullUrl($applicationData['cover_image'] ?? '', $baseUrl);
            
            return $this->success($applicationData, '应用状态更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取所有可供选择的商品
     */
    public function getAvailableProducts()
    {
        $products = SkProduct::where('status', 1)
                            ->field('id, name, product_code')
                            ->order('name', 'asc')
                            ->select();

        return $this->success($products);
    }

    /**
     * 上传应用封面图片
     */
    public function uploadImage()
    {
        try {
            // 获取上传的文件
            $file = $this->request->file('file');
            
            if (!$file) {
                return $this->error('请上传文件');
            }
            
            // 使用UploadService上传图片
            $result = UploadService::uploadImage($file, 'applications');
            
            return $this->success([
                'url' => $result['url'],
                'name' => $result['name'],
                'size' => $result['size'],
                'mime' => $result['mime']
            ], '图片上传成功');
            
        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 关联商品与应用（辅助方法）
     */
    private function associateProducts($applicationId, $products)
    {
        $data = [];
        foreach ($products as $productId) {
            if (SkProduct::find($productId)) {
                $data[] = [
                    'application_id' => $applicationId,
                    'product_id' => $productId
                ];
            }
        }

        if (!empty($data)) {
            (new SkApplicationProduct)->saveAll($data);
        }
    }
}
