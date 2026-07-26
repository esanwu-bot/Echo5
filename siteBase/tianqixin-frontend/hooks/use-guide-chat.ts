/**
 * 导购Agent对话Hook
 * 封装SSE流式对话逻辑
 */

import { useCallback, useRef } from 'react'
import { useGuideStore } from '@/stores/guide-store'
import { guideApi } from '@/lib/guide-api'
import type { GuideMessage, GuideSSEEvent } from '@/types/guide'

export function useGuideChat() {
  const {
    sessionId,
    messages,
    isStreaming,
    selectedModel,
    setSessionId,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    addHistoryItem,
  } = useGuideStore()

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    // 添加用户消息
    const userMessage: GuideMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }
    addMessage(userMessage)

    // 添加到历史记录
    addHistoryItem(content.trim())

    // 创建AI消息占位
    const aiMessage: GuideMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    addMessage(aiMessage)

    setIsStreaming(true)
    abortControllerRef.current = new AbortController()

    try {
      // 设置30秒超时保护
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort()
      }, 30000)

      const response = await guideApi.chatStream({
        message: content.trim(),
        session_id: sessionId || undefined,
        model: selectedModel,
      })

      // 收到响应后取消超时
      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          let msg = '操作太频繁了，请稍后再试'
          try {
            const errData = await response.json()
            if (errData?.message) msg = errData.message
          } catch { /* ignore */ }
          throw new Error('RATE_LIMITED:' + msg)
        }
        throw new Error(`HTTP ${response.status}`)
      }

      // 设置读取超时保护（60秒内无数据则断开）
      let readTimeoutId: ReturnType<typeof setTimeout> | null = null
      const resetReadTimeout = () => {
        if (readTimeoutId) clearTimeout(readTimeoutId)
        readTimeoutId = setTimeout(() => {
          abortControllerRef.current?.abort()
        }, 60000)
      }
      resetReadTimeout()

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 收到数据，重置读取超时
        resetReadTimeout()

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data: GuideSSEEvent = JSON.parse(line.slice(6))

            if (data.type === 'token' && data.text) {
              // 追加token到最后一条消息 - 使用函数式更新获取最新状态
              updateLastMessage((prevContent: string) => prevContent + data.text)
            } else if (data.type === 'done') {
              // 对话完成
              if (data.session_id) {
                setSessionId(data.session_id)
              }
            } else if (data.type === 'error') {
              if (data.error_code === 'QUOTA_EXCEEDED') {
                throw new Error('QUOTA_EXCEEDED:' + (data.message || '当前模型额度已用尽，请切换到其他模型。'))
              }
              throw new Error(data.message || '服务错误')
            }
          } catch (parseError) {
            console.warn('SSE解析错误:', parseError)
          }
        }
      }

      // 清理读取超时
      if (readTimeoutId) clearTimeout(readTimeoutId)
    } catch (error) {
      // 用户取消不显示错误
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      // 额度用尽错误
      if (error instanceof Error && error.message.startsWith('QUOTA_EXCEEDED:')) {
        const msg = error.message.replace('QUOTA_EXCEEDED:', '')
        updateLastMessage(msg)
        addMessage({
          role: 'assistant',
          content: msg,
          timestamp: Date.now(),
          isError: true,
        })
      } else if (error instanceof Error && error.message.startsWith('RATE_LIMITED:')) {
        // 限流错误
        const msg = error.message.replace('RATE_LIMITED:', '')
        updateLastMessage(msg)
        addMessage({
          role: 'assistant',
          content: msg,
          timestamp: Date.now(),
          isError: true,
        })
      } else {
        // 更新最后一条消息为错误信息
        updateLastMessage('抱歉，服务暂时不可用，请稍后重试。')
        addMessage({
          role: 'assistant',
          content: '抱歉，服务暂时不可用，请稍后重试。',
          timestamp: Date.now(),
          isError: true,
        })
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [sessionId, isStreaming, addMessage, updateLastMessage, setIsStreaming, setSessionId, addHistoryItem, messages, selectedModel])

  /**
   * 停止流式输出
   */
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }, [setIsStreaming])

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    useGuideStore.getState().clearMessages()
    setSessionId(null)
  }, [setSessionId])

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
    sessionId,
  }
}

export default useGuideChat
