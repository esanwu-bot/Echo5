/**
 * 客户案例 —— 服务端组件。
 * 主案例：天启芯科技 (tikchip.cn) —— 电子元器件 / 半导体 B2B 企业官网。
 * 复用 marketing 通用样式（.wrap / .btn / .kicker / .sec-head / .stats-strip 等），
 * 案例页专用样式以内联 <style> 注入，不污染全局。
 */

const CASES_CSS = `
/* ============ CASES PAGE ============ */
.mkt .case-hero{position:relative;background:var(--mkt-ink);color:#fff;padding:150px 0 90px;overflow:hidden}
.mkt .case-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 80% 70% at 50% 30%,#000 30%,transparent 75%)}
.mkt .case-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(680px 420px at 12% 8%,rgba(99,102,241,.32),transparent 60%),radial-gradient(620px 420px at 92% 18%,rgba(124,58,237,.26),transparent 60%),radial-gradient(560px 380px at 70% 96%,rgba(245,158,11,.16),transparent 60%)}
.mkt .case-hero .wrap{position:relative;z-index:2}
.mkt .case-hero .sec-head{margin:0;text-align:left;max-width:760px}
.mkt .case-hero .kicker{color:var(--mkt-amber2)}
.mkt .case-hero h1{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(32px,4.4vw,54px);line-height:1.1;font-weight:700;letter-spacing:-.01em;margin-top:14px}
.mkt .case-hero h1 .grad{background:linear-gradient(100deg,var(--mkt-amber2),var(--mkt-pink) 55%,var(--mkt-indigo2));-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .case-hero p.lead{margin-top:20px;font-size:17px;color:rgba(255,255,255,.72);max-width:560px;line-height:1.75}
.mkt .case-hero .case-tags{margin-top:26px;display:flex;gap:10px;flex-wrap:wrap}
.mkt .case-hero .case-tags span{font-family:var(--font-mono),monospace;font-size:12px;color:rgba(255,255,255,.8);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding:6px 13px;border-radius:999px}

/* ============ SPOTLIGHT (主案例) ============ */
.mkt .spotlight{padding:80px 0 40px}
.mkt .spotlight .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:54px;align-items:center}
.mkt .spotlight .label{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono),monospace;font-size:11.5px;letter-spacing:.14em;color:var(--mkt-indigo);background:rgba(79,70,229,.08);border:1px solid rgba(79,70,229,.2);padding:6px 12px;border-radius:999px;font-weight:600;text-transform:uppercase}
.mkt .spotlight .label .dot{width:7px;height:7px;border-radius:50%;background:var(--mkt-indigo);box-shadow:0 0 8px var(--mkt-indigo)}
.mkt .spotlight h2{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:clamp(26px,3vw,38px);font-weight:700;letter-spacing:-.01em;margin-top:16px;line-height:1.18}
.mkt .spotlight .sub{margin-top:8px;font-size:15px;color:var(--mkt-dim)}
.mkt .spotlight .desc{margin-top:18px;font-size:15px;color:var(--mkt-dim);line-height:1.8}
.mkt .spotlight .checklist{margin-top:22px;display:flex;flex-direction:column;gap:12px}
.mkt .spotlight .checklist li{display:flex;align-items:flex-start;gap:11px;font-size:14.5px;color:var(--mkt-text);line-height:1.6}
.mkt .spotlight .checklist li svg{width:19px;height:19px;color:var(--mkt-green);flex:0 0 19px;margin-top:2px}
.mkt .spotlight .case-cta{margin-top:28px;display:flex;gap:12px;flex-wrap:wrap}
.mkt .spotlight .case-cta .btn-ghost{background:var(--mkt-white);color:var(--mkt-text);border:1px solid var(--mkt-line2)}
.mkt .spotlight .case-cta .btn-ghost:hover{background:var(--mkt-paper);color:var(--mkt-indigo)}
.mkt .spotlight .case-cta .ext{font-size:13px;color:var(--mkt-faint);font-family:var(--font-mono),monospace;display:inline-flex;align-items:center;gap:6px}

/* ============ BROWSER FRAME (案例截图模拟) ============ */
.mkt .browser{background:linear-gradient(180deg,#1c1a2e,#15131f);border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 40px 90px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.04) inset;overflow:hidden;transform:rotateY(-6deg) rotateX(3deg);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.mkt .browser:hover{transform:rotateY(-2deg) rotateX(1deg)}
.mkt .browser-bar{display:flex;align-items:center;gap:8px;padding:11px 14px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.07)}
.mkt .browser-bar .dots{display:flex;gap:6px}
.mkt .browser-bar .dots i{width:11px;height:11px;border-radius:50%}
.mkt .browser-bar .dots i:nth-child(1){background:#FF5F57}
.mkt .browser-bar .dots i:nth-child(2){background:#FEBC2E}
.mkt .browser-bar .dots i:nth-child(3){background:#28C840}
.mkt .browser-bar .url{flex:1;margin-left:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:5px 12px;font-family:var(--font-mono),monospace;font-size:11.5px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:7px}
.mkt .browser-bar .url .lock{color:var(--mkt-green)}
.mkt .browser-bar .lang{font-family:var(--font-mono),monospace;font-size:10.5px;color:rgba(255,255,255,.45);background:rgba(255,255,255,.06);padding:3px 8px;border-radius:6px}
.mkt .browser-body{background:#0d0c18;color:#fff;min-height:420px;display:flex;flex-direction:column}

/* 模拟 tikchip.cn 页面内容 */
.mkt .tc-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 22px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)}
.mkt .tc-nav .logo{display:flex;align-items:center;gap:9px;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-weight:700;font-size:15px}
.mkt .tc-nav .logo .mk{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(135deg,#3B82F6,#06B6D4);font-size:13px;font-weight:900}
.mkt .tc-nav .links{display:flex;gap:16px}
.mkt .tc-nav .links span{font-size:11.5px;color:rgba(255,255,255,.6)}
.mkt .tc-nav .links span.on{color:#60A5FA}
.mkt .tc-hero{padding:26px 22px 22px;position:relative;overflow:hidden}
.mkt .tc-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(420px 200px at 80% 10%,rgba(59,130,246,.22),transparent 70%)}
.mkt .tc-hero .t{position:relative;z-index:1;font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:20px;font-weight:700}
.mkt .tc-hero .t em{font-style:normal;background:linear-gradient(100deg,#60A5FA,#06B6D4);-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .tc-hero .s{position:relative;z-index:1;margin-top:8px;font-size:12px;color:rgba(255,255,255,.55);line-height:1.6;max-width:340px}
.mkt .tc-hero .pills{position:relative;z-index:1;margin-top:14px;display:flex;gap:8px;flex-wrap:wrap}
.mkt .tc-hero .pills span{font-size:10px;font-family:var(--font-mono),monospace;color:#60A5FA;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.28);padding:4px 9px;border-radius:6px}
.mkt .tc-grid{padding:0 22px 22px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;position:relative;z-index:1}
.mkt .tc-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px}
.mkt .tc-card .mh{height:8px;width:50%;border-radius:4px;background:linear-gradient(90deg,rgba(96,165,250,.6),rgba(6,182,212,.6));margin-bottom:9px}
.mkt .tc-card .mb{height:8px;width:85%;border-radius:4px;background:rgba(255,255,255,.12);margin-bottom:6px}
.mkt .tc-card .mb2{height:8px;width:65%;border-radius:4px;background:rgba(255,255,255,.08)}
.mkt .tc-card .code{margin-top:9px;font-family:var(--font-mono),monospace;font-size:10px;color:#60A5FA}
.mkt .tc-foot{margin-top:auto;padding:14px 22px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;font-size:10.5px;color:rgba(255,255,255,.4)}
.mkt .tc-foot .stats{display:flex;gap:18px}
.mkt .tc-foot .stats b{color:rgba(255,255,255,.8);font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-weight:700}

/* ============ CASE STATS ============ */
.mkt .case-stats{padding:50px 0}
.mkt .case-stats .strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--mkt-line);border:1px solid var(--mkt-line);border-radius:16px;overflow:hidden}
.mkt .case-stats .cell{background:var(--mkt-white);padding:30px 22px;text-align:center}
.mkt .case-stats .cell b{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:36px;font-weight:700;display:block;background:linear-gradient(120deg,var(--mkt-indigo),var(--mkt-violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.mkt .case-stats .cell span{font-size:13px;color:var(--mkt-dim);margin-top:5px;display:block}
.mkt .case-stats .cell .delta{display:inline-block;margin-top:6px;font-family:var(--font-mono),monospace;font-size:11px;color:var(--mkt-green);background:rgba(16,185,129,.1);padding:2px 7px;border-radius:5px}

/* ============ SOLUTION GRID ============ */
.mkt .sol-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mkt .sol{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:var(--mkt-r);padding:28px 24px;transition:transform .3s,box-shadow .3s,border-color .3s;position:relative;overflow:hidden}
.mkt .sol::after{content:"";position:absolute;inset:0;background:radial-gradient(420px 200px at 50% -20%,rgba(59,130,246,.07),transparent 70%);opacity:0;transition:opacity .3s}
.mkt .sol:hover{transform:translateY(-6px);box-shadow:var(--mkt-shadow-md);border-color:transparent}
.mkt .sol:hover::after{opacity:1}
.mkt .sol .ic{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;margin-bottom:16px;background:linear-gradient(135deg,#3B82F6,#06B6D4);position:relative;z-index:1}
.mkt .sol .ic svg{width:22px;height:22px;color:#fff}
.mkt .sol h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:600;position:relative;z-index:1}
.mkt .sol p{margin-top:9px;font-size:13.5px;color:var(--mkt-dim);line-height:1.7;position:relative;z-index:1}
.mkt .sol .tag{display:inline-block;margin-top:14px;font-family:var(--font-mono),monospace;font-size:11px;color:#3B82F6;background:rgba(59,130,246,.08);padding:3px 9px;border-radius:6px;position:relative;z-index:1}

/* ============ OTHER CASES ============ */
.mkt .more-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mkt .more-card{background:var(--mkt-white);border:1px solid var(--mkt-line);border-radius:var(--mkt-r);padding:28px 24px;transition:transform .3s,box-shadow .3s;position:relative}
.mkt .more-card:hover{transform:translateY(-5px);box-shadow:var(--mkt-shadow-md)}
.mkt .more-card .soon{position:absolute;top:18px;right:18px;font-family:var(--font-mono),monospace;font-size:10.5px;color:var(--mkt-faint);background:var(--mkt-paper);border:1px solid var(--mkt-line);padding:3px 9px;border-radius:6px}
.mkt .more-card .ind{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.12em;color:var(--mkt-indigo);text-transform:uppercase;font-weight:600}
.mkt .more-card h3{font-family:var(--font-disp),'Noto Sans SC',sans-serif;font-size:18px;font-weight:600;margin-top:10px}
.mkt .more-card p{margin-top:8px;font-size:13.5px;color:var(--mkt-dim);line-height:1.65}

/* ============ RESPONSIVE ============ */
@media (max-width:1024px){
  .mkt .spotlight .wrap{grid-template-columns:1fr;gap:40px}
  .mkt .sol-grid{grid-template-columns:repeat(2,1fr)}
  .mkt .more-grid{grid-template-columns:repeat(2,1fr)}
  .mkt .case-stats .strip{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:760px){
  .mkt .case-hero{padding:120px 0 70px}
  .mkt .case-hero .sec-head{text-align:center;margin:0 auto}
  .mkt .case-hero .case-tags{justify-content:center}
  .mkt .sol-grid,.more-grid{grid-template-columns:1fr}
  .mkt .case-stats .strip{grid-template-columns:1fr}
  .mkt .browser{transform:none}
  .mkt .tc-grid{grid-template-columns:1fr 1fr}
}
@media (prefers-reduced-motion: reduce){
  .mkt .browser{transform:none}
}
`;

const SOLUTIONS = [
  {
    icon: "i-search",
    title: "SEO 原生结构",
    desc: "产品分类页内置 Product / Breadcrumb Schema，二极管、三极管系列页天然适配搜索引擎富媒体结果。",
    tag: "schema.org",
  },
  {
    icon: "i-robot",
    title: "GEO 实体优化",
    desc: "为天启芯品牌、产品线、应用领域建立实体关联，让 DeepSeek、GPT、Kimi 在选型问答中主动引用。",
    tag: "AI-ready",
  },
  {
    icon: "i-devices",
    title: "中英双语响应式",
    desc: "一套结构覆盖中英双语与全端设备，工程师在手机上选型、查规格同样流畅。",
    tag: "i18n",
  },
  {
    icon: "i-zap",
    title: "静态优先 + 边缘分发",
    desc: "全球 50+ 国家访问首屏毫秒级，Lighthouse 性能评分稳定 95+，海外客户体验无落差。",
    tag: "edge cdn",
  },
  {
    icon: "i-spark",
    title: "AI 内容生成",
    desc: "用自然语言描述产品参数，AI 自动撰写规格说明与应用场景文案，专业性与可读性兼得。",
    tag: "no-code",
  },
  {
    icon: "i-rocket",
    title: "一键部署 + 收录提交",
    desc: "绑定域名、HTTPS、IndexNow 收录全自动，新上线产品页几小时内即被搜索引擎发现。",
    tag: "auto-deploy",
  },
] as const;

const OTHER_CASES = [
  {
    ind: "SaaS · 工具",
    title: "开发者工具平台",
    desc: "面向开发者的 API 文档站与控制台，结构化数据驱动技术内容搜索可见度。",
  },
  {
    ind: "跨境 · 电商",
    title: "DTC 品牌独立站",
    desc: "Product Schema + 多语言 GEO 优化，让海外 AI 助手推荐品牌商品。",
  },
  {
    ind: "教育 · 培训",
    title: "在线教育官网",
    desc: "课程页 Course Schema 标记，移动端报名转化率显著提升。",
  },
] as const;

export default function Cases() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CASES_CSS }} />

      {/* Hero */}
      <section className="case-hero" id="top">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">CUSTOMER STORIES</span>
            <h1>
              看真实企业如何用<span className="grad">壶天</span>把网站变成增长引擎
            </h1>
            <p className="lead">
              从电子元器件到跨境电商，壶天 AI 建站帮助各行业客户在传统 SEO 与生成式搜索（GEO）双赛道同时领跑。
            </p>
            <div className="case-tags">
              <span>B2B 制造</span>
              <span>电子元器件</span>
              <span>中英双语</span>
              <span>全球分发</span>
            </div>
          </div>
        </div>
      </section>

      {/* Spotlight: 天启芯科技 */}
      <section className="sec spotlight">
        <div className="wrap">
          <div className="reveal">
            <span className="label">
              <i className="dot" />
              精选案例 · FEATURED
            </span>
            <h2>天启芯科技：让全球客户「搜得到、问得到」的元器件官网</h2>
            <p className="sub">tikchip.cn · 电子元器件 / 半导体 B2B 企业官网</p>
            <p className="desc">
              天启芯科技是一家专注于全球电子元件供应与贸易的企业，产品覆盖普通整流二极管、快恢复整流管、稳压二极管、三极管等全系列，服务新能源、智慧城市、物联网与工业控制四大应用领域。面对 SKU 庞大、专业性强、客户遍布全球的挑战，天启芯选择壶天 AI 建站，用一次对话生成兼顾专业表达与搜索可见性的中英双语官网。
            </p>
            <ul className="checklist">
              <li>
                <svg>
                  <use href="#i-check" />
                </svg>
                自然语言生成多语言站点结构，中英双语同步上线，覆盖 50+ 国家客户
              </li>
              <li>
                <svg>
                  <use href="#i-check" />
                </svg>
                产品系列页内置 Product Schema，二极管 / 三极管规格页适配富媒体结果
              </li>
              <li>
                <svg>
                  <use href="#i-check" />
                </svg>
                面向 DeepSeek、GPT、Kimi 优化实体与引用结构，AI 选型问答中主动提及品牌
              </li>
              <li>
                <svg>
                  <use href="#i-check" />
                </svg>
                静态优先 + 边缘分发，海外客户首屏毫秒级，移动端选型体验流畅
              </li>
            </ul>
            <div className="case-cta">
              <a href="https://tikchip.cn/zh" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                访问官网
                <svg>
                  <use href="#i-arrow" />
                </svg>
              </a>
              <a href="#cta" className="btn btn-ghost">
                我也要建这样的站
              </a>
              <span className="ext">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
                </svg>
                tikchip.cn/zh
              </span>
            </div>
          </div>

          {/* 浏览器框架模拟 tikchip.cn 截图 */}
          <div className="browser reveal">
            <div className="browser-bar">
              <div className="dots">
                <i />
                <i />
                <i />
              </div>
              <div className="url">
                <span className="lock">
                  <svg width="12" height="12">
                    <use href="#i-lock" />
                  </svg>
                </span>
                tikchip.cn/zh
              </div>
              <span className="lang">中 / EN</span>
            </div>
            <div className="browser-body">
              <div className="tc-nav">
                <div className="logo">
                  <span className="mk">天</span>
                  天启芯科技
                </div>
                <div className="links">
                  <span className="on">首页</span>
                  <span>产品</span>
                  <span>应用</span>
                  <span>关于</span>
                </div>
              </div>
              <div className="tc-hero">
                <div className="t">
                  专业电子元器件采购平台 · <em>引领芯片创新</em>
                </div>
                <div className="s">
                  GPP 芯片工艺 + SMD 封装技术，为新能源、智慧城市、物联网与工业控制提供高性价比二极管 / 三极管方案。
                </div>
                <div className="pills">
                  <span>Over-Voltage</span>
                  <span>Over-Temperature</span>
                  <span>Short-Circuit</span>
                  <span>Overload</span>
                </div>
              </div>
              <div className="tc-grid">
                <div className="tc-card">
                  <div className="mh" />
                  <div className="mb" />
                  <div className="mb2" />
                  <div className="code">SKRI1012-504</div>
                </div>
                <div className="tc-card">
                  <div className="mh" />
                  <div className="mb" />
                  <div className="mb2" />
                  <div className="code">SKRI1012-104</div>
                </div>
                <div className="tc-card">
                  <div className="mh" />
                  <div className="mb" />
                  <div className="mb2" />
                  <div className="code">SKRI1012-302</div>
                </div>
              </div>
              <div className="tc-foot">
                <div className="stats">
                  <span>
                    <b>50+</b> 国家
                  </span>
                  <span>
                    <b>200+</b> 合作伙伴
                  </span>
                  <span>
                    <b>98%</b> 满意度
                  </span>
                </div>
                <span>Product Schema ✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 成果指标 */}
      <section className="case-stats">
        <div className="wrap">
          <div className="strip reveal">
            <div className="cell">
              <b>1.2s</b>
              <span>首屏加载（全球）</span>
              <span className="delta">Lighthouse 95+</span>
            </div>
            <div className="cell">
              <b>100</b>
              <span>Lighthouse SEO 评分</span>
              <span className="delta">满分</span>
            </div>
            <div className="cell">
              <b>2x</b>
              <span>收录页面数增长</span>
              <span className="delta">vs 上线前</span>
            </div>
            <div className="cell">
              <b>50+</b>
              <span>国家访问覆盖</span>
              <span className="delta">中英双语</span>
            </div>
          </div>
        </div>
      </section>

      {/* 解决方案细节 */}
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">SOLUTION</span>
            <h2>壶天为天启芯做了什么</h2>
            <p>从内容生成到搜索优化，六项能力共同支撑一个能被「搜到 + 问到」的元器件官网。</p>
          </div>
          <div className="sol-grid">
            {SOLUTIONS.map((s) => (
              <div className="sol reveal" key={s.title}>
                <div className="ic">
                  <svg>
                    <use href={`#${s.icon}`} />
                  </svg>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="tag">{s.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 其他案例 */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="kicker">MORE STORIES</span>
            <h2>更多行业案例筹备中</h2>
            <p>以下方向正在对接客户，上线后将持续更新。</p>
          </div>
          <div className="more-grid">
            {OTHER_CASES.map((c) => (
              <div className="more-card reveal" key={c.title}>
                <span className="soon">即将上线</span>
                <span className="ind">{c.ind}</span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
