<?php
/**
 * 电子元器件商城 - 站点地图控制器
 * 文件说明：动态生成 XML 格式 sitemap.xml，供搜索引擎抓取全站 URL。
 */

declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use app\model\SkApplication;
use app\model\SkArticle;
use app\model\SkCategory;
use app\model\SkNews;
use app\model\SkProduct;
use app\model\SkProductModel;
use app\model\SkProductSeries;
use think\Response;

/**
 * 站点地图 API 控制器
 * @package app\controller\api
 */
class SitemapController extends BaseController
{
    /**
     * 站点主域名
     * @var string
     */
    protected $domain = 'https://tikchip.cn';

    /**
     * 生成 sitemap.xml
     * GET /api/v1/sitemap.xml
     *
     * @access public
     * @return Response
     */
    public function index(): Response
    {
        try {
            $websiteUrl = $this->getWebsiteUrl();
            // 过滤开发环境地址，确保生产 sitemap 使用正确域名
            if ($websiteUrl && !preg_match('/localhost|127\.0\.0\.1/', $websiteUrl)) {
                $this->domain = $websiteUrl;
            } else {
                $this->domain = 'https://tikchip.cn';
            }
            $urls = $this->buildUrls();
            $xml = $this->renderXml($urls);

            return Response::create($xml, 'xml', 200)
                ->header(['Content-Type' => 'application/xml; charset=utf-8']);
        } catch (\Exception $e) {
            \think\facade\Log::error('生成 sitemap 失败: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('生成 sitemap 失败', 500);
        }
    }

    /**
     * 构建所有需要收录的 URL 列表
     *
     * @access protected
     * @return array
     */
    protected function buildUrls(): array
    {
        $urls = [];

        // 静态页面
        $staticPages = [
            ['loc' => '/', 'priority' => '1.0', 'changefreq' => 'daily'],
            ['loc' => '/products', 'priority' => '0.9', 'changefreq' => 'daily'],
            ['loc' => '/applications', 'priority' => '0.8', 'changefreq' => 'weekly'],
            ['loc' => '/news', 'priority' => '0.8', 'changefreq' => 'weekly'],
            ['loc' => '/about', 'priority' => '0.7', 'changefreq' => 'monthly'],
            ['loc' => '/support', 'priority' => '0.7', 'changefreq' => 'monthly'],
            ['loc' => '/bom', 'priority' => '0.6', 'changefreq' => 'monthly'],
            ['loc' => '/mall', 'priority' => '0.8', 'changefreq' => 'daily'],
            ['loc' => '/series', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ];
        foreach ($staticPages as $page) {
            $urls[] = $page;
        }

        // 产品分类
        try {
            $categories = SkCategory::field('id, update_time')
                ->where('status', 1)
                ->select();
            foreach ($categories as $category) {
                $urls[] = [
                    'loc' => '/products/' . $category->id,
                    'priority' => '0.8',
                    'changefreq' => 'weekly',
                    'lastmod' => $this->formatTime($category->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 产品分类生成失败: ' . $e->getMessage());
        }

        // 产品详情
        try {
            $products = SkProduct::field('id, product_code, update_time')
                ->where('status', 1)
                ->select();
            foreach ($products as $product) {
                $urls[] = [
                    'loc' => '/product/' . $product->id,
                    'priority' => '0.9',
                    'changefreq' => 'weekly',
                    'lastmod' => $this->formatTime($product->update_time),
                ];
                // 商城产品详情页
                $urls[] = [
                    'loc' => '/mall/product/' . $product->id,
                    'priority' => '0.8',
                    'changefreq' => 'weekly',
                    'lastmod' => $this->formatTime($product->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 产品详情生成失败: ' . $e->getMessage());
        }

        // 产品系列
        try {
            $series = SkProductSeries::field('id, update_time')
                ->where('status', 1)
                ->select();
            foreach ($series as $item) {
                $urls[] = [
                    'loc' => '/series/' . $item->id,
                    'priority' => '0.8',
                    'changefreq' => 'weekly',
                    'lastmod' => $this->formatTime($item->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 产品系列生成失败: ' . $e->getMessage());
        }

        // 型号详情
        try {
            $models = SkProductModel::field('id, updated_at')
                ->where('status', 1)
                ->select();
            foreach ($models as $model) {
                $urls[] = [
                    'loc' => '/models/' . $model->id,
                    'priority' => '0.8',
                    'changefreq' => 'weekly',
                    'lastmod' => $this->formatTime($model->updated_at),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 型号详情生成失败: ' . $e->getMessage());
        }

        // 应用领域
        try {
            $applications = SkApplication::field('id, update_time')
                ->where('status', 1)
                ->select();
            foreach ($applications as $app) {
                $urls[] = [
                    'loc' => '/applications/' . $app->id,
                    'priority' => '0.7',
                    'changefreq' => 'monthly',
                    'lastmod' => $this->formatTime($app->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 应用领域生成失败: ' . $e->getMessage());
        }

        // 新闻
        try {
            $newsList = SkNews::field('id, update_time')
                ->where('status', 1)
                ->select();
            foreach ($newsList as $news) {
                $urls[] = [
                    'loc' => '/news/' . $news->id,
                    'priority' => '0.7',
                    'changefreq' => 'monthly',
                    'lastmod' => $this->formatTime($news->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 新闻生成失败: ' . $e->getMessage());
        }

        // 文章
        try {
            $articles = SkArticle::field('id, update_time')
                ->where('status', 1)
                ->select();
            foreach ($articles as $article) {
                $urls[] = [
                    'loc' => '/article/' . $article->id,
                    'priority' => '0.7',
                    'changefreq' => 'monthly',
                    'lastmod' => $this->formatTime($article->update_time),
                ];
            }
        } catch (\Exception $e) {
            \think\facade\Log::warning('sitemap 文章生成失败: ' . $e->getMessage());
        }

        return $urls;
    }

    /**
     * 渲染 XML 站点地图
     *
     * @access protected
     * @param array $urls URL 列表
     * @return string
     */
    protected function renderXml(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL;

        foreach ($urls as $url) {
            $loc = htmlspecialchars($this->domain . $url['loc'], ENT_XML1, 'UTF-8');
            $priority = $url['priority'] ?? '0.5';
            $changefreq = $url['changefreq'] ?? 'weekly';
            $lastmod = $url['lastmod'] ?? date('Y-m-d');

            $xml .= '  <url>' . PHP_EOL;
            $xml .= '    <loc>' . $loc . '</loc>' . PHP_EOL;
            $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . PHP_EOL;
            $xml .= '    <changefreq>' . $changefreq . '</changefreq>' . PHP_EOL;
            $xml .= '    <priority>' . $priority . '</priority>' . PHP_EOL;
            $xml .= '  </url>' . PHP_EOL;
        }

        $xml .= '</urlset>';

        return $xml;
    }

    /**
     * 格式化时间为 sitemap 日期格式
     *
     * @access protected
     * @param mixed $time 时间戳或日期字符串
     * @return string
     */
    protected function formatTime($time): string
    {
        if (empty($time)) {
            return date('Y-m-d');
        }
        if (is_numeric($time)) {
            return date('Y-m-d', (int)$time);
        }
        $timestamp = strtotime((string)$time);
        return $timestamp ? date('Y-m-d', $timestamp) : date('Y-m-d');
    }
}
