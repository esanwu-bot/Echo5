<?php
/**
 * 电子元器件商城 - 文章/资讯管理（后台）
 * 文件说明：管理文章与分类，用于后台维护公司新闻、技术文章与公告。
 */

namespace app\controller\admin;

use app\controller\BaseController;
use app\model\SkArticle;
use app\model\SkArticleCategory;
use think\exception\ValidateException;
use think\facade\Db;
use think\facade\Log;

class ArticleController extends BaseController
{
    /**
     * 获取文章列表
     */
    public function index()
    {
        $params = $this->request->param();
        $page = $params['page'] ?? 1;
        $limit = $params['pageSize'] ?? $params['limit'] ?? 10;
        
        $query = SkArticle::with(['category']);

        if (!empty($params['keyword'])) {
            $keyword = $params['keyword'];
            $query->where('title|summary|content', 'like', '%' . $keyword . '%');
        }

        if (!empty($params['category_id'])) {
            $query->where('category_id', $params['category_id']);
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
     * 获取文章分类
     */
    public function categories()
    {
        $categories = SkArticleCategory::where('status', 1)->order('sort', 'asc')->select();

        return $this->success($categories);
    }

    /**
     * 获取文章详情
     */
    public function read($id)
    {
        $article = SkArticle::with(['category'])->find($id);
        if (!$article) {
            return $this->error('文章不存在');
        }
        return $this->success($article);
    }

    /**
     * 创建新文章
     */
    public function save()
    {
        try {
            $data = $this->filterDeprecatedLangFields($this->request->param());

            // 如果未提供发布时间，则设置默认值
            if (empty($data['publish_time'])) {
                $data['publish_time'] = date('Y-m-d H:i:s');
            }

            $this->validate($data, 'app\validate\SkArticle.save');

            if (!empty($data['category_id'])) {
                if (!SkArticleCategory::find($data['category_id'])) {
                    return $this->error('分类不存在');
                }
            }

            $article = SkArticle::create($data);

            // 保存词条到 sk_translation 并触发翻译队列
            $i18n = app(\app\service\I18nService::class);
            foreach (['title', 'summary', 'content'] as $field) {
                if (!empty($data[$field])) {
                    $i18n->saveKey('article', (int) $article->id, $field, $data[$field]);
                }
            }

            return $this->success($article, '文章创建成功');

        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 更新文章
     */
    public function update($id)
    {
        try {
            $article = SkArticle::find($id);
            if (!$article) {
                return $this->error('文章不存在');
            }

            $data = $this->filterDeprecatedLangFields($this->request->param());
            $this->validate($data, 'app\validate\SkArticle.update');

            if (!empty($data['category_id'])) {
                if (!SkArticleCategory::find($data['category_id'])) {
                    return $this->error('分类不存在');
                }
            }

            $article->save($data);

            // 保存词条到 sk_translation 并触发翻译队列
            $i18n = app(\app\service\I18nService::class);
            foreach (['title', 'summary', 'content'] as $field) {
                if (!empty($data[$field])) {
                    $i18n->saveKey('article', (int) $article->id, $field, $data[$field]);
                }
            }

            return $this->success($article, '文章更新成功');

        } catch (ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 批量删除文章
     */
    public function batchDelete()
    {
        try {
            $ids = $this->request->post('ids', []);
            if (empty($ids) || !is_array($ids)) {
                return $this->error('请选择要删除的文章');
            }
            SkArticle::destroy($ids);

            // 删除词条
            $i18n = app(\app\service\I18nService::class);
            foreach ($ids as $id) {
                $i18n->deleteByBusiness('article', (int) $id);
            }

            return $this->success(null, '批量删除成功');
        } catch (\Exception $e) {
            Log::error('Batch delete error: ' . $e->getMessage());
            return $this->error('批量删除失败');
        }
    }

    /**
     * 删除文章
     */
    public function delete($id)
    {
        try {
            $article = SkArticle::find($id);
            if (!$article) {
                return $this->error('文章不存在');
            }

            $article->delete();

            // 删除词条
            $i18n = app(\app\service\I18nService::class);
            $i18n->deleteByBusiness('article', (int) $id);

            return $this->success(null, '文章删除成功');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
