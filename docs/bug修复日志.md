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

### 6. 改动文件清单（本次提交）
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/intent.ts` —— 加 continue_last + 承接词白名单双护栏 + classify 上下文消歧 + ambiguous 反问不播欢迎
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/run-agent.ts` —— 加 history 输入和回调、拼 messages、入口 log 判官、ambiguous 写回、continue_last 放行主 LLM
- `hutian-seo-geo-agent/apps/agent-bridge/src/server.ts` —— sessionHistories Map + 读/写回
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/verify-intent.ts` —— 新增 ■18-■21 共 12 条断言（双护栏、窄匹配、上下文消歧、上下文反问不播欢迎）
- `hutian-seo-geo-agent/apps/agent-bridge/src/loop/probe-continue-amnesia.ts` —— 新增判官脚本 4/4 分层验规则层+loop 层
- `docs/bug修复日志.md` —— 本条（新建）
