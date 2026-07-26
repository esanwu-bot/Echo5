<?php

use think\facade\Route;

// API v1 routes for Semiconductor Website
Route::group('api/v1', function () {

    // --- Public Routes (No Authentication Required) ---

    /**
     * Cron Jobs (定时任务接口，密钥验证)
     * GET /api/v1/cron/refresh-spec-summary?secret=xxx
     */
    Route::get('cron/refresh-spec-summary', 'app\controller\api\CronController@refreshSpecSummary');

    /**
     * Banners
     * GET /api/v1/banners?position=home
     */
    Route::get('banners', 'app\controller\api\BannerController@index');

    /**
     * Sitemap
     * GET /api/v1/sitemap.xml
     */
    Route::get('sitemap.xml', 'app\controller\api\SitemapController@index');

    /**
     * Languages
     * GET /api/v1/languages
     * GET /api/v1/languages/default
     * GET /api/v1/languages/:code
     */
    Route::get('languages', 'app\controller\api\LanguageController@index');
    Route::get('languages/default', 'app\controller\api\LanguageController@default');
    Route::get('languages/:code', 'app\controller\api\LanguageController@read');

    /**
     * Product Categories
     * GET /api/v1/categories
     * GET /api/v1/categories/tree
     * GET /api/v1/categories/:id
     */
    Route::get('categories', 'app\controller\api\CategoryController@index');
    Route::get('categories/tree', 'app\controller\api\CategoryController@tree');
    Route::get('categories/:id', 'app\controller\api\CategoryController@read');
    Route::get('categories/:id/attributes', 'app\controller\api\CategoryController@attributes');

    /**
     * Category Attributes
     * GET /api/v1/category-attributes/:category_id
     * GET /api/v1/category-attributes/:category_id/filter
     * GET /api/v1/category-attributes/:category_id/required
     */
    Route::get('category-attributes/:category_id', 'app\controller\api\CategoryAttributeController@getCategoryAttributes');
    Route::get('category-attributes/:category_id/filter', 'app\controller\api\CategoryAttributeController@getFilterAttributes');
    Route::get('category-attributes/:category_id/required', 'app\controller\api\CategoryAttributeController@getRequiredAttributes');

    /**
     * Products
     * GET /api/v1/products
     * GET /api/v1/products/new
     * GET /api/v1/products/hot
     * GET /api/v1/products/brands
     * GET /api/v1/products/:id
     * 注意：静态路由必须在动态路由前注册，避免被:id捕获
     */
    Route::get('products', 'app\controller\api\ProductController@index');
    Route::get('products/new', 'app\controller\api\ProductController@new');
    Route::get('products/hot', 'app\controller\api\ProductController@hot');
    Route::get('products/brands', 'app\controller\api\ProductController@brands');
    Route::get('products/:id', 'app\controller\api\ProductController@read');

    /**
     * Mall Products
     * GET /api/v1/mall/products
     */
    Route::get('mall/products', 'app\controller\api\MallProductController@index');
    Route::get('mall/products/:id', 'app\controller\api\MallProductController@mallProductDetail');

    /**
     * Product Filtering System (已弃用)
     * @deprecated 2.0 请使用 POST /api/v1/parametric-search 替代 (ParametricSearchController@unifiedSearch)
     * POST /api/v1/products/filter - 产品筛选
     * GET /api/v1/products/categories/:categoryId/attributes - 获取分类属性
     * GET /api/v1/products/categories/:categoryId/brands - 获取分类品牌
     * GET /api/v1/products/categories/tree - 获取分类树
     */
    Route::post('products/filter', 'app\controller\api\ProductFilterController@filter');
    Route::get('products/categories/tree', 'app\controller\api\ProductFilterController@getCategoryTree');
    Route::get('products/categories/:categoryId/attributes', 'app\controller\api\ProductFilterController@getCategoryAttributes');
    Route::get('products/categories/:categoryId/brands', 'app\controller\api\ProductFilterController@getCategoryBrands');

    /**
     * Electronic Components
     * GET /api/v1/electronic-components
     */
    Route::get('electronic-components', 'app\controller\api\ElectronicComponentController@index');

    /**
     * Parametric Search
     * POST /api/v1/parametric-search - 统一参数筛选 (型号级, sk_model_param_val + sk_product_attribute fallback)
     * GET /api/v1/parametric-search/model-params/:modelId - 获取型号参数值
     *
     * @deprecated GET endpoints:
     *   GET /api/v1/parametric-search/products - 参数化产品搜索（旧表）-- 请改用 POST /api/v1/parametric-search
     *   GET /api/v1/parametric-search/filters/:categoryId - 获取筛选选项 -- 请改用 POST /api/v1/parametric-search 中的 filterOptions
     */
    Route::get('parametric-search/products', 'app\controller\api\ParametricSearchController@getProducts');
    Route::get('parametric-search/filters/:categoryId', 'app\controller\api\ParametricSearchController@getFilterOptions');
    Route::post('parametric-search', 'app\controller\api\ParametricSearchController@unifiedSearch');
    Route::get('parametric-search/model-params/:modelId', 'app\controller\api\ParametricSearchController@getModelParams');

    /**
     * Model Management
     * GET /api/v1/models
     * GET /api/v1/models/:id
     * GET /api/v1/models/:id/detail - TI风格型号详情页
     * POST /api/v1/models
     * PUT /api/v1/models/:id
     * DELETE /api/v1/models/:id
     */
    Route::group('models', function () {
        Route::get('', 'app\controller\api\ModelController@index');
        Route::get(':id/detail', 'app\controller\api\ModelController@detail');
        Route::get(':id/stock-locations', 'app\controller\api\ModelController@stockLocations');
        Route::get(':id/downloads', 'app\controller\api\ModelController@downloads');
        Route::get(':id/technical-specs', 'app\controller\api\ModelController@getTechnicalSpecs');
        Route::put(':id/technical-specs', 'app\controller\api\ModelController@updateTechnicalSpecs');
        Route::get(':id', 'app\controller\api\ModelController@read');
        Route::post('', 'app\controller\api\ModelController@save');
        Route::put(':id', 'app\controller\api\ModelController@update');
        Route::delete(':id', 'app\controller\api\ModelController@delete');
        Route::get('category/:categoryId', 'app\controller\api\ModelController@getModelsByCategory');
        Route::get('brand/:brandId', 'app\controller\api\ModelController@getModelsByBrand');
        Route::post('compare', 'app\controller\api\ModelController@compare');
    });

    /**
     * Supplier Management
     * GET /api/v1/suppliers
     * GET /api/v1/suppliers/:id
     * POST /api/v1/suppliers
     * PUT /api/v1/suppliers/:id
     * DELETE /api/v1/suppliers/:id
     */
    Route::group('suppliers', function () {
        Route::get('', 'app\controller\api\SupplierController@index');
        Route::get(':id', 'app\controller\api\SupplierController@read');
        Route::post('', 'app\controller\api\SupplierController@save');
        Route::put(':id', 'app\controller\api\SupplierController@update');
        Route::delete(':id', 'app\controller\api\SupplierController@delete');
    });

    /**
     * Product Supplier Management
     * GET /api/v1/product-suppliers
     * GET /api/v1/product-suppliers/:id
     * POST /api/v1/product-suppliers
     * PUT /api/v1/product-suppliers/:id
     * DELETE /api/v1/product-suppliers/:id
     */
    Route::group('product-suppliers', function () {
        Route::get('', 'app\controller\api\ProductSupplierController@index');
        Route::get(':id', 'app\controller\api\ProductSupplierController@read');
        Route::post('', 'app\controller\api\ProductSupplierController@save');
        Route::put(':id', 'app\controller\api\ProductSupplierController@update');
        Route::delete(':id', 'app\controller\api\ProductSupplierController@delete');
    });

    /**
     * Application Categories
     * GET /api/v1/application-categories
     * GET /api/v1/application-categories/:id
     */
    Route::get('application-categories', 'app\controller\api\ApplicationCategoryController@index');
    Route::get('application-categories/:id', 'app\controller\api\ApplicationCategoryController@read');

    /**
     * Applications
     * GET /api/v1/applications
     * GET /api/v1/applications/:id
     */
    Route::get('applications', 'app\controller\api\ApplicationController@index');
    Route::get('applications/:id', 'app\controller\api\ApplicationController@read');

    /**
     * News
     * GET /api/v1/news
     * GET /api/v1/news/:id
     */
    Route::get('news', 'app\controller\api\NewsController@index');
    Route::get('news/:id', 'app\controller\api\NewsController@read');

    /**
     * Articles
     * GET /api/v1/articles
     * GET /api/v1/articles/:id
     */
    Route::get('articles', 'app\controller\api\ArticleController@index');
    Route::get('articles/:id', 'app\controller\api\ArticleController@read');

    // --- User Authentication Routes ---
    Route::post('auth/register', 'app\controller\api\AuthController@register');
    Route::post('auth/login', 'app\controller\api\AuthController@login');
    Route::post('auth/forgot-password', 'app\controller\api\AuthController@forgotPassword');
    Route::post('auth/reset-password', 'app\controller\api\AuthController@resetPassword');
    Route::post('auth/logout', 'app\controller\api\AuthController@logout');
    Route::get('auth/me', 'app\controller\api\UserController@profile')->middleware('auth');

    /**
     * Business Applications
     * POST /api/v1/business/quote-request
     * POST /api/v1/business/sample-apply
     */
    Route::post('business/quote-request', 'app\controller\api\BusinessController@submitQuote');
    Route::post('business/sample-apply', 'app\controller\api\BusinessController@submitSample');

    /**
     * Search
     * GET /api/v1/search
     * GET /api/v1/search/suggestions
     */
    Route::get('search', 'app\controller\api\SearchController@search');
    Route::get('search/suggestions', 'app\controller\api\SearchController@suggestions');

    /**
     * Home Page Data
     * GET /api/v1/home
     */
    Route::get('home', 'app\controller\api\HomeController@index');

    /**
     * 获取系统默认语言（无缓存）
     * GET /api/v1/system/default-language
     */
    Route::get('system/default-language', 'app\controller\api\SystemController@defaultLanguage');

    /**
     * Temp Translation Tools (翻译工具接口，需管理员认证)
     * POST /api/v1/temp-translation/import-queue        导入API代码词条
     * GET  /api/v1/temp-translation/import-queue        导入API代码词条（浏览器）
     * POST /api/v1/temp-translation/import-db-queue     导入数据库业务数据词条
     * GET  /api/v1/temp-translation/import-db-queue     导入数据库业务数据词条（浏览器）
     * POST /api/v1/temp-translation/translate-pending    批量翻译未翻译词条
     * GET  /api/v1/temp-translation/pending-count        查询待翻译数量
     * GET  /api/v1/temp-translation/export-to-frontend   增量导出翻译到前台语言包
     * GET  /api/v1/temp-translation/export-data          导出指定语言翻译数据（前台自行生成语言包）
     * POST /api/v1/temp-translation/report-missing-key   上报 i18next missingKey
     */
    Route::group(function () {
        Route::post('temp-translation/import-queue', 'app\controller\api\TempTranslationController@importQueue');
        Route::get('temp-translation/import-queue', 'app\controller\api\TempTranslationController@importQueue');
        Route::post('temp-translation/import-db-queue', 'app\controller\api\TempTranslationController@importDbQueue');
        Route::get('temp-translation/import-db-queue', 'app\controller\api\TempTranslationController@importDbQueue');
        Route::post('temp-translation/translate-pending', 'app\controller\api\TempTranslationController@translatePending');
        Route::get('temp-translation/pending-count', 'app\controller\api\TempTranslationController@pendingCount');
        Route::get('temp-translation/export-to-frontend', 'app\controller\api\TempTranslationController@exportToFrontend');
        Route::get('temp-translation/export-data', 'app\controller\api\TempTranslationController@exportData');
        Route::post('temp-translation/report-missing-key', 'app\controller\api\TempTranslationController@reportMissingKey');
    })->middleware('admin_auth');

    /**
     * Training Activities
     * GET /api/v1/training
     * GET /api/v1/training/:id
     */
    Route::get('training', 'app\controller\api\TrainingController@index');
    Route::get('training/:id', 'app\controller\api\TrainingController@read');

    /**
     * FAQs
     * GET /api/v1/faqs
     */
    Route::get('faqs', 'app\controller\api\FaqController@index');

    /**
     * Messages (Contact Form)
     * POST /api/v1/messages
     */
    Route::post('messages', 'app\controller\api\MessageController@save');

    /**
     * About Us
     * GET /api/v1/about/company
     * GET /api/v1/about/qualifications
     */
    Route::get('about/company', 'app\controller\api\AboutController@company');
    Route::get('about/qualifications', 'app\controller\api\AboutController@qualifications');

    /**
     * Jobs
     * GET /api/v1/jobs
     * GET /api/v1/jobs/:id
     * POST /api/v1/jobs/:id/apply
     */
    Route::get('jobs', 'app\controller\api\JobController@index');
    Route::get('jobs/:id', 'app\controller\api\JobController@read');
    Route::post('jobs/:id/apply', 'app\controller\api\JobController@apply');

/**
 * Series (SPU)
 * GET /api/v1/series - 系列列表
 * GET /api/v1/series/:id - 系列详情
 * GET /api/v1/series/:id/parameter-ranges - 系列关键参数范围
 * GET /api/v1/series/:id/filters - 系列动态筛选参数
 * GET /api/v1/series/:id/models - 系列下的型号矩阵
 * GET /api/v1/categories/:categoryId/series - 分类下的系列列表
 */
Route::get('series', 'app\controller\api\SeriesController@index');
Route::get('series/:id/parameter-ranges', 'app\controller\api\SeriesController@parameterRanges');
Route::get('series/:id/filters', 'app\controller\api\SeriesController@filters');
Route::get('series/:id/models', 'app\controller\api\SeriesController@models');
Route::get('series/:id', 'app\controller\api\SeriesController@read');
Route::get('categories/:categoryId/series', 'app\controller\api\SeriesController@index');
Route::get('categories/:categoryId/brands', 'app\controller\api\ProductFilterController@getCategoryBrands');
Route::get('categories/:categoryId/attributes-with-values', 'app\controller\api\ProductFilterController@getCategoryAttributes');

    /**
     * BOM Management
     * POST /api/v1/bom/check-stock - 校验BOM库存并返回替代建议
     * POST /api/v1/bom/inquiry - 提交BOM询盘
     * POST /api/v1/bom/upload - 上传BOM文件（Excel/CSV）
     * GET /api/v1/bom/projects - 获取用户BOM项目列表
     * GET /api/v1/bom/projects/:id - 获取单个BOM项目详情
     * POST /api/v1/bom/projects - 保存BOM项目
     * PUT /api/v1/bom/projects/:id - 更新BOM项目
     * DELETE /api/v1/bom/projects/:id - 删除BOM项目
     */
    Route::post('bom/check-stock', 'app\controller\api\BomController@checkStock');
    Route::post('bom/inquiry', 'app\controller\api\BomController@submitInquiry');
    Route::post('bom/upload', 'app\controller\api\BomController@upload');
    Route::get('bom/projects', 'app\controller\api\BomController@getProjects');
    Route::get('bom/projects/:id', 'app\controller\api\BomController@getProject');
    Route::post('bom/projects', 'app\controller\api\BomController@saveProject');
    Route::put('bom/projects/:id', 'app\controller\api\BomController@updateProject');
    Route::delete('bom/projects/:id', 'app\controller\api\BomController@deleteProject');

    /**
     * Product Alternates
     * GET /api/v1/models/:id/alternates - 获取型号的替代型号
     * GET /api/v1/alternates?model_id=:id - 按型号获取替代
     */
    Route::get('models/:id/alternates', 'app\controller\api\ProductAlternateController@index');
    Route::get('alternates', 'app\controller\api\ProductAlternateController@getByModel');

    /**
     * Model Param Values
     * GET /api/v1/models/:id/params - 获取型号的参数值
     */
    Route::get('models/:id/params', 'app\controller\api\ModelParamValController@index');

    /**
     * Product Documents
     * GET /api/v1/product-documents - 产品文档列表
     * GET /api/v1/product-documents/:id - 单个文档详情
     */
    Route::get('product-documents', 'app\controller\api\ProductDocumentController@index');
    Route::get('product-documents/:id', 'app\controller\api\ProductDocumentController@read');

    /**
     * Upload
     * POST /api/v1/upload/file
     */
    Route::post('upload/file', 'app\controller\api\UploadController@file');

    /**
     * Agent 数据分析智能体
     * POST /api/v1/agent/chat
     * POST /api/v1/agent/chat/stream
     * GET  /api/v1/agent/dashboard
     * GET  /api/v1/agent/report
     * POST /api/v1/agent/report
     * GET  /api/v1/agent/session
     * GET  /api/v1/agent/sessions
     * POST /api/v1/agent/session/delete
     */
    Route::post('agent/chat', 'app\controller\agent\AnalyticsController@chat')
        ->middleware('admin_auth');
    Route::post('agent/chat/stream', 'app\controller\agent\AnalyticsController@chatStream')
        ->middleware('admin_auth');
    Route::get('agent/dashboard', 'app\controller\agent\AnalyticsController@dashboard')
        ->middleware('admin_auth');
    Route::get('agent/models', 'app\controller\agent\AnalyticsController@models')
        ->middleware('admin_auth');
    Route::get('agent/report', 'app\controller\agent\AnalyticsController@reportList')
        ->middleware('admin_auth');
    Route::post('agent/report', 'app\controller\agent\AnalyticsController@generateReport')
        ->middleware('admin_auth');
    Route::get('agent/session', 'app\controller\agent\AnalyticsController@session')
        ->middleware('admin_auth');
    Route::get('agent/sessions', 'app\controller\agent\AnalyticsController@sessionList')
        ->middleware('admin_auth');
    Route::post('agent/session/delete', 'app\controller\agent\AnalyticsController@deleteSession')
        ->middleware('admin_auth');

    /**
     * Guide 导购智能体
     * POST /api/v1/guide/chat
     * POST /api/v1/guide/chat/stream
     * GET  /api/v1/guide/models
     * GET  /api/v1/guide/session
     * GET  /api/v1/guide/sessions
     * POST /api/v1/guide/session/delete
     * GET  /api/v1/guide/quick-search
     * GET  /api/v1/guide/categories
     * POST /api/v1/guide/quote
     * POST /api/v1/guide/sample
     */
    Route::post('guide/chat', 'app\controller\agent\ShoppingGuideController@chat')
        ->middleware(['rate_limit']);
    Route::post('guide/chat/stream', 'app\controller\agent\ShoppingGuideController@chatStream')
        ->middleware(['rate_limit']);
    Route::get('guide/models', 'app\controller\agent\ShoppingGuideController@models');
    Route::get('guide/session', 'app\controller\agent\ShoppingGuideController@session');
    Route::get('guide/sessions', 'app\controller\agent\ShoppingGuideController@sessions');
    Route::post('guide/session/delete', 'app\controller\agent\ShoppingGuideController@deleteSession');
    Route::get('guide/quick-search', 'app\controller\agent\ShoppingGuideController@quickSearch')
        ->middleware(['rate_limit']);
    Route::get('guide/categories', 'app\controller\agent\ShoppingGuideController@categories');
    Route::post('guide/quote', 'app\controller\agent\ShoppingGuideController@quote')
        ->middleware(['rate_limit']);
    Route::post('guide/sample', 'app\controller\agent\ShoppingGuideController@sample')
        ->middleware(['rate_limit']);

    /**
     * Documents
     * GET /api/v1/documents
     * GET /api/v1/documents/:id
     * GET /api/v1/documents/:id/download
     * GET /api/v1/documents/categories
     */
    Route::get('documents', 'app\controller\api\DocumentController@index');
    // Place static/non-parameter routes before the generic :id route to avoid accidental capture
    Route::get('documents/categories', 'app\controller\api\DocumentController@categories');
    Route::get('documents/:id/download', 'app\controller\api\DocumentController@download');
    Route::get('documents/:id', 'app\controller\api\DocumentController@read');

    /**
     * Languages and Translations
     * GET /api/v1/translations/:lang_code
     */
    Route::get('translations/:lang_code', 'app\controller\api\LanguageController@translations');

    /**
     * Site Settings
     * GET /api/v1/settings
     * GET /api/v1/settings/:group
     */
    Route::get('settings', 'app\controller\api\SettingController@index');
    Route::get('settings/:group', 'app\controller\api\SettingController@group');

    // --- Authenticated Routes (User login required) ---
    Route::group(function () {
        /**
         * User Profile
         * GET /api/v1/user/profile
         * PUT /api/v1/user/profile
         * PUT /api/v1/user/password
         */
        Route::get('user/profile', 'app\controller\api\UserController@profile');
        Route::put('user/profile', 'app\controller\api\UserController@updateProfile');
        Route::put('user/password', 'app\controller\api\UserController@changePassword');

        /**
         * User Applications
         * GET /api/v1/user/applications
         */
        Route::get('user/applications', 'app\controller\api\UserController@applications');

        /**
         * User Orders
         * GET /api/v1/user/orders
         */
        Route::get('user/orders', 'app\controller\api\UserController@orders');

        /**
         * Orders Management
         * POST /api/v1/orders
         * GET /api/v1/orders/:id
         */
        Route::post('orders', 'app\controller\api\OrderController@save');
        Route::get('orders/:id', 'app\controller\api\OrderController@read');
        Route::post('orders/:id/cancel', 'app\controller\api\OrderController@cancel');
        Route::post('orders/:id/confirm', 'app\controller\api\OrderController@confirm');

        /**
         * Member Center API
         */

        // User Profile
        Route::get('member/profile', 'app\controller\api\UserController@profile');
        Route::put('member/profile', 'app\controller\api\UserController@updateProfile');
        Route::put('member/password', 'app\controller\api\UserController@changePassword');

        // Favorites
        Route::get('member/favorites', 'app\controller\api\UserController@favorites');
        Route::post('member/favorites', 'app\controller\api\UserController@addFavorite');
        Route::delete('member/favorites/:id', 'app\controller\api\UserController@removeFavorite');

        // Inquiries
        Route::get('member/inquiries', 'app\controller\api\UserController@inquiries');
        Route::post('member/inquiries', 'app\controller\api\UserController@createInquiry');

        // Sample Applications
        Route::get('member/sample-applications', 'app\controller\api\UserController@sampleApplications');
        Route::post('member/sample-applications', 'app\controller\api\UserController@createSampleApplication');

        // Orders
        Route::get('member/orders', 'app\controller\api\UserController@orders');

        // Addresses
        Route::get('member/addresses', 'app\controller\api\UserController@addresses');
        Route::post('member/addresses', 'app\controller\api\UserController@addAddress');
        Route::put('member/addresses/:id', 'app\controller\api\UserController@updateAddress');
        Route::delete('member/addresses/:id', 'app\controller\api\UserController@deleteAddress');
        Route::put('member/addresses/:id/default', 'app\controller\api\UserController@setDefaultAddress');
       })->middleware('auth');
});

// ====== 购物车（支持登录用户和游客，无需 auth 中间件）======
Route::group('api/v1', function () {
    Route::get('cart', 'app\controller\api\CartController@index');
    Route::post('cart/items', 'app\controller\api\CartController@add');
    Route::put('cart/items/:id', 'app\controller\api\CartController@update');
    Route::delete('cart/items/:id', 'app\controller\api\CartController@delete');
    Route::delete('cart', 'app\controller\api\CartController@clear');
    Route::get('cart/count', 'app\controller\api\CartController@stats');
    Route::post('cart/merge', 'app\controller\api\CartController@merge');
});
