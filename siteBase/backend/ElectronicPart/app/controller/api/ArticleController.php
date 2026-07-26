<?php
/**
 * 电子元器件商城 - 文章/资讯接口
 * 文件说明：提供文章列表与详情查询，包含本地化与图片 URL 处理。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkArticle;
use think\Response;
use think\facade\Log;
class ArticleController extends BaseController
{
    /**
     * 获取文章列表
     * GET /api/v1/articles?limit=10&page=1&category_id=1
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);
            $categoryId = (int)($params['category_id'] ?? 0);

            $lang = $this->getLang();
            $cacheKey = 'article_index_' . $lang . '_' . $page . '_' . $limit . '_' . $categoryId;

            $cachedData = \think\facade\Cache::remember($cacheKey, function () use ($page, $limit, $categoryId) {
                $query = SkArticle::active()
                    ->order('create_time', 'desc');
                
                // Filter by category if provided
                if ($categoryId > 0) {
                    $query->where('category_id', $categoryId);
                }
                
                // Get total count
                $total = $query->count();
                
                // Get paginated data
                $articles = $query->page($page, $limit)->select();
                
                // 本地化文章数据
                $localizedFields = ['title', 'summary', 'content'];
                $articles = $this->localizeCollection($articles, $localizedFields);
                $articles = $this->processImageUrls($articles, ['image', 'cover']);

                return [
                    'list' => $articles,
                    'total' => $total,
                ];
            }, 3600);

            return $this->paginate($cachedData['list'], $cachedData['total'], $page, $limit);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 获取文章详情
     * GET /api/v1/articles/:id
     */
    public function read(string $id): Response
    {
        try {
            $article = SkArticle::with(['category'])
                ->where('id', $id)
                ->where('status', 1)
                ->find();
            
            if (!$article) {
                return $this->error('文章不存在', 404);
            }
            
            // 增加浏览量（不缓存）
            $article->views = $article->views + 1;
            $article->save();

            $lang = $this->getLang();
            $cacheKey = 'article_read_' . $lang . '_' . $id;

            $articleData = \think\facade\Cache::remember($cacheKey, function () use ($id) {
                $article = SkArticle::with(['category'])
                    ->where('id', $id)
                    ->where('status', 1)
                    ->find();
                
                // 本地化文章数据
                $localizedFields = ['title', 'summary', 'content'];
                $articleData = $this->localizeItem($article, $localizedFields);
                $articleData = $this->processImageUrls($articleData, ['image', 'cover']);
                
                return $articleData;
            }, 3600);

            return $this->success($articleData);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
