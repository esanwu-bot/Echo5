<?php
/**
 * 数据分析智能体
 * 专注于电子元器件站点数据洞察
 */
namespace app\agent;

use app\agent\provider\AIProviderInterface;
use app\agent\provider\OpenAICompatibleProvider;
use app\agent\tools\AnalyticsTools;
use app\agent\tools\SeoTools;

class AnalyticsAgent extends Agent
{
    /**
     * {@inheritdoc}
     */
    protected function createProvider(?string $model = null): AIProviderInterface
    {
        return new OpenAICompatibleProvider($model);
    }

    /**
     * {@inheritdoc}
     */
    protected function instructions(): string
    {
        return <<<INSTRUCTIONS
你是"天启芯数据分析与SEO优化智能体"，专注于电子元器件行业站点数据洞察与搜索引擎优化。

## 你的双重身份
### 1. 数据分析师
擅长分析以下业务数据：
- **产品数据**：产品分类分布、热门产品排行、品牌竞争力、价格带分析、新品追踪、库存预警、产品完整度
- **销售数据**：销售趋势、订单状态分布、客单价分析、热销SKU、购物车转化、复购分析
- **客户数据**：客户增长趋势、客户分层、地域分布、询盘转化漏斗
- **内容数据**：内容发布趋势、Banner效果、FAQ热度、应用方案覆盖
- **多语言数据**：翻译覆盖率、翻译质量监控、语言分布、待翻译队列
- **系统数据**：操作审计、配置概览、字典健康度

### 2. SEO专家
你同时是一名资深的搜索引擎优化专家，精通：
- **页面SEO审计**：Meta标签完整性、标题/描述优化、H标签结构、图片ALT属性、内链外链分析
- **技术SEO**：站点地图生成、robots.txt配置、canonical标签、结构化数据(Schema.org)、页面加载速度
- **内容SEO**：关键词策略、内容框架生成、长尾关键词挖掘、GEO(生成式引擎优化)
- **竞品分析**：竞品域名分析、关键词差距分析、外链策略
- **SEO报告**：全站健康度扫描、问题诊断、优化建议优先级排序

## 工作方式
1. 当用户提出数据分析需求时，调用数据分析工具获取数据
2. 当用户提出SEO优化需求时，调用SEO工具进行审计和分析
3. 基于数据结果，生成专业的分析结论和可视化建议
4. 如果数据不足，坦诚告知并建议如何补充数据

## 输出格式
- 使用中文回复
- 数据用 Markdown 表格呈现
- 关键指标用加粗标出
- SEO问题按严重级别标注：Critical（红色）/ Warning（黄色）/ Info（蓝色）
- 提供至少一条可执行的业务建议或SEO优化方案

## 数据库说明
- 产品表：sk_product, sk_brands, sk_category, sk_product_models
- 订单表：sk_order, sk_order_item, sk_cart
- 客户表：sk_customer
- 内容表：sk_article, sk_news, sk_banner, sk_application, sk_faq, sk_training
- 翻译表：sk_translation, sk_lang_code
- 系统表：sk_admin_log, sk_config, sk_dictionary_data
- SEO表：seo_pages, seo_audit_logs, seo_keywords, seo_sitemaps, seo_competitors

请始终保持专业、准确、有帮助。
INSTRUCTIONS;
    }

    /**
     * {@inheritdoc}
     */
    protected function registerTools(): array
    {
        $tools = new AnalyticsTools();
        $seoTools = new SeoTools();
        $toolInstances = [];

        // ========== 数据分析工具 ==========

        // 工具1：产品查询
        $toolInstances['search_products_tool'] = Tool::make(
            'search_products_tool',
            '查询产品信息，支持按分类、品牌、价格区间、新品/热销等条件筛选'
        )->addProperty('category_id', 'integer', '分类ID，0表示所有分类', false)
         ->addProperty('brand_id', 'integer', '品牌ID，0表示所有品牌', false)
         ->addProperty('limit', 'integer', '返回数量，默认10', false)
         ->addProperty('order_by', 'string', '排序字段：views/price/created_at', false)
         ->setCallable([$tools, 'searchProducts']);

        // 工具2：销售分析
        $toolInstances['analyze_sales_tool'] = Tool::make(
            'analyze_sales_tool',
            '分析销售数据，包括销售趋势、订单状态分布、客单价等'
        )->addProperty('period', 'string', '时间周期：7d/30d/90d/1y', false)
         ->addProperty('metric', 'string', '指标：trend/status/average_order', false)
         ->setCallable([$tools, 'analyzeSales']);

        // 工具3：客户分析
        $toolInstances['analyze_customers_tool'] = Tool::make(
            'analyze_customers_tool',
            '分析客户数据，包括增长趋势、分层、地域分布'
        )->addProperty('period', 'string', '时间周期：7d/30d/90d', false)
         ->addProperty('metric', 'string', '指标：growth/tier/region', false)
         ->setCallable([$tools, 'analyzeCustomers']);

        // 工具4：库存分析
        $toolInstances['analyze_inventory_tool'] = Tool::make(
            'analyze_inventory_tool',
            '分析库存数据，包括库存预警、库存周转率'
        )->addProperty('threshold', 'integer', '预警阈值，默认10', false)
         ->setCallable([$tools, 'analyzeInventory']);

        // 工具5：内容分析
        $toolInstances['analyze_content_tool'] = Tool::make(
            'analyze_content_tool',
            '分析内容运营数据，包括文章、新闻、Banner、FAQ等'
        )->addProperty('type', 'string', '内容类型：article/news/banner/faq/training', false)
         ->addProperty('metric', 'string', '指标：count/views/trend', false)
         ->setCallable([$tools, 'analyzeContent']);

        // 工具6：翻译分析
        $toolInstances['analyze_translation_tool'] = Tool::make(
            'analyze_translation_tool',
            '分析多语言翻译数据，包括覆盖率、待翻译数量'
        )->addProperty('lang_code', 'string', '语言代码：en-US/ja-JP/ko-KR/all', false)
         ->addProperty('metric', 'string', '指标：coverage/pending/quality', false)
         ->setCallable([$tools, 'analyzeTranslation']);

        // 工具7：图表生成
        $toolInstances['generate_chart_tool'] = Tool::make(
            'generate_chart_tool',
            '生成 ECharts 图表配置，用于前端可视化渲染'
        )->addProperty('chart_type', 'string', '图表类型：bar/line/pie/funnel/table', true)
         ->addProperty('title', 'string', '图表标题', true)
         ->addProperty('data', 'string', '图表数据（JSON字符串）', true)
         ->addProperty('x_axis', 'string', 'X轴字段名', false)
         ->addProperty('y_axis', 'string', 'Y轴字段名', false)
         ->setCallable([$tools, 'generateChart']);

        // 工具8：综合报告
        $toolInstances['generate_report_tool'] = Tool::make(
            'generate_report_tool',
            '生成综合数据分析报告，整合多个维度数据'
        )->addProperty('report_type', 'string', '报告类型：daily/weekly/product/translation', true)
         ->addProperty('period', 'string', '时间周期：7d/30d', false)
         ->setCallable([$tools, 'generateReport']);

        // 工具9：系统监控
        $toolInstances['analyze_system_tool'] = Tool::make(
            'analyze_system_tool',
            '分析系统运营数据，包括操作日志、配置状态'
        )->addProperty('metric', 'string', '指标：logs/config/dictionary', false)
         ->addProperty('limit', 'integer', '返回数量，默认20', false)
         ->setCallable([$tools, 'analyzeSystem']);

        // ========== SEO优化工具 ==========

        // 工具10：页面SEO审计
        $toolInstances['analyze_page_seo_tool'] = Tool::make(
            'analyze_page_seo_tool',
            '分析指定页面的SEO状态，检查标题、描述、H标签、图片ALT、链接等'
        )->addProperty('url_path', 'string', '页面URL路径，如 /products/123', true)
         ->addProperty('page_type', 'string', '页面类型：home/product/category/article/about/contact', false)
         ->addProperty('page_id', 'integer', '关联业务ID', false)
         ->setCallable([$seoTools, 'analyzePageSeo']);

        // 工具11：全站SEO健康度
        $toolInstances['analyze_site_health_tool'] = Tool::make(
            'analyze_site_health_tool',
            '扫描全站SEO健康度，包括页面覆盖率、平均评分、问题统计、关键词覆盖等'
        )->setCallable([$seoTools, 'analyzeSiteHealth']);

        // 工具12：关键词分析
        $toolInstances['analyze_keywords_tool'] = Tool::make(
            'analyze_keywords_tool',
            '查询关键词库，分析关键词分布、搜索量、竞争难度、排名变化'
        )->addProperty('category', 'string', '关键词分类：brand/product/industry/longtail', false)
         ->addProperty('limit', 'integer', '返回数量，默认20', false)
         ->setCallable([$seoTools, 'analyzeKeywords']);

        // 工具13：关键词建议生成
        $toolInstances['generate_keyword_suggestions_tool'] = Tool::make(
            'generate_keyword_suggestions_tool',
            '基于产品或分类数据自动生成关键词建议，包括主关键词、次要关键词、长尾关键词'
        )->addProperty('product_id', 'integer', '产品ID，与category_id二选一', false)
         ->addProperty('category_id', 'integer', '分类ID，与product_id二选一', false)
         ->setCallable([$seoTools, 'generateKeywordSuggestions']);

        // 工具14：Sitemap生成
        $toolInstances['generate_sitemap_tool'] = Tool::make(
            'generate_sitemap_tool',
            '生成XML站点地图，包含所有产品、分类、文章、新闻、应用等页面的URL'
        )->addProperty('base_url', 'string', '站点基础URL，默认https://www.tianqixin.tech', false)
         ->addProperty('type', 'string', '地图类型：xml/txt/html', false)
         ->setCallable([$seoTools, 'generateSitemap']);

        // 工具15：Schema结构化数据
        $toolInstances['generate_schema_tool'] = Tool::make(
            'generate_schema_tool',
            '生成Schema.org结构化数据(JSON-LD)，支持Product/Organization/Article/BreadcrumbList等类型'
        )->addProperty('page_type', 'string', 'Schema类型：Product/Organization/Article/BreadcrumbList/WebPage', true)
         ->addProperty('page_id', 'integer', '关联页面ID', false)
         ->setCallable([$seoTools, 'generateSchema']);

        // 工具16：竞品分析
        $toolInstances['analyze_competitor_tool'] = Tool::make(
            'analyze_competitor_tool',
            '分析竞品域名的SEO数据，包括域名评分、外链、有机关键词、流量估算'
        )->addProperty('domain', 'string', '竞品域名，如 example.com', true)
         ->setCallable([$seoTools, 'analyzeCompetitor']);

        // 工具17：SEO报告生成
        $toolInstances['generate_seo_report_tool'] = Tool::make(
            'generate_seo_report_tool',
            '生成综合SEO分析报告，包含健康度、关键词、Sitemap、优化建议等'
        )->addProperty('report_type', 'string', '报告类型：full/health/keywords/sitemap', false)
         ->setCallable([$seoTools, 'generateSeoReport']);

        return $toolInstances;
    }
}
