import type { AgentEvent } from "@hutian/agent-protocol";

/**
 * Demo event sequence that replays the prototype's GEO optimization scenario.
 * Used when no backend is connected — provides a full interactive demo.
 */
export const demoEvents: (AgentEvent & { delay: number })[] = [
  { type: "meta", totalTools: 5, delay: 300 },
  { type: "thinking", on: true, delay: 200 },
  { type: "thinking", on: false, delay: 1200 },
  {
    type: "message",
    role: "agent",
    content:
      '收到。品牌更名是本次会话的<strong>前置约束</strong>，我会先固化实体，再做可见度诊断与结构化补齐。执行计划如下：',
    delay: 300,
  },
  {
    type: "plan",
    items: [
      "全站品牌实体更新 → 壶天（schema / OG / sitemap）",
      "运行 SEO / GEO 综合诊断",
      "追踪 AI 引用来源与情感倾向",
      "补齐 Product 结构化数据（JSON-LD）",
      "提交语义站点地图并验证收录",
    ],
    delay: 400,
  },
  { type: "plan_update", done: 0, current: 0, delay: 700 },
  {
    type: "tool_start",
    id: "t1",
    name: "entity_rename",
    args: 'from="天启芯 / Tikchip" → to="壶天"',
    delay: 200,
  },
  {
    type: "tool_end",
    id: "t1",
    ok: true,
    durationMs: 1800,
    output: {
      checks: [
        { ok: true, text: "命中 37 个文件 · 替换 428 处（schema / OG / sitemap / 页脚）" },
        { ok: true, text: "实体主键已切换 → wikidata:壶天 (Hutian)" },
        { ok: true, text: "旧品牌名 301 重定向规则已写入 redirects.conf" },
      ],
    },
    delay: 1800,
  },
  { type: "plan_update", done: 1, current: 1, delay: 300 },
  {
    type: "tool_start",
    id: "t2",
    name: "run_diagnosis",
    args: "target=hutian.com/products/tc-diode-001",
    delay: 200,
  },
  {
    type: "tool_end",
    id: "t2",
    ok: true,
    durationMs: 1600,
    output: {
      meters: [
        { label: "传统 SEO", value: 64, color: "amber" },
        { label: "生成式 GEO", value: 92, color: "teal" },
      ],
      checks: [
        { ok: true, text: "实体清晰度 — 通过" },
        { ok: true, text: "语义链接 — 通过" },
        { ok: false, text: "结构化数据缺失 — Product 缺少 gtin / price / sameAs" },
      ],
    },
    delay: 1600,
  },
  { type: "plan_update", done: 2, current: 2, delay: 300 },
  {
    type: "tool_start",
    id: "t3",
    name: "trace_citations",
    args: "window=30d · engines=all",
    delay: 200,
  },
  {
    type: "tool_end",
    id: "t3",
    ok: true,
    durationMs: 1700,
    output: {
      citations: [
        { engine: "DeepSeek-V3", share: 42, tag: "ds", note: "主要来源" },
        { engine: "GPT-4o", share: 28, tag: "gpt", note: "次要权威" },
        { engine: "Kimi", share: 15, tag: "kimi", note: "提及" },
        { engine: "其他", share: 15, tag: "oth", note: "长尾" },
      ],
      total: 2410,
      sentiment: "正面 87%",
      growth: "+12.5%",
    },
    delay: 1700,
  },
  { type: "plan_update", done: 3, current: 3, delay: 300 },
  { type: "thinking", on: true, delay: 200 },
  { type: "thinking", on: false, delay: 1000 },
  {
    type: "message",
    role: "agent",
    content:
      '诊断结论：GEO 表现强劲（<span class="text-amber font-bold">92%</span>），但 <code>Product</code> 结构化数据缺 <code>gtin / price / sameAs</code>，会拉低生成式引擎的<strong>事实采纳率</strong>。现在写入修补 —— 注意右侧面板。',
    delay: 300,
  },
  {
    type: "tool_start",
    id: "t4",
    name: "edit_file",
    args: "schema/product.jsonld",
    delay: 600,
  },
  {
    type: "diff",
    data: {
      file: "schema/product.jsonld",
      additions: 9,
      deletions: 2,
      lines: [
        { no: 1, text: "{", kind: "ctx" },
        { no: 2, text: '  "@context": "https://schema.org",', kind: "ctx" },
        { no: 3, text: '  "@type": "Product",', kind: "ctx" },
        { no: 4, text: '  "name": "半导体二极管",', kind: "ctx" },
        { no: 5, text: '  "brand": "Tikchip",', kind: "del" },
        { no: 5, text: '  "brand": "壶天",', kind: "add" },
        { no: 6, text: '  "description": "高性能半导体器件，适用于工业控制与物联网。",', kind: "ctx" },
        { no: 7, text: '  "sku": "TC-DIODE-001",', kind: "ctx" },
        { no: 8, text: '  "gtin": "6970000000017",', kind: "add" },
        { no: 9, text: '  "sameAs": ["https://www.wikidata.org/wiki/Q128888"],', kind: "add" },
        { no: 10, text: '  "offers": {', kind: "ctx" },
        { no: 11, text: '    "@type": "Offer",', kind: "ctx" },
        { no: 12, text: '    "availability": "https://schema.org/InStock"', kind: "del" },
        { no: 12, text: '    "availability": "https://schema.org/InStock",', kind: "add" },
        { no: 13, text: '    "price": "12.80",', kind: "add" },
        { no: 14, text: '    "priceCurrency": "CNY"', kind: "add" },
        { no: 15, text: "  },", kind: "ctx" },
        { no: 16, text: '  "subjectOf": {', kind: "add" },
        { no: 17, text: '    "@type": "TechArticle",', kind: "add" },
        { no: 18, text: '    "name": "工业控制选型指南"', kind: "add" },
        { no: 19, text: "  }", kind: "add" },
        { no: 20, text: "}", kind: "ctx" },
      ],
    },
    delay: 400,
  },
  {
    type: "tool_end",
    id: "t4",
    ok: true,
    durationMs: 1500,
    output: {
      checks: [
        { ok: true, text: "schema/product.jsonld  +9 / −2 — 右侧 Diff 面板已高亮" },
        { ok: true, text: "brand 字段统一为「壶天」，补充 gtin / price / sameAs / subjectOf" },
        { ok: true, text: "JSON-LD 语法校验通过 · 富媒体结果资格 ✓" },
      ],
    },
    delay: 1100,
  },
  { type: "plan_update", done: 4, current: 4, delay: 300 },
  {
    type: "tool_start",
    id: "t5",
    name: "submit_sitemap",
    args: "semantic=true · targets=google,bing",
    delay: 200,
  },
  {
    type: "terminal",
    line: '<span class="text-teal">➜</span> hutian deploy --sitemap semantic.xml --targets google,bing',
    delay: 400,
  },
  {
    type: "terminal",
    line: '<span class="text-amber">↑</span> 1,284 URLs · IndexNow <span class="text-green">200 OK</span> <span class="text-faint">· 312ms</span>',
    delay: 600,
  },
  {
    type: "tool_end",
    id: "t5",
    ok: true,
    durationMs: 1500,
    output: {
      checks: [
        { ok: true, text: "解析 1,284 个 URL（含 96 个实体锚点）" },
        { ok: true, text: "IndexNow 提交 → Google / Bing · 200 OK · 312ms" },
        { ok: true, text: "抓取队列已预热，预计 40 分钟内完成再索引" },
      ],
    },
    delay: 900,
  },
  { type: "plan_update", done: 5, current: 5, delay: 300 },
  { type: "thinking", on: true, delay: 200 },
  { type: "thinking", on: false, delay: 1000 },
  {
    type: "stats",
    items: [
      { label: "搜索流量", value: 89, prefix: "+", suffix: "%", accent: "amber", sub: "▲ 30 天环比" },
      { label: "GEO 饱和度", value: 92, suffix: "%", accent: "teal" },
      { label: "AI 引用量", value: 2410, accent: "violet", sub: "DeepSeek 占 42%" },
      { label: "引用增速", value: 12.5, dec: 1, prefix: "+", suffix: "%", accent: "green", sub: "▲ 周环比" },
    ],
    delay: 300,
  },
  {
    type: "message",
    role: "agent",
    content:
      '全部完成 ✅ 本次会话共执行 <strong>5 个工具调用</strong>。建议下一步：<br/>1. 为「壶天」注册 Wikidata 品牌实体条目，强化 sameAs 证据链<br/>2. 产品页追加 FAQPage 结构化数据，抢占生成式引用位<br/>3. 每周一 09:00 自动生成 GEO 引用周报并推送',
    delay: 300,
  },
  { type: "done", delay: 200 },
];
