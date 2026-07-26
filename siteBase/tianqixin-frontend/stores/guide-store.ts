/**
 * 导购Agent状态管理
 * 使用Zustand管理导购助手的全局状态
 */

import { create } from 'zustand'
import type { GuideMessage, GuideSession, GuideProduct, GuideMenuItem, GuideModel } from '@/types/guide'

interface GuideState {
  // 会话相关
  currentSession: GuideSession | null
  sessions: GuideSession[]
  sessionId: string | null

  // 消息相关
  messages: GuideMessage[]
  isStreaming: boolean

  // 搜索相关
  searchKeyword: string
  searchResults: GuideProduct[]
  isSearching: boolean

  // 导航菜单
  menuItems: GuideMenuItem[]
  expandedMenus: string[]

  // 历史记录
  historyItems: string[]

  // 模型相关
  selectedModel: string
  availableModels: GuideModel[]

  // Actions
  setSessionId: (id: string | null) => void
  setCurrentSession: (session: GuideSession | null) => void
  setSessions: (sessions: GuideSession[]) => void
  addMessage: (message: GuideMessage) => void
  updateLastMessage: (content: string | ((prev: string) => string)) => void
  clearMessages: () => void
  setIsStreaming: (streaming: boolean) => void
  setSearchKeyword: (keyword: string) => void
  setSearchResults: (results: GuideProduct[]) => void
  setIsSearching: (searching: boolean) => void
  setMenuItems: (items: GuideMenuItem[]) => void
  toggleMenu: (menuId: string) => void
  addHistoryItem: (item: string) => void
  clearHistory: () => void
  setSelectedModel: (model: string) => void
  setAvailableModels: (models: GuideModel[]) => void
  reset: () => void
}

const MAX_HISTORY = 10

const DEFAULT_MODEL = 'deepseek-v4-flash'

export const useGuideStore = create<GuideState>((set, get) => ({
  // 初始状态
  currentSession: null,
  sessions: [],
  sessionId: null,
  messages: [],
  isStreaming: false,
  searchKeyword: '',
  searchResults: [],
  isSearching: false,
  menuItems: [],
  expandedMenus: [],
  historyItems: [],
  selectedModel: DEFAULT_MODEL,
  availableModels: [],

  // Actions
  setSessionId: (id) => set({ sessionId: id }),

  setCurrentSession: (session) => set({ currentSession: session }),

  setSessions: (sessions) => set({ sessions }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),

  updateLastMessage: (contentOrUpdater) => set((state) => {
    const messages = [...state.messages]
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      const newContent = typeof contentOrUpdater === 'function'
        ? (contentOrUpdater as (prev: string) => string)(lastMsg.content)
        : contentOrUpdater
      messages[messages.length - 1] = {
        ...lastMsg,
        content: newContent,
      }
    }
    return { messages }
  }),

  clearMessages: () => set({ messages: [] }),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  setSearchResults: (results) => set({ searchResults: results }),

  setIsSearching: (searching) => set({ isSearching: searching }),

  setMenuItems: (items) => set({ menuItems: items }),

  toggleMenu: (menuId) => set((state) => {
    const expanded = state.expandedMenus
    if (expanded.includes(menuId)) {
      return { expandedMenus: expanded.filter((id) => id !== menuId) }
    }
    return { expandedMenus: [...expanded, menuId] }
  }),

  addHistoryItem: (item) => set((state) => {
    const history = [item, ...state.historyItems.filter((h) => h !== item)]
    return { historyItems: history.slice(0, MAX_HISTORY) }
  }),

  clearHistory: () => set({ historyItems: [] }),

  setSelectedModel: (model) => set({ selectedModel: model }),

  setAvailableModels: (models) => set({ availableModels: models }),

  reset: () => set({
    currentSession: null,
    sessionId: null,
    messages: [],
    isStreaming: false,
    searchKeyword: '',
    searchResults: [],
    isSearching: false,
    selectedModel: DEFAULT_MODEL,
    availableModels: [],
  }),
}))

export default useGuideStore
