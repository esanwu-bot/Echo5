<?php
/**
 * 电子元器件商城 - 全站搜索接口
 * 文件说明：实现针对产品、文章与应用领域的搜索聚合，返回按相关性排序的结果。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\BaseController;
use app\model\Product;
use app\model\Article;
use app\model\Application;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

/**
 * 全站搜索API控制器
 * @package app\controller\api
 */
class SearchController extends BaseController
{
    /**
     * 全站搜索
     */
    public function search(Request $request): Response
    {
        $keyword = $request->get('q', '');
        $type = $request->get('type', 'all');
        $page = (int)$request->get('page', 1);
        $limit = (int)$request->get('limit', 20);
        
        if (empty($keyword)) {
            return $this->error('搜索关键词不能为空', 400);
        }
        
        try {
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'search_search_' . md5($keyword . '_' . $type . '_' . $page . '_' . $limit . '_' . $lang);
            
            $data = Cache::remember($cacheKey, function() use ($keyword, $type, $page, $limit) {
                $results = [];
                
                if ($type === 'all' || $type === 'product') {
                    $products = $this->searchProducts($keyword, $limit);
                    $results = array_merge($results, $products);
                }
                
                if ($type === 'all' || $type === 'article') {
                    $articles = $this->searchArticles($keyword, $limit);
                    $results = array_merge($results, $articles);
                }
                
                if ($type === 'all' || $type === 'application') {
                    $applications = $this->searchApplications($keyword, $limit);
                    $results = array_merge($results, $applications);
                }
                
                // 按相关性排序
                usort($results, function($a, $b) {
                    return $b['relevance'] <=> $a['relevance'];
                });
                
                // 分页
                $total = count($results);
                $offset = ($page - 1) * $limit;
                $results = array_slice($results, $offset, $limit);
                
                return [
                    'results' => $results,
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit
                ];
            }, 3600);
            
            return $this->success($data, 'success');
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
    
    /**
     * 搜索产品
     */
    private function searchProducts(string $keyword, int $limit): array
    {
        $products = Product::where('name', 'like', "%{$keyword}%")
            ->whereOr('description', 'like', "%{$keyword}%")
            ->whereOr('model', 'like', "%{$keyword}%")
            ->where('status', 1)
            ->limit($limit)
            ->select();
        
        $results = [];
        foreach ($products as $product) {
            $relevance = $this->calculateRelevance($keyword, $product->name . ' ' . $product->description);
            $results[] = [
                'id' => $product->id,
                'type' => 'product',
                'title' => $product->name,
                'description' => $product->description,
                'image' => $product->image,
                'category' => $product->category_name ?? '产品',
                'price' => $product->price,
                'relevance' => $relevance
            ];
        }
        
        return $results;
    }
    
    /**
     * 搜索文章
     */
    private function searchArticles(string $keyword, int $limit): array
    {
        $articles = Article::where('title', 'like', "%{$keyword}%")
            ->whereOr('content', 'like', "%{$keyword}%")
            ->whereOr('summary', 'like', "%{$keyword}%")
            ->where('status', 'published')
            ->limit($limit)
            ->select();
        
        $results = [];
        foreach ($articles as $article) {
            $relevance = $this->calculateRelevance($keyword, $article->title . ' ' . $article->summary);
            $results[] = [
                'id' => $article->id,
                'type' => 'article',
                'title' => $article->title,
                'description' => $article->summary,
                'category' => $article->category ?? '技术文章',
                'publishTime' => date('Y-m-d', $article->publish_time),
                'relevance' => $relevance
            ];
        }
        
        return $results;
    }
    
    /**
     * 搜索应用领域
     */
    private function searchApplications(string $keyword, int $limit): array
    {
        $applications = Application::where('title', 'like', "%{$keyword}%")
            ->whereOr('description', 'like', "%{$keyword}%")
            ->where('status', 1)
            ->limit($limit)
            ->select();
        
        $results = [];
        foreach ($applications as $app) {
            $relevance = $this->calculateRelevance($keyword, $app->title . ' ' . $app->description);
            $results[] = [
                'id' => $app->id,
                'type' => 'application',
                'title' => $app->title,
                'description' => $app->description,
                'image' => $app->cover_image,
                'category' => '应用领域',
                'relevance' => $relevance
            ];
        }
        
        return $results;
    }
    
    /**
     * 计算相关性得分
     */
    private function calculateRelevance(string $keyword, string $content): float
    {
        $keyword = strtolower($keyword);
        $content = strtolower($content);
        
        // 标题完全匹配得分最高
        if (strpos($content, $keyword) === 0) {
            return 1.0;
        }
        
        // 包含关键词
        if (strpos($content, $keyword) !== false) {
            return 0.8;
        }
        
        // 部分匹配
        $words = explode(' ', $keyword);
        $matches = 0;
        foreach ($words as $word) {
            if (strpos($content, $word) !== false) {
                $matches++;
            }
        }
        
        return $matches / count($words) * 0.6;
    }
    
    /**
     * 搜索建议
     */
    public function suggestions(Request $request): Response
    {
        $keyword = $request->get('q', '');
        
        if (strlen($keyword) < 2) {
            return json([
                'code' => 200,
                'data' => []
            ]);
        }
        
        try {
            $lang = $this->request->lang ?? 'zh';
            $cacheKey = 'search_suggestions_' . md5($keyword . '_' . $lang);
            
            $data = Cache::remember($cacheKey, function() use ($keyword) {
                $suggestions = [];
                
                // 产品名称建议
                $products = Product::where('name', 'like', "%{$keyword}%")
                    ->where('status', 1)
                    ->limit(5)
                    ->column('name');
                
                foreach ($products as $name) {
                    $suggestions[] = $name;
                }

                // 热门搜索词从数据库获取
                // 这里假设没有专门的热门搜索词表，暂时返回空
                // 后续可以添加一个HotSearch模型来管理热门搜索词
                $hotKeywords = [];
                foreach ($hotKeywords as $hot) {
                    if (strpos($hot, $keyword) !== false) {
                        $suggestions[] = $hot;
                    }
                }

                return array_slice($suggestions, 0, 8);
            }, 3600);
            
            return json([
                'code' => 200,
                'data' => $data
            ]);
            
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}