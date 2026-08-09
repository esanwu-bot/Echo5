"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 壶天 Wiki —— 产品功能与使用指南。
 * 原型：D:/Downloads/Qwen_html_20260809_c8lmt14yl.html
 * 样式按当前 marketing 设计语言落地（--mkt-* 变量，indigo/amber/ink 配色）。
 *
 * 三栏布局：侧栏分组导航（含搜索）+ 文章内容 + 右侧 TOC。
 * 交互：文章切换、搜索过滤、代码复制、TOC 滚动高亮、上下篇、内联跳转。
 */

const DOCS_CSS = `
/* ============ WIKI HERO ============ */
.mkt .docs-hero{position:relative;background:var(--mkt-ink);color:#fff;padding:138px 0 56px;overflow:hidden}
.mkt .docs-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%)}
.mkt .docs-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(680px 420px at 12% 8%,rgba(99,102,241,.32),transparent 60%),radial-gradient(620px 420px at 92% 18%,rgba(124,58,237,.26),transparent 60%),radial-gradient(560px 380px at 70% 96%,rgba(245,158,11,.16),transparent 60%)}
.mkt .docs-hero .wrap{position:relative;z-index:2;display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.mkt .docs-hero-text{max-width:640px}
.mkt .docs-hero-search{display:flex;justify-content:flex-end;align-items:center}
.mkt .docs-hero .search-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:24px;width:100%;max-width:380px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 20px 50px rgba(0,0,0,.25)}
.mkt .docs-hero .search-card .label{display:block;font-size:13px;color:rgba(255,255,255,.7);margin-bottom:12px;font-weight:500}
.mkt .docs-hero .kicker{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.16em;color:var(--mkt-amber2);font-weight:600;margin-bottom:14px;text-transform:uppercase}
.mkt .docs-hero h1{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(34px,4.6vw,58px);line-height:1.1;font-weight:700;letter-spacing:-.01em;margin-bottom:16px}
.mkt .docs-hero h1 .grad{background:linear-gradient(100deg,var(--mkt-amber2),var(--mkt-pink) 55%,var(--mkt-indigo2));-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .docs-hero .lead{font-size:17px;color:rgba(255,255,255,.72);max-width:560px;line-height:1.75}
.mkt .docs-hero .hero-search{position:relative;width:100%}
.mkt .docs-hero .hero-search svg{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:17px;height:17px;stroke:rgba(255,255,255,.5)}
.mkt .docs-hero .hero-search input{width:100%;height:50px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:0 18px 0 46px;color:#fff;font-size:15px;font-family:var(--font-sans),sans-serif;outline:none;transition:.2s}
.mkt .docs-hero .hero-search input::placeholder{color:rgba(255,255,255,.45)}
.mkt .docs-hero .hero-search input:focus{background:rgba(255,255,255,.15);border-color:var(--mkt-indigo2);box-shadow:0 0 0 3px rgba(79,70,229,.25)}

/* ============ WIKI LAYOUT ============ */
.mkt .wiki{background:var(--mkt-paper);font-family:var(--font-sans),sans-serif;color:var(--mkt-text);padding-top:0}
.mkt .wiki-layout{display:grid;grid-template-columns:256px minmax(0,1fr) 212px;max-width:1320px;margin:0 auto;min-height:calc(100vh - 68px)}

/* ── 侧栏 ── */
.mkt .wiki-side{background:var(--mkt-white);border-right:1px solid var(--mkt-line);padding:24px 0 60px;position:sticky;top:68px;height:calc(100vh - 68px);overflow-y:auto}
.mkt .wiki-side::-webkit-scrollbar{width:0}
.mkt .wiki-search{padding:0 22px 18px;position:relative}
.mkt .wiki-search svg{position:absolute;left:35px;top:50%;transform:translateY(-50%);width:15px;height:15px;stroke:var(--mkt-faint)}
.mkt .wiki-search input{width:100%;height:36px;background:var(--mkt-paper);border:1px solid var(--mkt-line);border-radius:9px;padding:0 14px 0 36px;color:var(--mkt-text);font-size:13px;font-family:var(--font-sans),sans-serif;outline:none;transition:.2s}
.mkt .wiki-search input::placeholder{color:var(--mkt-faint)}
.mkt .wiki-search input:focus{border-color:var(--mkt-indigo);background:var(--mkt-white)}
.mkt .nav-group{margin-bottom:22px}
.mkt .nav-group h4{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.16em;color:var(--mkt-indigo);font-weight:600;padding:0 22px;margin-bottom:8px;display:flex;align-items:center;gap:8px;text-transform:uppercase}
.mkt .nav-group h4::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--mkt-line),transparent)}
.mkt .nav-link{display:flex;align-items:center;gap:10px;padding:8px 22px;color:var(--mkt-dim);font-size:13.5px;cursor:pointer;border-left:3px solid transparent;transition:.18s;background:none;border-top:none;border-right:none;border-bottom:none;text-align:left;width:100%;font-family:var(--font-sans),sans-serif}
.mkt .nav-link .ic{width:17px;text-align:center;font-size:14px;opacity:.8}
.mkt .nav-link:hover{color:var(--mkt-text);background:var(--mkt-paper)}
.mkt .nav-link.active{color:var(--mkt-indigo);border-left-color:var(--mkt-indigo);background:rgba(79,70,229,.06);font-weight:600}
.mkt .nav-empty{padding:16px 22px;color:var(--mkt-faint);font-size:13px;display:none}

/* ── 内容区 ── */
.mkt .wiki-content{padding:40px 56px 90px;min-width:0}
.mkt .crumbs{font-size:12.5px;color:var(--mkt-faint);margin-bottom:22px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.mkt .crumbs a{color:var(--mkt-indigo);text-decoration:none;cursor:pointer}
.mkt .crumbs a:hover{text-decoration:underline}
.mkt .crumbs .sep{color:var(--mkt-line2)}
.mkt .crumbs .cur{color:var(--mkt-text);font-weight:600}
.mkt .wiki-article{animation:wikiFade .35s ease}
@keyframes wikiFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.mkt .wiki .kicker{font-family:var(--font-mono),monospace;font-size:12px;letter-spacing:.16em;color:var(--mkt-indigo);font-weight:600;margin-bottom:12px;text-transform:uppercase}
.mkt .wiki h1{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:32px;font-weight:700;color:var(--mkt-text);line-height:1.25;margin-bottom:14px}
.mkt .wiki .lead{font-size:16px;color:var(--mkt-dim);max-width:660px;margin-bottom:30px;line-height:1.75}
.mkt .wiki h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:22px;font-weight:600;color:var(--mkt-text);margin:44px 0 16px;padding-top:14px;border-top:1px solid var(--mkt-line);scroll-margin-top:84px;display:flex;align-items:center}
.mkt .wiki h2 .anchor{color:var(--mkt-amber);font-size:16px;margin-left:8px;opacity:0;transition:.2s;text-decoration:none}
.mkt .wiki h2:hover .anchor{opacity:1}
.mkt .wiki h3{font-size:16.5px;font-weight:700;color:var(--mkt-text);margin:28px 0 12px}
.mkt .wiki p{margin-bottom:14px;color:#3f3d35;line-height:1.8}
.mkt .wiki .inline{color:var(--mkt-indigo);text-decoration:underline;text-underline-offset:3px;cursor:pointer;background:none}
.mkt .wiki ul.doc{margin:0 0 16px 4px;list-style:none}
.mkt .wiki ul.doc li{padding-left:22px;position:relative;margin-bottom:8px;color:#3f3d35;line-height:1.75}
.mkt .wiki ul.doc li::before{content:'◆';position:absolute;left:0;top:1px;color:var(--mkt-amber);font-size:9px}
.mkt .wiki strong{color:var(--mkt-text);font-weight:600}

/* 代码块 */
.mkt .codeblock{position:relative;margin:18px 0;border-radius:11px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 4px 16px rgba(20,20,46,.1)}
.mkt .codeblock .cb-head{display:flex;align-items:center;justify-content:space-between;background:var(--mkt-ink2);padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.mkt .codeblock .lang{font-family:var(--font-mono),monospace;font-size:11px;color:var(--mkt-amber2);letter-spacing:1px}
.mkt .copy-btn{background:none;border:1px solid rgba(220,185,94,.3);color:#c9d6cd;font-size:11px;padding:3px 11px;border-radius:6px;cursor:pointer;font-family:var(--font-sans),sans-serif;transition:.2s}
.mkt .copy-btn:hover{border-color:var(--mkt-amber);color:var(--mkt-amber2)}
.mkt .copy-btn.done{border-color:var(--mkt-green);color:#7ed4a4}
.mkt .codeblock pre{background:var(--mkt-ink);padding:16px 18px;overflow-x:auto;margin:0}
.mkt .codeblock code{font-family:var(--font-mono),monospace;font-size:13px;line-height:1.7;color:#d7e2d9;white-space:pre}

/* 表格 */
.mkt .tbl-wrap{overflow-x:auto;margin:18px 0;border:1px solid var(--mkt-line);border-radius:11px;background:var(--mkt-white)}
.mkt .wiki table{width:100%;border-collapse:collapse;font-size:13.5px}
.mkt .wiki th{background:var(--mkt-paper);text-align:left;padding:11px 16px;font-weight:700;color:var(--mkt-text);border-bottom:2px solid var(--mkt-line);white-space:nowrap}
.mkt .wiki td{padding:11px 16px;border-bottom:1px solid var(--mkt-line);color:var(--mkt-dim);vertical-align:top}
.mkt .wiki tr:last-child td{border-bottom:none}
.mkt .wiki td b{color:var(--mkt-text)}

/* 提示框 */
.mkt .callout{border-radius:10px;padding:14px 18px;margin:18px 0;font-size:14px;display:flex;gap:12px;border:1px solid;border-left-width:4px;line-height:1.7}
.mkt .callout .ci{flex-shrink:0;font-size:16px}
.mkt .callout.tip{background:rgba(16,185,129,.06);border-color:rgba(16,185,129,.25);border-left-color:var(--mkt-green)}
.mkt .callout.note{background:rgba(79,70,229,.05);border-color:rgba(79,70,229,.2);border-left-color:var(--mkt-indigo)}
.mkt .callout.warn{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.25);border-left-color:var(--mkt-amber)}
.mkt .callout b{display:block;margin-bottom:3px;color:var(--mkt-text)}

/* 步骤 */
.mkt ol.steps{list-style:none;margin:20px 0;counter-reset:step;padding:0}
.mkt ol.steps li{counter-increment:step;position:relative;padding:0 0 26px 52px}
.mkt ol.steps li::before{content:counter(step);position:absolute;left:0;top:0;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--mkt-indigo),var(--mkt-violet));color:#fff;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:15px;font-weight:700;display:grid;place-items:center;box-shadow:0 3px 10px rgba(79,70,229,.3)}
.mkt ol.steps li::after{content:'';position:absolute;left:17px;top:42px;bottom:6px;width:2px;background:linear-gradient(180deg,var(--mkt-line),transparent)}
.mkt ol.steps li:last-child::after{display:none}
.mkt ol.steps b{display:block;font-size:15px;color:var(--mkt-text);margin-bottom:5px;font-weight:600}

/* 功能卡片网格 */
.mkt .feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:22px 0}
.mkt .wiki .feat{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:13px;padding:18px 20px;transition:.22s;cursor:pointer;text-align:left}
.mkt .wiki .feat:hover{transform:translateY(-3px);border-color:var(--mkt-indigo);box-shadow:var(--mkt-shadow-md)}
.mkt .wiki .feat .fi{font-size:21px;margin-bottom:10px}
.mkt .wiki .feat b{display:block;font-size:14.5px;color:var(--mkt-text);margin-bottom:5px;font-weight:600}
.mkt .wiki .feat p{font-size:12.5px;color:var(--mkt-dim);margin:0;line-height:1.6}

/* 徽章 */
.mkt .wiki .badge{display:inline-block;font-size:11px;padding:2px 10px;border-radius:20px;font-weight:600;letter-spacing:.5px}
.mkt .badge.gold{background:rgba(245,158,11,.15);color:#9a6a14}
.mkt .badge.green{background:rgba(16,185,129,.12);color:var(--mkt-green)}
.mkt .badge.indigo{background:rgba(79,70,229,.12);color:var(--mkt-indigo)}

/* 上下篇 */
.mkt .pager{display:flex;gap:14px;margin-top:52px;padding-top:26px;border-top:1px solid var(--mkt-line)}
.mkt .pager button{flex:1;border:1px solid var(--mkt-line);border-radius:12px;padding:15px 20px;transition:.2s;background:var(--mkt-white);cursor:pointer;text-align:left;font-family:var(--font-sans),sans-serif}
.mkt .pager button:hover{border-color:var(--mkt-indigo);box-shadow:var(--mkt-shadow-sm)}
.mkt .pager .dir{font-size:11px;color:var(--mkt-faint);letter-spacing:1px;margin-bottom:4px}
.mkt .pager .tt{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:15px;color:var(--mkt-text);font-weight:600}
.mkt .pager .next{text-align:right;margin-left:auto}

/* TOC */
.mkt .wiki-toc{position:sticky;top:68px;height:calc(100vh - 68px);overflow-y:auto;padding:42px 20px 40px 8px;font-size:13px}
.mkt .wiki-toc h5{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.16em;color:var(--mkt-faint);font-weight:600;margin-bottom:14px;text-transform:uppercase}
.mkt .wiki-toc a{display:block;color:var(--mkt-dim);text-decoration:none;padding:5px 0 5px 14px;border-left:2px solid var(--mkt-line);transition:.15s;line-height:1.5;cursor:pointer;background:none}
.mkt .wiki-toc a:hover{color:var(--mkt-indigo)}
.mkt .wiki-toc a.on{color:var(--mkt-indigo);border-left-color:var(--mkt-indigo);font-weight:600}

.mkt .wiki-foot{border-top:1px solid var(--mkt-line);margin-top:60px;padding-top:22px;font-size:12px;color:var(--mkt-faint);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}

/* 移动端抽屉 */
.mkt .wiki-menu-btn{display:none;background:none;border:1px solid var(--mkt-line);color:var(--mkt-text);font-size:18px;cursor:pointer;width:38px;height:38px;border-radius:9px;align-items:center;justify-content:center}
.mkt .wiki-backdrop{display:none}

@media(max-width:1120px){.mkt .wiki-layout{grid-template-columns:236px 1fr}.mkt .wiki-toc{display:none}}
@media(max-width:820px){
  .mkt .wiki-layout{grid-template-columns:1fr}
  .mkt .wiki-side{position:fixed;left:-280px;top:68px;width:260px;z-index:90;transition:.28s;height:calc(100vh - 68px);box-shadow:12px 0 40px rgba(0,0,0,.15)}
  .mkt .wiki-side.open{left:0}
  .mkt .wiki-menu-btn{display:flex}
  .mkt .wiki-content{padding:24px 20px 70px}
  .mkt .wiki-backdrop.open{display:block;position:fixed;inset:68px 0 0 0;background:rgba(15,14,23,.4);z-index:89}
  .mkt .wiki h1{font-size:26px}
}
@media(prefers-reduced-motion:reduce){.mkt .wiki-article{animation:none}}
`;

/* ── 文章数据 ── */

type Block =
  | { t: "p"; html: string }
  | { t: "ul"; items: string[] }
  | { t: "code"; lang: string; text: string }
  | { t: "table"; headers: string[]; rows: string[][] }
  | { t: "callout"; v: "tip" | "note" | "warn"; icon: string; title: string; html: string; goto?: string }
  | { t: "steps"; items: { b: string; html: string; code?: { lang: string; text: string } }[] }
  | { t: "featGrid"; items: { icon: string; title: string; desc: string; goto: string }[] }
  | { t: "badgeP"; html: string; badge: { text: string; cls: string } };

type Section = { id: string; title: string; blocks: Block[] };
type Article = { id: string; group: string; title: string; kicker: string; lead: string; sections: Section[] };

const ARTICLES: Article[] = [
  {
    id: "intro",
    group: "开始使用",
    title: "产品简介",
    kicker: "OVERVIEW · 壶中天地",
    lead: "壶天是一个面向出海品牌的 AI 智能体平台，把传统 SEO 与生成式引擎优化（GEO）合并为一条可对话的工作流——你只需描述目标，Agent 自动完成诊断、建站、结构化数据与收录提交。",
    sections: [
      {
        id: "h-what",
        title: "它解决什么问题",
        blocks: [
          {
            t: "p",
            html: '过去做 SEO，你需要在关键词工具、CMS 后台、Google Search Console 之间反复切换；而 AI 搜索时代，<strong>光有排名还不够——你的内容还要能被 ChatGPT、Perplexity、Kimi 等引擎引用</strong>。壶天把这两件事交给一个 Agent：',
          },
          {
            t: "ul",
            items: [
              "<strong>双评分诊断</strong>：同一页面同时给出传统 SEO 分与生成式 GEO 分，看清两类引擎的差距。",
              "<strong>结构化数据补齐</strong>：自动检测 JSON-LD 缺失并生成补丁，争取搜索结果富文本展示。",
              "<strong>一句话建站</strong>：描述需求即可生成文章页/产品页，建完自动复验达标。",
              "<strong>AI 引用追踪</strong>：监测品牌在主流 AI 引擎中的引用占比与增速。",
            ],
          },
        ],
      },
      {
        id: "h-modules",
        title: "核心功能一览",
        blocks: [
          {
            t: "featGrid",
            items: [
              { icon: "🔍", title: "双评分诊断", desc: "传统 SEO + 生成式 GEO 双维度评分，定位实体清晰度短板。", goto: "seo-diagnosis" },
              { icon: "🧬", title: "结构化数据", desc: "JSON-LD 校验与补齐，解锁搜索引擎富文本结果。", goto: "structured-data" },
              { icon: "🏗️", title: "一句话建站", desc: "对话式生成文章/产品页，建完即复验 SEO 达标。", goto: "cms-build" },
              { icon: "🤖", title: "AI 引用追踪", desc: "监测品牌在 AI 引擎的引用占比、增速与来源。", goto: "geo-tracking" },
            ],
          },
        ],
      },
      {
        id: "h-how",
        title: "它如何工作",
        blocks: [
          { t: "p", html: "壶天以<strong>对话</strong>为入口。你在工作台用自然语言下达任务，Agent 规划步骤、调用工具、实时汇报，每一步都以事件流形式可视化——你能看到它在诊断、在补数据、在提交，而非一个黑盒。" },
          {
            t: "callout",
            v: "note",
            icon: "💡",
            title: "多租户架构",
            html: '每个品牌拥有独立的工作空间与数据隔离，你的站点数据不会与其他租户混淆。详见<a class="inline" data-goto="workspace">工作空间与席位</a>。',
            goto: "workspace",
          },
        ],
      },
    ],
  },
  {
    id: "quickstart",
    group: "开始使用",
    title: "快速上手",
    kicker: "QUICKSTART",
    lead: "从零到第一次诊断只需三步。本指南带你在 5 分钟内跑通壶天的核心闭环。",
    sections: [
      {
        id: "h-pre",
        title: "前置条件",
        blocks: [
          {
            t: "ul",
            items: ["一个已注册的壶天账号（由管理员邀请加入工作空间）。", "你希望优化的网站 URL（需可公开访问）。"],
          },
        ],
      },
      {
        id: "h-steps",
        title: "三步跑通",
        blocks: [
          {
            t: "steps",
            items: [
              { b: "登录并进入工作台", html: "使用账号登录门户，点击「工作台」。左侧是你的会话历史，中栏是对话区，底部输入任务。" },
              {
                b: "发起第一次诊断",
                html: "在输入框描述目标，Agent 会抓取页面并返回双评分报告。",
                code: {
                  lang: "对话示例",
                  text: "# 你输入：\n诊断 https://shop.example.com/product/1180 的 Product JSON-LD\n\n# Agent 返回：传统 SEO 100 / 生成式 GEO 0，\n# 并列出缺失的 gtin、price、brand 字段。",
                },
              },
              { b: "按建议补齐并复验", html: "回复「继续」或「补齐这些字段」，Agent 生成结构化数据补丁并重新校验，直到富文本资格达标。" },
            ],
          },
        ],
      },
      {
        id: "h-next",
        title: "下一步",
        blocks: [
          { t: "p", html: '跑通诊断后，建议继续了解<a class="inline" data-goto="structured-data">结构化数据</a>如何争取富文本展示，或用<a class="inline" data-goto="cms-build">一句话建站</a>直接产出达标页面。' },
          { t: "callout", v: "tip", icon: "✅", title: "小技巧", html: "诊断、补数据、提交收录可以在同一个会话里连续完成——Agent 记得上下文，你只需顺着它的提问往下接。" },
        ],
      },
    ],
  },
  {
    id: "seo-diagnosis",
    group: "SEO 工具箱",
    title: "双评分诊断",
    kicker: "SEO TOOLKIT · DIAGNOSIS",
    lead: "一次抓取，两套评分。壶天同时用传统搜索引擎与生成式引擎的视角审视你的页面，帮你看清“排名”与“被 AI 引用”之间的差距。",
    sections: [
      {
        id: "h-two",
        title: "两套评分体系",
        blocks: [
          {
            t: "table",
            headers: ["维度", "关注点", "典型信号"],
            rows: [
              ["<b>传统 SEO 分</b>", "搜索引擎抓取与排名能力", "可抓取性、title/meta、加载性能、结构化数据完整度"],
              ["<b>生成式 GEO 分</b>", "被 AI 引擎理解与引用的能力", "实体清晰度、语义结构、可引用的事实密度"],
              ["<b>实体清晰度</b>", "品牌/产品作为“实体”是否可被识别", "品牌名一致性、标识符（SKU/GTIN）、关联关系"],
            ],
          },
          { t: "callout", v: "warn", icon: "⚠️", title: "常见误区", html: "传统 SEO 满分 ≠ GEO 高分。一个页面可能抓取无误（传统 100 分），却因缺少结构化事实而完全不被 AI 引用（GEO 0 分）。两套评分要分别对待。" },
        ],
      },
      {
        id: "h-run",
        title: "发起诊断",
        blocks: [
          {
            t: "code",
            lang: "对话示例",
            text: "诊断 https://shop.example.com/product/1180\n\n# Agent 执行 run_diagnosis，输出：\n传统 SEO：100 / 100\n生成式 GEO：0 / 100\n核心问题：实体不清晰 · 语义链接缺失 · JSON-LD 缺失",
          },
        ],
      },
      {
        id: "h-read",
        title: "读懂报告",
        blocks: [
          { t: "p", html: '报告末尾会给出可执行的修复建议（如补齐 Product 的 <code>gtin / price / brand</code>）。你可以直接回复「按建议补齐」，Agent 会衔接<a class="inline" data-goto="structured-data">结构化数据</a>工具完成修复并复验。' },
        ],
      },
    ],
  },
  {
    id: "structured-data",
    group: "SEO 工具箱",
    title: "结构化数据（JSON-LD）",
    kicker: "SEO TOOLKIT · SCHEMA",
    lead: "结构化数据是搜索引擎与 AI 引擎读懂你页面的“通用语言”。壶天自动检测缺失、生成补丁、并校验是否具备富文本结果资格。",
    sections: [
      {
        id: "h-why",
        title: "为什么重要",
        blocks: [
          { t: "p", html: "JSON-LD 让 Google 等引擎在搜索结果中展示星级、价格、库存等<strong>富文本片段</strong>，显著提升点击率；对 AI 引擎而言，结构化事实是被引用的前提。" },
        ],
      },
      {
        id: "h-detect",
        title: "检测与补齐",
        blocks: [
          {
            t: "code",
            lang: "JSON-LD 示例 · Product",
            text: '{\n  "@type": "Product",\n  "brand": { "@type": "Brand", "name": "壶天" },\n  "sku": "TRIKE-X1",\n  "offers": {\n    "@type": "Offer",\n    "price": "1299",\n    "priceCurrency": "USD"\n  }\n}',
          },
          { t: "callout", v: "tip", icon: "✅", title: "自动闭环", html: "补齐后 Agent 会自动复验 <code>rich_result_eligible</code>（富文本资格），确认达标才收尾，无需你手动再跑一次。" },
        ],
      },
      {
        id: "h-types",
        title: "支持的数据类型",
        blocks: [
          {
            t: "table",
            headers: ["类型", "适用页面", "富文本效果"],
            rows: [
              ["<b>Product</b>", "产品详情页", "价格 / 库存 / 评分星级"],
              ["<b>Article</b>", "文章 / 博客", "头条轮播 / 发布时间"],
              ["<b>FAQPage</b>", "问答页", "可折叠问答折叠面板"],
              ["<b>BreadcrumbList</b>", "全站", "面包屑导航路径"],
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cms-build",
    group: "智能建站",
    title: "一句话建站",
    kicker: "SMART BUILD",
    lead: "描述你想要的页面，Agent 自动写入内容、配置结构化数据，并在建成后立即复验 SEO 达标——建站即优化，一步到位。",
    sections: [
      {
        id: "h-flow",
        title: "建站流程",
        blocks: [
          {
            t: "code",
            lang: "对话示例",
            text: "# 你输入：\n建一篇电动三轮车选购指南，包含电机分档、续航、认证合规\n\n# Agent 依次执行：\ncms_create_page   → 生成文章并写入站点\ncheck_schema      → 自动复验 JSON-LD\nsubmit_sitemap    → 提交收录",
          },
          { t: "callout", v: "note", icon: "🛡️", title: "破坏性操作保护", html: "涉及品牌更名、站点地图提交等影响范围大的操作，Agent 会先向你确认再执行，不会擅自改动。" },
        ],
      },
      {
        id: "h-pages",
        title: "可生成的页面类型",
        blocks: [
          {
            t: "ul",
            items: [
              "<strong>文章页</strong>：选购指南、行业洞察、使用教程，自动注入 Article JSON-LD。",
              "<strong>产品页</strong>：含 SKU、价格、规格，自动注入 Product JSON-LD。",
              "<strong>FAQ 页</strong>：问答结构，注入 FAQPage 以争取折叠面板展示。",
            ],
          },
        ],
      },
      {
        id: "h-verify",
        title: "建成即复验",
        blocks: [
          { t: "badgeP", html: "壶天的建站不是“生成了事”——每次建成后会自动抓取渲染结果，校验 head、JSON-LD、H1 唯一性等物理指标，确认搜索引擎能真正读懂，再向你汇报。", badge: { text: "建完即达标", cls: "gold" } },
        ],
      },
    ],
  },
  {
    id: "geo-tracking",
    group: "GEO 监测",
    title: "AI 引用追踪",
    kicker: "GEO MONITORING",
    lead: "AI 搜索时代，被 ChatGPT、Perplexity、Kimi 引用就是新的“排名”。壶天持续监测你的品牌在这些引擎中的引用占比与增速。",
    sections: [
      {
        id: "h-what",
        title: "追踪什么",
        blocks: [
          {
            t: "table",
            headers: ["指标", "含义", "用途"],
            rows: [
              ["<b>引用量</b>", "品牌被 AI 引擎引用的总次数", "衡量整体可见度"],
              ["<b>引用占比</b>", "相对竞品的引用份额", "判断市场声量位置"],
              ["<b>引用增速</b>", "引用量随时间的变化", "评估 GEO 优化成效"],
              ["<b>来源引擎</b>", "引用来自哪些 AI 引擎", "定位重点优化渠道"],
            ],
          },
        ],
      },
      {
        id: "h-run",
        title: "发起追踪",
        blocks: [
          { t: "code", lang: "对话示例", text: "追踪「壶天」品牌最近 30 天在 AI 引擎的引用情况\n\n# Agent 执行 trace_citations，返回引用量 / 占比 / 增速 / 来源分布。" },
          { t: "callout", v: "tip", icon: "📈", title: "配合使用", html: '引用增速是检验 GEO 优化是否见效的核心指标——先用<a class="inline" data-goto="structured-data">结构化数据</a>补齐事实，再定期追踪引用变化，形成闭环。', goto: "structured-data" },
        ],
      },
    ],
  },
  {
    id: "workspace",
    group: "平台管理",
    title: "工作空间与席位",
    kicker: "PLATFORM",
    lead: "壶天以多租户架构服务多个品牌——每个品牌拥有独立的工作空间、数据与站点实例，彼此完全隔离。",
    sections: [
      {
        id: "h-concept",
        title: "核心概念",
        blocks: [
          {
            t: "ul",
            items: [
              "<strong>租户（Tenant）</strong>：计费与登录的主体，通常对应一个公司。",
              "<strong>工作空间（Workspace）</strong>：一个品牌/站点的主体，拥有独立的品牌配置与站点实例。",
              "<strong>席位（Seat）</strong>：租户内的成员名额，决定多少人可以登录协作。",
            ],
          },
        ],
      },
      {
        id: "h-roles",
        title: "角色与权限",
        blocks: [
          {
            t: "table",
            headers: ["角色", "能力"],
            rows: [
              ['<span class="badge gold">Owner</span>', "最高权限，可管理席位、凭证与全部数据。"],
              ['<span class="badge green">Admin</span>', "可邀请成员、执行建站与 SEO 操作。"],
              ['<span class="badge green">Member</span>', "在授权范围内使用工作台。"],
            ],
          },
          { t: "callout", v: "note", icon: "🔒", title: "数据隔离", html: "工作空间之间的数据严格隔离，你的站点、会话与诊断记录对其他租户不可见。" },
        ],
      },
    ],
  },
];

const ORDER = ARTICLES.map((a) => a.id);
const GROUPS = ARTICLES.reduce<Record<string, string>>((acc, a) => {
  acc[a.id] = a.group;
  return acc;
}, {});
const GROUP_ORDER = ["开始使用", "SEO 工具箱", "智能建站", "GEO 监测", "平台管理"];

export default function Docs() {
  const [current, setCurrent] = useState("intro");
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const article = ARTICLES.find((a) => a.id === current)!;
  const articleIndex = ORDER.indexOf(current);
  const prev = articleIndex > 0 ? ARTICLES[articleIndex - 1] : null;
  const next = articleIndex < ORDER.length - 1 ? ARTICLES[articleIndex + 1] : null;

  const go = useCallback((id: string) => {
    if (!ARTICLES.find((a) => a.id === id)) return;
    setCurrent(id);
    setSidebarOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  // 代码复制
  const copyCode = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
      });
    }
  };

  // TOC 滚动高亮
  useEffect(() => {
    const sections = article.sections;
    if (!sections.length) return;
    const onScroll = () => {
      const y = window.scrollY + 110;
      let idx = 0;
      sections.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= y) idx = i;
      });
      setActiveSection(sections[idx].id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [current, article]);

  // 内联跳转事件委托
  const onContentClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-goto]");
    if (target) {
      e.preventDefault();
      go((target as HTMLElement).getAttribute("data-goto")!);
    }
  };

  // 搜索过滤
  const filtered = (id: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return ARTICLES.find((a) => a.id === id)!.title.toLowerCase().includes(q);
  };
  const groupVisible = (g: string) =>
    ARTICLES.some((a) => a.group === g && filtered(a.id));

  const renderBlock = (b: Block, si: number, bi: number) => {
    const codeKey = `${current}-${si}-${bi}`;
    switch (b.t) {
      case "p":
        return <p dangerouslySetInnerHTML={{ __html: b.html }} />;
      case "ul":
        return (
          <ul className="doc">
            {b.items.map((it, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
            ))}
          </ul>
        );
      case "code":
        return (
          <div className="codeblock">
            <div className="cb-head">
              <span className="lang">{b.lang}</span>
              <button
                className={`copy-btn${copiedKey === codeKey ? " done" : ""}`}
                onClick={() => copyCode(b.text, codeKey)}
              >
                {copiedKey === codeKey ? "已复制 ✓" : "复制"}
              </button>
            </div>
            <pre>
              <code>{b.text}</code>
            </pre>
          </div>
        );
      case "table":
        return (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  {b.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} dangerouslySetInnerHTML={{ __html: c }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "callout":
        return (
          <div
            className={`callout ${b.v}`}
            {...(b.goto ? { "data-goto": b.goto, onClick: () => go(b.goto!), style: { cursor: "pointer" } } : {})}
          >
            <span className="ci">{b.icon}</span>
            <div>
              <b>{b.title}</b>
              <span dangerouslySetInnerHTML={{ __html: b.html }} />
            </div>
          </div>
        );
      case "steps":
        return (
          <ol className="steps">
            {b.items.map((s, i) => (
              <li key={i}>
                <b>{s.b}</b>
                <div dangerouslySetInnerHTML={{ __html: s.html }} />
                {s.code && (
                  <div className="codeblock">
                    <div className="cb-head">
                      <span className="lang">{s.code.lang}</span>
                      <button
                        className={`copy-btn${copiedKey === `${codeKey}-${i}` ? " done" : ""}`}
                        onClick={() => copyCode(s.code!.text, `${codeKey}-${i}`)}
                      >
                        {copiedKey === `${codeKey}-${i}` ? "已复制 ✓" : "复制"}
                      </button>
                    </div>
                    <pre>
                      <code>{s.code.text}</code>
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ol>
        );
      case "featGrid":
        return (
          <div className="feat-grid">
            {b.items.map((f, i) => (
              <button key={i} className="feat" onClick={() => go(f.goto)}>
                <div className="fi">{f.icon}</div>
                <b>{f.title}</b>
                <p>{f.desc}</p>
              </button>
            ))}
          </div>
        );
      case "badgeP":
        return (
          <p>
            <span dangerouslySetInnerHTML={{ __html: b.html }} />{" "}
            <span className={`badge ${b.badge.cls}`}>{b.badge.text}</span>
          </p>
        );
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DOCS_CSS }} />

      <section className="wiki">
        <div className="docs-hero">
          <div className="wrap">
            <div className="docs-hero-text">
              <span className="kicker">DOCUMENTATION</span>
              <h1>
                壶天 <span className="grad">Wiki</span>
              </h1>
              <p className="lead">产品功能与使用指南——从 SEO 诊断到 GEO 监测，一文讲清如何用壶天 Agent 完成建站与优化的完整闭环。</p>
            </div>
            <div className="docs-hero-search">
              <div className="search-card">
                <span className="label">查找指南</span>
                <div className="hero-search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索功能或指南…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const first = ARTICLES.find((a) => filtered(a.id));
                        if (first) go(first.id);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 移动端顶栏 */}
        <div className="wrap" style={{ paddingTop: 14, paddingBottom: 0 }}>
          <button className="wiki-menu-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="文档目录">
            ☰
          </button>
        </div>

        <div className="wiki-layout">
          {/* 侧栏 */}
          <aside className={`wiki-side${sidebarOpen ? " open" : ""}`}>
            <div className="wiki-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="text"
                placeholder="搜索功能或指南…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const first = ARTICLES.find((a) => filtered(a.id));
                    if (first) go(first.id);
                  }
                }}
              />
            </div>
            {GROUP_ORDER.map((g) =>
              groupVisible(g) ? (
                <div className="nav-group" key={g}>
                  <h4>{g}</h4>
                  {ARTICLES.filter((a) => a.group === g).map((a) =>
                    filtered(a.id) ? (
                      <button
                        key={a.id}
                        className={`nav-link${a.id === current ? " active" : ""}`}
                        onClick={() => go(a.id)}
                      >
                        <span className="ic">{a.id === "intro" ? "📖" : a.id === "quickstart" ? "🚀" : a.id === "seo-diagnosis" ? "🔍" : a.id === "structured-data" ? "🧬" : a.id === "cms-build" ? "🏗️" : a.id === "geo-tracking" ? "🤖" : "🗂️"}</span>
                        {a.title}
                      </button>
                    ) : null
                  )}
                </div>
              ) : null
            )}
            {query && !ARTICLES.some((a) => filtered(a.id)) && (
              <div className="nav-empty" style={{ display: "block" }}>
                未找到匹配的指南
              </div>
            )}
          </aside>

          {/* 移动端遮罩 */}
          <div className={`wiki-backdrop${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

          {/* 内容区 */}
          <main className="wiki-content" ref={contentRef} onClick={onContentClick}>
            <div className="crumbs">
              <a onClick={() => go("intro")}>首页</a>
              <span className="sep">/</span>
              <span>{GROUPS[current]}</span>
              <span className="sep">/</span>
              <span className="cur">{article.title}</span>
            </div>

            <article className="wiki-article" key={current}>
              <div className="kicker">{article.kicker}</div>
              <h1>{article.title}</h1>
              <p className="lead">{article.lead}</p>

              {article.sections.map((s, si) => (
                <section key={s.id}>
                  <h2 id={s.id}>
                    {s.title}
                    <a
                      className="anchor"
                      href={`#${s.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      #
                    </a>
                  </h2>
                  {s.blocks.map((b, bi) => (
                    <div key={bi}>{renderBlock(b, si, bi)}</div>
                  ))}
                </section>
              ))}

              {/* 上下篇 */}
              <div className="pager">
                {prev ? (
                  <button onClick={() => go(prev.id)}>
                    <div className="dir">← 上一篇</div>
                    <div className="tt">{prev.title}</div>
                  </button>
                ) : (
                  <span />
                )}
                {next ? (
                  <button className="next" onClick={() => go(next.id)}>
                    <div className="dir">下一篇 →</div>
                    <div className="tt">{next.title}</div>
                  </button>
                ) : null}
              </div>

              <div className="wiki-foot">
                <span>© 2026 壶天 SEO/GEO 智能体 · 壶中天地，大有可为</span>
                <span>本文档由壶天 Wiki 模块渲染 · 最后更新 2026-08</span>
              </div>
            </article>
          </main>

          {/* 右侧 TOC */}
          <nav className="wiki-toc">
            <h5>本页目录</h5>
            {article.sections.map((s) => (
              <a
                key={s.id}
                className={activeSection === s.id ? "on" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
