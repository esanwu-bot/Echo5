// API 基础 URL（用于 API 请求）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// 后端域名 URL（用于图片/静态资源）
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api\/v\d+$/, '')

// 管理后台域名 URL（用于图片）
export const BACKEND_ADMIN_URL = import.meta.env.VITE_BACKEND_ADMIN_URL || 'http://localhost:3001'

// 图片/静态资源基础 URL（优先使用 BACKEND_URL，否则从 API URL 中提取域名部分）
export const STATIC_BASE_URL = BACKEND_URL

import { toast } from "sonner"
import i18n from './i18n'
import { API_MESSAGE_MAP } from './api-message-map'

/**
 * 获取完整的图片 URL
 * @param path 图片路径（相对路径或完整 URL）
 * @returns 完整的图片 URL
 */
export function getImageUrl(path: string | undefined | null): string {
  console.log('[getImageUrl] Input path:', path)
  console.log('[getImageUrl] STATIC_BASE_URL:', STATIC_BASE_URL)
  console.log('[getImageUrl] BACKEND_URL:', BACKEND_URL)
  console.log('[getImageUrl] import.meta.env.VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL)
  
  if (!path) return ''
  
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // 提取路径部分，使用当前环境的后端域名
    try {
      const url = new URL(path)
      const result = STATIC_BASE_URL + url.pathname
      console.log('[getImageUrl] Full URL detected, result:', result)
      return result
    } catch {
      console.log('[getImageUrl] URL parse failed, returning original:', path)
      return path
    }
  }
  
  // 如果是相对路径（以 / 开头），拼接后端域名
  if (path.startsWith('/')) {
    const result = STATIC_BASE_URL + path
    console.log('[getImageUrl] Relative path detected, result:', result)
    return result
  }
  
  // 如果是相对路径（不以 / 开头），拼接后端域名和 /
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    const result = STATIC_BASE_URL + '/' + path
    console.log('[getImageUrl] Relative path without leading slash detected, result:', result)
    return result
  }
  
  console.log('[getImageUrl] No match, returning original:', path)
  return path
}

/**
 * 获取完整的图片 URL（使用管理后台域名）
 * @param path 图片路径（相对路径或完整 URL）
 * @returns 完整的图片 URL
 */
export function getImageUrlSecond(path: string | undefined | null): string {
  console.log('[getImageUrlSecond] Input path:', path)
  console.log('[getImageUrlSecond] BACKEND_ADMIN_URL:', BACKEND_ADMIN_URL)
  
  if (!path) return ''
  
  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.log('[getImageUrlSecond] Full URL detected, returning original:', path)
    return path
  }
  
  // 如果是相对路径（以 / 开头），拼接管理后台域名
  if (path.startsWith('/')) {
    const result = BACKEND_ADMIN_URL + path
    console.log('[getImageUrlSecond] Relative path detected, result:', result)
    return result
  }
  
  // 如果是相对路径（不以 / 开头），拼接管理后台域名和 /
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    const result = BACKEND_ADMIN_URL + '/' + path
    console.log('[getImageUrlSecond] Relative path without leading slash detected, result:', result)
    return result
  }
  
  console.log('[getImageUrlSecond] No match, returning original:', path)
  return path
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export interface AuthResponse {
  token: string
  user: any
}

export interface LoginRequest {
  username?: string
  email?: string
  password?: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  password_confirm: string
  nickname?: string
  country?: string
  postal_code?: string
  phone?: string
  company?: string
}

export interface Document {
  id: number
  title: string
  category: string
  url: string
  created_at: string
}

export interface Application {
  id: number
  title: string
  slug?: string
  description: string
  cover_image: string
  content?: string
  sort: number
  status?: number
  category_id: number
  products_count?: number
  products?: MallProduct[]
  created_at?: string
}

export interface ApplicationCategory {
  id: number
  name: string
  name_en: string
  cover_image: string
  description: string
  template_type: 'A' | 'B'
  sort: number
  applications?: Application[]
}

export interface MallProduct {
  id: number
  product_code: string
  name: string
  description: string
  category_name: string
  brand_name: string
  images: string[]
  main_image: string
  price: string | number
  currency: string
  unit: string
  stock: number
  status_text: string
  is_new: boolean
  location: string
  models: Array<{ id: number; name: string }>
}

export interface FactoryStep {
  id?: number
  title: string
  title_en: string
  image: string
  isLast?: boolean
  sort?: number
}

export interface FactoryData {
  id?: string
  title: string
  steps: FactoryStep[]
}

export interface VisionFacility {
  type: 'image' | 'text'
  image?: string
  alt?: string
  title?: string
  subtitle?: string
  subtitle_en?: string
}

export interface VisionData {
  id?: string
  title: string
  description: string
  facilities: VisionFacility[]
}

export interface HeroBannerData {
  title: string
  subtitle: string
  banners: Array<{
    id?: number
    title?: string
    subtitle?: string
    description?: string
    image?: string
  }>
  ctaButton: {
    text: string
    url: string
    style: string
  }
}

export interface ApplicationsSectionData {
  id: string
  title: string
  description: string
  applications: Array<{
    id: number
    title?: string
    description: string
    cover_image?: string
    image?: string
    name?: string
    icon?: string
  }>
}

export interface HomeData {
  header?: any
  heroBanner?: HeroBannerData
  applications?: ApplicationsSectionData
  companyInfo?: {
    name?: string
    description?: string
    contact?: {
      phone?: string
      email?: string
      address?: string
    }
  }
  factory?: FactoryData
  sections?: {
    about?: any
    products?: {
      title: string
      subtitle: string
      items: Array<{
        id: number
        name: string
        description: string
        package: string
        image: string
        price: { amount: number; unit: string } | null
      }>
    }
    support?: any
    coverage?: any
    values?: any
    vision?: VisionData
    careers?: any
  }
  footer?: {
    companyInfo?: {
      name?: string
      description?: string
      contact?: {
        phone?: string
        email?: string
        address?: string
      }
    }
    hotProductCategories?: any[]
    hotApplicationCategories?: any[]
    copyright?: string
    icp?: string
  }
}

// Token management
const TOKEN_KEY = 'tqx_auth_token'

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

export const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }
}

// 游客会话 ID 管理
const SESSION_KEY = 'tqx_session_id'
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return ''
  let sid = localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, any>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    headers['X-Session-Id'] = getSessionId()
  }

  // Add language header
  if (typeof window !== 'undefined') {
    const lang = localStorage.getItem('lang') || 'zh'
    headers['Accept-Language'] = lang
    headers['cb-lang'] = lang  // CRMEB-style language header
  }

  if (!url.startsWith('http')) {
    url = `${API_BASE_URL}${url}`
  }

  // If Content-Type is explicitly set to undefined, remove it
  // This is used for FormData where the browser should set the boundary
  if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type']
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data: ApiResponse<T> = await response.json()

    // 翻译 API message 为当前语言
    const apiMessage = data.message || ''
    const translateKey = API_MESSAGE_MAP[apiMessage]
    if (translateKey) {
      // 尝试用已加载的 i18next 翻译，若无则回退到后端原文
      const translated = i18n.t(translateKey)
      if (translated && translated !== translateKey) {
        data.message = translated
      }
    }

    // Global error handling for 400 status code
    if (data.code === 400) {
      toast.error(data.message || '请求失败')
    }

    // Check for authentication errors (HTTP 401 or business code 401)
    if (response.status === 401 || data.code === 401) {
      // Clear invalid token
      setAuthToken(null)
      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      throw new Error(data.message || 'Authentication required')
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('API request error:', error)
    throw error
  }
}

// 认证相关API
export const authApi = {
  // 登录
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })

    if (response.code === 200 && response.data?.token) {
      setAuthToken(response.data.token)
    }

    return response
  },

  // 注册
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  // 登出
  async logout(): Promise<ApiResponse> {
    const response = await apiRequest('/auth/logout', {
      method: 'POST',
    })

    setAuthToken(null)
    return response
  },

  // 忘记密码
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // 重置密码
  async resetPassword(data: {
    email: string
    token: string
    password: string
    password_confirm: string
  }): Promise<ApiResponse> {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse> {
    return apiRequest('/auth/me')
  }
}

// 用户相关API
export const userApi = {
  // 获取用户信息
  async getInfo(): Promise<ApiResponse> {
    return apiRequest('/user/info')
  },

  // 获取用户资料
  async getProfile(): Promise<ApiResponse> {
    return apiRequest('/user/profile')
  },

  // 更新用户资料
  async updateProfile(data: any): Promise<ApiResponse> {
    return apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 修改密码
  async changePassword(data: {
    old_password: string
    new_password: string
    confirm_password: string
  }): Promise<ApiResponse> {
    return apiRequest('/user/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 获取用户订单
  async getOrders(params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/user/orders${query ? '?' + query : ''}`)
  },

  // 获取用户申请记录
  async getApplications(): Promise<ApiResponse> {
    return apiRequest('/user/applications')
  },

  // 获取样品申请记录
  async getSampleApplications(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/member/sample-applications${query ? '?' + query : ''}`)
  },

  // 获取收货地址列表
  async getAddresses(): Promise<ApiResponse> {
    return apiRequest('/member/addresses')
  },

  // 添加收货地址
  async addAddress(data: {
    name: string
    phone: string
    province: string
    city: string
    district: string
    address: string
    is_default?: boolean
  }): Promise<ApiResponse> {
    return apiRequest('/member/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新收货地址
  async updateAddress(id: number, data: {
    name?: string
    phone?: string
    province?: string
    city?: string
    district?: string
    address?: string
    is_default?: boolean
  }): Promise<ApiResponse> {
    return apiRequest(`/member/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除收货地址
  async deleteAddress(id: number): Promise<ApiResponse> {
    return apiRequest(`/member/addresses/${id}`, {
      method: 'DELETE',
    })
  },

  // 设置默认地址
  async setDefaultAddress(id: number): Promise<ApiResponse> {
    return apiRequest(`/member/addresses/${id}/default`, {
      method: 'PUT',
    })
  }
}

// 产品相关API
export const productApi = {
  // 获取产品列表
  async getProducts(params?: {
    page?: number
    limit?: number
    keyword?: string
    category_id?: number
    subcategory?: string
    rating?: string
    in_stock?: boolean
    normally_stocked?: boolean
    active?: boolean
    new_products?: boolean
    rohs_compliant?: boolean
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/products${query ? '?' + query : ''}`)
  },

  // 获取新品
  async getNewProducts(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/products/new${query ? '?' + query : ''}`)
  },

  // 获取热销产品
  async getHotProducts(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/products/hot${query ? '?' + query : ''}`)
  },

  // 获取产品详情
  async getProduct(id: number): Promise<ApiResponse> {
    return apiRequest(`/products/${id}`)
  }
}

// 分类相关API
export const categoryApi = {
  // 获取分类列表
  async getCategories(parentId?: number): Promise<ApiResponse> {
    const query = parentId ? `?parent_id=${parentId}` : ''
    return apiRequest(`/categories${query}`)
  },

  // 获取分类树
  async getCategoryTree(): Promise<ApiResponse> {
    return apiRequest('/categories/tree')
  },

  // 获取分类详情
  async getCategory(id: number): Promise<ApiResponse> {
    return apiRequest(`/categories/${id}`)
  },

  // 获取分类关联的筛选属性（旧接口，无 available_values）
  async getCategoryAttributes(categoryId: number): Promise<ApiResponse> {
    return apiRequest(`/categories/${categoryId}/attributes`)
  },

  // 获取分类属性及可用值（含 available_values，用于分类详情页快捷筛选）
  async getCategoryAttributesWithValues(categoryId: number): Promise<ApiResponse> {
    return apiRequest(`/products/categories/${categoryId}/attributes`)
  },

  // 获取分类下的可用品牌列表
  async getCategoryBrands(categoryId: number): Promise<ApiResponse<{
    brands: Array<{ id: number; name: string; model_count: number }>
    total: number
  }>> {
    return apiRequest(`/products/categories/${categoryId}/brands`)
  }
}

// 购物车相关API（支持登录用户和游客）
export const cartApi = {
  async getCart(): Promise<ApiResponse> {
    return apiRequest('/cart')
  },

  async addToCart(data: {
    model_id?: number
    product_id?: number
    quantity: number
    spec_id?: number
  }): Promise<ApiResponse> {
    return apiRequest('/cart/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateCartItem(id: number, quantity: number): Promise<ApiResponse> {
    return apiRequest(`/cart/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    })
  },

  async removeCartItem(id: number): Promise<ApiResponse> {
    return apiRequest(`/cart/items/${id}`, {
      method: 'DELETE',
    })
  },

  async clearCart(): Promise<ApiResponse> {
    return apiRequest('/cart', {
      method: 'DELETE',
    })
  },

  async getCartCount(): Promise<ApiResponse> {
    return apiRequest('/cart/count')
  },

  // 登录后合并游客购物车
  async mergeCart(): Promise<ApiResponse> {
    return apiRequest('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ session_id: getSessionId() }),
    })
  }
}

// 订单相关API
export const orderApi = {
  // 创建订单（留言询盘，客服联系）
  async createOrder(data: {
    address_id: number
    payment_method: string
    cart_items: Array<{
      product_id: number
      quantity: number
    }>
    remark?: string
  }): Promise<ApiResponse> {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 获取订单详情
  async getOrder(id: number): Promise<ApiResponse> {
    return apiRequest(`/orders/${id}`)
  },

  async cancelOrder(id: number): Promise<ApiResponse> {
    return apiRequest(`/orders/${id}/cancel`, {
      method: 'POST',
    })
  }
}

// 新闻相关API
export const newsApi = {
  // 获取新闻列表
  async getNews(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/news${query ? '?' + query : ''}`)
  },

  // 获取新闻详情
  async getNewsDetail(id: number): Promise<ApiResponse> {
    return apiRequest(`/news/${id}`)
  }
}

// 文章相关API
export const articleApi = {
  // 获取文章列表
  async getArticles(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/articles${query ? '?' + query : ''}`)
  },

  // 获取文章详情
  async getArticle(id: number): Promise<ApiResponse> {
    return apiRequest(`/articles/${id}`)
  }
}

// 商业相关API
export const businessApi = {
  // 提交报价申请
  async submitQuote(data: {
    company: string
    contact_name: string
    email: string
    phone: string
    product_info: string
    quantity: number
  }): Promise<ApiResponse> {
    return apiRequest('/business/quote-request', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 申请样品
  async applySample(data: {
    company: string
    contact_name: string
    email: string
    phone: string
    product_info: string
    quantity: number
  }): Promise<ApiResponse> {
    return apiRequest('/business/sample-apply', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// 搜索相关API
export const searchApi = {
  // 全站搜索
  async search(params: {
    q: string
    type?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/search${query ? '?' + query : ''}`)
  },

  // 搜索建议
  async getSuggestions(q: string): Promise<ApiResponse> {
    return apiRequest(`/search/suggestions?q=${q}`)
  }
}

// 培训活动相关API
export const trainingApi = {
  // 获取培训活动列表
  async getTraining(): Promise<ApiResponse> {
    return apiRequest('/training')
  },

  // 获取培训活动详情
  async getTrainingDetail(id: number): Promise<ApiResponse> {
    return apiRequest(`/training/${id}`)
  },

  // 报名培训活动
  async registerTraining(id: number, data: {
    name: string
    gender: string
    contact: string
    location: string
    attendees: number
    transport: string
  }): Promise<ApiResponse> {
    return apiRequest(`/training/${id}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// 常见问题相关API
export const faqApi = {
  // 获取常见问题
  async getFaqs(): Promise<ApiResponse> {
    return apiRequest('/faqs')
  }
}

// 留言相关API
export const messageApi = {
  // 提交留言
  async submitMessage(data: {
    name: string
    email: string
    subject: string
    content: string
  }): Promise<ApiResponse> {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// 关于我们相关API
export const aboutApi = {
  // 获取公司信息
  async getCompanyInfo(): Promise<ApiResponse> {
    return apiRequest('/about/company')
  },

  // 获取公司资质
  async getQualifications(): Promise<ApiResponse> {
    return apiRequest('/about/qualifications')
  }
}

// 招聘相关API
export const jobApi = {
  // 获取招聘职位
  async getJobs(params?: {
    page?: number
    limit?: number
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/jobs${query ? '?' + query : ''}`)
  },

  // 获取职位详情
  async getJob(id: number): Promise<ApiResponse> {
    return apiRequest(`/jobs/${id}`)
  },

  // 申请职位
  async applyJob(id: number, data: any): Promise<ApiResponse> {
    return apiRequest(`/jobs/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// 首页相关API
export const homeApi = {
  // 获取首页数据
  async getHomeData(): Promise<ApiResponse> {
    return apiRequest('/home')
  }
}

// 横幅相关API
export const bannerApi = {
  // 获取横幅列表
  async getBanners(position?: string): Promise<ApiResponse> {
    const query = position ? `?position=${position}` : ''
    return apiRequest(`/banners${query}`)
  }
}

// 语言相关API
export const languageApi = {
  // 获取语言列表
  async getLanguages(): Promise<ApiResponse> {
    return apiRequest('/languages')
  },

  // 获取语言详情
  async getLanguage(code: string): Promise<ApiResponse> {
    return apiRequest(`/languages/${code}`)
  },

  // 获取默认语言
  async getDefaultLanguage(): Promise<ApiResponse> {
    return apiRequest('/languages/default')
  },

  // 获取翻译内容
  async getTranslations(langCode: string): Promise<ApiResponse> {
    return apiRequest(`/translations/${langCode}`)
  }
}

// 上传相关API
export const uploadApi = {
  // 上传文件
  async uploadFile(file: File): Promise<ApiResponse<{ url: string; filename: string; original_name: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    return apiRequest('/upload/file', {
      method: 'POST',
      body: formData,
      headers: {
        // Let browser set Content-Type with boundary
        'Content-Type': undefined as any,
      },
    })
  }
}

// 文档相关 API
export const documentApi = {
  // 获取文档列表
  async getDocuments(params?: { page?: number; limit?: number; category?: string; keyword?: string }): Promise<ApiResponse<Document[]>> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/documents${query ? '?' + query : ''}`)
  },

  // 获取文档详情
  async getDocument(id: number): Promise<ApiResponse<Document>> {
    return apiRequest(`/documents/${id}`)
  },

  // 获取文档分类
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiRequest('/documents/categories')
  },

  // 构造下载 URL（直接在前端打开即可）
  downloadUrl(id: number) {
    return `${API_BASE_URL}/documents/${id}/download`
  }
}

// 应用领域相关API
export const applicationApi = {
  // 获取应用领域列表
  async getApplications(params?: {
    limit?: number
    category?: string
  }): Promise<ApiResponse> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/applications${query ? '?' + query : ''}`)
  },

  // 获取应用领域详情
  async getApplication(id: number): Promise<ApiResponse> {
    return apiRequest(`/applications/${id}`)
  }
}

// 应用分类相关API
export const applicationCategoryApi = {
  // 获取应用分类列表
  async getCategories(): Promise<ApiResponse<ApplicationCategory[]>> {
    return apiRequest('/application-categories')
  },

  // 获取应用分类详情
  async getCategory(id: number): Promise<ApiResponse<ApplicationCategory>> {
    return apiRequest(`/application-categories/${id}`)
  }
}

// 型号相关数据结构 (TI风格)
export interface ModelDetail {
  header: {
    modelCode: string
    modelName: string
    status: string
    statusCode: string
    inStock: boolean
    stockQuantity: number
    description: string
    equivalentModel: string
  }
  images: {
    mainImage: string
    thumbnail: string
  }
  datasheets: Array<{
    id: string
    title: string
    description: string
    type: string
    version: string
    language: string
    pdfUrl: string
    htmlUrl: string
    fileSize: string
    uploadDate: string
  }>
  pricing: {
    currency: string
    priceBreaks: Array<{
      quantity: string | number
      price: number
      currency: string
    }>
    moq: number
  }
  qualityInfo: {
    grade: { label: string; value: string }
    rohs: { label: string; value: string }
    reach: { label: string; value: string }
    pinPlating: { label: string; value: string }
    msl: { label: string; value: string }
    reliability: { label: string; link: string }
  }
  packageInfo: {
    packageType: { label: string; value: string }
    operatingTemperature: { label: string; value: string }
    packaging: { label: string; value: string }
  }
  features: string[]
  description: {
    title: string
    content: string
  }
  orderInfo: {
    purchaseButton: {
      text: string
      action: string
      url: string
    }
    checkStock: {
      text: string
      action: string
    }
    leadTime: string
    regionSupport: string[]
  }
  breadcrumbs: Array<{ label: string; link: string }>
  relatedResources: {
    params: { title: string; link: string }
    techDocs: { title: string; link: string }
    designDev: { title: string; link: string }
    support: { title: string; link: string }
  }
  exportControl: {
    title: string
    note: string
    eccn: string
  }
  raw: {
    id: number
    categoryId: number
    brandId: number
    series: string
    createdAt: string
    updatedAt: string
  }
}

// 商城相关API
export const mallApi = {
  // 获取商城商品列表
  async mall_getProducts(params?: {
    page?: number
    limit?: number
    keyword?: string
  }): Promise<ApiResponse<{ list: MallProduct[]; total: number }>> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/mall/products${query ? '?' + query : ''}`)
  },

  // 获取商城商品详情
  async mall_getProductDetail(id: string): Promise<ApiResponse<MallProduct>> {
    return apiRequest(`/mall/products/${id}`)
  }
}

// 参数化搜索相关API
export interface ParametricProduct {
  id: number
  partNumber: string
  name: string
  modelId: number | null
  modelCode: string | null
  modelName: string | null
  models: Array<{ id: number; code: string; name: string; isPrimary?: boolean }>
  manufacturer: string
  classification: string
  description: string
  price: number
  currency: string
  inStock: boolean
  stock: number
  packageType: string
  channels: number | null
  bandwidthMHz: number | null
  slewRate: number | null
  supplyVoltageMin: number | null
  supplyVoltageMax: number | null
  offsetVoltageVal: number | null
  images: string[]
  categoryId: number
  subcategoryId: number
  createTime: string
}

export interface FilterOptions {
  category: {
    id: number
    name: string
    name_en: string
  }
  filters: {
    classification: {
      label: string
      type: 'checkbox'
      options: string[]
    }
    channels: {
      label: string
      type: 'checkbox'
      options: number[]
    }
    package_types: {
      label: string
      type: 'checkbox'
      options: string[]
    }
    brands: {
      label: string
      type: 'checkbox'
      options: Array<{ id: number; name: string; product_count: number }>
    }
    bandwidth: {
      label: string
      type: 'range'
      unit: string
      min: number
      max: number
    }
    slew_rate: {
      label: string
      type: 'range'
      unit: string
      min: number
      max: number
    }
    voltage: {
      label: string
      type: 'range'
      unit: string
      min: number
      max: number
    }
    price: {
      label: string
      type: 'range'
      unit: string
      min: number
      max: number
    }
  }
}

export const parametricSearchApi = {
  // 获取参数化产品列表
  async getProducts(params?: {
    category_id?: number
    subcategory_id?: number
    keyword?: string
    page?: number
    page_size?: number
    sort_field?: string
    sort_order?: 'asc' | 'desc'
    in_stock?: boolean
    classification?: string[]
    channels?: number[]
    package_types?: string[]
    brands?: number[]
    bandwidth_min?: number
    bandwidth_max?: number
    slew_rate_min?: number
    slew_rate_max?: number
    voltage_min?: number
    voltage_max?: number
    price_min?: number
    price_max?: number
    attribute_filters?: string
  }): Promise<ApiResponse<{
    products: ParametricProduct[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => query.append(`${key}[]`, String(v)))
          } else {
            query.append(key, String(value))
          }
        }
      })
    }
    return apiRequest(`/parametric-search/products?${query.toString()}`)
  },

  // 获取筛选选项
  async getFilterOptions(categoryId: number): Promise<ApiResponse<FilterOptions>> {
    return apiRequest(`/parametric-search/filters/${categoryId}`)
  }
}

// 型号相关API
export const modelApi = {
  // 获取型号列表
  async getModels(params?: {
    page?: number
    limit?: number
    keyword?: string
    brand_id?: number
    category_id?: number
  }): Promise<ApiResponse<{ list: any[]; total: number; page: number; limit: number }>> {
    const query = new URLSearchParams(params as any).toString()
    return apiRequest(`/models${query ? '?' + query : ''}`)
  },

  // 获取型号详情（基础信息）
  async getModel(id: string): Promise<ApiResponse<any>> {
    return apiRequest(`/models/${id}`)
  },

  // 获取型号详情页（TI风格完整数据）
  async getModelDetail(id: string): Promise<ApiResponse<ModelDetail>> {
    return apiRequest(`/models/${id}/detail`)
  },

  // 按分类获取型号
  async getModelsByCategory(categoryId: number): Promise<ApiResponse<any[]>> {
    return apiRequest(`/models/category/${categoryId}`)
  },

  // 按品牌获取型号
  async getModelsByBrand(brandId: number): Promise<ApiResponse<any[]>> {
    return apiRequest(`/models/brand/${brandId}`)
  },

  // 获取型号技术规格
  async getTechnicalSpecs(id: number): Promise<ApiResponse<any[]>> {
    return apiRequest(`/models/${id}/technical-specs`)
  },

  // 获取型号各仓库库存分布
  async getStockLocations(id: number | string): Promise<ApiResponse<Array<{
    warehouse: string
    warehouse_code: string
    stock: number
    status: 'in_stock' | 'low_stock' | 'out_of_stock'
  }>>> {
    return apiRequest(`/models/${id}/stock-locations`)
  },

  // 获取型号可下载资料（数据手册、ECAD、3D模型等）
  async getDownloads(id: number | string): Promise<ApiResponse<ModelDownloadFile[]>> {
    return apiRequest(`/models/${id}/downloads`)
  }
}
// 系列(SPU)相关API
export interface SeriesItem {
  id: number
  name: string
  description: string
  category_id: number
  category_name: string
  brand_id: number
  brand_name: string
  image: string
  model_count: number
}

export interface SeriesDetailCategory {
  categoryId: string
  name: string
  path: string[]
}

export interface SeriesDetailBrand {
  brandId: string
  name: string
  logo: string
}

export interface SeriesDetailSpecSummary {
  packageRange: string
  resistanceRange: string
  toleranceRange: string
  powerRange: string
}

export interface SeriesDetailDocument {
  type: string
  name: string
  url: string
  language: string
  size: string
  version: string
}

export interface SeriesDetailActions {
  downloadDatasheet: string
  downloadECAD: string
  viewModels: string
}

export interface SeriesDetail {
  seriesId: string
  id: number
  name: string
  mpnPrefix?: string
  category: SeriesDetailCategory
  brand: SeriesDetailBrand
  description: string
  image: string
  specSummary: SeriesDetailSpecSummary
  modelCount: number
  documents: SeriesDetailDocument[]
  actions: SeriesDetailActions
}

export interface SeriesModelItem {
  id: number
  model_code: string
  model_name: string
  brand_name: string
  package_type: string
  stock: number
  moq: number
  lead_time: string
  params: Array<{
    id: number
    model_id: number
    param_id: number
    value: string
    value_numeric: number | null
  }>
}

export interface SeriesParameterRange {
  name: string
  code?: string
  label: string
  unit?: string
  min_value?: string | number
  max_value?: string | number
  values?: string[]
}

export const seriesApi = {
  async getSeriesList(params?: {
    category_id?: number
    brand_id?: number
    keyword?: string
    package_type?: string
    tolerance?: string
    resistance_min?: number
    resistance_max?: number
    sort_by?: 'hot' | 'model_count' | 'newest'
    sort_order?: 'asc' | 'desc'
    page?: number
    page_size?: number
  }): Promise<ApiResponse<{
    series: SeriesItem[]
    pagination: { total: number; page: number; page_size: number; total_pages: number }
  }>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value))
        }
      })
    }
    return apiRequest(`/series${query.toString() ? '?' + query.toString() : ''}`)
  },

  async getSeriesDetail(id: number): Promise<ApiResponse<SeriesDetail>> {
    return apiRequest(`/series/${id}`)
  },

  // 获取系列关键参数范围（用于系列详情页速览）
  async getSeriesParameterRanges(id: number): Promise<ApiResponse<SeriesParameterRange[]>> {
    return apiRequest(`/series/${id}/parameter-ranges`)
  },

  // 获取系列型号矩阵页可用的动态筛选参数
  async getSeriesFilters(id: number): Promise<ApiResponse<Array<{
    name: string
    label: string
    values: string[]
  }>>> {
    return apiRequest(`/series/${id}/filters`)
  },

  async getSeriesModels(id: number, params?: {
    keyword?: string
    package_type?: string
    in_stock?: boolean
    param_filters?: Record<string, string[]>
    sort_field?: string
    sort_order?: 'asc' | 'desc'
    page?: number
    page_size?: number
  }): Promise<ApiResponse<{
    series_id: number
    models: SeriesModelItem[]
    pagination: { total: number; page: number; page_size: number; total_pages: number }
  }>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (key === 'param_filters' && typeof value === 'object') {
          Object.entries(value).forEach(([paramName, paramValues]) => {
            if (Array.isArray(paramValues)) {
              paramValues.forEach(v => query.append(`param_filters[${paramName}][]`, String(v)))
            }
          })
          return
        }
        query.append(key, String(value))
      })
    }
    return apiRequest(`/series/${id}/models${query.toString() ? '?' + query.toString() : ''}`)
  },

  // 导出系列型号矩阵为 Excel
  async exportSeriesModels(id: number, params?: {
    keyword?: string
    package_type?: string
    in_stock?: boolean
    param_filters?: Record<string, string[]>
  }): Promise<Blob> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        if (key === 'param_filters' && typeof value === 'object') {
          Object.entries(value).forEach(([paramName, paramValues]) => {
            if (Array.isArray(paramValues)) {
              paramValues.forEach(v => query.append(`param_filters[${paramName}][]`, String(v)))
            }
          })
          return
        }
        query.append(key, String(value))
      })
    }
    const response = await apiRequest(`/series/${id}/models/export?${query.toString()}`, {
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
    return response as unknown as Blob
  }
}

// 替代型号相关API
export interface AlternateModel {
  id: number
  model_id: number
  alternate_model_id: number
  match_type: 'DIRECT' | 'FUNCTIONAL'
  similarity_score: number | null
  notes: string | null
  alternate_model?: {
    id: number
    model_code: string
    model_name: string
    brand_name?: string
    package_type?: string
    stock?: number
  }
}

export const alternateApi = {
  async getModelAlternates(modelId: number): Promise<ApiResponse<AlternateModel[]>> {
    return apiRequest(`/models/${modelId}/alternates`)
  }
}

// BOM 相关类型
export interface BOMItem {
  id?: number
  model_id: number
  model_code: string
  model_name: string
  brand_name?: string
  quantity: number
  unit_price?: number
  stock?: number
  warning?: boolean
  alternate?: AlternateModel | null
}

export interface BOMProject {
  id?: number
  name: string
  company?: string
  items: BOMItem[]
  total_quantity: number
  total_amount: number
  created_at?: string
  updated_at?: string
}

export interface BOMInquiryRequest {
  project_name: string
  company?: string
  contact_name?: string
  email?: string
  phone?: string
  quantity?: string
  lead_time?: string
  notes?: string
  items: Array<{
    model_id: number
    model_code: string
    quantity: number
  }>
}

export interface BOMUploadResult {
  matched: BOMItem[]
  unmatched: Array<{ row: number; mpn: string; quantity: number; reason: string }>
  total: number
}

// BOM 相关 API
export const bomApi = {
  // 获取用户 BOM 列表（已保存的项目）
  async getProjects(): Promise<ApiResponse<BOMProject[]>> {
    return apiRequest('/bom/projects')
  },

  // 获取单个 BOM 项目详情
  async getProject(id: number): Promise<ApiResponse<BOMProject>> {
    return apiRequest(`/bom/projects/${id}`)
  },

  // 保存 BOM 项目
  async saveProject(data: BOMProject): Promise<ApiResponse<BOMProject>> {
    return apiRequest('/bom/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新 BOM 项目
  async updateProject(id: number, data: Partial<BOMProject>): Promise<ApiResponse<BOMProject>> {
    return apiRequest(`/bom/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除 BOM 项目
  async deleteProject(id: number): Promise<ApiResponse> {
    return apiRequest(`/bom/projects/${id}`, {
      method: 'DELETE',
    })
  },

  // 校验 BOM 库存并返回替代建议
  async validate(items: Array<{ model_id: number; quantity: number }>): Promise<ApiResponse<{
    items: BOMItem[]
    warnings: Array<{ model_id: number; message: string; alternate?: AlternateModel }>
  }>> {
    return apiRequest('/bom/check-stock', {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
  },

  // 提交 BOM 询盘
  async submitInquiry(data: BOMInquiryRequest): Promise<ApiResponse> {
    return apiRequest('/bom/inquiry', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 上传 BOM 文件（Excel/CSV）
  async uploadBOM(file: File): Promise<ApiResponse<BOMUploadResult>> {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest('/bom/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': undefined as any,
      },
    })
  },

  // 导出 BOM 为 Excel
  async exportExcel(items: BOMItem[]): Promise<Blob> {
    const response = await apiRequest('/bom/export', {
      method: 'POST',
      body: JSON.stringify({ items }),
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
    // 如果后端返回 Blob，这里需要特殊处理；默认按 JSON 响应处理
    return response as unknown as Blob
  },

  // 构造导出下载 URL（可直接触发下载）
  exportUrl(items: BOMItem[]): string {
    return `${API_BASE_URL}/bom/export`
  }
}

// 型号对比相关类型
export interface ModelComparisonResult {
  models: Array<{
    id: number
    model_code: string
    model_name: string
    brand_name?: string
    stock?: number
    unit_price?: number
  }>
  params: Array<{
    name: string | null
    label: string | null
    values: Array<string | number | null>
    has_diff: boolean
  }>
}

// 型号对比 API
export const comparisonApi = {
  // 对比多个型号参数
  async compare(modelIds: number[]): Promise<ApiResponse<ModelComparisonResult>> {
    return apiRequest('/models/compare', {
      method: 'POST',
      body: JSON.stringify({ model_ids: modelIds }),
    })
  },

  // 获取型号对比下载 URL
  downloadUrl(modelIds: number[]): string {
    const query = new URLSearchParams()
    modelIds.forEach(id => query.append('model_ids[]', String(id)))
    return `${API_BASE_URL}/models/compare/download?${query.toString()}`
  }
}

// 型号资料下载类型
export interface ModelDownloadFile {
  id: string
  title: string
  type: 'datasheet' | 'spec_report' | '3d_model' | 'footprint' | 'ecad' | 'app_note'
  url: string
  file_size?: string
  language?: string
}

// 型号下载 API
export const modelDownloadApi = {
  // 获取型号的全部可下载资料
  async getDownloads(modelId: number): Promise<ApiResponse<ModelDownloadFile[]>> {
    return apiRequest(`/models/${modelId}/downloads`)
  }
}

// 系统相关 API
export const systemApi = {
  // 清除后端缓存
  async clearCache(): Promise<ApiResponse> {
    return apiRequest('/system/clear-cache', { method: 'POST' })
  },

  // 获取系统默认语言（无缓存，页面初始化时用于同步前后台默认语言）
  async getDefaultLanguage(): Promise<ApiResponse<{ id: number; code: string; lang_code: string; name: string; is_default: number }>> {
    return apiRequest('/system/default-language', { cache: 'no-store' })
  },
}