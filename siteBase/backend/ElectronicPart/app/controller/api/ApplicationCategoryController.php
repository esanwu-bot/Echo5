<?php
/**
 * 电子元器件商城 - 应用分类接口
 * 文件说明：提供应用/用途分类查询（例如器件用途分类）
 */

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkApplication;
use app\model\SkApplicationCategory;

class ApplicationCategoryController extends BaseController
{
    /**
     * 获取应用分类列表
     */
    public function index()
    {
        $lang = $this->getLang();
        $cacheKey = 'application_category_index_' . $lang;

        $list = \think\facade\Cache::remember($cacheKey, function () {
            $list = SkApplicationCategory::where('status', 1)
                ->order('sort', 'asc')
                ->order('id', 'desc')
                ->select();

            $list = $this->localizeCollection($list, ['name']);

            // 为每个分类附加首个启用应用的封面图
            foreach ($list as $key => $category) {
                $firstAppCover = SkApplication::where('category_id', $category['id'])
                    ->where('status', 1)
                    ->order('sort', 'asc')
                    ->order('id', 'asc')
                    ->value('cover_image');
                $list[$key]['cover_image'] = $firstAppCover ?: '';
            }

            return $this->processImageUrls($list, ['cover_image']);
        }, 3600);

        return $this->success($list);
    }

    /**
     * 获取分类详情
     */
    public function read($id)
    {
        $category = SkApplicationCategory::where('status', 1)->find($id);

        if (!$category) {
            return $this->error('分类不存在');
        }

        $lang = $this->getLang();
        $cacheKey = 'application_category_read_applications_' . $lang . '_' . $id;

        $categoryData = \think\facade\Cache::remember($cacheKey, function () use ($id) {
            // 查询分类并预加载启用的应用列表，按 sort 升序排列，同时统计关联产品数量
            $category = SkApplicationCategory::where('status', 1)
                ->with(['applications' => function ($query) {
                    $query->where('status', 1)
                        ->order('sort', 'asc')
                        ->withCount('products');
                }])
                ->find($id);

            // 本地化分类名称
            $categoryData = $this->localizeItem($category, ['name']);

            // 本地化应用列表的 title 和 description 字段
            if (!empty($category->applications)) {
                $applications = $this->localizeCollection($category->applications, ['title', 'description']);
                // 只保留需要的字段：id, title, description, cover_image, sort, products_count
                $categoryData['applications'] = array_map(function ($app) {
                    return [
                        'id' => $app['id'],
                        'title' => $app['title'],
                        'description' => $app['description'],
                        'cover_image' => $app['cover_image'],
                        'sort' => $app['sort'],
                        'products_count' => $app['products_count'],
                    ];
                }, $applications);
            } else {
                $categoryData['applications'] = [];
            }

            return $categoryData;
        }, 3600);

        return $this->success($categoryData);
    }
}
