<?php
/**
 * 电子元器件商城 - 资讯/新闻接口
 * 文件说明：提供新闻/资讯列表与详情查询，支持本地化和图片字段处理。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use think\facade\Log;
use app\model\SkNews;
use think\Response;
class NewsController extends BaseController
{
    /**
     * 获取新闻列表
     * GET /api/v1/news?limit=10&page=1
     */
    public function index(): Response
    {
        try {
            $params = $this->request->get();
            
            $page = (int)($params['page'] ?? 1);
            $limit = (int)($params['limit'] ?? 20);

            $lang = $this->getLang();
            $cacheKey = 'news_index_' . $lang . '_' . $page . '_' . $limit;

            $cachedData = \think\facade\Cache::remember($cacheKey, function () use ($page, $limit) {
                $query = SkNews::active()
                    ->order('create_time', 'desc');
                
                // Get total count
                $total = $query->count();
                
                // Get paginated data
                $news = $query->page($page, $limit)->select();
                
                // 本地化新闻数据
                $localizedFields = ['title', 'summary', 'content'];
                $news = $this->localizeCollection($news, $localizedFields);
                $news = $this->processImageUrls($news, ['image', 'cover']);

                return [
                    'list' => $news,
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
     * 获取新闻详情
     * GET /api/v1/news/:id
     */
    public function read(string $id): Response
    {
        try {
            $news = SkNews::where('id', $id)
                ->where('status', 1)
                ->find();
            
            if (!$news) {
                return $this->error('新闻不存在', 404);
            }
            
            // 增加浏览量（不缓存）
            $news->views = $news->views + 1;
            $news->save();

            $lang = $this->getLang();
            $cacheKey = 'news_read_' . $lang . '_' . $id;

            $newsData = \think\facade\Cache::remember($cacheKey, function () use ($id) {
                $news = SkNews::where('id', $id)
                    ->where('status', 1)
                    ->find();
                
                // 本地化新闻数据
                $localizedFields = ['title', 'summary', 'content'];
                $newsData = $this->localizeItem($news, $localizedFields);
                $newsData = $this->processImageUrls($newsData, ['image', 'cover']);
                
                return $newsData;
            }, 3600);

            return $this->success($newsData);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
