<?php
/**
 * 电子元器件商城 - 应用/用途分类（后台）
 * 文件说明：管理应用分类（如器件用途分类），用于后台维护与查询。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkApplicationCategory;
use think\exception\ValidateException;
use think\facade\Cache;
use think\facade\Log;

class ApplicationCategoryController extends BaseController
{
    /**
     * 清除应用分类相关缓存
     */
    protected function clearCategoryCache($id = null)
    {
        $langs = ['zh', 'en', 'ja', 'ko', 'zh_CN', 'en_US', 'ja_JP', 'ko_KR'];
        foreach ($langs as $lang) {
            Cache::delete('application_category_index_' . $lang);
            if ($id) {
                Cache::delete('application_category_read_applications_' . $lang . '_' . $id);
            }
        }
    }
    /**
     * 获取应用分类列表
     */
    public function index()
    {
        $params = $this->request->param();
        $query = SkApplicationCategory::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('name', 'like', '%' . $keyword . '%');
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $list = $query->order('sort', 'asc')
                     ->order('id', 'desc')
                     ->select();

        return $this->success($list);
    }

    /**
     * 获取分类详情
     */
    public function read($id)
    {
        $category = SkApplicationCategory::find($id);

        if (!$category) {
            return $this->error('分类不存在');
        }

        return $this->success($category);
    }

    /**
     * 创建新分类
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());
            // 简单验证
            if (empty($data['name'])) {
                return $this->error('分类名称不能为空');
            }

            $category = SkApplicationCategory::create($data);
            $this->clearCategoryCache($category->id);
            return $this->success($category, '分类创建成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新分类
     */
    public function update($id)
    {
        try {
            $category = SkApplicationCategory::find($id);
            if (!$category) {
                return $this->error('分类不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $category->save($data);
            $this->clearCategoryCache($category->id);

            return $this->success($category, '分类更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除应用分类
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的分类');
            }
            $failed = [];
            $deleted = 0;
            foreach ($ids as $id) {
                $category = SkApplicationCategory::find($id);
                if (!$category) continue;
                $appCount = \app\model\SkApplication::where('category_id', $id)->count();
                if ($appCount > 0) { $failed[] = "分类 {$category->name} 有关联应用"; continue; }
                $category->delete();
                $this->clearCategoryCache($id);
                $deleted++;
            }
            $msg = "成功删除 {$deleted} 个分类";
            if (!empty($failed)) $msg .= '，' . count($failed) . ' 个失败: ' . implode('; ', $failed);
            return $this->success(null, $msg);
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除分类
     */
    public function delete($id)
    {
        try {
            $category = SkApplicationCategory::find($id);
            if (!$category) {
                return $this->error('分类不存在');
            }

            // 检查该分类下是否存在应用
            $appCount = \app\model\SkApplication::where('category_id', $id)->count();
            if ($appCount > 0) {
                return $this->error('该分类下有关联应用，无法删除');
            }

            $category->delete();
            $this->clearCategoryCache($id);
            return $this->success(null, '分类删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新分类状态
     */
    public function updateStatus($id)
    {
        try {
            $category = SkApplicationCategory::find($id);
            if (!$category) {
                return $this->error('分类不存在');
            }

            $status = $this->request->param('status', 0);
            $category->status = $status;
            $category->save();
            $this->clearCategoryCache($category->id);

            return $this->success($category, '分类状态更新成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
