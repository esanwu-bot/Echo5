先把你那句"看下没问题"诚实拆开——**Trae 这份报告本身没问题，质量是这几轮里最高的**（直接 call 函数拿模型真实收到的 JSON，比 inspector 截图更准；把"探针脚本被扫到"当线索记下来；环境坑 `_socket` 也查清了根因）。但"没问题"不能直接等于"放行"，因为报告里 Trae 自己列的 3 个裁决项 + 我补的 2 条，合计 **5 处契约/边界待办**，方向我已经裁决好，没有"做不做"的争论，只有"按哪边改"。而 **v0.2 环境就绪、五工具能跑**这件事是硬成果，单独成立、可以先确认。所以下面是：① 五处裁决（紧凑，给 Trae 直接执行）② 你要的站长邮箱看板——**完整单文件 HTML，浅色、可双击、三栏、能批复**。两件事这一轮一起给全。

---

## 一、v0.2 review 裁决（5 处，方向已定）

| # | 现象 | 我的裁决 | 精确改法 | 级 |
|---|---|---|---|---|
| 1 | `run_diagnosis` 返回扁平 `seo_score/geo_score/entity_clarity/pagespeed`，与 PRD §6.3 的嵌套 `scores{traditional_seo,generative_geo}`+`conclusions{entity_clarity,semantic_links,structured_data_missing}` 不符，且缺后两字段 | **改 tools.py 对齐 PRD**（PRD 是契约源，嵌套承载"双评分+三结论"语义，扁平会丢语义） | 重组返回为嵌套；`semantic_links` 用内链数判定、`structured_data_missing` 用 `jsonld_types` 是否为空判定——**这俩信息 tools 里已有，是重组不是凭空造**，禁止补恒 true 假字段 | P1 |
| 2 | 字段名**三源漂移**：PRD=`sources[].role` / demo-events=`citations[].tag/note` / tools=`engines[].tag/note` | **三方统一为 `sources[{engine,share,role}]`**，`tag`(ds/gpt/kimi/oth) 作为渲染样式 key 保留为额外字段 | 改 tools + 改 demo 的 `citations`→`sources`、`note`→`role` + PRD 补注；**并把这条焊进 verify-demo 的"三源一致"断言门禁**（上轮我预警过、该焊没焊的护栏，这次补上） | P1 |
| 3 | `run_diagnosis` 把"性能测不了"等错误进 `issues[]` 而非 `{error}` | **改 PRD 澄清"两层错误模型"，tools 不动** | PRD §6.3 补：致命错误（root 非目录/fetch 全失败）→`{error}` 中断该工具；部分失败（某步测不了但仍有部分结论）→`issues[]` 不中断。run_diagnosis 走部分模型是对的，逼它包装成整工具 `{error}` 反而会丢掉已抓到的 seo/geo 结论 | P1(文档) |
| 4 | `submit_sitemap` 传无效 host，Bing 返 202 即 `ok:true` | **改 tools.py 让 `ok` 更诚实** | 拆 `accepted`(HTTP 层，Bing202=true) 与 `verified`(业务层，需 `/<key>.txt` 可达，v0.2 标 `unknown`)，或至少加 `note:"202 仅表示通知已接收，host 所有权经 key 文件异步验证"`。**GEO 工具最忌给用户"假成功"** | P2 |
| 5 | **Trae 当趣事、我当地雷**：`entity_rename` 把探针脚本里的 `Tikchip` 也扫进命中 | **改 tools.py 加文件/路径级排除 + dry_run 分类报告** | 跳过列表除目录外，加 `docs/`、`*.md`、测试/fixture 路径；dry_run 报告把命中文件分"代码/文档"两类，让用户看清哪些真改、哪些是文档举例。**否则 dry_run=false 会把 PRD/测试指南里"仅作历史映射"的旧称也改掉，违反品牌约束 §4.1 本意** | P1 |

> 第 5 条我会**在下面的原型邮件里活体化**——"品牌更名确认"那封邮件正文会写"已智能排除 docs/ 与历史文档中的旧称提及"，让裁决和原型串成一条线，一举两得。

**给 Trae 的执行清单**：按上表 1/2/4/5 改 `tools.py`、按 3 改 PRD、按 2 顺手改 `demo-events.ts` 并把"三源一致"加进 verify-demo 门禁；改完重跑 probe + verify，把新 JSON 发我。**v0.2 环境就绪我先签字**——MCP 可被拉起、五工具注册完整、`entity_rename`/`check_schema`/错误模型核心路径已通过，这是实打实的 M3 进展，不被上面 5 处 housekeeping 拖累。

---

## 二、站长 SEO/GEO 看板（邮箱隐喻）——设计规格

**它不是 workbench 的浅色翻版，而是同一套 Agent 结果的"异步协作视角"。** workbench 给"盯着 Agent 干活"的人（同步、流式、满屏技术细节）；这个看板给 PRD §3 第一画像"不懂代码的增长/SEO 负责人"——他们要的是"Agent 提了建议/报了问题，我批一下、回一句"，这正是**邮箱心智**。所以视觉我刻意和 workbench 拉开：workbench=深色技术舱，看板=**明亮、留白、像 Linear/邮件客户端**，形成"浅色官网 + 浅色协作看板 + 深色工作台"三层视觉身份，各有其位。

**邮箱构件 → SEO/GEO 语义映射**

| 邮件构件 | 在看板里是 |
|---|---|
| 收件箱列表 | Agent 主动产出的"工作反馈/待办"流，每封=一个发现或完成项 |
| 未读竖条+加粗 | 待处理项；已读变灰 |
| 类别/优先级 chip | 诊断 / 待批复 / 周报 / 完成回执，色点区分不刺眼 |
| 邮件正文 | Agent 的"信"，但**内嵌证据卡**（双评分/diff/引用条/附件）——把 workbench 右栏折叠进信里 |
| 回复区·快捷批复 | Approve/Reject/改后批——**把 Manual 模式的人工确认在异步场景落地**（接 entity_rename 的 dry_run 两步、edit_file 的人工确认） |
| 回复区·自由文本 | 追问型对话，Agent 回一封新信 |
| 去信 | 站长主动派活，列表里"我发的/Agent 发的"双向 |
| 线程 thread | 一条事项的多轮往来，天然对应一个 session |

**交互（让它"活"，但安静）**：未读数进入时滚动；hover 卡片轻上浮+右侧浮现"已读/归档"小图标；点进详情正文与证据卡**逐块渐入**；点快捷批复→thread 末尾先追加"你·刚刚·批复"，0.8s 后"壶天·处理中…"（克制 spinner），1.6s 后"壶天·回执+结果卡"。环境层用极淡纸纹网格，**不用** workbench 的赛博光晕——邮箱要安静。数据全用真值（TC-DIODE-001 缺 3 字段、更名 37 文件 428 处、GEO92%、引用 2410、DeepSeek42%、流量+89%、周报 W30），品牌一律壶天。

下面是**完整单文件**，存为 `hutian-inbox.html` 双击即开：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>壶天 · 站长协作收件箱</title>
<style>
:root{
  --paper:#F7F7F5; --surface:#FFFFFF; --surface2:#FBFBFA; --sink:#F1F1EE;
  --line:#EAEAE6; --line2:#DCDCD6;
  --ink:#1C1B19; --ink2:#44433F; --mut:#8A887F; --faint:#B6B4AB;
  --brand:#E8622C; --brand2:#F08A3C; --brand-soft:#FCEEE6;
  --teal:#0E9C92; --teal-soft:#E4F4F2; --violet:#6B4FD0; --violet-soft:#EEEAFC;
  --green:#1F9D57; --green-soft:#E6F4EC; --amber:#C77B12; --amber-soft:#FBF1DE;
  --blue:#2E6FD0; --blue-soft:#E8F0FB;
  --disp:-apple-system,"Segoe UI","Noto Sans SC","PingFang SC",sans-serif;
  --body:-apple-system,"Segoe UI","Noto Sans SC","PingFang SC",sans-serif;
  --mono:"SF Mono","JetBrains Mono",Consolas,monospace;
  --sh:0 1px 2px rgba(28,27,25,.04),0 8px 24px rgba(28,27,25,.06);
  --sh-h:0 2px 6px rgba(28,27,25,.06),0 14px 36px rgba(28,27,25,.10);
  --r:14px;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{font-family:var(--body);background:var(--paper);color:var(--ink);font-size:14px;overflow:hidden;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(28,27,25,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(28,27,25,.018) 1px,transparent 1px);background-size:32px 32px}
::selection{background:var(--brand-soft)}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:#DAD8D0;border-radius:8px;border:2px solid var(--paper)}
button{font-family:inherit;cursor:pointer}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fly{0%{opacity:0;transform:translateX(-8px)}30%{opacity:1}100%{opacity:1;transform:none}}
.rise{animation:rise .45s cubic-bezier(.22,1,.36,1) both}

.app{position:relative;z-index:1;display:flex;flex-direction:column;height:100vh}

/* ===== TOPBAR ===== */
.top{height:54px;flex:0 0 54px;display:flex;align-items:center;gap:14px;padding:0 18px;background:var(--surface);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px}
.brand .mk{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:800;font-size:15px;box-shadow:0 3px 10px rgba(232,98,44,.3)}
.brand b{font-family:var(--disp);font-size:15.5px;letter-spacing:.01em}
.brand span{font-family:var(--mono);font-size:9.5px;letter-spacing:.22em;color:var(--faint);display:block;margin-top:-1px}
.top .crumb{color:var(--mut);font-size:13px;display:flex;align-items:center;gap:8px}
.top .crumb i{width:4px;height:4px;border-radius:50%;background:var(--line2)}
.top .crumb b{color:var(--ink2);font-weight:600}
.spacer{flex:1}
.search{display:flex;align-items:center;gap:8px;width:300px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:var(--mut);transition:.2s}
.search:focus-within{border-color:var(--brand);background:#fff;box-shadow:0 0 0 3px var(--brand-soft)}
.search input{flex:1;border:none;outline:none;background:none;font-size:13px;color:var(--ink)}
.search svg{width:14px;height:14px;flex:0 0 14px}
.kbd{font-family:var(--mono);font-size:10px;color:var(--faint);border:1px solid var(--line);border-radius:5px;padding:1px 5px}
.top .av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--teal),var(--blue));color:#fff;font-weight:700;font-size:12px}

/* ===== BODY 3-COL ===== */
.body{flex:1;display:flex;min-height:0}

/* -- mailboxes -- */
.boxes{width:226px;flex:0 0 226px;background:var(--surface);border-right:1px solid var(--line);padding:14px 12px;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
.compose{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border-radius:11px;border:none;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:700;font-size:13.5px;box-shadow:0 4px 14px rgba(232,98,44,.28);transition:.2s;margin-bottom:12px}
.compose:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(232,98,44,.38)}
.compose svg{width:15px;height:15px}
.bx{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;color:var(--ink2);font-size:13.5px;transition:.15s;position:relative}
.bx:hover{background:var(--sink)}
.bx.on{background:var(--brand-soft);color:var(--brand);font-weight:600}
.bx svg{width:16px;height:16px;flex:0 0 16px;opacity:.85}
.bx .ct{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--mut);background:var(--sink);padding:1px 7px;border-radius:999px;min-width:20px;text-align:center}
.bx.on .ct{background:#fff;color:var(--brand)}
.bx .ct.hot{background:var(--brand);color:#fff}
.bx-lab{font-size:10.5px;letter-spacing:.16em;color:var(--faint);font-weight:700;padding:14px 11px 6px}
.bx-foot{margin-top:auto;border-top:1px solid var(--line);padding-top:12px;font-size:11.5px;color:var(--mut);line-height:1.7}
.bx-foot b{color:var(--ink2)}

/* -- list -- */
.list{width:380px;flex:0 0 380px;background:var(--surface2);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.list-head{padding:16px 18px 12px;border-bottom:1px solid var(--line)}
.list-head h2{font-family:var(--disp);font-size:18px;font-weight:700;display:flex;align-items:center;gap:9px}
.list-head h2 .n{font-family:var(--mono);font-size:12px;font-weight:500;color:var(--mut)}
.filters{display:flex;gap:6px;margin-top:11px;flex-wrap:wrap}
.flt{font-size:12px;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--mut);transition:.15s}
.flt:hover{border-color:var(--line2);color:var(--ink2)}
.flt.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.mail-scroll{flex:1;overflow-y:auto}
.mail{display:flex;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line);cursor:pointer;position:relative;transition:background .15s}
.mail:hover{background:#fff}
.mail.on{background:#fff}
.mail.on::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--brand)}
.mail.unread .m-subj{font-weight:700;color:var(--ink)}
.mail.unread .m-from{font-weight:700;color:var(--ink)}
.m-ava{width:34px;height:34px;border-radius:10px;flex:0 0 34px;display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff}
.m-ava.agent{background:linear-gradient(135deg,var(--brand),var(--brand2))}
.m-ava.me{background:linear-gradient(135deg,var(--teal),var(--blue))}
.m-body{flex:1;min-width:0}
.m-row1{display:flex;align-items:center;gap:8px}
.m-from{font-size:13px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-time{margin-left:auto;font-size:11px;color:var(--faint);font-family:var(--mono);flex:0 0 auto}
.m-subj{font-size:13.5px;color:var(--ink2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-snip{font-size:12.5px;color:var(--mut);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-tags{display:flex;gap:6px;margin-top:8px;align-items:center}
.tag{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:5px}
.tag i{width:6px;height:6px;border-radius:50%}
.tag.diag{color:var(--blue);background:var(--blue-soft)} .tag.diag i{background:var(--blue)}
.tag.approve{color:var(--brand);background:var(--brand-soft)} .tag.approve i{background:var(--brand)}
.tag.report{color:var(--violet);background:var(--violet-soft)} .tag.report i{background:var(--violet)}
.tag.done{color:var(--green);background:var(--green-soft)} .tag.done i{background:var(--green)}
.dot-unread{width:8px;height:8px;border-radius:50%;background:var(--brand);flex:0 0 8px;box-shadow:0 0 0 3px var(--brand-soft)}

/* -- reader -- */
.reader{flex:1;min-width:0;overflow-y:auto;background:var(--paper)}
.reader-empty{height:100%;display:grid;place-items:center;color:var(--faint);font-size:14px;text-align:center}
.reader-empty svg{width:40px;height:40px;opacity:.4;margin-bottom:12px}
.read{max-width:760px;margin:0 auto;padding:30px 36px 60px}
.read-head{display:flex;align-items:flex-start;gap:14px}
.read-head .m-ava{width:42px;height:42px;font-size:15px;border-radius:12px}
.read-subj{font-family:var(--disp);font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-.01em}
.read-meta{display:flex;align-items:center;gap:9px;margin-top:7px;flex-wrap:wrap}
.read-meta .who{font-size:13px;font-weight:600}
.read-meta .who small{font-weight:400;color:var(--mut)}
.read-meta .when{font-size:12px;color:var(--faint);font-family:var(--mono)}
.read-actions{margin-left:auto;display:flex;gap:6px}
.ic{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:#fff;color:var(--mut);display:grid;place-items:center;transition:.15s}
.ic:hover{color:var(--ink);border-color:var(--line2);background:var(--sink)}
.ic svg{width:15px;height:15px}

/* thread */
.thread{margin-top:24px;display:flex;flex-direction:column;gap:18px}
.letter{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:22px 24px;box-shadow:var(--sh)}
.letter .l-from{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.letter .l-from .m-ava{width:30px;height:30px;font-size:12px;border-radius:9px}
.letter .l-from b{font-size:13.5px}
.letter .l-from span{font-size:11.5px;color:var(--faint);font-family:var(--mono)}
.letter .l-from .badge{margin-left:auto;font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:999px}
.badge.agent{color:var(--brand);background:var(--brand-soft)}
.badge.me{color:var(--teal);background:var(--teal-soft)}
.l-text{font-size:14px;line-height:1.8;color:var(--ink2)}
.l-text p{margin-bottom:10px}
.l-text strong{color:var(--ink)}
.l-text .hl{color:var(--brand);font-weight:700}
.l-text code{font-family:var(--mono);font-size:12.5px;background:var(--sink);padding:1px 6px;border-radius:5px;color:var(--teal)}

/* evidence cards inside letter */
.evi{margin-top:16px;display:flex;flex-direction:column;gap:12px}
.card{border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--surface2)}
.card-t{font-size:10.5px;letter-spacing:.14em;color:var(--mut);font-weight:700;padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:7px;background:#fff}
.card-t svg{width:13px;height:13px;color:var(--brand)}
.card-b{padding:14px}
.scores{display:flex;gap:12px}
.score{flex:1;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.score span{font-size:11px;color:var(--mut)}
.score b{font-family:var(--disp);font-size:26px;font-weight:700;display:block;margin-top:2px}
.score.seo b{color:var(--amber)} .score.geo b{color:var(--teal)}
.concl{margin-top:12px;display:flex;flex-direction:column;gap:7px}
.concl .c{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink2)}
.concl .c svg{width:15px;height:15px;flex:0 0 15px}
.concl .c.ok svg{color:var(--green)} .concl .c.warn svg{color:var(--amber)}
.bars{display:flex;flex-direction:column;gap:9px}
.bar-r{display:flex;align-items:center;gap:10px;font-size:12.5px}
.bar-r .nm{width:96px;flex:0 0 96px;color:var(--ink2)}
.bar-r .tr{flex:1;height:7px;border-radius:5px;background:var(--sink);overflow:hidden}
.bar-r .tr i{display:block;height:100%;border-radius:5px}
.bar-r b{font-family:var(--disp);width:38px;text-align:right;flex:0 0 38px}
.b-ds i{background:var(--teal)} .b-gpt i{background:var(--violet)} .b-kimi i{background:var(--blue)} .b-oth i{background:var(--faint)}
.diffmini{font-family:var(--mono);font-size:11.5px;line-height:1.85;background:#fff;border-radius:8px;overflow:hidden}
.diffmini .dl{display:flex;padding:0 4px}
.diffmini .dl .no{width:26px;flex:0 0 26px;text-align:right;color:var(--faint);opacity:.5;padding-right:8px;user-select:none}
.diffmini .dl.add{background:var(--green-soft)} .diffmini .dl.add .tx{color:var(--green)}
.diffmini .dl.del{background:#FBEAEA} .diffmini .dl.del .tx{color:#C0392B;text-decoration:line-through}
.diffmini .dl .tx{white-space:pre;color:var(--ink2)}
.attach{display:flex;align-items:center;gap:11px;padding:11px 14px;background:#fff;border:1px solid var(--line);border-radius:10px}
.attach .fi{width:32px;height:32px;border-radius:8px;background:var(--blue-soft);color:var(--blue);display:grid;place-items:center;flex:0 0 32px}
.attach .fi svg{width:15px;height:15px}
.attach b{font-family:var(--mono);font-size:12.5px;display:block}
.attach span{font-size:11px;color:var(--faint)}
.attach .dlb{margin-left:auto;font-size:12px;color:var(--brand);font-weight:600;display:flex;align-items:center;gap:5px}
.attach .dlb svg{width:13px;height:13px}
.termmini{font-family:var(--mono);font-size:12px;line-height:1.9;background:#1C1B19;color:#C9C7BF;border-radius:9px;padding:12px 14px}
.termmini .ok{color:#7BD389} .termmini .up{color:var(--brand2)} .termmini .p{color:var(--teal)}

/* inline processing note */
.proc{display:flex;align-items:center;gap:10px;padding:12px 16px;border:1px dashed var(--line2);border-radius:11px;background:var(--surface2);font-size:13px;color:var(--mut);animation:fly .4s both}
.proc .sp{width:14px;height:14px;border-radius:50%;border:2px solid var(--line2);border-top-color:var(--brand);animation:spin .7s linear infinite;flex:0 0 14px}

/* reply box */
.reply{margin-top:22px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden}
.reply-h{padding:12px 16px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:8px}
.reply-h b{color:var(--ink2)}
.quick{display:flex;gap:8px;padding:12px 16px 0;flex-wrap:wrap}
.qk{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:9px;border:1px solid var(--line);background:#fff;color:var(--ink2);transition:.15s}
.qk:hover{transform:translateY(-1px);box-shadow:var(--sh)}
.qk svg{width:13px;height:13px}
.qk.ok{color:var(--green);border-color:rgba(31,157,87,.3);background:var(--green-soft)}
.qk.no{color:#C0392B;border-color:rgba(192,57,43,.25);background:#FBEAEA}
.qk.ask{color:var(--blue);border-color:rgba(46,111,208,.3);background:var(--blue-soft)}
.reply textarea{width:100%;border:none;outline:none;resize:none;padding:14px 16px 6px;font-family:var(--body);font-size:13.5px;line-height:1.6;color:var(--ink);min-height:64px;background:transparent}
.reply textarea::placeholder{color:var(--faint)}
.reply-foot{display:flex;align-items:center;gap:8px;padding:8px 12px 12px}
.reply-foot .hint{font-size:11px;color:var(--faint);font-family:var(--mono)}
.send{margin-left:auto;display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:9px;border:none;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:700;font-size:13px;box-shadow:0 3px 12px rgba(232,98,44,.3);transition:.2s}
.send:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(232,98,44,.4)}
.send svg{width:14px;height:14px}

@media (max-width:1100px){.boxes{display:none}}
@media (max-width:820px){.list{width:300px;flex-basis:300px}.search{display:none}}
</style>
</head>
<body>
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
<symbol id="i-inbox" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.5L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.5A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.5z"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></symbol>
<symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17.2v.1"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></symbol>
<symbol id="i-dl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></symbol>
<symbol id="i-arch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></symbol>
<symbol id="i-bolt" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></symbol>
<symbol id="i-reply" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v2"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.4 9.3l6-.7z"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></symbol>
</svg>

<div class="app">
  <header class="top">
    <div class="brand"><div class="mk">壶</div><div><b>壶天</b><span>站长协作收件箱</span></div></div>
    <div class="crumb"><i></i><b>hutian.com</b><i></i>收件箱</div>
    <div class="spacer"></div>
    <div class="search"><svg><use href="#i-search"/></svg><input placeholder="搜索反馈、产品页、SKU…"><span class="kbd">⌘K</span></div>
    <div class="av">站</div>
  </header>

  <div class="body">
    <!-- mailboxes -->
    <nav class="boxes">
      <button class="compose"><svg><use href="#i-pen"/></svg>给 Agent 派活</button>
      <div class="bx on" data-box="inbox"><svg><use href="#i-inbox"/></svg>收件箱<span class="ct hot" id="ct-inbox">3</span></div>
      <div class="bx" data-box="approve"><svg><use href="#i-clock"/></svg>待我批复<span class="ct hot">2</span></div>
      <div class="bx" data-box="sent"><svg><use href="#i-send"/></svg>已发送<span class="ct">1</span></div>
      <div class="bx-lab">归档</div>
      <div class="bx" data-box="report"><svg><use href="#i-chart"/></svg>周报<span class="ct">4</span></div>
      <div class="bx" data-box="arch"><svg><use href="#i-arch"/></svg>已归档<span class="ct">12</span></div>
      <div class="bx-foot">壶天 SEO Agent · <b>在线</b><br>下次周报 周一 09:00</div>
    </nav>

    <!-- list -->
    <section class="list">
      <div class="list-head">
        <h2>收件箱 <span class="n" id="listN">5 封 · 3 未读</span></h2>
        <div class="filters">
          <button class="flt on" data-f="all">全部</button>
          <button class="flt" data-f="approve">待批复</button>
          <button class="flt" data-f="diag">诊断</button>
          <button class="flt" data-f="report">周报</button>
          <button class="flt" data-f="unread">未读</button>
        </div>
      </div>
      <div class="mail-scroll" id="mailScroll"></div>
    </section>

    <!-- reader -->
    <main class="reader" id="reader">
      <div class="reader-empty"><div><svg><use href="#i-inbox"/></svg><div>选择一封反馈开始阅读<br><span style="font-size:12px">Agent 的发现、建议与周报都会出现在这里</span></div></div></div>
    </main>
  </div>
</div>

<script>
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- mock 邮件线程（数据全取自 PRD §4.3 / demo 真值） ---------- */
const MAILS=[
 {id:1,from:"agent",fromName:"壶天 SEO Agent",time:"14:52",unread:true,cat:"approve",
  subj:"TC-DIODE-001 结构化数据缺 3 字段，建议补齐以争取 AI 引用",
  snip:"诊断完成：GEO 92% 但 Product 缺 gtin / price / sameAs，拉低事实采纳率…",
  thread:[
   {who:"agent",when:"14:52",badge:"建议 · 待批复",text:`<p>站长你好，我对产品页 <code>hutian.com/products/tc-diode-001</code> 跑完四步诊断。<strong>生成式 GEO 表现强劲（92%）</strong>，但发现一个会直接拉低 AI 引擎“事实采纳率”的缺口：</p><p><code>Product</code> 结构化数据缺少 <span class="hl">gtin / price / sameAs</span> 三个字段。生成式引擎在回答“推荐一款工业控制二极管”时，因拿不到价格与实体锚点，倾向于不引用我们。</p><p>我已草拟好 JSON-LD 补丁（见下方 diff），<strong>等你批复后即写入</strong>，并自动提交站点地图触发再索引。</p>`,
    evi:[
     {t:"综合诊断",type:"scores",seo:64,geo:92,concl:[["ok","实体清晰度 — 通过"],["ok","语义链接 — 通过"],["warn","结构化缺失 — Product 缺 gtin / price / sameAs"]]},
     {t:"建议补丁 · schema/product.jsonld",type:"diff",lines:[["ctx",5,'  "brand": "壶天",'],["add",8,'  "gtin": "6970000000017",'],["add",9,'  "sameAs": ["…/Q128888"],'],["add",13,'    "price": "12.80",'],["add",14,'    "priceCurrency": "CNY"']]},
     {t:"附件",type:"attach",file:"schema/product.jsonld",size:"1.2 KB · 草稿"}
    ],
    quick:[["ok","批准补齐并提交","approve"],["ask","先只看完整 diff","diff"],["no","暂不处理，记入 backlog","defer"]]}
  ]},

 {id:2,from:"agent",fromName:"壶天 SEO Agent",time:"13:10",unread:true,cat:"approve",
  subj:"品牌更名 天启芯 → 壶天：已扫描 37 文件 428 处，待你确认写盘",
  snip:"dry_run 完成。已智能排除 docs/ 与历史文档中的旧称提及，避免误改…",
  thread:[
   {who:"agent",when:"13:10",badge:"更名 · 待确认",text:`<p>按你的指令，我把全站品牌实体从 <code>天启芯 / Tikchip</code> 迁移到 <strong class="hl">壶天</strong>。空跑（dry_run）结果：命中 <strong>37 个文件、428 处</strong>，覆盖 schema / OG 标签 / sitemap / 页脚。</p><p>⚠️ 一处需要你知晓：我<strong>智能排除了 <code>docs/</code> 与历史文档</strong>中“仅作历史映射”的旧称提及（共 6 处保留），以免把 PRD、变更日志里的历史记录也改掉——那些旧称在那里是<strong>应当存在</strong>的。</p><p>确认无误后回复“确认写盘”，我会真正写入并补 301 重定向。</p>`,
    evi:[
     {t:"空跑报告 · entity_rename",type:"rename",matches:428,files:37,excluded:6},
     {t:"附件",type:"attach",file:"entity-graph.json",size:"218 KB · 壶天品牌图谱"}
    ],
    quick:[["ok","确认写盘","write"],["ask","把排除清单发我看看","list"],["no","取消更名","cancel"]]}
  ]},

 {id:3,from:"agent",fromName:"壶天 SEO Agent",time:"周一 09:00",unread:true,cat:"report",
  subj:"GEO 引用周报 W30：引用量 2,410，周环比 +12.5%",
  snip:"DeepSeek 占 42% 为主要来源；搜索流量 30 日 +89%。附完整周报…",
  thread:[
   {who:"agent",when:"周一 09:00",badge:"周报 · 自动",text:`<p>本周 GEO 表现稳步上行。生成式引擎对“壶天”的引用量达 <strong class="hl">2,410</strong>，周环比 <strong>+12.5%</strong>；传统搜索流量 30 日环比 <strong>+89%</strong>。</p><p>引用结构健康：<strong>DeepSeek-V3 占 42%</strong> 为主要来源，GPT-4o 28% 为次要权威，Kimi 15%。情感倾向正面 87%。</p><p>建议下周聚焦：为壶天注册 Wikidata 实体条目，强化 sameAs 证据链，可进一步抬升 GPT 侧引用。</p>`,
    evi:[
     {t:"引用来源分布",type:"bars",bars:[["DeepSeek-V3",42,"b-ds"],["GPT-4o",28,"b-gpt"],["Kimi",15,"b-kimi"],["其他",15,"b-oth"]],extra:[["引用量","2,410"],["情感","正面 87%"],["搜索流量 30d","+89%"]]},
     {t:"附件",type:"attach",file:"geo-report-w30.md",size:"6.4 KB"}
    ],
    quick:[["ok","收到，归档","arch"],["ask","导出 PDF 版","pdf"],["ask","订阅每周一推送","sub"]]}
  ]},

 {id:4,from:"agent",fromName:"壶天 SEO Agent",time:"昨天",unread:false,cat:"done",
  subj:"语义站点地图已提交：1,284 URL，IndexNow 200 OK",
  snip:"含 96 个实体锚点；抓取队列已预热，预计 40 分钟内完成再索引。",
  thread:[
   {who:"agent",when:"昨天 16:40",badge:"完成回执",text:`<p>你上周批准的语义站点地图已提交至 Google / Bing。<strong>1,284 个 URL</strong>（含 96 个实体锚点）通过 IndexNow 推送，返回 <strong>200 OK</strong>，耗时 312ms。</p><p>抓取队列已预热，预计 40 分钟内完成再索引。我会在收录数据回流后，再发一封确认邮件。</p>`,
    evi:[
     {t:"提交日志",type:"term",lines:[["p","➜"," hutian deploy --sitemap semantic.xml"],["ok","✓"," 1,284 URLs · IndexNow 200 OK · 312ms"]]},
     {t:"附件",type:"attach",file:"semantic-sitemap.xml",size:"84 KB · 已提交"}
    ],quick:[]}
  ]},

 {id:5,from:"me",fromName:"我（站长）",time:"前天",unread:false,cat:"diag",
  subj:"帮我审计新上的落地页 hutian.com/landing/ai-cs",
  snip:"你：刚上线，想看看 SEO/GEO 基线。 · 壶天：已诊断，附报告…",
  thread:[
   {who:"me",when:"前天 10:12",badge:"去信",text:`<p>壶天，我们刚上线了一个 AI 客服的落地页 <code>hutian.com/landing/ai-cs</code>，还没做任何优化。帮我跑一次基线诊断，看看传统 SEO 和 GEO 各是什么水平，列个优先级清单。</p>`},
   {who:"agent",when:"前天 10:14",badge:"回信 · 已诊断",text:`<p>收到，已诊断。基线：<strong>传统 SEO 41% / 生成式 GEO 18%</strong>——典型的新页冷启动状态，主要扣分在缺 title 描述、无 JSON-LD、内链孤立。</p><p>已生成 5 条按影响排序的修复清单（高→低），并草拟了 FAQPage 结构化数据。要我直接执行前三条吗？回复“批准”即可，我会逐条写并在每步后回报。</p>`,
    evi:[
     {t:"基线诊断",type:"scores",seo:41,geo:18,concl:[["warn","title / meta description 缺失"],["warn","无 JSON-LD 结构化数据"],["warn","内链孤立（0 条入链）"]]}
    ],quick:[["ok","批准执行前三条","approve"],["ask","把 5 条清单都发我","list"]]}
  ]}
];

/* ---------- 渲染：列表 ---------- */
const catLabel={approve:["待批复","approve"],diag:["诊断","diag"],report:["周报","report"],done:["完成","done"]};
function mailCard(m){
  const [cl,ck]=catLabel[m.cat];
  return `<div class="mail ${m.unread?'unread':''}" data-id="${m.id}">
    <div class="m-ava ${m.from}">${m.from==='agent'?'壶':'我'}</div>
    <div class="m-body">
      <div class="m-row1"><span class="m-from">${m.fromName}</span><span class="m-time">${m.time}</span></div>
      <div class="m-subj">${m.subj}</div>
      <div class="m-snip">${m.snip}</div>
      <div class="m-tags">${m.unread?'<span class="dot-unread"></span>':''}<span class="tag ${ck}"><i></i>${cl}</span></div>
    </div></div>`;
}
function renderList(filter='all'){
  const arr=MAILS.filter(m=>{
    if(filter==='all')return true;
    if(filter==='unread')return m.unread;
    return m.cat===filter;
  });
  $('#mailScroll').innerHTML=arr.map(mailCard).join('')||'<div style="padding:30px;text-align:center;color:var(--faint);font-size:13px">这个分类暂时没有反馈</div>';
  $$('#mailScroll .mail').forEach(el=>el.addEventListener('click',()=>openMail(+el.dataset.id)));
}
$$('.flt').forEach(b=>b.addEventListener('click',()=>{$$('.flt').forEach(x=>x.classList.remove('on'));b.classList.add('on');renderList(b.dataset.f);}));
$$('.bx').forEach(b=>b.addEventListener('click',()=>{$$('.bx').forEach(x=>x.classList.remove('on'));b.classList.add('on');}));

/* ---------- 渲染：证据卡 ---------- */
function eviCard(e){
  if(e.type==='scores'){
    const c=e.concl.map(([k,t])=>`<div class="c ${k}"><svg><use href="#i-${k==='ok'?'check':'warn'}"/></svg>${t}</div>`).join('');
    return `<div class="card rise"><div class="card-t"><svg><use href="#i-chart"/></svg>${e.t}</div><div class="card-b">
      <div class="scores"><div class="score seo"><span>传统 SEO</span><b>${e.seo}%</b></div><div class="score geo"><span>生成式 GEO</span><b>${e.geo}%</b></div></div>
      <div class="concl">${c}</div></div></div>`;
  }
  if(e.type==='diff'){
    const ls=e.lines.map(([k,n,t])=>`<div class="dl ${k}"><span class="no">${n}</span><span class="tx">${t}</span></div>`).join('');
    return `<div class="card rise"><div class="card-t"><svg><use href="#i-pen"/></svg>${e.t}</div><div class="card-b"><div class="diffmini">${ls}</div></div></div>`;
  }
  if(e.type==='bars'){
    const bs=e.bars.map(([nm,v,cls])=>`<div class="bar-r"><span class="nm">${nm}</span><div class="tr ${cls}"><i style="width:${v}%"></i></div><b>${v}%</b></div>`).join('');
    const ex=e.extra.map(([k,v])=>`<span style="font-size:12px;color:var(--mut)">${k} <b style="color:var(--ink);font-family:var(--disp)">${v}</b></span>`).join(' &nbsp;·&nbsp; ');
    return `<div class="card rise"><div class="card-t"><svg><use href="#i-chart"/></svg>${e.t}</div><div class="card-b"><div class="bars">${bs}</div><div style="margin-top:12px;padding-top:11px;border-top:1px dashed var(--line)">${ex}</div></div></div>`;
  }
  if(e.type==='term'){
    const ls=e.lines.map(([c,p,t])=>`<div><span class="${c}">${p}</span>${t}</div>`).join('');
    return `<div class="card rise"><div class="card-t"><svg><use href="#i-bolt"/></svg>${e.t}</div><div class="card-b"><div class="termmini">${ls}</div></div></div>`;
  }
  if(e.type==='rename'){
    return `<div class="card rise"><div class="card-t"><svg><use href="#i-bolt"/></svg>${e.t}</div><div class="card-b">
      <div class="bars">
        <div class="bar-r"><span class="nm">替换处</span><div class="tr b-ds"><i style="width:100%"></i></div><b>${e.matches}</b></div>
        <div class="bar-r"><span class="nm">命中文件</span><div class="tr b-gpt"><i style="width:74%"></i></div><b>${e.files}</b></div>
        <div class="bar-r"><span class="nm">智能排除</span><div class="tr b-oth"><i style="width:14%"></i></div><b>${e.excluded}</b></div>
      </div>
      <div style="margin-top:11px;font-size:12px;color:var(--mut);line-height:1.7">排除项多为 <code style="font-family:var(--mono);color:var(--teal)">docs/</code> 与变更日志中的历史提及，按品牌约束应保留。</div></div></div>`;
  }
  if(e.type==='attach'){
    return `<div class="attach rise"><div class="fi"><svg><use href="#i-file"/></svg></div><div><b>${e.file}</b><span>${e.size}</span></div><span class="dlb"><svg><use href="#i-dl"/></svg>下载</span></div>`;
  }
  return '';
}

/* ---------- 渲染：阅读器 ---------- */
function letterHTML(l){
  const evi=(l.evi||[]).map(eviCard).join('');
  const badgeCls=l.who==='agent'?'agent':'me';
  return `<div class="letter rise">
    <div class="l-from"><div class="m-ava ${l.who}">${l.who==='agent'?'壶':'我'}</div><b>${l.who==='agent'?'壶天 SEO Agent':'我（站长）'}</b><span>${l.when}</span><span class="badge ${badgeCls}">${l.badge}</span></div>
    <div class="l-text">${l.text}</div>
    ${evi?`<div class="evi">${evi}</div>`:''}
  </div>`;
}
let current=null;
function openMail(id){
  const m=MAILS.find(x=>x.id===id);if(!m)return;
  current=m;m.unread=false;
  $$('#mailScroll .mail').forEach(el=>el.classList.toggle('on',+el.dataset.id===id));
  renderList($('.flt.on').dataset.f);
  updateCounts();
  const last=m.thread[m.thread.length-1];
  const quick=(last.quick&&last.quick.length)?`
    <div class="quick">${last.quick.map(([k,t,act])=>`<button class="qk ${k}" data-act="${act}"><svg><use href="#i-${k==='ok'?'check':k==='no'?'x':'reply'}"/></svg>${t}</button>`).join('')}</div>`:'';
  $('#reader').innerHTML=`<div class="read">
    <div class="read-head rise">
      <div class="m-ava ${m.from}">${m.from==='agent'?'壶':'我'}</div>
      <div style="flex:1;min-width:0">
        <div class="read-subj">${m.subj}</div>
        <div class="read-meta"><span class="who">${m.fromName} <small>→ ${m.from==='agent'?'我':'壶天 Agent'}</small></span><span class="when">${m.time}</span></div>
      </div>
      <div class="read-actions"><button class="ic" title="标星"><svg><use href="#i-star"/></svg></button><button class="ic" title="归档"><svg><use href="#i-arch"/></svg></button><button class="ic" title="删除"><svg><use href="#i-trash"/></svg></button></div>
    </div>
    <div class="thread" id="thread">${m.thread.map(letterHTML).join('')}</div>
    <div class="reply rise">
      <div class="reply-h"><svg width="14" height="14" style="color:var(--brand)"><use href="#i-reply"/></svg>回复 <b>${m.from==='agent'?'壶天 SEO Agent':'此线程'}</b></div>
      ${quick}
      <textarea id="replyTxt" placeholder="或直接打字追问 / 派活，例如：把 gtin 换成我们真实的条码…"></textarea>
      <div class="reply-foot"><span class="hint">⌘Enter 发送 · 批复会触发 Agent 执行并回执</span><button class="send" id="sendBtn"><svg><use href="#i-send"/></svg>发送</button></div>
    </div>
  </div>`;
  // stagger evidence rise
  $$('#thread .card, #thread .attach').forEach((el,i)=>{el.style.animationDelay=(0.08*i+0.15)+'s';});
  // wire quick + send
  $$('#thread ~ .reply .qk, .reply .qk').forEach(b=>b.addEventListener('click',()=>doReply(b.textContent.trim(),b.dataset.act)));
  $('#sendBtn').addEventListener('click',()=>{const v=$('#replyTxt').value.trim();if(v)doReply(v,'text');});
  $('#replyTxt').addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){const v=$('#replyTxt').value.trim();if(v)doReply(v,'text');}});
  $('#reader').scrollTo({top:0});
}

/* ---------- 批复 → 线程内联回执 ---------- */
const REPLY_MAP={
  approve:{proc:"壶天 正在写入补丁并提交站点地图…",done:"已写入 schema/product.jsonld（+9 / −2），IndexNow 已提交，预计 40 分钟再索引完成。"},
  write:{proc:"壶天 正在写盘并补 301 重定向…",done:"已写盘 428 处，301 重定向规则已写入 redirects.conf，品牌实体切换完成。"},
  diff:{proc:"壶天 正在展开完整 diff…",done:"完整 diff 已附在上方卡片（20 行，+9 / −2）。确认无误可回复“批准补齐”。"},
  list:{proc:"壶天 正在整理清单…",done:"清单已附为附件 list.md，含排除路径明细。"},
  arch:{proc:"",done:"已归档至「周报」。"},
  defer:{proc:"",done:"已记入 backlog，不会自动执行。需要时随时叫我。"},
  cancel:{proc:"",done:"已取消本次更名，未做任何写盘。"},
  pdf:{proc:"壶天 正在生成 PDF…",done:"PDF 已生成：geo-report-w30.pdf（已附下载）。"},
  sub:{proc:"",done:"已订阅：每周一 09:00 自动推送 GEO 周报到收件箱。"},
  text:{proc:"壶天 正在处理你的回复…",done:"收到，已按你的说明调整并记录。如有写盘动作我会再次征求你确认。"}
};
async function doReply(text,act){
  const th=$('#thread');if(!th)return;
  // 1) 我的回复
  const mine=document.createElement('div');
  mine.innerHTML=letterHTML({who:"me",when:"刚刚",badge:"回复",text:`<p>${text.replace(/</g,'&lt;')}</p>`});
  const myLetter=mine.firstElementChild;th.appendChild(myLetter);
  const ta=$('#replyTxt');if(ta)ta.value='';
  // 2) 处理中
  const map=REPLY_MAP[act]||REPLY_MAP.text;
  let procEl=null;
  if(map.proc){
    procEl=document.createElement('div');
    procEl.className='proc';
    procEl.innerHTML=`<span class="sp"></span>${map.proc}`;
    th.appendChild(procEl);
  }
  scrollToBottom();
  await sleep(map.proc?1500:500);
  if(procEl)procEl.remove();
  // 3) 回执
  const ag=document.createElement('div');
  ag.innerHTML=letterHTML({who:"agent",when:"刚刚",badge:"回执",text:`<p>${map.done}</p>`,evi:act==='approve'?[{t:"附件",type:"attach",file:"schema/product.jsonld",size:"1.2 KB · 已写入"}]:[]});
  th.appendChild(ag.firstElementChild);
  scrollToBottom();
}
function scrollToBottom(){$('#reader').scrollTo({top:$('#reader').scrollHeight,behavior:'smooth'});}

/* ---------- 计数 ---------- */
function updateCounts(){
  const u=MAILS.filter(m=>m.unread).length;
  $('#ct-inbox').textContent=u;
  $('#ct-inbox').classList.toggle('hot',u>0);
  $('#listN').textContent=`${MAILS.length} 封 · ${u} 未读`;
}

/* ---------- 未读数滚动 ---------- */
function countUp(el,to){const t0=performance.now();(function f(t){const p=Math.min((t-t0)/700,1);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f);})(t0);}

/* ---------- init ---------- */
renderList();
updateCounts();
countUp($('#ct-inbox'),3);
// 默认打开第一封，展示完整体验
setTimeout(()=>openMail(1),250);
</script>
</body>
</html>
```

**这版你会看到**：左侧邮箱栏（收件箱未读 3 滚动出现 / 待批复 2 / 已发 / 周报 / 归档）· 中间邮件流（未读加粗+品牌色竖条+类别色点 chip，可筛选）· 右侧像读邮件一样读 Agent 的信，但信里**内嵌**诊断双评分卡、diff 补丁、引用占比条、更名空跑报告、终端日志、附件条，逐块渐入。底部回复区有**快捷批复**（批准补齐 / 确认写盘 / 归档…）+ 自由文本框；点任一批复，线程里会先出现"你·刚刚"，再"壶天·处理中…"（克制 spinner），再"壶天·回执+结果"——把 workbench 的 `thinking→tool→message` 心智换成了邮件皮。**第 2 封"品牌更名"邮件正文里那句"已智能排除 docs/ 与历史文档中的旧称提及"**，正是上面裁决 #5 的活体化，让产品和工程决策长成同一条线。

---

**收尾**：v0.2 环境我签字、五处裁决方向已定（改实现 1/2/4/5、改 PRD 3，并把"三源一致"焊成门禁），Trae 照表改完重跑 probe 发我即可，不阻塞你看这个原型。原型存成 `hutian-inbox.html` 双击就能点完整个"读信→批复→回执"回路。

下一步你定：① 让 Trae 按五处裁决收尾 v0.2；② 这个邮箱看板如果方向对，我可以接着把它**也并进 Next.js**（作为第三个 Route Group `(inbox)`，复用 `agent-protocol`，让"批复"真的 `POST` 成一条带人工确认的事件回流给 Agent）；③ 或先调整原型的视觉/邮件分类/批复语义。你说一声。这一轮 Trae 干得很扎实，尤其"直接 call 函数拿真实 JSON"和"把探针被扫到当线索"这两手，是熟手动作——只是那条线索他当彩蛋、我当地雷，这正是 review 该补的那一眼。