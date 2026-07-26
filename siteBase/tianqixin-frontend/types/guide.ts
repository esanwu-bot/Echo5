/**
 * 导购Agent类型定义
 */

/** 消息 */
export interface GuideMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  tool_calls?: ToolCall[]
  isError?: boolean
}

/** 工具调用 */
export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
}

/** 会话 */
export interface GuideSession {
  session_id: string
  title: string
  messages: GuideMessage[]
  created_at: string
  updated_at: string
}

/** 产品 */
export interface GuideProduct {
  id: number
  product_code: string
  name: string
  model_number: string
  brand: string
  brand_id: number
  price: number | null
  stock: number
  package_type: string | null
  image_url: string | null
  datasheet_url?: string | null
  views?: number
  is_new?: number
  category_name?: string
}

/** 分类菜单项 */
export interface GuideMenuItem {
  id: string
  name: string
  icon?: string
  prompt?: string
  children?: GuideMenuItem[]
}

/** API响应 */
export interface GuideApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  limit: number
}

/** 模型 */
export interface GuideModel {
  id: string
  name: string
  provider: string
}

/** SSE事件 */
export interface GuideSSEEvent {
  type: 'token' | 'done' | 'error'
  text?: string
  session_id?: string
  tool_calls?: ToolCall[]
  message?: string
  error_code?: string
}
