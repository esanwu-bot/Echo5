# Bug 修复日志

按修复倒序记录，每条含：**压测复现 | 根因分层 | 改动点（含护栏）| 验收签名 | 待补项**。不写无证据的推断，分层明确哪一层盖了章、哪一层没盖。

---

## 2026-07-29 · 「继续失忆」—— session 内承接词（继续/好的/下一步）掉回首轮欢迎菜单

### 1. 压测复现
| 步骤 | 现象 |
| --- | --- |
| 工作台发送：`诊断 https://tikchip.cn/mall/product/1180 的 Product JSON-LD` | Agent 执行诊断、返回结果，末尾问句 `需要我继续吗？😊` |
| 2 分钟后，仅发送：`继续` | **Agent 重播带 emoji 的首轮回旋欢迎菜单**（"例如「诊断...」「建一篇关于三轮车...」"），不续上一步缺字段的 JSON-LD 补齐，**工具链断裂、失忆** |

> 复现口径：同 session（同 browser tab、同 sessionId、未重启 bridge、未关页、间隔 2 分钟）。**2 分钟这个时间戳直接把"session 持久化/Memory"从根因里除名**——进程内内存 Map 2 分钟不会蒸发，根因是 **session 内无状态**，不是跨进程/跨天的长期记忆。

### 2. 根因（三层，修一层治一层漏，全焊才不漏）
| 层 | 现象 | 为什么会掉欢迎菜单 |
| --- | --- | --- |
| ① **Intent 围栏（stateless 单 turn 决断）** | `classifyIntent("继续")` 落 `ambiguous` | classifyIntent 的 enum 集合是 `diagnose/rename/build/submit/report/check_schema/cms/chitchat/confirm/cancel/ambiguous`——**"继续"从不属于其中任何一个**，它不是"新意图"，是"延续上一意图"。喂再多历史进这个 enum 分类器也只会纠结、最终落 ambiguous。而 ambiguous 当时的兜底反问是**硬拼了一套首轮回旋欢迎模板**（"例如「诊断...」「建一篇关于三轮车...」"）→ 承接词掉 ambiguous = 直接播放欢迎菜单。 |
| ② **Loop 层（messages 空启动）** | 即便 intent 不落 ambiguous，loop 调主 LLM 时 `messages=[system, 当前user]`，`len=2` | loop 当时的入参 `AgentLoopInput` 只有 `prompt`，**没有 history 字段**；主 LLM 永远只看本轮 user prompt，看不见上一轮 agent 的问句和工具结果，接不住语境——用户说"继续"，LLM 只能理解成"继续什么？"→ 再次兜底欢迎。 |
| ③ **Server 层（无 session 级 messages 读写）** | 同一个 sessionId 的第二次请求，拿不到上一轮的 messages 列表 | server.ts 的 `startAgentLoop(sessionId, prompt)` 只把 `prompt` 丢给 loop，**没有 Map<String, Message[]> 做 session→messages 累积；也没有 onMessagesUpdated 写回**——每一轮都是全新 loop、全新空 messages，即便是 session 内也无状态。 |

### 3. 修复点（3 个文件 + 两个护栏焊死 + 入口 log 判官绑定）

#### 3.1 `apps/agent-bridge/src/loop/intent.ts`
- **新增伪意图**：`IntentKind` 加 `continue_last`（不是新意图，是"跳过本次重分类，续上一意图，主 loop 带完整 history 走"）。
- **承接词白名单（规则层封闭枚举）**：`CONTINUATION_STANDALONE` + `CONTINUATION_PUNCT_ONLY` 正则集合（继续/好的/行/下一步/然后呢/对/是的/嗯/go on/next/proceed/continue/...）——**严格 standalone 窄匹配**，"可以帮我换个 URL 诊断""对了改品牌名""然后补 JSON-LD"这种带宾语/话题的一律不命中，避免"短的新话题被错误续到旧任务"（护栏一宽度守门）。
- **双护栏才放行**：白名单命中 && `lastAgentMessage` 是**问句/提供了选项**（`containsQuestion/containsOption` 匹配 吗？/是否？/选/①②③/A B C 等）才判 `continue_last`。空上下文首句"继续"、或 agent 末尾是陈述句的"继续"**一律不过**（护栏二上下文确认）。
- **非承接词带最近 N 轮消歧**：非白名单命中时才走 `classifyIntentByLLM`，传入 `recentContextText`（最近 2-3 轮压缩历史）而不是整段，不把 classify 这个"快+便宜的闸门"拖慢变重。
- **ambiguous 反问上下文感知**：`buildClarifyQuestion` 有 `recentContextText` 时改说"需要我继续上一步诊断？还是你要告诉我刚才要什么？"——**永不播首轮回旋欢迎模板**，彻底从 ambiguous 兜底路径里把欢迎菜单拔掉。
- 红线保持：`isDestructiveAuthorized` 只信 `src=rule` 的 `confirm`，`continue_last/llm-confirm` 一律卡断。

#### 3.2 `apps/agent-bridge/src/loop/run-agent.ts`
- **`AgentLoopInput` 扩展**：加 `history?: Message[]` + `onMessagesUpdated?: (latest: Message[]) => void`。
- **messages 拼历史**：`[system, ...history, 本轮 user]` 而不是 `[system, user]`。
- **入口 log 判官（焊死，修完即验）**：每轮 loop 开头固定输出一行：
  ```
  [agent-loop] classify kind=<intent> src=<rule/llm> | messages.len=<N> | last=<role>«<前30字>»
  ```
  这行直接回答三个问题：intent 对不对、历史在不在（len>2 就有历史）、上一条是谁的消息——比"看 history 长度"更具体，把"修"和"验"绑成一步。
- **ambiguous 分支也记 messages**：不管是 ambiguous 反问还是正常生成，`onMessagesUpdated` 都在末尾回调一次写回 server，不会因为走了反问分支就漏写 agent 消息。
- **`continue_last` + 非破坏性 confirm 走主 LLM**：承接词直接让主 LLM 读完整 history 续接，不进 ambiguous 分支。

#### 3.3 `apps/agent-bridge/src/server.ts`
- **`sessionHistories = new Map<string, Message[]>()`**：内存态、per-session messages 累积（不含 system 消息，避免重复）。
- **读历史**：`startAgentLoop` 启动时 `prevHistory = sessionHistories.get(sessionId) ?? []`，丢给 `runAgentLoop({history: prevHistory})`。
- **写历史**：传 `onMessagesUpdated` 回调，每次 loop 结束把 `nonSystem = msgs.filter(role !== system)` 写回 Map——**所有分支（正常生成/ambiguous 反问/工具调失败）都走同一个写回口**，不冒"漏写 assistant 问句"的险。

### 4. 验收签名（分层盖，哪层盖了哪层没盖标清楚）

| 层 | 盖了吗 | 证据 |
| --- | --- | --- |
| 规则层：承接词白名单 + 双护栏（standalone + 问句） | ✅ 签 | `verify-intent` 57/57：■18（5 条：继续问句命中/好的命中/下一步带标点命中/空上下文不命中/非问句不命中） + ■19（4 条：可以帮我…/对了改品牌/然后补JSONLD 不命中；然后呢 standalone 命中） + ■20（继续+问句上下文→continue_last 非 ambiguous） + ■21（有上下文 ambiguous 反问不播欢迎菜单） |
| Loop 层：带 history 续接、messages.len 对、承接词前一条=上一轮 assistant 问句 | ✅ 签 | `probe-continue-amnesia` 4/4 GREEN：Round2a classify 非 ambiguous + 回合1 终 assistant 有问句 + 回合2 messages.len ≥ 回合1+2（写回对） + round-2 user "继续"前一条 = 上一轮 assistant 问句（续接对）。入口 log 判官双行可对：回合1 `messages.len=2 last=system`；回合2 `messages.len=6 last=assistant«...需要我继续»` |
| MockLLM + 真 MCP：loop 调工具链不断，续接后 MCP 通 | ✅ 签 | 回合1 真发 `ListToolsRequest/CallToolRequest(check_schema)`；回合2 classify `kind=continue_last src=rule` 走规则续接，LLM 回复"接着把缺的 JSON-LD 写回"——工具链接口通、规则续接生效、承接词零 LLM 分类调用（快+便宜+确定） |
| Server.ts 自动命中层：**真 HTTP 两轮**间 sessionHistories 自动读/写 | ⚠️ 待工作台补验 | 判官脚本用"手动传 prevHistory.len=4"模拟了 loop 续接，绕过了"浏览器真发两轮 SSE 请求 → server.ts 按同 sessionId 读 Map → 自动命中、自动写回"这一跳。最小补验动作：工作台真发两轮，第一轮诊断出问句，第二轮只发"继续"，接着补 JSON-LD = 这一跳通；又回欢迎 = 写回或 sessionId 命中有问题，发 log 跟进。 |

### 5. 待补项（诚实边界，不在本单强塞）
1. **工作台真 HTTP 两轮补签 server.ts 自动命中层**：压测时顺手做，不另写脚本。绿了 = 进程内（不重启 bridge）维度彻底封箱。
2. **跨进程/跨天 session 持久化（M5 另排）**：`sessionHistories` 是内存 Map，bridge 重启即蒸发。真走开几小时/真重启再发"继续" = 失忆符合预期，持久化（Redis/文件/DB 按 sessionId 落）不进这一单，另排 M5。
3. **verify:loop 的 meta.totalTools 预估断言**：当前 MCP 实际 10 个工具、断言写死 5 → fail 1 项。属于测试脚本常量与实际不一致，与"继续失忆"根因正交，不阻塞本次修复，后续单独对齐 verify-loop 脚本的工具清单。

### 6. 改动文件清单（2026-07-29 · 继续失忆 提交）
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/intent.ts` —— 加 continue_last + 承接词白名单双护栏 + classify 上下文消歧 + ambiguous 反问不播欢迎
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/run-agent.ts` —— 加 history 输入和回调、拼 messages、入口 log 判官、ambiguous 写回、continue_last 放行主 LLM
- `hutian-seo-geo-agent/apps/agent-bridge/src/server.ts` —— sessionHistories Map + 读/写回
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/verify-intent.ts` —— 新增 ■18-■21 共 12 条断言（双护栏、窄匹配、上下文消歧、上下文反问不播欢迎）
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/probe-continue-amnesia.ts` —— 新增判官脚本 4/4 分层验规则层+loop 层
- `docs/bug修复日志.md` —— 本条（新建）

---

## 2026-07-29 · 附带修复：启动脚本 ps1/bat 中文乱码（双保险 + 子窗口联动切代码页）

### 1. 现象
Windows PowerShell 5.x 运行 `start_all_web_with_sitebase.ps1` 时，所有中文全变乱码（典型 UTF-8 字节被按 GBK/CP936 解码），`start "xxx" cmd /k` 启动的 4 个子窗口（php think run / go run / pnpm dev）若输出 UTF-8 中文也会继续乱。

### 2. 根因（两问题叠一起，缺一都乱）
| 乱码点 | 原因 |
| --- | --- |
| ps1 源码中文乱 | ps1 默认被 Write 工具存为 **UTF-8 without BOM**，而 **Windows PowerShell 5.x（即"Windows PowerShell"不是 pwsh7）读无 BOM 脚本默认按 ANSI=简中 CP936/GBK** → UTF-8 字节当 GBK 解，彻底乱。 |
| 控制台/子窗口输出乱 | 宿主控制台、以及 `start "siteBase" cmd /k` 打开的 4 个 cmd 子窗口，代码页默认停在 **936(GBK)**，php/go/node/pnpm 子进程默认 UTF-8 输出 → 字符错映射。 |

### 3. 修复（双保险 + 子窗口联动）

#### 3.1 `start_all_web_with_sitebase.ps1`（UTF-8 with BOM 存盘 + 4 处编码锁）
- **存盘强制 UTF-8 with BOM**：用 `[System.IO.File]::WriteAllText(path, content, New-Object UTF8Encoding($true))` 落盘，PS5 读到 `EF BB BF` 就按 UTF-8 读脚本，不再默认 CP936。
- **4 锁齐下**：
  1. `chcp 65001 >$null`：宿主控制台直接切 UTF-8 代码页（王道，对 cmd/PS 都生效）
  2. `[Console]::InputEncoding / OutputEncoding = UTF8`
  3. `$OutputEncoding = UTF8`：PowerShell 管道发外部程序也 UTF-8
  4. 每个 `Start-Process cmd.exe` 的命令串最前面先 `chcp 65001>nul`，**4 个服务子 cmd 窗口继承 UTF-8 代码页**，php think run / go run / pnpm dev 输出中文不乱。

#### 3.2 `start_all_web_with_sitebase.bat`（UTF-8 no BOM 中转 stub，无中文）
- cmd.exe 对 UTF-8 BOM 会显示首字乱、对 GBK/CP936 存盘又在运行时切 65001 会 echo 乱码；干脆把 bat 改成**纯中转 stub**，里面只有英文 REM + 一行 `powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_all_web_with_sitebase.ps1"`。
- 所有中文输出、服务窗口管理、代码页切换全部集中在 ps1 中维护，避免 bat/cmd 代码页不一致导致的中文乱码。

### 4. 验收
- ps1 存盘后让 PS5 立读立验：前 8 行中文（包括新增的租户后台/管理后台端口）显示正常，无乱码。
- bat 立读立验：内容为英文 REM + 一行 powershell 调用，无中文，双击直接拉起 ps1。
- 运行态压测你工作台跑真两轮时一起验，子窗口日志若全中文正常即可闭环。

### 5. 附带修复改动清单
- `start_all_web_with_sitebase.ps1` —— 4 处编码锁 + 子窗口联动切 65001 + 以 UTF-8 BOM 存盘 + 追加租户后台(3001)与管理后台(4319)
- `start_all_web_with_sitebase.bat` —— 改为 UTF-8 no BOM 中转 stub，内部无中文，仅调用 ps1
- `docs/bug修复日志.md` —— 本附带修复条目

---

## 2026-07-29 · 修正：承接词白名单漏了"需要"这类 yes/no 问句肯定应答词

### 1. 现象（不是 context 又丢了）
压测第二轮：用户第一轮诊断后 Agent 问"需要我帮你补充这些 JSON-LD 结构化数据吗？"，本轮只回"需要"两个字，Agent **没有续上一步**，而是反问了上一轮表格的内容——但反问里**原样引用了上一轮表格**，且**没有重播那套带 emoji 的首轮回旋欢迎菜单**。

### 2. 根因判定（两层硬证据切开了"记忆"和"词表"）
| 证据 | 说明 |
| --- | --- |
| 反问引用了上轮表格，且本轮无 tool_start/tool_end | **history 在、context 没掉**。如果是 session/history 丢了，反问不可能引用上轮表格。 |
| 反问是"上下文感知反问"，不是欢迎菜单 | 上轮 `buildClarifyQuestion` 的"有 recentContextText 时不播欢迎模板"修复生效了。 |
| 所以根因只能是 | **白名单漏了"需要"** —— 它不是承接词，是对 yes/no 问句的肯定应答；上一轮问句"需要我帮你补...吗"，用户回"需要"=yes，但 `CONTINUATION_STANDALONE` 里只有"继续/好的/对/是的..."，没有"需要"。 |

### 3. 修复
- `apps/agent-bridge/src/loop/intent.ts`：
  - 新增 `AFFIRMATIVE_STANDALONE` 白名单子集，收录对 yes/no 问句的短肯定回答：`需要、要、没问题、可以、补吧、加吧、做吧、搞吧、来吧、上吧、整吧、开干、开搞、好嘞、行啊、嗯嗯、对对、please、plz` 等。
  - 在 `classifyIntentByRule` 中把 `AFFIRMATIVE_STANDALONE` 与 `CONTINUATION_STANDALONE` 合并匹配，命中且 `looksLikeAgentPromptedChoice(lastAgentMessage)` 通过 → `continue_last`。
  - **双护栏原封不动**：
    - 护栏一 standalone 窄匹配仍在 —— "需要改品牌名""要补 JSON-LD""可以帮我换个 URL"这种带宾语的，不会命中；
    - 护栏二 `looksLikeAgentPromptedChoice` 仍在 —— 上一轮不是问句/没给选项，单说"需要"不会放行。
- `apps/agent-bridge/src/loop/verify-intent.ts`：新增 ■19.5，5 条断言：
  - `"需要" + yes/no 问句 → continue_last`（复用用户截图真实问句）
  - `"要" + yes/no 问句 → continue_last`
  - `"没问题" + yes/no 问句 → continue_last`
  - `"补吧" + yes/no 问句 → continue_last`
  - `"需要改品牌名" 带宾语 → NOT continue_last`（护栏一宽度守门）
- `apps/agent-bridge/src/loop/probe-continue-amnesia.ts`：顺手补 `MockScriptStep` 必填字段 `match: ""`（之前 typecheck 绿是误打误撞，这次补上正交类型修复）。

### 4. 验收
- `verify-intent`：**62/62 GREEN**（原 57 + 新增 5）。
- `typecheck`：**通过**。
- 运行态：你下一轮工作台真 HTTP 两轮，第一轮诊断出"需要我帮你补...吗"，第二轮只回"需要"，应直接续上 JSON-LD 补齐，不再反问。

### 5. 后续方向（v2，不进这单）
靠枚举肯定词永远补不全（"中""整一个""来呗""你看着办"）。v2 可对"上一轮是 yes/no 问句"做**预期式解析**：短回复默认按 confirm/continue 处理，显式否定词→cancel，显式新意图动词+宾语→新指令。但需额外护栏防止"短新话题被默认续接"，所以单独排 v2。

### 6. 改动文件清单
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/intent.ts` —— 加 AFFIRMATIVE_STANDALONE 肯定应答词子集，与承接词并列、双护栏不变
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/verify-intent.ts` —— 新增 ■19.5 共 5 条断言
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/probe-continue-amnesia.ts` —— MockScriptStep 补 `match: ""`（typecheck 正交修复）

---

## 2026-07-29 · 修复：Workbench 左侧“新建会话”按钮点击无响应

### 1. 现象
在 `http://localhost:3000/workbench` 页面，左侧橙色“+ 新建会话”按钮点击后没有任何反应：不跳转、不刷新聊天区、不创建新 session。

### 2. 根因
`Sidebar.tsx` 里的“新建会话”按钮是一个**纯静态 `<button>`，没有绑定 `onClick` 处理器**；同时：
- `useAgentSession` 没有提供“新建会话 / 重置会话”的方法；
- `streamReducer` 没有对应的 `reset` UI action；
- `WorkbenchPage` 也没有把重置能力传给 `Sidebar`。

按钮从 UI 到状态管理整条链路都是断的，所以点击无反应。

### 3. 修复
- `hutian-seo-geo-agent/apps/web/lib/streamReducer.ts`：
  - `UiAction` 增加 `{ type: "reset" }`。
  - reducer 处理 `reset` 时返回 `initialStreamState`，清空消息、工具、timeline、右栏等全部状态。
- `hutian-seo-geo-agent/apps/web/lib/useAgentSession.ts`：
  - 新增 `reset()` 回调：关闭当前 SSE EventSource、清空 `sessionId`、清空 pending 队列、dispatch `reset`。
  - 将 `reset` 暴露给调用方。
- `hutian-seo-geo-agent/apps/web/components/workbench/Sidebar.tsx`：
  - `SidebarProps` 增加可选 `onNewSession?: () => void`。
  - “新建会话”按钮绑定 `onClick={onNewSession}`，并加 `active:scale-[0.98]` 按下反馈。
- `hutian-seo-geo-agent/apps/web/app/(workbench)/workbench/page.tsx`：
  - 从 `useAgentSession` 解构 `reset`。
  - 给 `Sidebar` 传 `onNewSession={() => { reset(); addToast("已新建会话", "violet"); setSidebarOpen(false); }}`。

### 4. 验收
- `pnpm tsc --noEmit`（web 包）：**通过，0 error**。
- 运行态：启动 web dev server 后，点击“新建会话”按钮，聊天区应清空为初始空状态；在 SSE 模式下输入新消息后应 lazy 创建全新 session，不再复用旧 session。

### 5. 改动文件清单
- `hutian-seo-geo-agent/apps/web/lib/streamReducer.ts` —— 加 `reset` UI action
- `hutian-seo-geo-agent/apps/web/lib/useAgentSession.ts` —— 加 `reset()` 方法并暴露
- `hutian-seo-geo-agent/apps/web/components/workbench/Sidebar.tsx` —— 按钮加 onClick 与 onNewSession prop
- `hutian-seo-geo-agent/apps/web/app/(workbench)/workbench/page.tsx` —— 串联 reset 与 Sidebar
- `docs/bug修复日志.md` —— 本条

---

## 2026-07-29 · 修复：管理后台 admin 登录后 overview 接口 401 被踢回登录页

### 1. 现象
`http://localhost:4319/login` 登录后进入总览（/overview），页面闪一下红色错误提示，然后 URL 被重定向回 `/login`。

### 2. 根因分析（401 被踢回登录 = client.ts 拦截器执行了 clearAdminToken + window.location.href = /login）
client.ts 只对 HTTP 401 执行清 token 跳转，所以服务端返回的是 401。401 只可能来自 `middleware/admin_context.go` 的三种情况：
- `TENANT_ADMIN_TOKEN` env 未配 → 原返回 503（不会被 client.ts 处理，不会跳登录），现改成 401；
- 请求没带 `X-Admin-Token` → 说明 axios 没成功写 header 或 localStorage 没 token；
- token 不匹配 → 说明前端发的 token 和后端 env 不一致。

代码审查发现几个高概率问题：
- `client.ts` 用 `config.headers["X-Admin-Token"] = token` 索引赋值，在 axios 1.x 的 AxiosHeaders 上不如 `headers.set()` 稳定；
- 登录输入框未 trim，可能把首尾空格写进 localStorage；
- env 未配时返回 503，前端不处理，用户看不到明确原因。

### 3. 修复
- `hutian-seo-geo-agent/apps/admin/src/api/client.ts`：
  - token 读取后 `.trim()`；
  - header 写入改为 `config.headers.set("X-Admin-Token", token)`；
  - 请求/响应加 `console.log/console.error`，方便浏览器 Network/Console 直接看到 token 是否带上、服务端返回什么。
- `hutian-seo-geo-agent/apps/tenant-api/middleware/admin_context.go`：
  - `expectedToken == ""` 时从 503 改为 401，reason 仍为 `TENANT_ADMIN_TOKEN env not configured`；
  - token mismatch 时加后端日志 `got len=%d, expected len=%d`。
- `hutian-seo-geo-agent/apps/admin/src/App.tsx`：
  - LoginCard 两处 onLogin、Modal 的 onOk/onPressEnter 全部对 token `trim()` 后再存。

### 4. 验收
- `apps/admin`: `pnpm tsc --noEmit` —— 通过，0 error。
- `apps/tenant-api`: `go build .` —— 通过。
- 运行态：登录后打开浏览器 DevTools Console，应看到 `[admin-api] outgoing GET /overview token-present: true`；
  如果仍失败，Console 会打印具体 status 和 reason，tenant-api 控制台会打印 `token mismatch` 或 `admin disabled`。

### 5. 若仍失败的最小排查清单
1. 看 tenant-api 启动窗口的 env：`set TENANT_ADMIN_TOKEN` 是否等于你输入的 token（默认 `dev-admin-token-change-in-prod`）。
2. 看浏览器 Console 的 `[admin-api] outgoing` 行：token-present 是 true 还是 false。
3. 看 tenant-api 控制台：有没有 `[admin-auth] token mismatch: got len=... expected len=...`。
4. 如果 Console 报 0 / Network Error，检查 tenant-api（:4318）是否真启动了；如果报 401 + `admin disabled`，说明 env 没配成功。

### 6. 改动文件清单
- `hutian-seo-geo-agent/apps/admin/src/api/client.ts` —— headers.set + trim + 日志
- `hutian-seo-geo-agent/apps/admin/src/App.tsx` —— 登录 token trim
- `hutian-seo-geo-agent/apps/tenant-api/middleware/admin_context.go` —— 503 改 401 + mismatch 日志
- `docs/bug修复日志.md` —— 本条

---

## 2026-07-30 · 真根因：cmd.exe `set VAR=value && next` 尾随空格被吃进变量值，导致 admin token 恒定 mismatch

### 1. 现象
上一条（2026-07-29 admin 登录 401）的修复（headers.set + 前端 trim + 503→401 + mismatch 日志）上线后，问题仍复现：登录后进入 /overview，Console 打印 `[admin-api] response error 401 {error:"admin token invalid", reason:"token mismatch"}`，tenant-api 控制台打印 `[admin-auth] token mismatch: got len=33, expected len=34`——**后端期望的 token 比前端发的多 1 个字符**。

### 2. 根因（cmd.exe `set` 经典陷阱，不是 Go/axios/编码问题）

`start_all_web_with_sitebase.ps1` 通过 `Start-ServiceWindow` 最终在 cmd.exe 里执行：
```
set TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod && set TENANT_JWT_KEY=dev-jwt-key-change-in-prod && go run .
```

cmd.exe 的 `set VAR=value && next` 语法中，**`&&` 前的那个空格会被 `set` 吃进变量值尾部**。所以后端进程实际拿到的 env 是：
```
TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod<空格>   ← len=34
```

而前端通过 HTTP header 发送的 token 会被 Go `net/http` 自动 trim 首尾空白：
```
X-Admin-Token: dev-admin-token-change-in-prod              ← len=33
```

`subtle.ConstantTimeCompare([]byte("...prod"), []byte("...prod "))` 永远返回 0 → **恒定 mismatch，无论前端 token 输得多对都踢回登录**。

> 为什么上一条修复没堵住：上一条只在**前端**侧 trim token 和改 header 写法，但根因在**后端 env 被注入了尾随空格**，前端怎么 trim 都对不上。`subtle.ConstantTimeCompare` 严格字节比较，一个空格都不能差。

### 3. 修复（三层堵，根治 + 防御 + 源头）

#### 3.1 后端 config.go — 从根源 trim env（根治层）
- `config.Load()` 里 `AdminToken` 和 `JWTKey` 读取时包 `strings.TrimSpace(os.Getenv(...))`。
- 即使 cmd.exe 把空格注入 env，Go 进程内部用的 token 已经是干净的，恒定时间比较能对上。
- 这是根治层——不依赖启动脚本的写法是否正确。

#### 3.2 后端 admin_context.go — 防御性 trim header（防御层）
- `AdminContext` 中间件读 header 时也 `strings.TrimSpace(c.GetHeader("X-Admin-Token"))`。
- 双保险：即便 config 层漏了 trim，header 侧也 trim，两边都干净才能比较。

#### 3.3 ps1 启动脚本 — `set "VAR=value"` 引号包裹（源头层）
- `start_all_web_with_sitebase.ps1` 第 50 行 tenant-api 启动命令改为引号包裹写法：
  ```
  set "TENANT_ADMIN_TOKEN=dev-admin-token-change-in-prod" && set "TENANT_JWT_KEY=dev-jwt-key-change-in-prod" && go run .
  ```
- cmd.exe 的 `set "VAR=value"` 语法中，引号界定变量值的边界，**`&&` 前的空格不会被吃进变量值**。
- 这是源头层——从注入点堵住，env 一开始就是干净的。

#### 3.4 前端 client.ts — 恢复 401 跳转逻辑
- 根因已修，撤回上一轮的 DEBUG 临时屏蔽（注释掉的 `clearAdminToken()` + 跳转 `/login`），恢复正常 401 处理。
- 保留请求/响应的 `console.log/console.error` 调试日志（生产可注释，dev 有用）。

### 4. 验收
- `apps/admin`: `pnpm tsc --noEmit` —— 通过，0 error。
- `apps/tenant-api`: `go build .` —— 通过。
- 运行态：重启 tenant-api 后，登录 /overview 应返回 200，Console 不再出现 401 token mismatch。

### 5. 教训（写进红线避免重犯）
- **cmd.exe `set VAR=value && next` 的尾随空格陷阱**：Windows 启动脚本里拼接多命令时，`set` 必须用 `set "VAR=value"` 引号包裹，否则 `&&` 前的空格进变量值。这条对 Go env、Java -D、Node process.env 同样适用——只要宿主是 cmd.exe。
- **恒定时间比较对空白零容忍**：`subtle.ConstantTimeCompare` 是字节级严格比较，env/header 的尾随空格不会被自动忽略。安全比较前必须先 trim 两边。
- **根因分层不要只修症状层**：上一条只修了前端 trim + header 写法，没碰到后端 env 注入点，所以必复发。这次三层堵（config 根治 + 中间件防御 + 脚本源头）才真正封箱。

### 6. 改动文件清单
- `hutian-seo-geo-agent/apps/tenant-api/config/config.go` —— AdminToken/JWTKey 读取时 TrimSpace（根治层）
- `hutian-seo-geo-agent/apps/tenant-api/middleware/admin_context.go` —— header 读取时 TrimSpace（防御层）
- `start_all_web_with_sitebase.ps1` —— `set "VAR=value"` 引号包裹写法（源头层）
- `hutian-seo-geo-agent/apps/admin/src/api/client.ts` —— 恢复 401 跳转逻辑，撤回 DEBUG 屏蔽
- `docs/bug修复日志.md` —— 本条
