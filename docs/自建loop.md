方向已定：**自建 agent loop 为主线，MCP 工具层保留**。grok 不再作为 agent host（直接 stdio/TUI 控制 loop 的前方案已放弃），但可作为 OpenAI 兼容 LLM 后端经本地 CLIProxyAPI 接入。默认首发 LLM 仍是 CodeBuddy；grok 优先级需本地探针 GREEN 后通过 `LLM_PROVIDER=grok` 显式启用。这份清单接开发计划 Phase 4——v0.3 的 M4 即「自建 loop MVP」。

---

## ■ 0 · 拍定的默认值

| 决策点 | 默认值 | 为什么 |
|---|---|---|
| 主路线 | 自建 loop（单一） | grok 不再作为 agent host |
| 首发 LLM | **CodeBuddy**（腾讯云 TokenHub，`deepseek-v4-flash`，OpenAI 兼容格式） | 已通过 T4.1 探针验证 tool_calls 结构化输出 |
| 可选 LLM | **Grok**（本地 CLIProxyAPI，OpenAI 兼容格式） | 需通过 `probe:grok-derived` + `probe:grok-loop` 后显式启用 |
| loop 语言/位置 | **TS，写在 bridge 里**，经 MCP client 调 Python 工具 | bridge 本就持有会话+推 SSE，loop 放这最顺，事件直推不跨语言 |
| MCP 层 | **保留**，loop 作 MCP client 调 `hutian-seo-mcp` | 工具仍可被 Cursor 复用 |
| 成本/key | MVP 用**一个测试 key**（放 bridge env `CODEBUDDY_API_KEY`） | BYOK/代理计费放 v2.0，现在不碰 |

**前置（你做）**：给 Trae 一个 CodeBuddy API key（`CODEBUDDY_API_KEY`）。没有 key，T4.3 之后跑不了真闭环（但 T4.1/T4.2 可用 mock LLM 先做）。

---

## ■ 1 · LLM 适配层（`T4.1`）

**目标**：把"调 LLM"抽象成一个可替换接口，CodeBuddy 是首个实现。

```ts
// bridge/src/llm/types.ts
export interface ToolSchema { type: "function"; function: { name: string; description: string; parameters: object } }
export interface LLMResponse {
  content: string | null;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  finishReason: "stop" | "tool_calls" | "length";
}
export interface LLMClient {
  readonly name: string;                                   // "codebuddy" | "mock" ...
  chat(opts: {
    messages: Message[]; tools?: ToolSchema[];
    signal?: AbortSignal; onToken?: (t: string) => void;   // 流式回调
  }): Promise<LLMResponse>;
}
// CodeBuddyClient：POST https://tokenhub.tencentmaas.com/v1/chat/completions，OpenAI 兼容格式
// MockLLMClient：按脚本返回预设 toolCalls（无 key 时测 loop 本身，CI 兜底）
```

**验收**：`CodeBuddyClient` 能跑通一次普通对话 + 一次 tool calling（返回 `toolCalls`）；`MockLLMClient` 能按脚本吐 toolCalls。

---

## ■ 2 · 工具 schema 派生（`T4.2`）

**目标**：五工具的 schema 从 MCP 派生成 OpenAI `tools` 格式，**不手写第二份**（避免双源漂移，接我们 verify 门禁的思路）。

- 用 `@modelcontextprotocol/sdk` 的 `Client`（stdio transport）连 `hutian-seo-mcp`，调 `list_tools()` 拿到五工具的 name/description/inputSchema。
- 写一个 `sanitizeForOpenAI()`：把 MCP 的 `inputSchema`（pydantic 派生的 JSON Schema）清洗成 OpenAI 兼容格式——剥 `title`、收敛 `anyOf` null 分支、内联 `$ref`、补 `additionalProperties: false`。
- **验收**：派生出的 5 个工具名 = `run_diagnosis/check_schema/trace_citations/submit_sitemap/entity_rename`，一字不差（接 R4 工具名闭环）；清洗规则有单测门禁（`verify:sanitize`）。

---

## ■ 3 · agent loop 核心（`T4.3`）—— 这是 v0.3 的心脏

**目标**：写 `runAgentLoop()`，一个 while 循环：调 LLM → 执行 toolCalls（经 MCP）→ 结果喂回 → 直到 LLM 不再调工具。**全程产出 `AgentEvent`**（复用前端契约，一行不改前端）。

```ts
// bridge/src/loop/runAgent.ts（骨架，标了三个关键点）
export async function* runAgentLoop(input: string, deps: Deps): AsyncIterable<AgentEvent> {
  const tools = await deps.mcp.listToolSchemas();          // ← T4.2 派生
  const messages: Message[] = [SYSTEM_PROMPT, { role: "user", content: input }];
  yield { type: "meta", totalTools: tools.length };
  yield { type: "thinking", on: true };

  for (let turn = 0; turn < MAX_TURNS; turn++) {           // 终止条件：防死循环
    const res = await deps.llm.chat({ messages, tools, signal: deps.signal,
      onToken: (t) => {/* 流式 → 聚合 message */} });
    if (res.toolCalls.length === 0) {                      // LLM 收工
      yield { type: "message", role: "agent", content: res.content ?? "" };
      break;
    }
    for (const call of res.toolCalls) {
      yield { type: "tool_start", id: call.id, name: call.name, args: JSON.stringify(call.args) };
      const out = await deps.mcp.callTool(call.name, call.args);   // ← 经 MCP 调 Python 工具
      yield { type: "tool_end", id: call.id, ok: !out.error, durationMs: out.ms, output: out };
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
      // ← 流程控制钩子点（T4.4 在这插硬编码规则）
      // ← diff/terminal/artifact 事件：若 call.name 是 edit_file/submit_sitemap，从 out 派生对应 AgentEvent
    }
  }
  yield { type: "done" };
}
```

**验收**：用 `MockLLMClient` 跑 `runAgentLoop`，吐出的 `AgentEvent` 序列喂进 `streamReducer`，前端三栏渲染**和 mock 流一致**（工具块 spinner→✓、计划点亮）。这一步不依赖真 key。

---

## ■ 4 · 流程控制硬编码（`T4.4`）—— 路线 Y 的精髓

**目标**：把 skills/agents 里"求 LLM 遵守"的原则，变成 loop 里**代码强制**。这是自建 loop 的根本优势，但 MVP 只做关键几条，别一次全做：

| 原则（来自 skills） | 硬编码成 | MVP 做否 |
|---|---|---|
| seo-auditor「绝不臆测评分」 | system prompt 强约束 + loop 校验：评分只信 `run_diagnosis` 返回，LLM 文本里的数字不作为 `stats` 事件来源 | ✅ |
| schema-map「edit 后复验」 | loop 检测 `edit_file`/写 JSON-LD 后，**自动插入** `check_schema` 调用 | ✅ |
| 品牌前置「先 entity_rename」 | 检测会话涉及品牌更名时，首轮优先 `entity_rename(dry_run=true)` | ✅ |
| dry_run「先统计再确认」 | `entity_rename(dry_run=true)` 后，loop 暂停等用户确认事件，才发 `dry_run=false` | ⚠️ 可放 T4.6 后 |
| 四步诊断顺序 | system prompt 引导（不硬编码，保留 LLM 灵活性） | prompt 即可 |

**验收**：跑一个"诊断+补 Schema"任务，loop 在 edit 后**确实自动调了** `check_schema`（事件流里能看到），不靠 LLM 自觉。

---

## ■ 5 · 接 bridge SSE + 前端切真流（`T4.5`）

**目标**：把 `runAgentLoop` 接进 bridge 的会话，事件推 SSE；前端 `useAgentSession` 的 `mode` 从 `"mock"` 切 `"sse"`。

- bridge `POST /sessions/:id/messages` → 起 `runAgentLoop` → 每个 `AgentEvent` 写 SSE。
- 前端**一行不改**（它只认 `AgentEvent`）——这是契约稳定的回报，验收时重点确认前端零改动。
- **验收**：浏览器输入一句话 → 真 LLM 决策 → 真工具执行 → 三栏实时渲染。

---

## ■ 6 · 上下文/流式/重试（`T4.6`，简版，别过度设计）

loop 自己管的"脏活"，MVP 做简版：
- **流式**：`onToken` 聚合成 `message`（或逐 token 推，MVP 先整条推）。
- **上下文**：messages 超阈值时截断早期轮次（简版，先不做摘要）。
- **重试**：LLM API 429/超时，指数退避重试 2 次。
- **终止**：`MAX_TURNS`（如 15）防死循环；超限发 `done` + 提示。
- **验收**：故意触发一次 LLM 超时，loop 重试后恢复或优雅 `done`，不挂死。

---

## ■ 7 · AgentRuntime 收敛（`T4.7`）

**目标**：把自建 loop 和 mock 统一到一个接口下，前端/bridge 无感切换——这是"运行时可替换"的落地。

```ts
export interface AgentRuntime {
  readonly name: string;                       // "local-loop" | "fake"
  run(input: string, ctx: RunContext): AsyncIterable<AgentEvent>;
}
// LocalLoopRuntime = 包 runAgentLoop（T4.3）  ← v0.3 默认
// FakeRuntime      = MockLLMClient 驱动       ← CI 兜底
```

- bridge 通过 `AgentRuntime` 接口调用，默认 `LocalLoopRuntime`。
- **验收**：bridge 能在 `local-loop` / `fake` 间切换，前端渲染一致。

---

## ■ 验收（M4 出口，接开发计划）

- [ ] 真 loop（CodeBuddy）流 vs mock 流，前端三栏渲染一致（**前端零改动**）
- [ ] 用户一句话 → LLM 决策 → MCP 工具执行 → 事件回流 → 三栏实时
- [ ] 工具出参与 `verify:tools` fixture 一致（五工具名一字不差）
- [ ] edit 后自动 `check_schema` 复验（流程控制生效）
- [ ] 缺 `CODEBUDDY_API_KEY` 时优雅降级（回退 mock 或明确报错，不白屏）
- [ ] `tsc --noEmit` 零报错；`AgentRuntime` 能在 local-loop/fake 间切

---

## ■ 复用清单（这些一行别重写，重写就是浪费）

| 已有资产 | 在自建 loop 里的角色 |
|---|---|
| `agent-protocol` 的 `AgentEvent` | loop 的产出契约，前端零改动靠它 |
| `hutian-seo-mcp` 五工具 + 出参/错误模型 | loop 经 MCP 调用，逻辑不动 |
| `streamReducer` / 前端组件 | 消费 AgentEvent，不动 |
| `verify:tools` / `__fixtures__` | 工具出参回归基线，继续守门 |
| `verify:sanitize` / sanitize.ts | schema 清洗规则单测门禁，守 OpenAI 兼容性 |
| skills/agents 正文 | 转成 system prompt + T4.4 硬编码（**转化，不是丢弃**） |

---

## ■ 给 Trae 的坑提醒

1. **CodeBuddy tool calling**：用 `deepseek-v4-flash`（V4 Flash，OpenAI Responses 兼容）。模型 ID 必须用 TokenHub 的"model 参数值"列，不是商品名（如 `kimi-k2.5` 不是 `kimi-2.5`）。格式是 OpenAI 兼容的 `tools` + `tool_calls`。
2. **MCP client**：TS 侧用 `@modelcontextprotocol/sdk` 的 stdio Client 连 `hutian-seo-mcp`（`pip install -e .` 后的命令），已验证可用。
3. **key 安全**：`CODEBUDDY_API_KEY` 只放 bridge env，**绝不下前端**（NFR-05）。
4. **别动前端契约**：loop 产出必须是现有 `AgentEvent` 的 12 个 type，不许新增 type 逼前端改（要新增先同步三方，接开发计划 §9 变更机制）。
5. **diff/terminal/artifact 事件**：自建 loop 下，`edit_file` 的 diff 要 loop 自己从工具返回派生成 `diff` 事件（前端 FR-W06 的 Diff 闪靠它）。MVP 若暂不实现 edit_file，可先让 LLM 输出 JSON-LD 文本、loop 包成 `message`，Diff 联动放后面。

---

## 收尾：跑通发我什么

按 T4.1→T4.7 顺序做，**T4.3 用 MockLLM 先验 loop 骨架**（不卡 key），有 CodeBuddy key 后跑真闭环。每个 T 完成发我对应验收证据（事件流 JSON / 前端截图 / tsc 输出），我做对照 review。

需要你（产品）现在拍的，别拖到 T4.5 之后：① **CodeBuddy key**（没有就先用 MockLLM 做 T4.1–T4.4）；② 确认 **MVP 是否要 edit_file 的 Diff 联动**（要，则 T4.4/T4.5 多一块；不要，则 LLM 先输出 JSON-LD 文本，Diff 放 v1.0）。这两个定了，Trae 就能一路推到真闭环。

grok 作为 agent host 的路线已放弃（headless 输出/TUI/Free 档无解），但 GrokClient 已保留为可选 LLM 后端。经本地 CLIProxyAPI 接入后，loop 零改动即可切换。默认仍走 CodeBuddy；grok 优先需本地探针 GREEN 后设置 `LLM_PROVIDER=grok`。
