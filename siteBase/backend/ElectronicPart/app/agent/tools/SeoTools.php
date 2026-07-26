<?php
/**
 * SEO 优化工具集
 * 包含页面审计、关键词分析、Sitemap生成、竞品分析、Schema检查等
 */
namespace app\agent\tools;

use think\facade\Db;
use think\facade\Cache;
use think\facade\Log;

class SeoTools
{
    const CACHE_TTL = 3600;
    const CACHE_PREFIX = 'seo:';

    // ==================== 页面SEO审计 ====================

    /**
     * 分析指定页面的SEO状态
     */
    public function analyzePageSeo(array $args): array
    {
        $urlPath = $args['url_path'] ?? '/';
        $pageType = $args['page_type'] ?? 'page';
        $pageId = (int) ($args['page_id'] ?? 0);

        $cacheKey = self::CACHE_PREFIX . 'page:' . md5($urlPath);
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        // 从数据库获取页面SEO数据
        $page = Db::table('seo_pages')
            ->where('url_path', $urlPath)
            ->find();

        $result = [];

        if ($page) {
            $result = [
                'url_path'        => $page['url_path'],
                'page_type'       => $page['page_type'],
                'title'           => $page['title'],
                'meta_description'=> $page['meta_description'],
                'meta_keywords'   => $page['meta_keywords'],
                'h1'              => $page['h1'],
                'h2_count'        => (int) $page['h2_count'],
                'h3_count'        => (int) $page['h3_count'],
                'image_alt_ratio' => $page['image_total'] > 0 ? round($page['image_alt_count'] / $page['image_total'] * 100, 1) : 0,
                'internal_links'  => (int) $page['internal_links'],
                'external_links'  => (int) $page['external_links'],
                'has_canonical'   => (bool) $page['has_canonical'],
                'has_og_tags'     => (bool) $page['has_og_tags'],
                'has_schema'      => !empty($page['schema_json']),
                'seo_score'       => (int) $page['seo_score'],
                'load_time_ms'    => (int) $page['load_time_ms'],
                'mobile_score'    => (int) $page['mobile_score'],
                'last_audit_at'   => $page['last_audit_at'],
            ];

            // 获取该页面的审计问题
            $issues = Db::table('seo_audit_logs')
                ->where('page_id', $page['id'])
                ->where('is_fixed', 0)
                ->order('severity', 'desc')
                ->limit(20)
                ->select()
                ->toArray();
            $result['issues'] = $issues;
        } else {
            // 页面未审计，给出基础诊断
            $result = $this->diagnosePage($urlPath, $pageType, $pageId);
        }

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    /**
     * 诊断页面SEO（未录入数据库时）
     */
    protected function diagnosePage(string $urlPath, string $pageType, int $pageId): array
    {
        $issues = [];
        $score = 100;

        // 根据页面类型获取数据
        $title = '';
        $description = '';
        $h1 = '';

        switch ($pageType) {
            case 'product':
                $product = Db::table('sk_product')->where('id', $pageId)->find();
                if ($product) {
                    $title = $product['name'] ?? '';
                    $description = $product['description'] ?? '';
                    $h1 = $product['name'] ?? '';
                }
                break;
            case 'category':
                $cat = Db::table('sk_category')->where('id', $pageId)->find();
                if ($cat) {
                    $title = $cat['name'] ?? '';
                    $description = $cat['description'] ?? '';
                    $h1 = $cat['name'] ?? '';
                }
                break;
            case 'article':
                $article = Db::table('sk_article')->where('id', $pageId)->find();
                if ($article) {
                    $title = $article['title'] ?? '';
                    $description = $article['summary'] ?? '';
                    $h1 = $article['title'] ?? '';
                }
                break;
            case 'home':
                $config = Db::table('sk_config')
                    ->whereIn('config_key', ['site_name', 'site_description', 'site_keywords'])
                    ->column('config_value', 'config_key');
                $title = $config['site_name'] ?? '天启芯科技';
                $description = $config['site_description'] ?? '专业的半导体元件供应商';
                $h1 = $title;
                break;
        }

        // 检查标题
        if (empty($title)) {
            $issues[] = ['severity' => 'critical', 'category' => 'meta', 'title' => '页面标题缺失', 'detail' => 'title标签为空，搜索引擎无法识别页面主题'];
            $score -= 25;
        } elseif (mb_strlen($title) > 60) {
            $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '标题过长', 'detail' => '标题长度' . mb_strlen($title) . '字符，建议控制在60字符以内'];
            $score -= 5;
        } elseif (mb_strlen($title) < 10) {
            $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '标题过短', 'detail' => '标题长度' . mb_strlen($title) . '字符，建议至少10字符以充分描述页面内容'];
            $score -= 5;
        }

        // 检查描述
        if (empty($description)) {
            $issues[] = ['severity' => 'critical', 'category' => 'meta', 'title' => 'Meta Description缺失', 'detail' => '缺少meta description，搜索引擎将随机抓取内容作为摘要'];
            $score -= 20;
        } elseif (mb_strlen($description) > 160) {
            $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '描述过长', 'detail' => '描述长度' . mb_strlen($description) . '字符，建议控制在160字符以内'];
            $score -= 3;
        } elseif (mb_strlen($description) < 50) {
            $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '描述过短', 'detail' => '描述长度' . mb_strlen($description) . '字符，建议50-160字符以充分描述页面'];
            $score -= 3;
        }

        // 检查H1
        if (empty($h1)) {
            $issues[] = ['severity' => 'critical', 'category' => 'heading', 'title' => 'H1标题缺失', 'detail' => '页面缺少H1标签，搜索引擎难以理解页面核心主题'];
            $score -= 20;
        }

        // 通用检查（假设未审计）
        $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '缺少Canonical标签', 'detail' => '未设置canonical标签，可能导致重复内容问题'];
        $issues[] = ['severity' => 'warning', 'category' => 'meta', 'title' => '缺少Open Graph标签', 'detail' => '未设置og:title/og:description，社交媒体分享效果差'];
        $issues[] = ['severity' => 'warning', 'category' => 'schema', 'title' => '缺少结构化数据', 'detail' => '未配置Schema.org结构化数据，影响富媒体搜索结果展示'];
        $issues[] = ['severity' => 'info', 'category' => 'content', 'title' => '缺少llms.txt', 'detail' => '未配置llms.txt，AI搜索引擎可能无法正确索引内容'];

        $score = max(0, $score);

        return [
            'url_path'         => $urlPath,
            'page_type'        => $pageType,
            'title'            => $title,
            'meta_description' => $description,
            'h1'               => $h1,
            'seo_score'        => $score,
            'issues'           => $issues,
            'note'             => '该页面尚未完成完整SEO审计，以上为基于数据库信息的初步诊断',
        ];
    }

    // ==================== 全站SEO健康度 ====================

    /**
     * 全站SEO健康度扫描
     */
    public function analyzeSiteHealth(array $args): array
    {
        $cacheKey = self::CACHE_PREFIX . 'site:health';
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        // 统计各类页面数量
        $productCount = Db::table('sk_product')->where('status', 1)->count();
        $categoryCount = Db::table('sk_category')->where('status', 1)->count();
        $articleCount = Db::table('sk_article')->where('status', 1)->count();
        $newsCount = Db::table('sk_news')->where('status', 1)->count();
        $applicationCount = Db::table('sk_application')->where('status', 1)->count();

        $totalPages = $productCount + $categoryCount + $articleCount + $newsCount + $applicationCount + 5; // +5 为首页、关于、联系等

        // 已审计页面
        $auditedPages = Db::table('seo_pages')->where('status', 1)->count();
        $avgScore = Db::table('seo_pages')->where('status', 1)->avg('seo_score') ?? 0;

        // 问题统计
        $criticalIssues = Db::table('seo_audit_logs')->where('severity', 'critical')->where('is_fixed', 0)->count();
        $warningIssues = Db::table('seo_audit_logs')->where('severity', 'warning')->where('is_fixed', 0)->count();
        $fixedIssues = Db::table('seo_audit_logs')->where('is_fixed', 1)->count();

        // 各维度评分
        $metaScore = Db::table('seo_pages')->where('status', 1)->avg('seo_score') ?? 0;

        // 关键词覆盖
        $keywordCount = Db::table('seo_keywords')->count();
        $primaryKeywords = Db::table('seo_keywords')->where('is_primary', 1)->count();

        $result = [
            'overview' => [
                'total_pages'      => (int) $totalPages,
                'audited_pages'    => (int) $auditedPages,
                'audit_coverage'   => $totalPages > 0 ? round($auditedPages / $totalPages * 100, 1) : 0,
                'avg_seo_score'    => round((float) $avgScore, 1),
                'critical_issues'  => (int) $criticalIssues,
                'warning_issues'   => (int) $warningIssues,
                'fixed_issues'     => (int) $fixedIssues,
                'health_status'    => $avgScore >= 80 ? '健康' : ($avgScore >= 60 ? '需优化' : '严重'),
            ],
            'pages' => [
                'products'     => (int) $productCount,
                'categories'   => (int) $categoryCount,
                'articles'     => (int) $articleCount,
                'news'         => (int) $newsCount,
                'applications' => (int) $applicationCount,
            ],
            'keywords' => [
                'total'    => (int) $keywordCount,
                'primary'  => (int) $primaryKeywords,
            ],
            'dimensions' => [
                'meta_tags'     => round((float) $metaScore, 1),
                'headings'      => round((float) $metaScore, 1),
                'images'        => round((float) $metaScore, 1),
                'links'         => round((float) $metaScore, 1),
                'schema'        => round((float) $metaScore, 1),
                'mobile'        => round((float) $metaScore, 1),
                'speed'         => round((float) $metaScore, 1),
            ],
        ];

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    // ==================== 关键词分析 ====================

    /**
     * 关键词库查询与分析
     */
    public function analyzeKeywords(array $args): array
    {
        $category = $args['category'] ?? '';
        $limit = (int) ($args['limit'] ?? 20);

        $cacheKey = self::CACHE_PREFIX . 'keywords:' . ($category ?: 'all');
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $query = Db::table('seo_keywords')->order('search_volume', 'desc');
        if ($category) {
            $query->where('category', $category);
        }

        $list = $query->limit($limit)->select()->toArray();

        $total = Db::table('seo_keywords')->count();
        $primary = Db::table('seo_keywords')->where('is_primary', 1)->count();

        // 按分类统计
        $byCategory = Db::table('seo_keywords')
            ->field('category, COUNT(*) as count')
            ->group('category')
            ->select()
            ->toArray();

        $result = [
            'total'       => (int) $total,
            'primary'     => (int) $primary,
            'list'        => $list,
            'by_category' => $byCategory,
        ];

        Cache::set($cacheKey, $result, self::CACHE_TTL);
        return $result;
    }

    /**
     * 基于产品数据生成关键词建议
     */
    public function generateKeywordSuggestions(array $args): array
    {
        $productId = (int) ($args['product_id'] ?? 0);
        $categoryId = (int) ($args['category_id'] ?? 0);

        $suggestions = [];

        if ($productId > 0) {
            $product = Db::table('sk_product')
                ->alias('p')
                ->field('p.name, p.product_code, p.description, b.brand_name, c.name as category_name')
                ->leftJoin('sk_brands b', 'p.brand_id = b.id')
                ->leftJoin('sk_category c', 'p.category_id = c.id')
                ->where('p.id', $productId)
                ->find();

            if ($product) {
                $name = $product['name'];
                $code = $product['product_code'];
                $brand = $product['brand_name'] ?? '';
                $category = $product['category_name'] ?? '';

                $suggestions = [
                    'primary' => [
                        $name,
                        $code,
                        $brand . ' ' . $name,
                    ],
                    'secondary' => [
                        $name . ' 价格',
                        $name . ' 规格',
                        $name . '  datasheet',
                        $code . ' 代理',
                        $category . ' ' . $brand,
                    ],
                    'longtail' => [
                        $brand . ' ' . $name . ' 现货',
                        $name . ' 原装正品',
                        $code . ' 供应商',
                        $category . ' ' . $name . ' 批发',
                    ],
                ];
            }
        } elseif ($categoryId > 0) {
            $cat = Db::table('sk_category')->where('id', $categoryId)->find();
            if ($cat) {
                $name = $cat['name'];
                $suggestions = [
                    'primary' => [$name, $name . ' 元器件'],
                    'secondary' => [$name . ' 供应商', $name . ' 批发'],
                    'longtail' => [$name . ' 现货供应', $name . ' 生产厂家'],
                ];
            }
        }

        return ['suggestions' => $suggestions];
    }

    // ==================== Sitemap 生成 ====================

    /**
     * 生成站点地图
     */
    public function generateSitemap(array $args): array
    {
        $baseUrl = $args['base_url'] ?? 'https://www.tianqixin.tech';
        $type = $args['type'] ?? 'xml';

        $urls = [];

        // 首页
        $urls[] = ['loc' => $baseUrl . '/', 'priority' => '1.0', 'changefreq' => 'daily'];

        // 产品页
        $products = Db::table('sk_product')
            ->where('status', 1)
            ->field('id, updated_at')
            ->select()
            ->toArray();
        foreach ($products as $p) {
            $urls[] = [
                'loc'      => $baseUrl . '/products/' . $p['id'],
                'priority' => '0.8',
                'changefreq' => 'weekly',
                'lastmod'  => $p['updated_at'] ?? date('Y-m-d'),
            ];
        }

        // 分类页
        $categories = Db::table('sk_category')->where('status', 1)->field('id')->select()->toArray();
        foreach ($categories as $c) {
            $urls[] = [
                'loc'      => $baseUrl . '/categories/' . $c['id'],
                'priority' => '0.7',
                'changefreq' => 'weekly',
            ];
        }

        // 文章页
        $articles = Db::table('sk_article')->where('status', 1)->field('id, updated_at')->select()->toArray();
        foreach ($articles as $a) {
            $urls[] = [
                'loc'      => $baseUrl . '/articles/' . $a['id'],
                'priority' => '0.6',
                'changefreq' => 'monthly',
                'lastmod'  => $a['updated_at'] ?? date('Y-m-d'),
            ];
        }

        // 新闻页
        $news = Db::table('sk_news')->where('status', 1)->field('id, updated_at')->select()->toArray();
        foreach ($news as $n) {
            $urls[] = [
                'loc'      => $baseUrl . '/news/' . $n['id'],
                'priority' => '0.5',
                'changefreq' => 'weekly',
                'lastmod'  => $n['updated_at'] ?? date('Y-m-d'),
            ];
        }

        // 应用页
        $apps = Db::table('sk_application')->where('status', 1)->field('id')->select()->toArray();
        foreach ($apps as $a) {
            $urls[] = [
                'loc'      => $baseUrl . '/applications/' . $a['id'],
                'priority' => '0.6',
                'changefreq' => 'monthly',
            ];
        }

        // 静态页面
        $staticPages = ['/about', '/contact', '/careers', '/support'];
        foreach ($staticPages as $page) {
            $urls[] = [
                'loc'      => $baseUrl . $page,
                'priority' => '0.5',
                'changefreq' => 'monthly',
            ];
        }

        $result = [
            'url_count' => count($urls),
            'urls'      => array_slice($urls, 0, 100),
            'xml_template' => $this->buildXmlSitemap($urls),
        ];

        return $result;
    }

    protected function buildXmlSitemap(array $urls): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $url) {
            $xml .= '  <url>' . "\n";
            $xml .= '    <loc>' . htmlspecialchars($url['loc']) . '</loc>' . "\n";
            if (isset($url['lastmod'])) {
                $xml .= '    <lastmod>' . $url['lastmod'] . '</lastmod>' . "\n";
            }
            if (isset($url['changefreq'])) {
                $xml .= '    <changefreq>' . $url['changefreq'] . '</changefreq>' . "\n";
            }
            if (isset($url['priority'])) {
                $xml .= '    <priority>' . $url['priority'] . '</priority>' . "\n";
            }
            $xml .= '  </url>' . "\n";
        }
        $xml .= '</urlset>';
        return $xml;
    }

    // ==================== Schema.org 结构化数据 ====================

    /**
     * 生成Schema.org结构化数据
     */
    public function generateSchema(array $args): array
    {
        $pageType = $args['page_type'] ?? 'WebPage';
        $pageId = (int) ($args['page_id'] ?? 0);

        $schema = [];

        switch ($pageType) {
            case 'Product':
                $product = Db::table('sk_product')
                    ->alias('p')
                    ->field('p.id, p.name, p.description, p.price, p.images, b.brand_name, c.name as category_name')
                    ->leftJoin('sk_brands b', 'p.brand_id = b.id')
                    ->leftJoin('sk_category c', 'p.category_id = c.id')
                    ->where('p.id', $pageId)
                    ->find();
                if ($product) {
                    $schema = [
                        '@context' => 'https://schema.org',
                        '@type'    => 'Product',
                        'name'     => $product['name'],
                        'description' => strip_tags($product['description'] ?? ''),
                        'brand'    => ['@type' => 'Brand', 'name' => $product['brand_name'] ?? '天启芯'],
                        'category' => $product['category_name'] ?? '',
                        'offers'   => [
                            '@type' => 'Offer',
                            'price' => $product['price'] ?? '0.00',
                            'priceCurrency' => 'USD',
                            'availability' => 'https://schema.org/InStock',
                        ],
                    ];
                }
                break;

            case 'Organization':
                $schema = [
                    '@context' => 'https://schema.org',
                    '@type'    => 'Organization',
                    'name'     => '天启芯科技有限公司',
                    'url'      => 'https://www.tianqixin.tech',
                    'logo'     => 'https://www.tianqixin.tech/logo.png',
                    'description' => '专业的半导体元件供应商',
                    'address'  => [
                        '@type' => 'PostalAddress',
                        'addressLocality' => '深圳市',
                        'addressRegion' => '广东省',
                        'addressCountry' => 'CN',
                    ],
                    'contactPoint' => [
                        '@type' => 'ContactPoint',
                        'telephone' => '+86-755-12345678',
                        'contactType' => 'sales',
                    ],
                ];
                break;

            case 'Article':
                $article = Db::table('sk_article')->where('id', $pageId)->find();
                if ($article) {
                    $schema = [
                        '@context' => 'https://schema.org',
                        '@type'    => 'Article',
                        'headline' => $article['title'],
                        'description' => $article['summary'] ?? '',
                        'datePublished' => $article['created_at'] ?? '',
                        'dateModified'  => $article['updated_at'] ?? '',
                        'author' => ['@type' => 'Organization', 'name' => '天启芯科技'],
                        'publisher' => [
                            '@type' => 'Organization',
                            'name'  => '天启芯科技',
                            'logo'  => ['@type' => 'ImageObject', 'url' => 'https://www.tianqixin.tech/logo.png'],
                        ],
                    ];
                }
                break;

            case 'BreadcrumbList':
                $schema = [
                    '@context' => 'https://schema.org',
                    '@type'    => 'BreadcrumbList',
                    'itemListElement' => [
                        ['@type' => 'ListItem', 'position' => 1, 'name' => '首页', 'item' => 'https://www.tianqixin.tech/'],
                        ['@type' => 'ListItem', 'position' => 2, 'name' => '产品', 'item' => 'https://www.tianqixin.tech/products'],
                    ],
                ];
                break;

            default:
                $schema = [
                    '@context' => 'https://schema.org',
                    '@type'    => 'WebPage',
                    'name'     => '天启芯科技',
                    'description' => '专业的半导体元件供应商',
                ];
        }

        return ['schema' => $schema, 'json_ld' => json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)];
    }

    // ==================== SEO 竞品分析 ====================

    /**
     * 竞品分析
     */
    public function analyzeCompetitor(array $args): array
    {
        $domain = $args['domain'] ?? '';
        if (empty($domain)) {
            return ['error' => '请输入竞品域名'];
        }

        $competitor = Db::table('seo_competitors')->where('domain', $domain)->find();
        if ($competitor) {
            return [
                'domain'            => $competitor['domain'],
                'domain_score'      => (int) $competitor['domain_score'],
                'backlinks'         => (int) $competitor['backlinks'],
                'referring_domains' => (int) $competitor['referring_domains'],
                'organic_keywords'  => (int) $competitor['organic_keywords'],
                'organic_traffic'   => (int) $competitor['organic_traffic'],
                'top_keywords'      => json_decode($competitor['top_keywords'] ?? '[]', true),
                'last_check_at'     => $competitor['last_check_at'],
            ];
        }

        return ['domain' => $domain, 'note' => '该竞品尚未录入分析数据，请通过第三方工具获取后录入'];
    }

    // ==================== SEO 报告生成 ====================

    /**
     * 生成SEO分析报告
     */
    public function generateSeoReport(array $args): array
    {
        $reportType = $args['report_type'] ?? 'full';

        $report = [
            'type' => $reportType,
            'generated_at' => date('Y-m-d H:i:s'),
        ];

        if ($reportType === 'full' || $reportType === 'health') {
            $report['health'] = $this->analyzeSiteHealth([]);
        }

        if ($reportType === 'full' || $reportType === 'keywords') {
            $report['keywords'] = $this->analyzeKeywords([]);
        }

        if ($reportType === 'full' || $reportType === 'sitemap') {
            $report['sitemap'] = $this->generateSitemap([]);
        }

        // 生成优化建议
        $report['recommendations'] = $this->generateRecommendations($report);

        return $report;
    }

    /**
     * 生成优化建议
     */
    protected function generateRecommendations(array $report): array
    {
        $recommendations = [];
        $health = $report['health']['overview'] ?? [];

        if (($health['avg_seo_score'] ?? 0) < 60) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'overall',
                'title' => '全站SEO评分偏低',
                'action' => '优先修复Critical级别问题，重点完善Meta标签和结构化数据',
            ];
        }

        if (($health['critical_issues'] ?? 0) > 0) {
            $recommendations[] = [
                'priority' => 'high',
                'category' => 'issues',
                'title' => '存在' . $health['critical_issues'] . '个Critical级别问题',
                'action' => '立即修复页面标题缺失、描述缺失、H1缺失等Critical问题',
            ];
        }

        if (($health['audit_coverage'] ?? 0) < 80) {
            $recommendations[] = [
                'priority' => 'medium',
                'category' => 'coverage',
                'title' => 'SEO审计覆盖率不足',
                'action' => '对未审计页面执行批量SEO扫描，建议覆盖率达到90%以上',
            ];
        }

        $recommendations[] = [
            'priority' => 'medium',
            'category' => 'content',
            'title' => '建议配置llms.txt',
            'action' => '在站点根目录添加llms.txt，提升AI搜索引擎的内容抓取效率',
        ];

        $recommendations[] = [
            'priority' => 'medium',
            'category' => 'technical',
            'title' => '完善Schema.org结构化数据',
            'action' => '为产品页、文章页、组织页添加JSON-LD结构化数据标记',
        ];

        $recommendations[] = [
            'priority' => 'low',
            'category' => 'technical',
            'title' => '生成并提交Sitemap',
            'action' => '生成XML站点地图并提交至Google Search Console和百度站长平台',
        ];

        return $recommendations;
    }
}
