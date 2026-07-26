/**
 * Agent 智能体 API 服务
 * 封装数据分析智能体相关的 API 调用
 */
import { apiClient } from './client';

// Agent 会话
export interface AgentSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Agent 消息
export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
  created_at?: string;
}

// 仪表盘数据
export interface DashboardData {
  products: any;
  sales: any;
  customers: any;
  inventory: any;
  translation: any;
}

// SEO 健康数据
export interface SeoHealthData {
  score: number;
  coverage: string;
  critical: number;
  warning: number;
  info: number;
  keywords_total: number;
  keywords_primary: number;
  issues: SeoIssue[];
}

export interface SeoIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  url_path?: string;
  created_at?: string;
}

export const agentApi = {
  // 获取会话列表
  async getSessions(page = 1, limit = 20) {
    const res = await apiClient.get('/admin/agent/sessions', {
      params: { page, limit },
    });
    return res.data;
  },

  // 获取会话详情
  async getSession(sessionId: string) {
    const res = await apiClient.get('/admin/agent/session', {
      params: { session_id: sessionId },
    });
    return res.data;
  },

  // 删除会话
  async deleteSession(sessionId: string) {
    const res = await apiClient.post('/admin/agent/session/delete', {
      session_id: sessionId,
    });
    return res.data;
  },

  // 同步对话
  async chat(message: string, sessionId?: string) {
    const res = await apiClient.post('/admin/agent/chat', {
      message,
      session_id: sessionId || '',
    });
    return res.data;
  },

  // 获取仪表盘数据
  async getDashboard(period = '7d') {
    const res = await apiClient.get('/admin/agent/dashboard', {
      params: { period },
    });
    return res.data;
  },

  // 获取报告列表
  async getReports(type = '', page = 1, limit = 10) {
    const res = await apiClient.get('/admin/agent/report', {
      params: { type, page, limit },
    });
    return res.data;
  },

  // 生成报告
  async generateReport(type = 'daily', period = '7d') {
    const res = await apiClient.post('/admin/agent/report', {
      type,
      period,
    });
    return res.data;
  },

  // 获取可用模型列表
  async getModels() {
    const res = await apiClient.get('/admin/agent/models');
    return res.data;
  },
};

/**
 * SSE 流式对话
 * 返回一个 ReadableStream，用于逐 token 读取 AI 回复
 */
export async function chatStream(
  message: string,
  sessionId: string | undefined,
  onToken: (token: string) => void,
  onDone: (data: { session_id: string }) => void,
  onError: (message: string) => void,
  model?: string,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';

  const response = await fetch(`${baseUrl}/admin/agent/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, session_id: sessionId || '', model: model || '' }),
  });

  if (!response.ok) {
    onError(`请求失败: ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('无法获取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.type === 'token') {
            onToken(event.text);
          } else if (event.type === 'done') {
            onDone({ session_id: event.session_id });
          } else if (event.type === 'error') {
            onError(event.message);
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  } catch (e) {
    onError('连接中断，请重试');
  }
}
