import type { EmailMeta, EmailLetter, EvidenceCard } from "@hutian/agent-protocol";

/**
 * Mock 邮件数据 — 全部取自 prototype/email_kanban.html 与 demo-events.ts 真值。
 * 数字（64/92/+89/2410/+12.5/42/28/15/428/37/6）与 demo-events / verify:demo 门禁对齐。
 */

const EVIDENCE_SCORES_1: EvidenceCard = {
  type: "scores",
  title: "综合诊断",
  seo: 64,
  geo: 92,
  conclusions: [
    { kind: "ok", text: "实体清晰度 — 通过" },
    { kind: "ok", text: "语义链接 — 通过" },
    { kind: "warn", text: "结构化缺失 — Product 缺 gtin / price / sameAs" },
  ],
};

const EVIDENCE_DIFF_1: EvidenceCard = {
  type: "diff",
  title: "建议补丁 · schema/product.jsonld",
  lines: [
    { kind: "ctx", no: 5, text: '  "brand": "壶天",' },
    { kind: "add", no: 8, text: '  "gtin": "6970000000017",' },
    { kind: "add", no: 9, text: '  "sameAs": ["…/Q128888"],' },
    { kind: "add", no: 13, text: '    "price": "12.80",' },
    { kind: "add", no: 14, text: '    "priceCurrency": "CNY"' },
  ],
};

const EVIDENCE_RENAME_2: EvidenceCard = {
  type: "rename",
  title: "空跑报告 · entity_rename",
  matches: 428,
  files: 37,
  excluded: 6,
};

const EVIDENCE_BARS_3: EvidenceCard = {
  type: "bars",
  title: "引用来源分布",
  bars: [
    { name: "DeepSeek-V3", value: 42, className: "b-ds" },
    { name: "GPT-4o",      value: 28, className: "b-gpt" },
    { name: "Kimi",        value: 15, className: "b-kimi" },
    { name: "其他",         value: 15, className: "b-oth" },
  ],
  extras: [
    ["引用量", "2,410"],
    ["情感", "正面 87%"],
    ["搜索流量 30d", "+89%"],
  ],
};

const EVIDENCE_TERM_4: EvidenceCard = {
  type: "term",
  title: "提交日志",
  lines: [
    { cls: "p",  prefix: "➜", text: " hutian deploy --sitemap semantic.xml" },
    { cls: "ok", prefix: "✓", text: " 1,284 URLs · IndexNow 200 OK · 312ms" },
  ],
};

const EVIDENCE_SCORES_5: EvidenceCard = {
  type: "scores",
  title: "基线诊断",
  seo: 41,
  geo: 18,
  conclusions: [
    { kind: "warn", text: "title / meta description 缺失" },
    { kind: "warn", text: "无 JSON-LD 结构化数据" },
    { kind: "warn", text: "内链孤立（0 条入链）" },
  ],
};

/** 邮件元数据 — 列表项 */
export const inboxMails: EmailMeta[] = [
  {
    id: "m1",
    from: "agent",
    fromName: "壶天 SEO Agent",
    time: "14:52",
    unread: true,
    category: "approve",
    subject: "TC-DIODE-001 结构化数据缺 3 字段，建议补齐以争取 AI 引用",
    snippet: "诊断完成：GEO 92% 但 Product 缺 gtin / price / sameAs，拉低事实采纳率…",
  },
  {
    id: "m2",
    from: "agent",
    fromName: "壶天 SEO Agent",
    time: "13:10",
    unread: true,
    category: "approve",
    subject: "品牌更名 天启芯 → 壶天：已扫描 37 文件 428 处，待你确认写盘",
    snippet: "dry_run 完成。已智能排除 docs/ 与历史文档中的旧称提及，避免误改…",
  },
  {
    id: "m3",
    from: "agent",
    fromName: "壶天 SEO Agent",
    time: "周一 09:00",
    unread: true,
    category: "report",
    subject: "GEO 引用周报 W30：引用量 2,410，周环比 +12.5%",
    snippet: "DeepSeek 占 42% 为主要来源；搜索流量 30 日 +89%。附完整周报…",
  },
  {
    id: "m4",
    from: "agent",
    fromName: "壶天 SEO Agent",
    time: "昨天",
    unread: false,
    category: "done",
    subject: "语义站点地图已提交：1,284 URL，IndexNow 200 OK",
    snippet: "含 96 个实体锚点；抓取队列已预热，预计 40 分钟内完成再索引。",
  },
  {
    id: "m5",
    from: "me",
    fromName: "我（站长）",
    time: "前天",
    unread: false,
    category: "diag",
    subject: "帮我审计新上的落地页 hutian.com/landing/ai-cs",
    snippet: "你：刚上线，想看看 SEO/GEO 基线。 · 壶天：已诊断，附报告…",
  },
];

/** 邮件线程 — 选中后渲染 */
export const inboxThreads: Record<string, EmailLetter[]> = {
  m1: [
    {
      id: "m1-l1",
      who: "agent",
      when: "14:52",
      badge: "建议 · 待批复",
      textHtml:
        '<p>站长你好，我对产品页 <code>hutian.com/products/tc-diode-001</code> 跑完四步诊断。<strong>生成式 GEO 表现强劲（92%）</strong>，但发现一个会直接拉低 AI 引擎"事实采纳率"的缺口：</p>' +
        '<p><code>Product</code> 结构化数据缺少 <span class="hl">gtin / price / sameAs</span> 三个字段。生成式引擎在回答"推荐一款工业控制二极管"时，因拿不到价格与实体锚点，倾向于不引用我们。</p>' +
        '<p>我已草拟好 JSON-LD 补丁（见下方 diff），<strong>等你批复后即写入</strong>，并自动提交站点地图触发再索引。</p>',
      evidence: [
        EVIDENCE_SCORES_1,
        EVIDENCE_DIFF_1,
        { type: "attach", file: "schema/product.jsonld", size: "1.2 KB · 草稿" },
      ],
      quick: [
        { kind: "ok",  label: "批准补齐并提交", action: "approve" },
        { kind: "ask", label: "先只看完整 diff", action: "diff" },
        { kind: "no",  label: "暂不处理，记入 backlog", action: "defer" },
      ],
    },
  ],
  m2: [
    {
      id: "m2-l1",
      who: "agent",
      when: "13:10",
      badge: "更名 · 待确认",
      textHtml:
        '<p>按你的指令，我把全站品牌实体从 <code>天启芯 / Tikchip</code> 迁移到 <strong class="hl">壶天</strong>。空跑（dry_run）结果：命中 <strong>37 个文件、428 处</strong>，覆盖 schema / OG 标签 / sitemap / 页脚。</p>' +
        '<p>⚠️ 一处需要你知晓：我<strong>智能排除了 <code>docs/</code> 与历史文档</strong>中"仅作历史映射"的旧称提及（共 6 处保留），以免把 PRD、变更日志里的历史记录也改掉——那些旧称在那里是<strong>应当存在</strong>的。</p>' +
        '<p>确认无误后回复"确认写盘"，我会真正写入并补 301 重定向。</p>',
      evidence: [
        EVIDENCE_RENAME_2,
        { type: "attach", file: "entity-graph.json", size: "218 KB · 壶天品牌图谱" },
      ],
      quick: [
        { kind: "ok",  label: "确认写盘",       action: "write" },
        { kind: "ask", label: "把排除清单发我看看", action: "list" },
        { kind: "no",  label: "取消更名",       action: "cancel" },
      ],
    },
  ],
  m3: [
    {
      id: "m3-l1",
      who: "agent",
      when: "周一 09:00",
      badge: "周报 · 自动",
      textHtml:
        '<p>本周 GEO 表现稳步上行。生成式引擎对"壶天"的引用量达 <strong class="hl">2,410</strong>，周环比 <strong>+12.5%</strong>；传统搜索流量 30 日环比 <strong>+89%</strong>。</p>' +
        '<p>引用结构健康：<strong>DeepSeek-V3 占 42%</strong> 为主要来源，GPT-4o 28% 为次要权威，Kimi 15%。情感倾向正面 87%。</p>' +
        '<p>建议下周聚焦：为壶天注册 Wikidata 实体条目，强化 sameAs 证据链，可进一步抬升 GPT 侧引用。</p>',
      evidence: [
        EVIDENCE_BARS_3,
        { type: "attach", file: "geo-report-w30.md", size: "6.4 KB" },
      ],
      quick: [
        { kind: "ok",  label: "收到，归档",       action: "arch" },
        { kind: "ask", label: "导出 PDF 版",     action: "pdf" },
        { kind: "ask", label: "订阅每周一推送", action: "sub" },
      ],
    },
  ],
  m4: [
    {
      id: "m4-l1",
      who: "agent",
      when: "昨天 16:40",
      badge: "完成回执",
      textHtml:
        '<p>你上周批准的语义站点地图已提交至 Google / Bing。<strong>1,284 个 URL</strong>（含 96 个实体锚点）通过 IndexNow 推送，返回 <strong>200 OK</strong>，耗时 312ms。</p>' +
        '<p>抓取队列已预热，预计 40 分钟内完成再索引。我会在收录数据回流后，再发一封确认邮件。</p>',
      evidence: [
        EVIDENCE_TERM_4,
        { type: "attach", file: "semantic-sitemap.xml", size: "84 KB · 已提交" },
      ],
      quick: [],
    },
  ],
  m5: [
    {
      id: "m5-l1",
      who: "me",
      when: "前天 10:12",
      badge: "去信",
      textHtml:
        '<p>壶天，我们刚上线了一个 AI 客服的落地页 <code>hutian.com/landing/ai-cs</code>，还没做任何优化。帮我跑一次基线诊断，看看传统 SEO 和 GEO 各是什么水平，列个优先级清单。</p>',
    },
    {
      id: "m5-l2",
      who: "agent",
      when: "前天 10:14",
      badge: "回信 · 已诊断",
      textHtml:
        '<p>收到，已诊断。基线：<strong>传统 SEO 41% / 生成式 GEO 18%</strong>——典型的新页冷启动状态，主要扣分在缺 title 描述、无 JSON-LD、内链孤立。</p>' +
        '<p>已生成 5 条按影响排序的修复清单（高→低），并草拟了 FAQPage 结构化数据。要我直接执行前三条吗？回复"批准"即可，我会逐条写并在每步后回报。</p>',
      evidence: [EVIDENCE_SCORES_5],
      quick: [
        { kind: "ok",  label: "批准执行前三条", action: "approve" },
        { kind: "ask", label: "把 5 条清单都发我", action: "list" },
      ],
    },
  ],
};
