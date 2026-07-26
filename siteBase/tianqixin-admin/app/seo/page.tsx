'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Progress,
  Statistic,
  Row,
  Col,
  Tabs,
  Space,
  message,
  Modal,
  Input,
  Select,
  Tooltip,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  KeyOutlined,
  BarChartOutlined,
  AimOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { agentApi } from '@/lib/api/agent';
import { API_BASE_URL } from '@/lib/api/config';

const { Search } = Input;

/* ── 页面 SEO 审计数据（从 API 获取或使用默认值） ── */
interface SeoPage {
  id: number;
  url_path: string;
  page_type: string;
  title: string;
  seo_score: number;
  h1: string;
  has_canonical: boolean;
  has_og_tags: boolean;
  has_schema: boolean;
  load_time_ms: number;
  mobile_score: number;
  last_audit_at: string;
}

interface SeoIssue {
  id: number;
  url_path: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  suggestion: string;
  is_fixed: boolean;
}

interface SeoKeyword {
  id: number;
  keyword: string;
  category: string;
  is_primary: boolean;
  search_volume: number;
  competition: string;
  difficulty: number;
  current_rank: number;
  trend: string;
}

/* ── 严重级别配置 ── */
const severityConfig = {
  critical: { color: '#ef4444', icon: <CloseCircleOutlined />, text: '严重' },
  warning: { color: '#f59e0b', icon: <WarningOutlined />, text: '警告' },
  info: { color: '#3b82f6', icon: <InfoCircleOutlined />, text: '提示' },
};

const pageTypeMap: Record<string, string> = {
  home: '首页',
  product: '产品页',
  category: '分类页',
  article: '文章页',
  news: '新闻页',
  application: '应用方案',
  about: '关于我们',
  contact: '联系我们',
};

/* ══════════════════════════════════════════════════════════════
   SEO 管理中心页面
   ══════════════════════════════════════════════════════════════ */
export default function SeoPage() {
  // 页面审计列表
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  // 问题列表
  const [issues, setIssues] = useState<SeoIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // 关键词列表
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

  // 筛选
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [keywordSearch, setKeywordSearch] = useState('');

  // 加载数据
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadingPages(true);
    setLoadingIssues(true);
    setLoadingKeywords(true);

    try {
      const res = await agentApi.getDashboard('7d');
      if (res.code === 200) {
        // 从 dashboard 数据中提取 SEO 信息
        // 目前 dashboard 可能没有 SEO 数据，使用默认示例数据
        setPages(defaultPages);
        setIssues(defaultIssues);
        setKeywords(defaultKeywords);
      }
    } catch {
      // 使用默认数据
      setPages(defaultPages);
      setIssues(defaultIssues);
      setKeywords(defaultKeywords);
    } finally {
      setLoadingPages(false);
      setLoadingIssues(false);
      setLoadingKeywords(false);
    }
  };

  // 统计数据
  const totalScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.seo_score, 0) / pages.length)
    : 0;
  const criticalCount = issues.filter((i) => i.severity === 'critical' && !i.is_fixed).length;
  const warningCount = issues.filter((i) => i.severity === 'warning' && !i.is_fixed).length;
  const infoCount = issues.filter((i) => i.severity === 'info' && !i.is_fixed).length;
  const fixedCount = issues.filter((i) => i.is_fixed).length;
  const primaryKeywords = keywords.filter((k) => k.is_primary).length;

  // 过滤问题
  const filteredIssues = issues.filter((issue) => {
    if (severityFilter && issue.severity !== severityFilter) return false;
    if (categoryFilter && issue.category !== categoryFilter) return false;
    return true;
  });

  // 过滤关键词
  const filteredKeywords = keywords.filter((kw) => {
    if (keywordSearch && !kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase())) return false;
    return true;
  });

  // 页面审计表格列
  const pageColumns = [
    {
      title: '页面路径',
      dataIndex: 'url_path',
      key: 'url_path',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ color: '#3b82f6' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'page_type',
      key: 'page_type',
      width: 80,
      render: (text: string) => <Tag>{pageTypeMap[text] || text}</Tag>,
    },
    {
      title: 'SEO标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'SEO评分',
      dataIndex: 'seo_score',
      key: 'seo_score',
      width: 120,
      sorter: (a: SeoPage, b: SeoPage) => a.seo_score - b.seo_score,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
          format={(p) => <span style={{ fontSize: 12 }}>{p}</span>}
        />
      ),
    },
    {
      title: 'H1',
      dataIndex: 'h1',
      key: 'h1',
      width: 120,
      ellipsis: true,
      render: (text: string) => text || <Tag color="red">缺失</Tag>,
    },
    {
      title: '技术标签',
      key: 'tags',
      width: 160,
      render: (_: any, record: SeoPage) => (
        <Space size={4}>
          {record.has_canonical ? (
            <Tag color="green" style={{ fontSize: 11 }}>Canonical</Tag>
          ) : (
            <Tooltip title="缺少 canonical 标签"><Tag color="red" style={{ fontSize: 11 }}>Canonical</Tag></Tooltip>
          )}
          {record.has_og_tags ? (
            <Tag color="green" style={{ fontSize: 11 }}>OG</Tag>
          ) : (
            <Tooltip title="缺少 Open Graph 标签"><Tag color="red" style={{ fontSize: 11 }}>OG</Tag></Tooltip>
          )}
          {record.has_schema ? (
            <Tag color="green" style={{ fontSize: 11 }}>Schema</Tag>
          ) : (
            <Tooltip title="缺少结构化数据"><Tag color="red" style={{ fontSize: 11 }}>Schema</Tag></Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '加载时间',
      dataIndex: 'load_time_ms',
      key: 'load_time_ms',
      width: 90,
      render: (ms: number) => (
        <span style={{ color: ms > 3000 ? '#ef4444' : ms > 1500 ? '#f59e0b' : '#10b981' }}>
          {ms}ms
        </span>
      ),
    },
    {
      title: '移动端',
      dataIndex: 'mobile_score',
      key: 'mobile_score',
      width: 80,
      render: (score: number) => (
        <span style={{ color: score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444' }}>
          {score}
        </span>
      ),
    },
  ];

  // 问题表格列
  const issueColumns = [
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity: string) => {
        const cfg = severityConfig[severity as keyof typeof severityConfig];
        return (
          <Tag color={cfg?.color} icon={cfg?.icon}>
            {cfg?.text}
          </Tag>
        );
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (text: string) => {
        const map: Record<string, string> = { meta: 'Meta', heading: '标题', content: '内容', link: '链接', schema: '结构化', speed: '速度' };
        return <Tag>{map[text] || text}</Tag>;
      },
    },
    {
      title: '页面',
      dataIndex: 'url_path',
      key: 'url_path',
      width: 150,
      ellipsis: true,
    },
    {
      title: '问题描述',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '修复建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      ellipsis: true,
      width: 250,
    },
    {
      title: '状态',
      dataIndex: 'is_fixed',
      key: 'is_fixed',
      width: 80,
      render: (fixed: boolean) =>
        fixed ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>已修复</Tag>
        ) : (
          <Tag color="orange">待修复</Tag>
        ),
    },
  ];

  // 关键词表格列
  const keywordColumns = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (text: string, record: SeoKeyword) => (
        <Space>
          <span style={{ fontWeight: record.is_primary ? 600 : 400 }}>{text}</span>
          {record.is_primary && <Tag color="blue" style={{ fontSize: 11 }}>主词</Tag>}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (text: string) => {
        const map: Record<string, string> = { brand: '品牌', product: '产品', industry: '行业', longtail: '长尾', general: '通用' };
        return <Tag>{map[text] || text}</Tag>;
      },
    },
    {
      title: '月搜索量',
      dataIndex: 'search_volume',
      key: 'search_volume',
      width: 100,
      sorter: (a: SeoKeyword, b: SeoKeyword) => a.search_volume - b.search_volume,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '竞争度',
      dataIndex: 'competition',
      key: 'competition',
      width: 80,
      render: (text: string) => {
        const color = text === 'high' ? 'red' : text === 'medium' ? 'orange' : 'green';
        const label = text === 'high' ? '高' : text === 'medium' ? '中' : '低';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      sorter: (a: SeoKeyword, b: SeoKeyword) => a.difficulty - b.difficulty,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 70 ? '#ef4444' : v >= 40 ? '#f59e0b' : '#10b981'}
          format={(p) => <span style={{ fontSize: 11 }}>{p}</span>}
        />
      ),
    },
    {
      title: '当前排名',
      dataIndex: 'current_rank',
      key: 'current_rank',
      width: 90,
      render: (rank: number) => {
        if (!rank) return <span style={{ color: '#9ca3af' }}>-</span>;
        const color = rank <= 10 ? '#10b981' : rank <= 30 ? '#f59e0b' : '#ef4444';
        return <span style={{ fontWeight: 600, color }}>#{rank}</span>;
      },
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      width: 80,
      render: (trend: string) => {
        const map: Record<string, { color: string; text: string }> = {
          rising: { color: '#10b981', text: '↑ 上升' },
          stable: { color: '#6b7280', text: '→ 稳定' },
          falling: { color: '#ef4444', text: '↓ 下降' },
        };
        const t = map[trend] || map.stable;
        return <span style={{ color: t.color, fontSize: 12 }}>{t.text}</span>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          <GlobalOutlined style={{ marginRight: 8 }} />
          SEO 管理中心
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          全站 SEO 健康度监控、关键词管理、页面审计与优化建议
        </p>
      </div>

      {/* 概览统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic
              title="全站平均评分"
              value={totalScore}
              suffix="/ 100"
              valueStyle={{ color: totalScore >= 80 ? '#10b981' : totalScore >= 60 ? '#f59e0b' : '#ef4444' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic
              title="严重问题"
              value={criticalCount}
              valueStyle={{ color: '#ef4444' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic
              title="警告问题"
              value={warningCount}
              valueStyle={{ color: '#f59e0b' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic
              title="关键词库"
              value={keywords.length}
              suffix={`(${primaryKeywords} 主词)`}
              prefix={<KeyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tab 切换 */}
      <Tabs
        defaultActiveKey="pages"
        items={[
          {
            key: 'pages',
            label: (
              <span>
                <FileTextOutlined />
                页面审计
              </span>
            ),
            children: (
              <Card size="small">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      共 {pages.length} 个页面已审计
                    </span>
                  </Space>
                  <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loadingPages}>
                    刷新
                  </Button>
                </div>
                <Table
                  dataSource={pages}
                  columns={pageColumns}
                  rowKey="id"
                  loading={loadingPages}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  scroll={{ x: 1100 }}
                />
              </Card>
            ),
          },
          {
            key: 'issues',
            label: (
              <span>
                <WarningOutlined />
                问题列表
                {criticalCount > 0 && (
                  <Badge count={criticalCount} size="small" style={{ marginLeft: 6 }} />
                )}
              </span>
            ),
            children: (
              <Card size="small">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <Select
                      placeholder="严重级别"
                      allowClear
                      style={{ width: 120 }}
                      value={severityFilter || undefined}
                      onChange={(v) => setSeverityFilter(v || '')}
                      options={[
                        { label: '严重', value: 'critical' },
                        { label: '警告', value: 'warning' },
                        { label: '提示', value: 'info' },
                      ]}
                    />
                    <Select
                      placeholder="问题分类"
                      allowClear
                      style={{ width: 120 }}
                      value={categoryFilter || undefined}
                      onChange={(v) => setCategoryFilter(v || '')}
                      options={[
                        { label: 'Meta', value: 'meta' },
                        { label: '标题', value: 'heading' },
                        { label: '内容', value: 'content' },
                        { label: '链接', value: 'link' },
                        { label: '结构化', value: 'schema' },
                        { label: '速度', value: 'speed' },
                      ]}
                    />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {filteredIssues.length} / {issues.length} 条问题
                    </span>
                  </Space>
                  <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loadingIssues}>
                    刷新
                  </Button>
                  <Button onClick={() => { setSeverityFilter(''); setCategoryFilter(''); }}>重置</Button>
                </div>
                <Table
                  dataSource={filteredIssues}
                  columns={issueColumns}
                  rowKey="id"
                  loading={loadingIssues}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  scroll={{ x: 900 }}
                />
              </Card>
            ),
          },
          {
            key: 'keywords',
            label: (
              <span>
                <KeyOutlined />
                关键词库
              </span>
            ),
            children: (
              <Card size="small">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <Search
                      placeholder="搜索关键词..."
                      allowClear
                      style={{ width: 200 }}
                      onSearch={(v) => setKeywordSearch(v)}
                      onChange={(e) => !e.target.value && setKeywordSearch('')}
                    />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {filteredKeywords.length} 个关键词
                    </span>
                  </Space>
                  <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loadingKeywords}>
                    刷新
                  </Button>
                  <Button onClick={() => setKeywordSearch('')}>重置</Button>
                </div>
                <Table
                  dataSource={filteredKeywords}
                  columns={keywordColumns}
                  rowKey="id"
                  loading={loadingKeywords}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  scroll={{ x: 800 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

/* ── 默认示例数据 ── */
const defaultPages: SeoPage[] = [
  { id: 1, url_path: '/', page_type: 'home', title: '天启芯科技 - 专业的半导体元器件供应商', seo_score: 75, h1: '天启芯科技', has_canonical: true, has_og_tags: true, has_schema: false, load_time_ms: 1200, mobile_score: 92, last_audit_at: '2026-05-27' },
  { id: 2, url_path: '/products', page_type: 'product', title: '产品中心 - 天启芯科技', seo_score: 62, h1: '产品中心', has_canonical: false, has_og_tags: false, has_schema: false, load_time_ms: 1800, mobile_score: 85, last_audit_at: '2026-05-27' },
  { id: 3, url_path: '/products/stm32f103c8t6', page_type: 'product', title: 'STM32F103C8T6 - STM32微控制器', seo_score: 88, h1: 'STM32F103C8T6 STM32微控制器', has_canonical: true, has_og_tags: true, has_schema: true, load_time_ms: 950, mobile_score: 95, last_audit_at: '2026-05-27' },
  { id: 4, url_path: '/applications', page_type: 'application', title: '应用方案 - 天启芯科技', seo_score: 55, h1: '', has_canonical: false, has_og_tags: false, has_schema: false, load_time_ms: 2200, mobile_score: 78, last_audit_at: '2026-05-26' },
  { id: 5, url_path: '/about', page_type: 'about', title: '关于我们', seo_score: 45, h1: '', has_canonical: false, has_og_tags: false, has_schema: false, load_time_ms: 800, mobile_score: 90, last_audit_at: '2026-05-26' },
  { id: 6, url_path: '/news', page_type: 'news', title: '新闻资讯 - 天启芯科技', seo_score: 70, h1: '新闻资讯', has_canonical: true, has_og_tags: true, has_schema: false, load_time_ms: 1500, mobile_score: 88, last_audit_at: '2026-05-25' },
];

const defaultIssues: SeoIssue[] = [
  { id: 1, url_path: '/applications', severity: 'critical', category: 'heading', title: 'H1标签缺失', suggestion: '为页面添加唯一的H1标签，包含核心关键词', is_fixed: false },
  { id: 2, url_path: '/about', severity: 'critical', category: 'heading', title: 'H1标签缺失', suggestion: '添加H1标签，例如"关于天启芯科技"', is_fixed: false },
  { id: 3, url_path: '/about', severity: 'critical', category: 'meta', title: 'Meta描述缺失', suggestion: '添加150-160字符的Meta描述，包含公司简介和关键词', is_fixed: false },
  { id: 4, url_path: '/products', severity: 'warning', category: 'meta', title: 'Meta描述过短', suggestion: '扩展Meta描述至150-160字符，包含产品关键词', is_fixed: false },
  { id: 5, url_path: '/products', severity: 'warning', category: 'link', title: '缺少Canonical标签', suggestion: '添加<link rel="canonical">防止重复内容', is_fixed: false },
  { id: 6, url_path: '/applications', severity: 'warning', category: 'meta', title: '缺少OG标签', suggestion: '添加Open Graph标签以优化社交媒体分享效果', is_fixed: false },
  { id: 7, url_path: '/products', severity: 'warning', category: 'meta', title: '缺少OG标签', suggestion: '添加og:title, og:description, og:image等标签', is_fixed: false },
  { id: 8, url_path: '/', severity: 'info', category: 'schema', title: '缺少Organization结构化数据', suggestion: '添加JSON-LD格式的Organization结构化数据', is_fixed: false },
  { id: 9, url_path: '/products', severity: 'info', category: 'schema', title: '缺少ItemList结构化数据', suggestion: '添加ItemList结构化数据以增强搜索展示', is_fixed: false },
  { id: 10, url_path: '/applications', severity: 'info', category: 'link', title: '缺少Canonical标签', suggestion: '添加canonical标签', is_fixed: false },
  { id: 11, url_path: '/news', severity: 'info', category: 'schema', title: '缺少Article结构化数据', suggestion: '为新闻页添加Article结构化数据', is_fixed: false },
  { id: 12, url_path: '/', severity: 'info', category: 'content', title: '可添加FAQ结构化数据', suggestion: '添加FAQPage结构化数据以获取精选摘要', is_fixed: false },
];

const defaultKeywords: SeoKeyword[] = [
  { id: 1, keyword: '电子元器件', category: 'industry', is_primary: true, search_volume: 15000, competition: 'high', difficulty: 85, current_rank: 15, trend: 'rising' },
  { id: 2, keyword: 'MCU微控制器', category: 'product', is_primary: true, search_volume: 8500, competition: 'high', difficulty: 75, current_rank: 22, trend: 'stable' },
  { id: 3, keyword: 'STM32单片机', category: 'product', is_primary: true, search_volume: 12000, competition: 'high', difficulty: 70, current_rank: 8, trend: 'rising' },
  { id: 4, keyword: 'TI芯片代理', category: 'brand', is_primary: true, search_volume: 5000, competition: 'medium', difficulty: 60, current_rank: 0, trend: 'stable' },
  { id: 5, keyword: '原装正品IC', category: 'general', is_primary: false, search_volume: 3500, competition: 'medium', difficulty: 55, current_rank: 35, trend: 'falling' },
  { id: 6, keyword: '电子元器件批发', category: 'industry', is_primary: false, search_volume: 8000, competition: 'high', difficulty: 80, current_rank: 0, trend: 'stable' },
  { id: 7, keyword: 'IC芯片采购', category: 'general', is_primary: false, search_volume: 6000, competition: 'medium', difficulty: 65, current_rank: 28, trend: 'rising' },
  { id: 8, keyword: '单片机开发板', category: 'product', is_primary: false, search_volume: 4000, competition: 'medium', difficulty: 50, current_rank: 12, trend: 'stable' },
  { id: 9, keyword: '意法半导体代理', category: 'brand', is_primary: false, search_volume: 3000, competition: 'low', difficulty: 45, current_rank: 5, trend: 'rising' },
  { id: 10, keyword: 'NXP代理商', category: 'brand', is_primary: false, search_volume: 2500, competition: 'low', difficulty: 40, current_rank: 0, trend: 'stable' },
];
