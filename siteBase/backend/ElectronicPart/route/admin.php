<?php
use think\facade\Route;

// Admin routes
Route::group('admin', function () {
    // Public routes (no authentication required)
    Route::group(function () {
        // Admin authentication
        Route::post('login', 'admin.AuthController/login');
    });
    
    // Authenticated routes
    Route::group(function () {
        // Upload
        Route::post('upload/image', 'admin.UploadController/image');
        Route::post('upload/images', 'admin.UploadController/images');
        Route::post('upload/file', 'admin.UploadController/file');
        
        // Admin profile
        Route::get('profile', 'admin.AuthController/profile');
        Route::get('info', 'admin.AuthController/profile'); // Alias for profile
        Route::post('logout', 'admin.AuthController/logout');
        
        // Category Management
        Route::get('categories', 'admin.CategoryController/index');
        Route::get('categories/tree', 'admin.CategoryController/tree');
        Route::get('categories/:id', 'admin.CategoryController/read');
        Route::post('categories', 'admin.CategoryController/save');
        Route::put('categories/:id', 'admin.CategoryController/update');
        Route::delete('categories/:id', 'admin.CategoryController/delete');
        
        // Category Attribute Management
        Route::get('category-attributes', 'admin.CategoryAttributeController/index');
        Route::get('category-attributes/category/:category_id', 'admin.CategoryAttributeController/getCategoryAttributes');
        Route::get('category-attributes/available/:category_id', 'admin.CategoryAttributeController/getAvailableAttributes');
        Route::post('category-attributes', 'admin.CategoryAttributeController/save');
        Route::put('category-attributes/:id', 'admin.CategoryAttributeController/update');
        Route::delete('category-attributes/:id', 'admin.CategoryAttributeController/delete');
        Route::delete('category-attributes/delete-by-category/:category_id', 'admin.CategoryAttributeController/deleteByCategory');
        Route::post('category-attributes/batch-add', 'admin.CategoryAttributeController/batchAdd');
        
        // Attribute Management
        Route::get('attributes', 'admin.AttributeController/index');
        Route::get('attributes/:id', 'admin.AttributeController/read');
        Route::post('attributes', 'admin.AttributeController/save');
        Route::put('attributes/:id', 'admin.AttributeController/update');
        Route::delete('attributes/:id', 'admin.AttributeController/delete');
        Route::post('attributes/batch-delete', 'admin.AttributeController/batchDelete');
        
        // Brand Management
        Route::get('brands', 'admin.BrandController/index');
        Route::get('brands/:id', 'admin.BrandController/read');
        Route::post('brands', 'admin.BrandController/save');
        Route::put('brands/:id', 'admin.BrandController/update');
        Route::delete('brands/:id', 'admin.BrandController/delete');
        Route::post('brands/batch-delete', 'admin.BrandController/batchDelete');
        
        // Product Management
        // 静态路由必须置于动态 :id 路由之前，防止被 products/:id 拦截
        Route::get('products/export', 'admin.ProductController/export');
        Route::get('products/import/template', 'admin.ProductController/importTemplate');
        Route::post('products/import', 'admin.ProductController/import');
        Route::post('products/batch-delete', 'admin.ProductController/batchDelete');
        Route::post('products/batch-status', 'admin.ProductController/batchStatus');
        Route::get('products', 'admin.ProductController/index');
        Route::get('products/:id', 'admin.ProductController/read');
        Route::post('products', 'admin.ProductController/save');
        Route::put('products/:id', 'admin.ProductController/update');
        Route::delete('products/:id', 'admin.ProductController/delete');
        
        // Product Specification Management
        Route::get('specifications', 'admin.SpecificationController/index');
        Route::get('specification-definitions', 'admin.SpecificationController/index'); // Alias for frontend compatibility
        Route::get('specifications/:id', 'admin.SpecificationController/read');
        Route::post('specifications', 'admin.SpecificationController/save');
        Route::put('specifications/:id', 'admin.SpecificationController/update');
        Route::delete('specifications/:id', 'admin.SpecificationController/delete');
        Route::post('specifications/batch-delete', 'admin.SpecificationController/batchDelete');
        Route::get('specifications/product/:product_id', 'admin.SpecificationController/byProduct');
        
        // Product Price Break (Price Tier) Management
        Route::get('price-breaks', 'admin.PriceBreakController/index');
        Route::get('price-breaks/:id', 'admin.PriceBreakController/read');
        Route::post('price-breaks', 'admin.PriceBreakController/save');
        Route::put('price-breaks/:id', 'admin.PriceBreakController/update');
        Route::delete('price-breaks/:id', 'admin.PriceBreakController/delete');
        Route::delete('price-breaks', 'admin.PriceBreakController/batchDelete');
        Route::get('price-breaks/product/:product_id', 'admin.PriceBreakController/byProduct');
        
        // Inventory Management
        Route::get('inventory', 'admin.InventoryController/index');
        Route::get('inventory/:id', 'admin.InventoryController/read');
        Route::put('inventory/:id', 'admin.InventoryController/update');
        Route::post('inventory/batch-delete', 'admin.InventoryController/batchDelete');
        Route::put('inventory/batch-update', 'admin.InventoryController/batchUpdate');
        Route::get('inventory/statistics', 'admin.InventoryController/statistics');
        
        // Article Management
        Route::get('articles', 'admin.ArticleController/index');
        Route::get('articles/categories', 'admin.ArticleController/categories');
        Route::get('articles/:id', 'admin.ArticleController/read');
        Route::post('articles', 'admin.ArticleController/save');
        Route::put('articles/:id', 'admin.ArticleController/update');
        Route::delete('articles/:id', 'admin.ArticleController/delete');
        Route::post('articles/batch-delete', 'admin.ArticleController/batchDelete');

        // News Management
        Route::get('news', 'admin.NewsController/index');
        Route::get('news/:id', 'admin.NewsController/read');
        Route::post('news', 'admin.NewsController/save');
        Route::put('news/:id', 'admin.NewsController/update');
        Route::delete('news/:id', 'admin.NewsController/delete');
        Route::post('news/batch-delete', 'admin.NewsController/batchDelete');
        
        // Job Management
        Route::get('job', 'admin.JobController/index');
        Route::post('job', 'admin.JobController/save');
        Route::post('job/batch', 'admin.JobController/batch');
        Route::get('job/applications', 'admin.JobController/applications');
        Route::get('job/application/:id', 'admin.JobController/applicationDetail');
        Route::put('job/application/:id', 'admin.JobController/updateApplication');
        Route::delete('job/application/:id', 'admin.JobController/deleteApplication');
        Route::get('job/statistics', 'admin.JobController/statistics');
        Route::get('job/:id', 'admin.JobController/read');
        Route::put('job/:id', 'admin.JobController/update');
        Route::delete('job/:id', 'admin.JobController/delete');

        // Banner Management
        Route::get('banners', 'admin.BannerController/index');
        Route::get('banners/:id', 'admin.BannerController/read');
        Route::post('banners', 'admin.BannerController/create');
        Route::put('banners/:id', 'admin.BannerController/update');
        Route::put('banners/:id/status', 'admin.BannerController/updateStatus');
        Route::delete('banners/:id', 'admin.BannerController/delete');
        Route::post('banners/batch-delete', 'admin.BannerController/batchDelete');

        // Document Management
    Route::get('documents', 'admin.DocumentController/index');
    Route::get('documents/:id', 'admin.DocumentController/read');
    Route::post('documents', 'admin.DocumentController/save');
    Route::put('documents/:id', 'admin.DocumentController/update');
    Route::delete('documents/:id', 'admin.DocumentController/delete');
    Route::post('documents/batch-delete', 'admin.DocumentController/batchDelete');

    // FAQ Management
    Route::get('faqs', 'admin.FaqController/index');
    Route::get('faqs/:id', 'admin.FaqController/read');
    Route::post('faqs', 'admin.FaqController/save');
    Route::put('faqs/:id', 'admin.FaqController/update');
    Route::delete('faqs/:id', 'admin.FaqController/delete');
    Route::post('faqs/batch-delete', 'admin.FaqController/batchDelete');

    // Messages (Contact) Management
    Route::get('messages', 'admin.MessageController/index');
    Route::get('messages/:id', 'admin.MessageController/read');
    Route::post('messages', 'admin.MessageController/save');
    Route::put('messages/:id', 'admin.MessageController/update');
    Route::delete('messages/:id', 'admin.MessageController/delete');
    Route::post('messages/batch-delete', 'admin.MessageController/batchDelete');

    // Quote Requests
    Route::get('quote-requests', 'admin.QuoteRequestController/index');
    Route::get('quote-requests/:id', 'admin.QuoteRequestController/read');
    Route::put('quote-requests/:id', 'admin.QuoteRequestController/update');
    Route::delete('quote-requests/:id', 'admin.QuoteRequestController/delete');

    // Sample Applications
    Route::get('sample-applications', 'admin.SampleApplyController/index');
    Route::get('sample-applications/:id', 'admin.SampleApplyController/read');
    Route::put('sample-applications/:id', 'admin.SampleApplyController/update');
    Route::delete('sample-applications/:id', 'admin.SampleApplyController/delete');

        // Application Category Management
        Route::get('application-categories', 'admin.ApplicationCategoryController/index');
        Route::get('application-categories/:id', 'admin.ApplicationCategoryController/read');
        Route::post('application-categories', 'admin.ApplicationCategoryController/save');
        Route::put('application-categories/:id', 'admin.ApplicationCategoryController/update');
        Route::put('application-categories/:id/status', 'admin.ApplicationCategoryController/updateStatus');
        Route::delete('application-categories/:id', 'admin.ApplicationCategoryController/delete');
        Route::post('application-categories/batch-delete', 'admin.ApplicationCategoryController/batchDelete');

        // Application Areas Management
        Route::get('applications', 'admin.ApplicationController/index');
        Route::get('applications/available-products', 'admin.ApplicationController/getAvailableProducts');
        Route::get('applications/:id', 'admin.ApplicationController/read');
        Route::post('applications', 'admin.ApplicationController/save');
        Route::put('applications/:id', 'admin.ApplicationController/update');
        Route::put('applications/:id/status', 'admin.ApplicationController/updateStatus');
        Route::delete('applications/:id', 'admin.ApplicationController/delete');
        Route::post('applications/batch-delete', 'admin.ApplicationController/batchDelete');

        // Business Applications Management
        Route::get('business-applications/quotes', 'admin.BusinessApplicationController/getQuoteRequests');
        Route::get('business-applications/samples', 'admin.BusinessApplicationController/getSampleApplications');
        Route::get('business-applications/quotes/:id', 'admin.BusinessApplicationController/getQuoteRequest');
        Route::get('business-applications/samples/:id', 'admin.BusinessApplicationController/getSampleApplication');
        Route::put('business-applications/quotes/:id', 'admin.BusinessApplicationController/updateQuoteRequest');
        Route::put('business-applications/samples/:id', 'admin.BusinessApplicationController/updateSampleApplication');
        Route::delete('business-applications/quotes/:id', 'admin.BusinessApplicationController/deleteQuoteRequest');
        Route::delete('business-applications/samples/:id', 'admin.BusinessApplicationController/deleteSampleApplication');
        Route::get('business-applications/statistics', 'admin.BusinessApplicationController/getStatistics');
        Route::post('business-applications/batch-update-quotes', 'admin.BusinessApplicationController/batchUpdateQuoteStatus');
        Route::post('business-applications/batch-update-samples', 'admin.BusinessApplicationController/batchUpdateSampleStatus');
        Route::post('business-applications/batch-delete-quotes', 'admin.BusinessApplicationController/batchDeleteQuotes');
        Route::post('business-applications/batch-delete-samples', 'admin.BusinessApplicationController/batchDeleteSamples');

        // Marketing Activity Management
        Route::get('marketing', 'admin.MarketingController/index');
        Route::get('marketing/:id', 'admin.MarketingController/read');
        Route::post('marketing', 'admin.MarketingController/save');
        Route::put('marketing/:id', 'admin.MarketingController/update');
        Route::delete('marketing/:id', 'admin.MarketingController/delete');
        Route::get('marketing/statistics', 'admin.MarketingController/statistics');
        Route::put('marketing/:id/status', 'admin.MarketingController/updateStatus');
        Route::post('marketing/batch-delete', 'admin.MarketingController/batchDelete');

        // Order Management
        // 静态路由置于 :id 路由之前
        Route::get('orders/export', 'admin.OrderController/export');
        Route::get('orders/statistics', 'admin.OrderController/statistics');
        Route::get('orders/recent', 'admin.OrderController/recent');
        Route::get('orders/sales-chart', 'admin.OrderController/salesChart');
        Route::post('orders/batch-delete', 'admin.OrderController/batchDelete');
        Route::get('orders', 'admin.OrderController/index');
        Route::get('orders/:id', 'admin.OrderController/read');
        Route::put('orders/:id/status', 'admin.OrderController/updateStatus');
        Route::post('orders/:id/ship', 'admin.OrderController/ship');
        Route::post('orders/:id/refund', 'admin.OrderController/refund');

        // Dashboard Management
        Route::get('dashboard', 'admin.DashboardController/index');
        Route::get('dashboard/statistics', 'admin.DashboardController/statistics');
        Route::get('dashboard/sales-chart', 'admin.DashboardController/salesChart');
        Route::get('dashboard/realtime', 'admin.DashboardController/realtime');

        // Agent 智能体（数据分析）
        Route::get('agent/sessions', 'agent.AnalyticsController/sessionList');
        Route::get('agent/session', 'agent.AnalyticsController/session');
        Route::post('agent/session/delete', 'agent.AnalyticsController/deleteSession');
        Route::post('agent/chat', 'agent.AnalyticsController/chat');
        Route::post('agent/chat/stream', 'agent.AnalyticsController/chatStream');
        Route::get('agent/dashboard', 'agent.AnalyticsController/dashboard');
        Route::get('agent/report', 'agent.AnalyticsController/reportList');
        Route::post('agent/report', 'agent.AnalyticsController/generateReport');
        Route::get('agent/models', 'agent.AnalyticsController/models');

        // Member/User Management
        Route::get('members', 'admin.UserController/index');
        Route::get('members/:id', 'admin.UserController/read');
        Route::put('members/:id/status', 'admin.UserController/updateStatus');
        Route::get('members/:id/orders', 'admin.UserController/getUserOrders');
        Route::get('members/statistics', 'admin.UserController/statistics');
        Route::post('members/batch-delete', 'admin.UserController/batchDelete');
        //
        // 用户管理 - 添加缺失的CRUD路由
        Route::post('users', 'admin.UserController/create')->name('admin.users.create');
        Route::put('users/:id', 'admin.UserController/update')->name('admin.users.update');
        Route::delete('users/:id', 'admin.UserController/delete')->name('admin.users.delete');
        
        // Language Management
        Route::get('languages', 'admin.LanguageAdminController/index');
        Route::get('languages/:id', 'admin.LanguageAdminController/read');
        Route::post('languages', 'admin.LanguageAdminController/save');
        Route::put('languages/:id', 'admin.LanguageAdminController/update');
        Route::delete('languages/:id', 'admin.LanguageAdminController/delete');
        Route::put('languages/:id/status', 'admin.LanguageAdminController/updateStatus');
        Route::put('languages/:id/set-default', 'admin.LanguageAdminController/setDefault');
        
        // Translation Management
        Route::get('translations', 'admin.TranslationAdminController/index');
        Route::get('translations/:id', 'admin.TranslationAdminController/read');
        Route::post('translations', 'admin.TranslationAdminController/save');
        Route::put('translations/:id', 'admin.TranslationAdminController/update');
        Route::delete('translations/:id', 'admin.TranslationAdminController/delete');
        Route::post('translations/batch-delete', 'admin.TranslationAdminController/batchDelete');
        Route::post('translations/auto-translate', 'admin.TranslationAdminController/autoTranslate');
        Route::post('translations/batch-import', 'admin.TranslationAdminController/batchImport');
        Route::get('translations/export', 'admin.TranslationAdminController/export');
        
        // Translation Configuration (Volcano Engine)
        Route::get('translate-config', 'admin.TranslateConfigController/index');
        Route::put('translate-config', 'admin.TranslateConfigController/update');

        // ============================================================
        // 多语言管理（对标 CRMEB 方案）
        // ============================================================

        // 语言类型管理 (LangType)
        Route::get('lang_types', 'admin.LangTypeAdminController/index');
        Route::get('lang_types/:id', 'admin.LangTypeAdminController/read');
        Route::post('lang_types', 'admin.LangTypeAdminController/save');
        Route::put('lang_types/:id', 'admin.LangTypeAdminController/update');
        Route::delete('lang_types/:id', 'admin.LangTypeAdminController/delete');
        Route::put('lang_types/:id/status', 'admin.LangTypeAdminController/updateStatus');
        Route::put('lang_types/:id/set-default', 'admin.LangTypeAdminController/setDefault');

        // 翻译词条管理 (LangCode)
        Route::get('lang_codes', 'admin.LangCodeAdminController/index');
        Route::get('lang_codes/info', 'admin.LangCodeAdminController/info');
        Route::post('lang_codes', 'admin.LangCodeAdminController/save');
        Route::delete('lang_codes/:code', 'admin.LangCodeAdminController/delete');
        Route::delete('lang_codes/id/:id', 'admin.LangCodeAdminController/deleteById');
        Route::post('lang_codes/translate', 'admin.LangCodeAdminController/translate');
        Route::post('lang_codes/batch_translate', 'admin.LangCodeAdminController/batchTranslate');
        Route::post('lang_codes/batch_delete', 'admin.LangCodeAdminController/batchDelete');

        // 浏览器语言映射管理 (LangCountry)
        Route::get('lang_countries', 'admin.LangCountryAdminController/index');
        Route::get('lang_countries/:id', 'admin.LangCountryAdminController/read');
        Route::post('lang_countries', 'admin.LangCountryAdminController/save');
        Route::put('lang_countries/:id', 'admin.LangCountryAdminController/update');
        Route::put('lang_countries/:id/status', 'admin.LangCountryAdminController/updateStatus');
        Route::delete('lang_countries/:id', 'admin.LangCountryAdminController/delete');
        Route::post('lang_countries/batch-delete', 'admin.LangCountryAdminController/batchDelete');
        
        // ============================================================
        // Product Module Enhancement (2026-07-02)
        // ============================================================

        // Series (SPU) Management
        Route::get('series', 'admin.SeriesController/index');
        Route::get('series/:id', 'admin.SeriesController/read');
        Route::post('series', 'admin.SeriesController/save');
        Route::put('series/:id', 'admin.SeriesController/update');
        Route::delete('series/:id', 'admin.SeriesController/delete');

        // Alternate Model Management
        Route::get('product-alternates', 'admin.ProductAlternateController/index');
        Route::get('product-alternates/:id', 'admin.ProductAlternateController/read');
        Route::post('product-alternates', 'admin.ProductAlternateController/save');
        Route::put('product-alternates/:id', 'admin.ProductAlternateController/update');
        Route::delete('product-alternates/:id', 'admin.ProductAlternateController/delete');

        // Model Param Value Management
        Route::get('model-param-vals', 'admin.ModelParamValController/index');
        Route::get('model-param-vals/:id', 'admin.ModelParamValController/read');
        Route::get('model-param-vals/by-model/:modelId', 'admin.ModelParamValController/getByModel');
        Route::post('model-param-vals', 'admin.ModelParamValController/save');
        Route::put('model-param-vals/:id', 'admin.ModelParamValController/update');
        Route::delete('model-param-vals/:id', 'admin.ModelParamValController/delete');

        // Product Document Management
        Route::get('product-documents', 'admin.ProductDocumentController/index');
        Route::get('product-documents/:id', 'admin.ProductDocumentController/read');
        Route::post('product-documents', 'admin.ProductDocumentController/save');
        Route::put('product-documents/:id', 'admin.ProductDocumentController/update');
        Route::delete('product-documents/:id', 'admin.ProductDocumentController/delete');
        Route::post('product-documents/batch-delete', 'admin.ProductDocumentController/batchDelete');

        // Settings Management
        Route::get('settings', 'admin.SettingController/index');
        Route::put('settings', 'admin.SettingController/update');
        Route::get('settings/group/:group', 'admin.SettingController/group');
        Route::post('settings/update-group/:group', 'admin.SettingController/updateGroup');
        Route::post('settings/backup', 'admin.SettingController/backup');
        Route::post('settings/restore', 'admin.SettingController/restore');
        
        // Model Management
        Route::get('models', 'admin.ModelController/index');
        Route::get('models/:id', 'admin.ModelController/read');
        Route::post('models', 'admin.ModelController/save');
        Route::put('models/:id', 'admin.ModelController/update');
        Route::delete('models/:id', 'admin.ModelController/delete');
        Route::post('models/batch-delete', 'admin.ModelController/batchDelete');
        Route::get('models/by-brand/:brandId', 'admin.ModelController/getByBrand');
        Route::get('models/by-category/:categoryId', 'admin.ModelController/getByCategory');
        
        // Supplier Management
        Route::get('suppliers', 'admin.SupplierController/index');
        Route::get('suppliers/active', 'admin.SupplierController/getActive');
        Route::get('suppliers/:id', 'admin.SupplierController/read');
        Route::post('suppliers', 'admin.SupplierController/save');
        Route::put('suppliers/:id', 'admin.SupplierController/update');
        Route::delete('suppliers/:id', 'admin.SupplierController/delete');
        Route::post('suppliers/batch-delete', 'admin.SupplierController/batchDelete');
        
        // Product Supplier Association Management
        Route::get('product-suppliers', 'admin.ProductSupplierController/index');
        Route::get('product-suppliers/:id', 'admin.ProductSupplierController/read');
        Route::post('product-suppliers', 'admin.ProductSupplierController/save');
        Route::put('product-suppliers/:id', 'admin.ProductSupplierController/update');
        Route::delete('product-suppliers/:id', 'admin.ProductSupplierController/delete');
        Route::post('product-suppliers/batch-delete', 'admin.ProductSupplierController/batchDelete');
        Route::get('product-suppliers/by-product/:productId', 'admin.ProductSupplierController/getByProduct');
        Route::get('product-suppliers/by-supplier/:supplierId', 'admin.ProductSupplierController/getBySupplier');

        // Proxy Order Management
        Route::post('proxy-order/list', 'admin.ProxyOrderController/getProxyOrders');
        Route::post('proxy-order/create', 'admin.ProxyOrderController/createOrder');
        Route::post('proxy-order/batch-delete', 'admin.ProxyOrderController/batchDelete');

        // Certificate Management (资质证书)
        Route::get('certificates', 'admin.CertificateController/index');
        Route::get('certificates/:id', 'admin.CertificateController/read');
        Route::post('certificates', 'admin.CertificateController/save');
        Route::put('certificates/:id', 'admin.CertificateController/update');
        Route::delete('certificates/:id', 'admin.CertificateController/delete');
        Route::post('certificates/batch-delete', 'admin.CertificateController/batchDelete');

        // Dictionary Management
        // Dictionary Management
        Route::get('dictionary/getProjects', 'admin.DictionaryController/getProjects');
        Route::get('dictionary/read', 'admin.DictionaryController/read');
        Route::post('dictionary/saveProject', 'admin.DictionaryController/saveProject');
        Route::post('dictionary/deleteProject', 'admin.DictionaryController/deleteProject');
        Route::post('dictionary/batchDeleteProject', 'admin.DictionaryController/batchDeleteProject');
        Route::get('dictionary/fields', 'admin.DictionaryController/fields');
        
        Route::get('dictionary/getDataList', 'admin.DictionaryController/getDataList');
        Route::post('dictionary/saveData', 'admin.DictionaryController/saveData');
        Route::post('dictionary/deleteData', 'admin.DictionaryController/deleteData');
        Route::post('dictionary/batchDeleteData', 'admin.DictionaryController/batchDeleteData');

    })->middleware(\app\middleware\AdminAuthMiddleware::class);
    
});
