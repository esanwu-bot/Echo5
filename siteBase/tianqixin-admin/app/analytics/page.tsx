'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Avatar, Tabs, Tag, Spin, Empty, message, Popconfirm, Select } from 'antd';
import {
  SendOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  BarChartOutlined,
  RobotOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  TranslationOutlined,
  AlertOutlined,
  FileTextOutlined,
  PieChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { agentApi, chatStream, type AgentSession, type AgentMessage } from '@/lib/api/agent';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const { TextArea } = Input;

/* ── 快捷提问按钮配置 ── */
const quickQuestions = [
  { label: '热门产品', icon: <BarChartOutlined />, query: '分析一下热门产品排行' },
  { label: '翻译覆盖', icon: <TranslationOutlined />, query: '翻译覆盖率是多少' },
  { label: '库存预警', icon: <AlertOutlined />, query: '库存预警的产品有哪些' },
  { label: '生成周报', icon: <FileTextOutlined />, query: '生成一份周报' },
  { label: '分类分布', icon: <PieChartOutlined />, query: '分析一下产品分类分布' },
  { label: '销售趋势', icon: <LineChartOutlined />, query: '最近30天销售趋势' },
];

const seoQuickQuestions = [
  { label: '健康扫描', query: '分析一下全站SEO健康度' },
  { label: '首页审计', query: '审计首页SEO状态' },
  { label: '关键词建议', query: '生成关键词建议' },
  { label: '生成Sitemap', query: '生成站点地图' },
  { label: 'Schema数据', query: '生成首页的Schema结构化数据' },
  { label: 'SEO报告', query: '生成一份SEO优化报告' },
];

/* ── 消息气泡组件（DeepSeek 风格） ── */
function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === 'user';
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
          background: isUser ? '#3b82f6' : '#f0f2f5',
          color: isUser ? '#fff' : '#374151',
        }}
      >
        {isUser ? '我' : 'AI'}
      </div>
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
                background: '#3b82f6',
                color: '#fff',
                borderBottomRightRadius: 4,
                whiteSpace: 'pre-wrap',
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
  );
}

/* ── 思考中动画 ── */
function ThinkingDots() {
  return (
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
  );
}

/* ── SEO 评分环 ── */
function SeoScoreRing({ score }: { score: number }) {
  const radius = 40;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e2e8f0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 20,
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        {score}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   主页面
   ══════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  // 会话状态
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('新对话');
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  // 输入状态
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // 模型选择
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-v4-flash');
  const [availableModels, setAvailableModels] = useState<{ id: string; label: string }[]>([]);

  // 仪表盘数据
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // SEO 数据
  const [seoScore, setSeoScore] = useState(75);
  const [seoCoverage, setSeoCoverage] = useState('45%');
  const [seoCritical, setSeoCritical] = useState(2);
  const [seoWarning, setSeoWarning] = useState(8);
  const [seoInfo, setSeoInfo] = useState(12);
  const [seoKeywordsTotal, setSeoKeywordsTotal] = useState(10);
  const [seoKeywordsPrimary, setSeoKeywordsPrimary] = useState(4);

  // 右侧面板 Tab
  const [rightTab, setRightTab] = useState<'analytics' | 'seo'>('analytics');

  // 消息列表 ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamFullTextRef = useRef('');

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 初始化
  useEffect(() => {
    loadSessions();
    loadDashboard();
    loadModels();
  }, []);

  // 加载可用模型
  const loadModels = async () => {
    try {
      const res = await agentApi.getModels();
      if (res.code === 200 && res.data) {
        setAvailableModels(res.data);
        if (res.data.length > 0 && !selectedModel) {
          setSelectedModel(res.data[0].id);
        }
      }
    } catch {
      // 静默失败，使用默认模型
    }
  };

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const res = await agentApi.getSessions();
      if (res.code === 200) {
        setSessions(res.data?.list || []);
      }
    } catch {
      // 静默失败
    }
  };

  // 加载仪表盘
  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await agentApi.getDashboard('7d');
      if (res.code === 200) {
        setDashboardData(res.data);
      }
    } catch {
      // 静默失败
    } finally {
      setLoadingDashboard(false);
    }
  };

  // 新建会话
  const newSession = () => {
    setCurrentSessionId(null);
    setSessionTitle('新对话');
    setMessages([]);
  };

  // 切换会话
  const switchSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const res = await agentApi.getSession(sessionId);
      if (res.code === 200) {
        setSessionTitle(res.data?.title || '对话');
        setMessages(res.data?.messages || []);
      }
    } catch {
      message.error('加载会话失败');
    }
  };

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      await agentApi.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        newSession();
      }
      loadSessions();
    } catch {
      message.error('删除失败');
    }
  };

  // 发送消息
  const sendMessage = async (text?: string) => {
    const msg = (text || inputValue).trim();
    if (!msg || isStreaming) return;

    setInputValue('');
    setIsStreaming(true);
    streamFullTextRef.current = '';

    // 添加用户消息
    const userMsg: AgentMessage = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    // 添加思考中占位
    setMessages((prev) => [...prev, { role: 'assistant', content: '__THINKING__' }]);

    try {
      await chatStream(
        msg,
        currentSessionId || undefined,
        // onToken
        (token) => {
          streamFullTextRef.current += token;
          // 替换思考中占位为实际内容
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            if (lastIdx >= 0 && newMsgs[lastIdx].content === '__THINKING__') {
              newMsgs[lastIdx] = { role: 'assistant', content: streamFullTextRef.current };
            } else if (lastIdx >= 0 && newMsgs[lastIdx].role === 'assistant') {
              newMsgs[lastIdx] = { role: 'assistant', content: streamFullTextRef.current };
            }
            return newMsgs;
          });
        },
        // onDone
        (data) => {
          setCurrentSessionId(data.session_id);
          loadSessions();
          // 首次对话更新标题
          if (!currentSessionId) {
            setSessionTitle(msg.slice(0, 20) + (msg.length > 20 ? '...' : ''));
          }
          // SEO 相关查询刷新 SEO 数据
          if (msg.includes('SEO') || msg.includes('seo')) {
            loadDashboard();
          }
        },
        // onError
        (errMsg) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            if (lastIdx >= 0 && newMsgs[lastIdx].content === '__THINKING__') {
              newMsgs[lastIdx] = { role: 'assistant', content: '抱歉，处理请求时出错：' + errMsg };
            }
            return newMsgs;
          });
        },
        selectedModel,
      );
    } catch {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastIdx = newMsgs.length - 1;
        if (lastIdx >= 0 && newMsgs[lastIdx].content === '__THINKING__') {
          newMsgs[lastIdx] = { role: 'assistant', content: '请求失败，请检查网络连接' };
        }
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // 销售趋势数据
  const salesTrendData = dashboardData?.sales?.trend || [];

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <>
    <div style={{ display: 'flex', height: 'calc(100vh - 64px - 40px)', background: '#f4f6fb' }}>
      {/* ── 左侧：会话列表 ── */}
      <aside
        style={{
          width: 260,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            数据分析智能体
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            block
            size="small"
            onClick={newSession}
          >
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 20 }}>
              暂无对话记录
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.session_id}
              onClick={() => switchSession(s.session_id)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: currentSessionId === s.session_id ? '#eff6ff' : 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentSessionId !== s.session_id)
                  (e.currentTarget as HTMLDivElement).style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (currentSessionId !== s.session_id)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: '#374151',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {s.title}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(s.updated_at)}</span>
                <Popconfirm
                  title="确认删除该对话？"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    deleteSession(s.session_id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="删除"
                  cancelText="取消"
                >
                  <DeleteOutlined
                    style={{ fontSize: 12, color: '#d1d5db', padding: 2 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── 中间：聊天区 ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 顶栏 */}
        <div
          style={{
            padding: '8px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
            {sessionTitle}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              size="small"
              value={selectedModel}
              onChange={(v) => setSelectedModel(v)}
              disabled={isStreaming}
              style={{ width: 180 }}
              options={availableModels.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
            />
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadDashboard}
              loading={loadingDashboard}
            >
              刷新数据
            </Button>
            <Button size="small" onClick={() => setMessages([])}>
              清空
            </Button>
          </div>
        </div>

        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            background: '#f8fafc',
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RobotOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
              <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
                数据分析智能体
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>
                输入数据分析或SEO优化问题，例如：分析一下最近30天的销售趋势
              </div>
            </div>
          )}
          {messages.map((msg, idx) =>
            msg.content === '__THINKING__' ? (
              <div key={idx} style={{ display: 'flex', marginBottom: 20, gap: 12 }}>
                <Avatar size={32} icon={<RobotOutlined />} style={{ background: '#10b981' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>智能体</div>
                  <ThinkingDots />
                </div>
              </div>
            ) : (
              <MessageBubble key={idx} msg={msg} />
            ),
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              background: '#f9fafb',
              borderRadius: 8,
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
            }}
          >
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入数据分析或SEO优化问题..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={isStreaming}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                fontSize: 14,
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || isStreaming}
              loading={isStreaming}
            >
              发送
            </Button>
          </div>
        </div>
      </main>

      {/* ── 右侧：数据看板 ── */}
      <aside
        style={{
          width: 340,
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          overflowY: 'auto',
          padding: 16,
          flexShrink: 0,
        }}
      >
        <Tabs
          activeKey={rightTab}
          onChange={(k) => setRightTab(k as 'analytics' | 'seo')}
          size="small"
          items={[
            {
              key: 'analytics',
              label: '数据分析',
              children: (
                <div>
                  {/* 指标卡 */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      实时数据看板
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        {
                          label: '总产品数',
                          value: dashboardData?.products?.total ?? '-',
                          color: '#3b82f6',
                        },
                        {
                          label: '待翻译词条',
                          value: dashboardData?.translation?.pending_count ?? '-',
                          color: '#f59e0b',
                        },
                        {
                          label: '库存预警',
                          value: dashboardData?.inventory?.out_of_stock_count ?? '-',
                          color: '#ef4444',
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            background: '#f9fafb',
                            borderRadius: 8,
                            padding: '10px 12px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.label}</div>
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 700,
                              color: item.color,
                              marginTop: 4,
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 快捷提问 */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      快捷提问
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {quickQuestions.map((q) => (
                        <Button
                          key={q.label}
                          size="small"
                          icon={q.icon}
                          onClick={() => sendMessage(q.query)}
                          disabled={isStreaming}
                          style={{ fontSize: 12 }}
                        >
                          {q.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 销售趋势图 */}
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      销售趋势
                    </div>
                    {salesTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={salesTrendData}>
                          <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="order_count"
                            stroke="#3b82f6"
                            fill="url(#salesGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div
                        style={{
                          height: 150,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9ca3af',
                          fontSize: 13,
                        }}
                      >
                        暂无销售数据
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'seo',
              label: 'SEO健康度',
              children: (
                <div>
                  {/* SEO 评分 */}
                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'left',
                      }}
                    >
                      SEO健康度
                    </div>
                    <SeoScoreRing score={seoScore} />
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                      {seoScore >= 80 ? '优秀' : seoScore >= 60 ? '良好' : '需要优化'}
                    </div>
                  </div>

                  {/* 审计覆盖率 */}
                  <div
                    style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 8,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>审计覆盖率</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>
                      {seoCoverage}
                    </div>
                  </div>

                  {/* 问题统计 */}
                  <div
                    style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>待修复问题</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { label: '严重', value: seoCritical, color: '#ef4444' },
                        { label: '警告', value: seoWarning, color: '#f59e0b' },
                        { label: '提示', value: seoInfo, color: '#3b82f6' },
                      ].map((item) => (
                        <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 600, color: item.color }}>
                            {item.value}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 关键词库 */}
                  <div
                    style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>关键词库</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>{seoKeywordsTotal}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>总词数</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#10b981' }}>
                          {seoKeywordsPrimary}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>主关键词</div>
                      </div>
                    </div>
                  </div>

                  {/* SEO 快捷操作 */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#6b7280',
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      SEO快捷操作
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {seoQuickQuestions.map((q) => (
                        <Button
                          key={q.label}
                          size="small"
                          onClick={() => sendMessage(q.query)}
                          disabled={isStreaming}
                          style={{ fontSize: 12 }}
                        >
                          {q.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </aside>
    </div>
    </>
  );
}
