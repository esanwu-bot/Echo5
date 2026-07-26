<?php
/**
 * 电子元器件商城 - 产品系列管理控制器
 * 文件说明：提供后台产品系列（SPU）的增删改查接口，系列实际使用 sk_product 表。
 * 路由：/admin/series
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkProduct;
use app\model\SkProductModel;
use app\model\SkCategory;
use app\model\SkBrand;
use think\facade\Db;
use think\facade\Log;

class SeriesController extends BaseController
{
    /**
     * 产品系列列表
     *
     * @access public
     * @return Response
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;

        $query = SkProduct::with(['category', 'brand']);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('name|product_code|mpn_prefix|description', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['category_id'])) {
            $query->where('category_fk_id', $params['category_id']);
        }

        if (!empty($params['brand_id'])) {
            $query->where('brand_id', $params['brand_id']);
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->withCount(['seriesModels'])
                     ->order('sort', 'asc')
                     ->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        // 处理图片URL和型号数量
        $baseUrl = $this->getWebsiteUrl();
        foreach ($list as &$item) {
            $item['image'] = $this->getFullUrl($item['image'] ?? ($item['images'] ? (is_array($item['images']) ? ($item['images'][0] ?? '') : $item['images']) : ''), $baseUrl);
            $item['model_count'] = $item->series_models_count ?? 0;
        }

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取系列详情
     *
     * @access public
     * @param int|string $id
     * @return Response
     */
    public function read($id)
    {
        $series = SkProduct::with(['category', 'brand'])->find($id);
        if (!$series) {
            return $this->error('系列不存在');
        }

        $seriesData = $series->toArray();
        $baseUrl = $this->getWebsiteUrl();
        $seriesData['image'] = $this->getFullUrl($seriesData['image'] ?? '', $baseUrl);

        // 获取关联型号数量
        $seriesData['model_count'] = SkProductModel::where('series_id', $id)->count();

        return $this->success($seriesData);
    }

    /**
     * 创建产品系列
     *
     * @access public
     * @return Response
     */
    public function save()
    {
        Db::startTrans();
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());

            $validate = $this->validate($data, [
                'name' => 'require|max:255',
            ]);
            if ($validate !== true) {
                return $this->error($validate);
            }

            // 分类校验（sk_product 使用 category_fk_id）
            if (!empty($data['category_id'])) {
                $data['category_fk_id'] = $data['category_id'];
                unset($data['category_id']);
            }
            if (!empty($data['category_fk_id']) && !SkCategory::find($data['category_fk_id'])) {
                return $this->error('分类不存在');
            }

            if (!empty($data['brand_id']) && !SkBrand::find($data['brand_id'])) {
                return $this->error('品牌不存在');
            }

            $data['status'] = $data['status'] ?? 1;
            $data['sort'] = $data['sort'] ?? 0;
            $data['is_on_sale'] = $data['is_on_sale'] ?? 1;

            // 处理图片
            if (!empty($data['image'])) {
                $images = $data['images'] ?? [];
                if (is_string($images)) {
                    $images = json_decode($images, true) ?: [];
                }
                if (!in_array($data['image'], $images)) {
                    array_unshift($images, $data['image']);
                }
                $data['images'] = $images;
            }

            $series = SkProduct::create($data);

            Db::commit();
            return $this->success($series, '创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('创建失败');
        }
    }

    /**
     * 更新产品系列
     *
     * @access public
     * @param int|string $id
     * @return Response
     */
    public function update($id)
    {
        Db::startTrans();
        try {
            $series = SkProduct::find($id);
            if (!$series) {
                return $this->error('系列不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());

            // 分类字段映射
            if (isset($data['category_id'])) {
                $data['category_fk_id'] = $data['category_id'];
                unset($data['category_id']);
            }
            if (!empty($data['category_fk_id']) && !SkCategory::find($data['category_fk_id'])) {
                return $this->error('分类不存在');
            }

            if (!empty($data['brand_id']) && !SkBrand::find($data['brand_id'])) {
                return $this->error('品牌不存在');
            }

            // 处理图片
            if (!empty($data['image'])) {
                $images = $series->images ?? [];
                if (is_string($images)) {
                    $images = json_decode($images, true) ?: [];
                }
                if (!in_array($data['image'], $images)) {
                    array_unshift($images, $data['image']);
                }
                $data['images'] = $images;
            }

            $series->save($data);

            Db::commit();
            return $this->success($series, '更新成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('更新失败');
        }
    }

    /**
     * 删除产品系列
     *
     * @access public
     * @param int|string $id
     * @return Response
     */
    public function delete($id)
    {
        Db::startTrans();
        try {
            $series = SkProduct::find($id);
            if (!$series) {
                return $this->error('系列不存在');
            }

            // 检查是否有关联型号
            $modelCount = SkProductModel::where('series_id', $id)->count();
            if ($modelCount > 0) {
                return $this->error("该系列下存在 {$modelCount} 个型号，无法删除");
            }

            $series->delete();

            Db::commit();
            return $this->success([], '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('删除失败');
        }
    }
}
