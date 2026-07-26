<?php
/**
 * 电子元器件商城 - 横幅管理（后台）
 * 文件说明：管理网站横幅（Banner）内容、位置与上下线时间，供后台使用。
 */

namespace app\controller\admin;
use think\facade\Log;

use app\controller\BaseController;
use app\model\SkBanner;
use think\exception\ValidateException;
use think\facade\Validate;

class BannerController extends BaseController
{
    /**
     * 获取横幅列表
     */
    public function index()
    {
        try {
            // 参数验证 - 只验证必要参数
            $validate = Validate::rule([
                'page' => 'integer|>=:1',
                'limit' => 'integer|between:1,100'
            ])->message([
                'page.integer' => '页码必须是整数',
                'limit.between' => '每页数量必须在1-100之间'
            ]);

            $params = $this->request->param();
           if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 20;
            $position = $params['position'] ?? '';
            $status = $params['status'] ?? '';

            $query = SkBanner::where([]);

            // 位置筛选
            if (!empty($position)) {
                $query->where('position', $position);
            }

            // 状态筛选
            ($status !== '') && $query->where('status', $status);

            $total = $query->count();
            $banners = $query->page($page, $limit)
                           ->order('sort', 'asc')
                           ->order('id', 'desc')
                           ->select();

            // 格式化横幅数据
            $bannerList = $banners->map(function($banner) {
                return [
                    'id' => $banner->id,
                    'title' => $banner->title,
                    'subtitle' => $banner->subtitle,
                    'image' => $banner->image,
                    'link' => $banner->link,
                    'position' => $banner->position,
                    'description' => $banner->description,
                    'sort' => $banner->sort,
                    'status' => $banner->status ? true : false,
                    'start_time' => $banner->start_time,
                    'end_time' => $banner->end_time,
                    'created_at' => $banner->created_at,
                    'updated_at' => $banner->updated_at
                ];
            });

            return $this->paginate($bannerList, $total, $page, $limit);

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Get banner list error: ' . $e->getMessage());
            return $this->error('获取横幅列表失败');
        }
    }

    /**
     * 创建横幅
     */
    public function create()
    {
        try {
            // 参数验证
            $validate = Validate::rule([
                'title' => 'require|length:1,255',
                'position' => 'require|in:home,product,about',
                'image' => 'require|length:1,500',
                'link' => 'max:500',
                'sort' => 'integer|>=:0',
                'status' => 'in:0,1',
                'subtitle' => 'max:255',
                'description' => 'max:1000',
                'start_time' => 'integer',
                'end_time' => 'integer'
            ])->message([
                'title.require' => '横幅标题不能为空',
                'title.length' => '横幅标题长度必须在1-255个字符之间',
                'position.require' => '显示位置不能为空',
                'position.in' => '显示位置值不正确',
                'image.require' => '横幅图片不能为空',
                'image.length' => '图片路径长度不能超过500个字符',
                'link.max' => '跳转链接长度不能超过500个字符',
                'sort.integer' => '排序值必须是整数',
                'sort.>=' => '排序值必须大于等于0',
                'status.in' => '状态值不正确',
                'subtitle.max' => '副标题长度不能超过255个字符',
                'description.max' => '描述长度不能超过1000个字符',
                'start_time.integer' => '开始时间必须是整数',
                'end_time.integer' => '结束时间必须是整数'
            ]);

            $params = $this->filterDeprecatedLangFields($this->request->param());
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            $bannerData = [
                'title' => $params['title'],
                'subtitle' => $params['subtitle'] ?? '',
                'image' => $params['image'],
                'link' => $params['link'] ?? '',
                'position' => $params['position'],
                'description' => $params['description'] ?? '',
                'sort' => $params['sort'] ?? 0,
                'status' => $params['status'] ?? 1,
                'start_time' => $params['start_time'] ?? null,
                'end_time' => $params['end_time'] ?? null
            ];

            $banner = SkBanner::create($bannerData);

            return $this->success([
                'id' => $banner->id,
                'title' => $banner->title,
                'position' => $banner->position
            ], '横幅创建成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Create banner error: ' . $e->getMessage());
            return $this->error('创建横幅失败');
        }
    }

    /**
     * 更新横幅
     */
    public function update($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('横幅ID无效');
            }

            $banner = SkBanner::find($id);
            if (!$banner) {
                return $this->error('横幅不存在');
            }

            // 参数验证
            $validate = Validate::rule([
                'title' => 'length:1,255',
                'position' => 'in:home,product,about',
                'image' => 'length:1,500',
                'link' => 'max:500',
                'sort' => 'integer|>=:0',
                'status' => 'in:0,1',
                'subtitle' => 'max:255',
                'description' => 'max:1000',
                'start_time' => 'integer',
                'end_time' => 'integer'
            ])->message([
                'title.length' => '横幅标题长度必须在1-255个字符之间',
                'position.in' => '显示位置值不正确',
                'image.length' => '图片路径长度不能超过500个字符',
                'link.max' => '跳转链接长度不能超过500个字符',
                'sort.integer' => '排序值必须是整数',
                'sort.>=' => '排序值必须大于等于0',
                'status.in' => '状态值不正确',
                'subtitle.max' => '副标题长度不能超过255个字符',
                'description.max' => '描述长度不能超过1000个字符',
                'start_time.integer' => '开始时间必须是整数',
                'end_time.integer' => '结束时间必须是整数'
            ]);

            $params = $this->filterDeprecatedLangFields($this->request->param());
            if (!$validate->check($params)) {
                return $this->error($validate->getError());
            }

            // 更新数据
            $updateData = [];
            if (isset($params['title'])) $updateData['title'] = $params['title'];
            if (isset($params['subtitle'])) $updateData['subtitle'] = $params['subtitle'];
            if (isset($params['image'])) $updateData['image'] = $params['image'];
            if (isset($params['link'])) $updateData['link'] = $params['link'];
            if (isset($params['position'])) $updateData['position'] = $params['position'];
            if (isset($params['description'])) $updateData['description'] = $params['description'];
            if (isset($params['sort'])) $updateData['sort'] = $params['sort'];
            if (isset($params['status'])) $updateData['status'] = $params['status'];
            if (isset($params['start_time'])) $updateData['start_time'] = $params['start_time'];
            if (isset($params['end_time'])) $updateData['end_time'] = $params['end_time'];

            $banner->save($updateData);

            return $this->success([], '横幅更新成功');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error('Update banner error: ' . $e->getMessage());
            return $this->error('更新横幅失败');
        }
    }

    /**
     * 批量删除横幅
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的横幅');
            }
            SkBanner::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除横幅
     */
    public function delete($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('横幅ID无效');
            }

            $banner = SkBanner::find($id);
            if (!$banner) {
                return $this->error('横幅不存在');
            }

            $banner->delete();

            return $this->success([], '横幅删除成功');

        } catch (\Exception $e) {
            Log::error('Delete banner error: ' . $e->getMessage());
            return $this->error('删除横幅失败');
        }
    }

    /**
     * 更新横幅状态
     */
    public function updateStatus($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('横幅ID无效');
            }

            $banner = SkBanner::find($id);
            if (!$banner) {
                return $this->error('横幅不存在');
            }

            $status = $this->request->param('status');
            if (!in_array($status, [0, 1])) {
                return $this->error('状态值不正确');
            }

            $banner->status = $status;
            $banner->save();

            $statusText = $status ? '启用' : '禁用';
            return $this->success([], "横幅{$statusText}成功");

        } catch (\Exception $e) {
            Log::error('Update banner status error: ' . $e->getMessage());
            return $this->error('更新横幅状态失败');
        }
    }

    /**
     * 获取单个横幅详情
     */
    public function read($id)
    {
        try {
            if (!is_numeric($id) || $id <= 0) {
                return $this->error('横幅ID无效');
            }

            $banner = SkBanner::find($id);
            if (!$banner) {
                return $this->error('横幅不存在');
            }

            $bannerData = [
                'id' => $banner->id,
                'title' => $banner->title,
                'subtitle' => $banner->subtitle,
                'image' => $banner->image,
                'link' => $banner->link,
                'position' => $banner->position,
                'description' => $banner->description,
                'sort' => $banner->sort,
                'status' => $banner->status ? true : false,
                'start_time' => $banner->start_time,
                'end_time' => $banner->end_time,
                'created_at' => $banner->created_at,
                'updated_at' => $banner->updated_at
            ];

            return $this->success($bannerData);

        } catch (\Exception $e) {
            Log::error('Get banner detail error: ' . $e->getMessage());
            return $this->error('获取横幅详情失败');
        }
    }
}