<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkNews;
use think\exception\ValidateException;
use think\facade\Log;

class NewsController extends BaseController
{
    /**
     * 获取新闻列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkNews::where([]);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('title|summary|content', 'like', '%' . $keyword . '%');
        }

        if (isset($params['status']) && $params['status'] !== '') {
            $query->where('status', $params['status']);
        }

        $total = $query->count();
        $list = $query->order('publish_time', 'desc')
                     ->order('id', 'desc')
                     ->page($page, $limit)
                     ->select();

        return $this->paginate($list, $total, $page, $limit);
    }

    /**
     * 获取新闻详情
     */
    public function read($id)
    {
        $news = SkNews::find($id);
        if (!$news) {
            return $this->error('News not found');
        }
        return $this->success($news);
    }

    /**
     * 创建新闻条目
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());

            // 如果未提供发布时间，则设置默认值
            if (empty($data['publish_time'])) {
                $data['publish_time'] = date('Y-m-d H:i:s');
            }

            $this->validate($data, 'app\validate\SkNews.save');

            $news = SkNews::create($data);
            return $this->success($news, 'News created successfully');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新新闻
     */
    public function update($id)
    {
        try {
            $news = SkNews::find($id);
            if (!$news) {
                return $this->error('News not found');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkNews.update');

            $news->save($data);
            return $this->success($news, 'News updated successfully');

        } catch (ValidateException $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除新闻
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的新闻');
            }
            SkNews::destroy($ids);
            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除新闻
     */
    public function delete($id)
    {
        try {
            $news = SkNews::find($id);
            if (!$news) {
                return $this->error('News not found');
            }

            $news->delete();
            return $this->success(null, 'News deleted successfully');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
