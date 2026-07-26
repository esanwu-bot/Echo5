"use client"

/**
 * 导购Agent聊天区组件
 * 包含头部、消息列表、输入框、弹窗管理
 * Markdown渲染使用 ReactSSERender-DeepSeekStyle Skill
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Bot, Package, DollarSign, FileText, AlertCircle, ShoppingCart, RefreshCw, Cpu } from 'lucide-react'
import { useGuideChat } from '@/hooks/use-guide-chat'
import { useGuideStore } from '@/stores/guide-store'
import { guideApi } from '@/lib/guide-api'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import GuideQuoteModal from './GuideQuoteModal'
import GuideSampleModal from './GuideSampleModal'
import type { GuideProduct, GuideMessage } from '@/types/guide'

/* ═══════════════════════════════════════════════════════════
 * 主组件
 * ═══════════════════════════════════════════════════════════ */

export default function GuideChatArea() {
  const { t } = useTranslation()
  const { messages, isStreaming, sendMessage, stopStreaming } = useGuideChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 快捷命令配置
  const quickCommands = [
    { icon: <Package size={14} />, label: t('查库存'), prompt: t('帮我查询库存') },
    { icon: <DollarSign size={14} />, label: t('询价'), prompt: t('帮我查询价格') },
    { icon: <RefreshCw size={14} />, label: t('替代'), prompt: t('推荐替代料') },
    { icon: <ShoppingCart size={14} />, label: t('样品'), prompt: t('申请样品') },
    { icon: <FileText size={14} />, label: t('手册'), prompt: t('查找数据手册') },
  ]

  // 模型相关状态
  const selectedModel = useGuideStore((s) => s.selectedModel)
  const availableModels = useGuideStore((s) => s.availableModels)
  const setSelectedModel = useGuideStore((s) => s.setSelectedModel)
  const setAvailableModels = useGuideStore((s) => s.setAvailableModels)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)

  // 弹窗状态
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [sampleModalOpen, setSampleModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<GuideProduct | null>(null)
  const [quoteProducts, setQuoteProducts] = useState<Array<{ id: number; name: string; product_code: string; quantity: number }>>([])

  // 加载可用模型列表
  useEffect(() => {
    guideApi.getModels().then((res) => {
      if ((res.code === 0 || res.code === 200) && Array.isArray(res.data)) {
        setAvailableModels(res.data)
      } else {
        // 后端返回非成功状态，回退本地默认模型
        setAvailableModels([
          { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'codebuddy' },
          { id: 'hy3-preview', name: 'Hy3 Preview', provider: 'codebuddy' },
          { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'codebuddy' },
        ])
      }
    }).catch(() => {
      // 静默失败，使用本地默认模型
      setAvailableModels([
        { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'codebuddy' },
        { id: 'hy3-preview', name: 'Hy3 Preview', provider: 'codebuddy' },
        { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'codebuddy' },
      ])
    })
  }, [setAvailableModels])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 监听来自侧边栏/快捷面板的消息事件
  useEffect(() => {
    const handleMessage = (e: CustomEvent<string>) => {
      sendMessage(e.detail)
    }
    window.addEventListener('guide:send-message', handleMessage as EventListener)
    return () => {
      window.removeEventListener('guide:send-message', handleMessage as EventListener)
    }
  }, [sendMessage])

  // 发送消息
  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    sendMessage(text)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 输入框高度自适应
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
  }

  // 点击快捷命令
  const handleQuickCommand = (prompt: string) => {
    if (isStreaming) return
    sendMessage(prompt)
  }

  // 卡片操作回调
  const handleQuote = useCallback((product: GuideProduct) => {
    setQuoteProducts([{
      id: product.id,
      name: product.name,
      product_code: product.product_code || product.model_number,
      quantity: 100,
    }])
    setQuoteModalOpen(true)
  }, [])

  const handleSample = useCallback((product: GuideProduct) => {
    setSelectedProduct(product)
    setSampleModalOpen(true)
  }, [])

  const handleDatasheet = useCallback((product: GuideProduct) => {
    if (product.datasheet_url) {
      window.open(product.datasheet_url, '_blank')
    } else {
      sendMessage(`${product.product_code || product.model_number} ${t('数据手册')}`)
    }
  }, [sendMessage])

  return (
    <main className="flex-1 flex flex-col bg-slate-50 relative">
      {/* 聊天头部 */}
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Bot className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{t('半导体导购助手')}</h2>
          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            {t('芯片采购专家')}
          </span>
        </div>

        {/* LLM 模型选择器 */}
        <div className="relative">
          <button
            onClick={() => setModelMenuOpen(!modelMenuOpen)}
            disabled={isStreaming}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 transition-colors disabled:opacity-50"
          >
            <Cpu size={14} className="text-slate-500" />
            <span className="max-w-[160px] truncate">
              {availableModels.find((m) => m.id === selectedModel)?.name || selectedModel}
            </span>
            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${modelMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {modelMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
              <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-100">{t('选择 AI 模型')}</div>
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id)
                    setModelMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    selectedModel === model.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  <span>{t(model.name)}</span>
                  {selectedModel === model.id && (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
              {availableModels.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-400">{t('加载中...')}</div>
              )}
            </div>
          )}
        </div>

        {/* 点击外部关闭模型菜单 */}
        {modelMenuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
        )}
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          // 欢迎消息
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4">
              <Bot className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">{t('您好，我是天启芯导购助手')}</h3>
            <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
              {t('我可以帮您查询产品库存、获取报价、推荐替代料、申请样品')}
            </p>
            <p className="text-slate-500 max-w-md mb-6 leading-relaxed">
              {t('等。请输入您需要查询的产品型号或描述您的需求。')}
            </p>
            {/* 欢迎页快捷入口 */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {[
                { icon: <Package size={18} />, title: t('查库存'), desc: t('查询型号库存状态') },
                { icon: <DollarSign size={18} />, title: t('获取报价'), desc: t('查询阶梯价格') },
                { icon: <RefreshCw size={18} />, title: t('替代推荐'), desc: t('查找兼容替代料') },
                { icon: <FileText size={18} />, title: t('技术文档'), desc: t('获取数据手册') },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(item.title)}
                  className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="text-emerald-500 mt-0.5">{item.icon}</div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                msg={msg}
                onQuote={handleQuote}
                onSample={handleSample}
                onDatasheet={handleDatasheet}
                userLabel={t('我')}
                aiLabel={t('AI')}
                copyLabel={t('复制')}
                copiedLabel={t('已复制')}
              />
            ))}
            {/* 思考中动画（DeepSeek 风格） */}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <ThinkingDots aiLabel={t('AI')} />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* 输入框 */}
          <div className="relative flex items-end gap-2 bg-slate-100 rounded-xl p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('输入型号，例如: STM32F103C8T6 报价')}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-slate-900 placeholder-slate-400 px-2 py-1.5 text-sm leading-relaxed"
              style={{ minHeight: '24px', maxHeight: '150px' }}
            />
            <button
              onClick={isStreaming ? stopStreaming : handleSend}
              disabled={!input.trim() && !isStreaming}
              className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                ${isStreaming
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : input.trim()
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
            >
              {isStreaming ? (
                <span className="text-sm font-bold">■</span>
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          {/* 快捷命令按钮 */}
          <div className="flex items-center gap-2 mt-3">
            {quickCommands.map((cmd, index) => (
              <button
                key={index}
                onClick={() => handleQuickCommand(cmd.prompt)}
                disabled={isStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cmd.icon}
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 询价弹窗 */}
      <GuideQuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        products={quoteProducts}
      />

      {/* 样品申请弹窗 */}
      <GuideSampleModal
        isOpen={sampleModalOpen}
        onClose={() => {
          setSampleModalOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          product_code: selectedProduct.product_code || selectedProduct.model_number,
          stock: selectedProduct.stock,
        } : null}
      />
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════
 * DeepSeek 风格消息气泡（来自 ReactSSERender-DeepSeekStyle Skill）
 * ═══════════════════════════════════════════════════════════ */

function MessageBubble({
  msg,
  onQuote,
  onSample,
  onDatasheet,
  userLabel = '我',
  aiLabel = 'AI',
}: {
  msg: GuideMessage
  onQuote?: (product: GuideProduct) => void
  onSample?: (product: GuideProduct) => void
  onDatasheet?: (product: GuideProduct) => void
  userLabel?: string
  aiLabel?: string
}) {
  const isUser = msg.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        marginBottom: 20,
        gap: 10,
        maxWidth: '88%',
        ...(isUser ? { marginLeft: 'auto', flexDirection: 'row-reverse' } : {}),
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          flexShrink: 0,
          background: isUser ? '#10b981' : '#f0f2f5',
          color: isUser ? '#fff' : '#374151',
        }}
      >
        {isUser ? userLabel : aiLabel}
      </div>

      {/* 消息内容 */}
      <div
        className={isUser ? '' : 'md-body'}
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          lineHeight: 1.75,
          fontSize: 14,
          wordBreak: 'break-word',
          ...(isUser
            ? {
                background: '#10b981',
                color: '#fff',
                borderBottomRightRadius: 4,
                whiteSpace: 'pre-wrap',
              }
            : msg.isError
              ? {
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  borderBottomLeftRadius: 4,
                }
              : {
                  background: '#fff',
                  color: '#1f2328',
                  border: '1px solid #e5e7eb',
                  borderBottomLeftRadius: 4,
                }),
        }}
      >
        {isUser ? msg.content : <MarkdownRenderer content={msg.content} />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
 * DeepSeek 风格思考中动画（来自 ReactSSERender-DeepSeekStyle Skill）
 * ═══════════════════════════════════════════════════════════ */

function ThinkingDots({ aiLabel = 'AI' }: { aiLabel?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, maxWidth: '88%' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          flexShrink: 0,
          background: '#f0f2f5',
          color: '#374151',
        }}
      >
        {aiLabel}
      </div>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderBottomLeftRadius: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#94a3b8',
                animation: 'pulse 1.4s infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
