// API 基础 URL - 直接使用后端API地址
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// 管理后台域名（用于拼接图片等静态资源URL）
export const BACKEND_ADMIN_URL = process.env.NEXT_PUBLIC_BACKEND_ADMIN_URL || 'http://localhost:8000';

// Note: We are now using the real API instead of mock data
// export const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' || false;

// API endpoints
export const API_ENDPOINTS = {
  ADMIN: {
    LOGIN: '/admin/login',
    PROFILE: '/admin/profile',
    LOGOUT: '/admin/logout',
  },
  PRODUCTS: {
    LIST: '/admin/products',
    CREATE: '/admin/products',
    UPDATE: '/admin/products/:id',
    DELETE: '/admin/products/:id',
    DETAIL: '/admin/products/:id',
  },
  CATEGORIES: {
    LIST: '/admin/categories',
    TREE: '/admin/categories/tree',
    CREATE: '/admin/categories',
    UPDATE: '/admin/categories/:id',
    DELETE: '/admin/categories/:id',
  },
  ARTICLES: {
    LIST: '/admin/articles',
    CATEGORIES: '/admin/articles/categories',
    CREATE: '/admin/articles',
    UPDATE: '/admin/articles/:id',
    DELETE: '/admin/articles/:id',
    DETAIL: '/admin/articles/:id',
  },
  NEWS: {
    LIST: '/admin/news',
    CREATE: '/admin/news',
    UPDATE: '/admin/news/:id',
    DELETE: '/admin/news/:id',
    DETAIL: '/admin/news/:id',
  },
  BANNERS: {
    LIST: '/admin/banners',
    CREATE: '/admin/banners',
    UPDATE: '/admin/banners/:id',
    UPDATE_STATUS: '/admin/banners/:id/status',
    DELETE: '/admin/banners/:id',
    DETAIL: '/admin/banners/:id',
    BY_POSITION: '/admin/banners/position/:position',
  },
  APPLICATIONS: {
    LIST: '/admin/applications',
    AVAILABLE_PRODUCTS: '/admin/applications/available-products',
    CREATE: '/admin/applications',
    UPDATE: '/admin/applications/:id',
    UPDATE_STATUS: '/admin/applications/:id/status',
    DELETE: '/admin/applications/:id',
    DETAIL: '/admin/applications/:id',
  },
  BUSINESS_APPLICATIONS: {
    QUOTES: '/admin/business-applications/quotes',
    SAMPLES: '/admin/business-applications/samples',
    QUOTE_DETAIL: '/admin/business-applications/quotes/:id',
    SAMPLE_DETAIL: '/admin/business-applications/samples/:id',
    UPDATE_QUOTE: '/admin/business-applications/quotes/:id',
    UPDATE_SAMPLE: '/admin/business-applications/samples/:id',
    DELETE_QUOTE: '/admin/business-applications/quotes/:id',
    DELETE_SAMPLE: '/admin/business-applications/samples/:id',
    STATISTICS: '/admin/business-applications/statistics',
    BATCH_UPDATE_QUOTES: '/admin/business-applications/batch-update-quotes',
    BATCH_UPDATE_SAMPLES: '/admin/business-applications/batch-update-samples',
  },
  LANGUAGES: {
    LIST: '/admin/languages',
    CREATE: '/admin/languages',
    UPDATE: '/admin/languages/:id',
    DELETE: '/admin/languages/:id',
    DETAIL: '/admin/languages/:id',
    UPDATE_STATUS: '/admin/languages/:id/status',
    SET_DEFAULT: '/admin/languages/:id/set-default',
  },
  MODELS: {
    LIST: '/admin/models',
    CREATE: '/admin/models',
    UPDATE: '/admin/models/:id',
    DELETE: '/admin/models/:id',
    DETAIL: '/admin/models/:id',
    BY_BRAND: '/admin/models/by-brand/:brandId',
    BY_CATEGORY: '/admin/models/by-category/:categoryId',
  },
  SUPPLIERS: {
    LIST: '/admin/suppliers',
    CREATE: '/admin/suppliers',
    UPDATE: '/admin/suppliers/:id',
    DELETE: '/admin/suppliers/:id',
    DETAIL: '/admin/suppliers/:id',
    ACTIVE: '/admin/suppliers/active',
  },
  PRODUCT_SUPPLIERS: {
    LIST: '/admin/product-suppliers',
    CREATE: '/admin/product-suppliers',
    UPDATE: '/admin/product-suppliers/:id',
    DELETE: '/admin/product-suppliers/:id',
    DETAIL: '/admin/product-suppliers/:id',
    BY_PRODUCT: '/admin/product-suppliers/by-product/:productId',
    BY_SUPPLIER: '/admin/product-suppliers/by-supplier/:supplierId',
  },
};

// Request timeout
export const REQUEST_TIMEOUT = 10000;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};
