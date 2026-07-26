/**
 * 导购Agent API客户端
 * 封装导购助手相关的API请求
 */

import { API_BASE_URL } from "./api-client"
import type { GuideApiResponse, GuideProduct, GuideMenuItem, GuideSession, PaginatedResponse } from "@/types/guide"

import i18n from "i18next";

const API_PREFIX = '/guide'

/**
 * 获取或生成访客标识（用于游客限流）
 */
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let vid = localStorage.getItem('guide_visitor_id')
  if (!vid) {
    vid = crypto.randomUUID?.() ??
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
    localStorage.setItem('guide_visitor_id', vid)
  }
  return vid
}

function guideHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Visitor-Id': getVisitorId(),
  }
}

/**
 * 获取当前语言
 */
function getCurrentLang(): string {
  return i18n.language || 'zh'
}

/**
 * 导购Agent API客户端
 */
export const guideApi = {
  /**
   * 同步对话
   */
  async chat(data: { message: string; session_id?: string; model?: string }): Promise<GuideApiResponse<{
    content: string
    tool_calls: Array<{ id: string; function: { name: string; arguments: string } }>
    session_id: string
  }>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/chat`, {
      method: 'POST',
      headers: guideHeaders(),
      body: JSON.stringify({ ...data, lang: getCurrentLang() }),
    })
    return res.json()
  },

  /**
   * 流式对话（SSE）
   * 返回Response对象，由调用方处理SSE流
   */
  chatStream(data: { message: string; session_id?: string; model?: string }): Promise<Response> {
    return fetch(`${API_BASE_URL}${API_PREFIX}/chat/stream`, {
      method: 'POST',
      headers: guideHeaders(),
      body: JSON.stringify({ ...data, lang: getCurrentLang() }),
    })
  },

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<GuideApiResponse<Array<{ id: string; name: string; provider: string }>>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/models`)
    return res.json()
  },

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<GuideApiResponse<GuideSession>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/session?session_id=${sessionId}`)
    return res.json()
  },

  /**
   * 获取会话列表
   */
  async getSessions(params?: { page?: number; limit?: number }): Promise<GuideApiResponse<PaginatedResponse<GuideSession>>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/sessions?${query}`)
    return res.json()
  },

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<GuideApiResponse<null>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/session/delete`, {
      method: 'POST',
      headers: guideHeaders(),
      body: JSON.stringify({ session_id: sessionId }),
    })
    return res.json()
  },

  /**
   * 快捷搜索
   */
  async quickSearch(keyword: string, limit = 10): Promise<GuideApiResponse<{
    products: GuideProduct[]
    total: number
    keyword: string
  }>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/quick-search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, {
      headers: { 'X-Visitor-Id': getVisitorId() },
    })
    return res.json()
  },

  /**
   * 获取分类菜单
   */
  async getCategories(): Promise<GuideApiResponse<{ menu: GuideMenuItem[] }>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/categories`)
    return res.json()
  },

  /**
   * 提交询价请求
   */
  async createQuote(data: {
    products: Array<{ product_id: number; quantity: number }>
    contact_name: string
    contact_phone: string
    contact_email?: string
    company?: string
    remark?: string
  }): Promise<GuideApiResponse<{ quote_id: number; message: string }>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/quote`, {
      method: 'POST',
      headers: guideHeaders(),
      body: JSON.stringify(data),
    })
    return res.json()
  },

  /**
   * 提交样品申请
   */
  async createSample(data: {
    product_id: number
    quantity: number
    contact_name: string
    contact_phone: string
    contact_email?: string
    company?: string
    purpose?: string
  }): Promise<GuideApiResponse<{ sample_id: number; message: string }>> {
    const res = await fetch(`${API_BASE_URL}${API_PREFIX}/sample`, {
      method: 'POST',
      headers: guideHeaders(),
      body: JSON.stringify(data),
    })
    return res.json()
  },
}

export default guideApi
