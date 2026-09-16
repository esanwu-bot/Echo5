import type {
  AgentEvent,
  PlanItem,
  StatItem,
  DiffData,
  ArtifactData,
  ArtifactEvent,
} from "@hutian/agent-protocol";

/**
 * Stream state for the workbench.  ← 技术方案 §5 状态机
 *
 * The reducer is a pure function over AgentEvent; the UI only renders this
 * state. Per §5: `thinking` is a singleton — it clears whenever a new message
 * or tool call arrives.
 */

export interface ToolCallState {
  id: string;
  name: string;
  args: string;
  status: "running" | "done";
  ok?: boolean;
  durationMs?: number;
  output?: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  ts: string;
}

export interface TerminalLine {
  id: string;
  html: string;
}

export type PanelTab = "diff" | "preview" | "term" | "arts";

/** 统一时间线条目 — 按 §5 "按 type 追加/更新 timeline" 原则，保证消息/工具交错顺序 */
export type TimelineEntry =
  | { kind: "message"; id: string }
  | { kind: "tool"; id: string }
  | { kind: "plan" }
  | { kind: "stats" };

export interface StreamState {
  totalTools: number;
  thinking: boolean;
  messages: ChatMessage[];
  planItems: PlanItem[];
  tools: ToolCallState[];
  diffs: DiffData[];
  terminalLines: TerminalLine[];
  artifacts: ArtifactData[];
  /**
   * v0.3: 富 artifact（artifact_created 事件），含完整 data 供右栏报告视图渲染。
   *
   * ⚠️ MVP 债：artifactEvents 随 session 内存态存在，页面刷新即丢失。
   * 持久化需落 DB（接 project_events 或独立 artifacts 表），另排期实现。
   * 与 sessionHistories 同级别内存态，不影响会话列表（Sidebar）的本地持久化。
   */
  artifactEvents: ArtifactEvent[];
  stats: StatItem[];
  activePanel: PanelTab;
  agentRunning: boolean;
  done: boolean;
  /** 渲染顺序真相源：ChatStream 按 timeline 顺序渲染消息与工具块 */
  timeline: TimelineEntry[];
}

export const initialStreamState: StreamState = {
  totalTools: 0,
  thinking: false,
  messages: [],
  planItems: [],
  tools: [],
  diffs: [],
  terminalLines: [],
  artifacts: [],
  artifactEvents: [],
  stats: [],
  activePanel: "diff",
  agentRunning: false,
  done: false,
  timeline: [],
};

let _idCounter = 0;
const uid = () => `${Date.now()}-${_idCounter++}`;
const now = () =>
  typeof Intl !== "undefined"
    ? new Date().toTimeString().slice(0, 5)
    : "";

/** UI 派发动作（非 AgentEvent，仅前端使用，如手动切换右栏标签 / 新建会话） */
export type UiAction =
  | { type: "set_panel"; tab: PanelTab }
  | { type: "reset" };

/** reducer 接受 AgentEvent（流式事件）或 UiAction（本地 UI 动作） */
export function streamReducer(
  state: StreamState,
  event: AgentEvent | UiAction,
): StreamState {
  switch (event.type) {
    case "set_panel":
      return { ...state, activePanel: event.tab };
    case "reset":
      // 新建会话：清空所有状态，回到 initialStreamState
      return initialStreamState;
    case "meta":
      return {
        ...state,
        totalTools: event.totalTools,
        agentRunning: true,
        done: false,
      };

    case "thinking":
      return { ...state, thinking: event.on };

    case "message": {
      // §5: thinking clears when a new message arrives.
      const msgId = uid();
      return {
        ...state,
        thinking: false,
        messages: [
          ...state.messages,
          { id: msgId, role: event.role, content: event.content, ts: now() },
        ],
        timeline: [...state.timeline, { kind: "message", id: msgId }],
      };
    }

    case "plan":
      return {
        ...state,
        planItems: event.items.map((text) => ({
          text,
          status: "pending" as const,
        })),
        timeline: [...state.timeline, { kind: "plan" }],
      };

    case "plan_update":
      return {
        ...state,
        planItems: state.planItems.map((item, i) => ({
          ...item,
          status:
            i < event.done
              ? ("ok" as const)
              : i === event.current
                ? ("now" as const)
                : ("pending" as const),
        })),
      };

    case "tool_start":
      // §5: thinking clears when a tool starts.
      return {
        ...state,
        thinking: false,
        tools: [
          ...state.tools,
          {
            id: event.id,
            name: event.name,
            args: event.args,
            status: "running",
          },
        ],
        timeline: [...state.timeline, { kind: "tool", id: event.id }],
      };

    case "tool_end":
      return {
        ...state,
        tools: state.tools.map((t) =>
          t.id === event.id
            ? {
                ...t,
                status: "done",
                ok: event.ok,
                durationMs: event.durationMs,
                output: event.output,
              }
            : t,
        ),
      };

    case "diff":
      return {
        ...state,
        diffs: [...state.diffs, event.data],
        activePanel: "diff",
      };

    case "terminal":
      // UX: submit 阶段输出部署日志时，右栏自动切到终端（原型节奏）
      return {
        ...state,
        terminalLines: [
          ...state.terminalLines,
          { id: uid(), html: event.line },
        ],
        activePanel: "term",
      };

    case "artifact":
      return {
        ...state,
        artifacts: [...state.artifacts, event.data],
        activePanel: "arts",
      };

    case "artifact_created": {
      // 按 artifact_id 去重（SSE 重连可能重复推送同一 artifact）
      const exists = state.artifactEvents.some(
        (a) => a.artifact_id === event.artifact_id,
      );
      if (exists) return state;
      return {
        ...state,
        artifactEvents: [...state.artifactEvents, event],
        activePanel: "arts",
      };
    }

    case "stats":
      return {
        ...state,
        stats: event.items,
        timeline: [...state.timeline, { kind: "stats" }],
      };

    case "done":
      return {
        ...state,
        agentRunning: false,
        thinking: false,
        done: true,
      };

    default:
      return state;
  }
}
