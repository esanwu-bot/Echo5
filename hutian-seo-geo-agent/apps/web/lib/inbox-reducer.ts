import type {
  EmailMeta,
  EmailLetter,
  EvidenceCard,
} from "@hutian/agent-protocol";
import { inboxMails, inboxThreads } from "./inbox-data";

/**
 * Inbox 状态机.  ← v0.2 inbox 协作流
 *
 * 数据流：
 *   approval_request (Agent) → 添加邮件/线程
 *   approval          (用户点按快捷) → dispatch + 占位 processing letter
 *   approval_ack      (Agent 回执) → 追加回执信 + 证据卡 + 清 processing
 *
 * v0.2 不接真 bridge，approval_ack 由本地 setTimeout 模拟"事件回流"。
 * 数据结构对齐 agent-protocol，v0.3 接 agent-bridge 时只需把 setTimeout 换成 SSE。
 */

/** 批复动作 → 回执文案与附加证据（模拟 Agent 回流，与原型 REPLY_MAP 一致） */
const ACK_MAP: Record<
  string,
  { proc: string; ack: string; evidence?: EvidenceCard[] }
> = {
  approve: {
    proc: "壶天 正在写入补丁并提交站点地图…",
    ack: "已写入 schema/product.jsonld（+9 / −2），IndexNow 已提交，预计 40 分钟再索引完成。",
    evidence: [
      { type: "attach", file: "schema/product.jsonld", size: "1.2 KB · 已写入" },
    ],
  },
  write: {
    proc: "壶天 正在写盘并补 301 重定向…",
    ack: "已写盘 428 处，301 重定向规则已写入 redirects.conf，品牌实体切换完成。",
  },
  diff: {
    proc: "壶天 正在展开完整 diff…",
    ack: "完整 diff 已附在上方卡片（20 行，+9 / −2）。确认无误可回复\"批准补齐\"。",
  },
  list: {
    proc: "壶天 正在整理清单…",
    ack: "清单已附为附件 list.md，含排除路径明细。",
  },
  arch:  { proc: "", ack: "已归档至「周报」。" },
  defer: { proc: "", ack: "已记入 backlog，不会自动执行。需要时随时叫我。" },
  cancel:{ proc: "", ack: "已取消本次更名，未做任何写盘。" },
  pdf:   { proc: "壶天 正在生成 PDF…",     ack: "PDF 已生成：geo-report-w30.pdf（已附下载）。" },
  sub:   { proc: "", ack: "已订阅：每周一 09:00 自动推送 GEO 周报到收件箱。" },
  text:  { proc: "壶天 正在处理你的回复…", ack: "收到，已按你的说明调整并记录。如有写盘动作我会再次征求你确认。" },
};

export interface InboxState {
  mails: EmailMeta[];
  threads: Record<string, EmailLetter[]>;
  selectedMailId: string | null;
  /** 正在处理的批复（按 mailId 索引；同时只允许一个，UX 约束） */
  processing: { mailId: string; text: string } | null;
}

export const initialInboxState: InboxState = {
  // 默认选中第一封并标已读，避免 useEffect 闭包陷阱（[] 依赖下 dispatch 拿不到 state）
  mails: inboxMails.map((m, i) =>
    i === 0 ? { ...m, unread: false } : m,
  ),
  threads: inboxThreads,
  selectedMailId: inboxMails[0]?.id ?? null,
  processing: null,
};

export type InboxAction =
  | { type: "select_mail"; mailId: string }
  | { type: "approval"; mailId: string; action: string; label: string; replyText?: string }
  | { type: "approval_ack"; mailId: string; action: string }
  | { type: "set_filter"; filter: string };

export function inboxReducer(
  state: InboxState,
  action: InboxAction,
): InboxState {
  switch (action.type) {
    case "select_mail": {
      // 标记已读
      const mails = state.mails.map((m) =>
        m.id === action.mailId ? { ...m, unread: false } : m,
      );
      return { ...state, mails, selectedMailId: action.mailId };
    }

    case "approval": {
      const { mailId, action: act, label, replyText } = action;
      const map = ACK_MAP[act] ?? ACK_MAP.text;

      // 1) 追加"我的回复"信件
      const myLetter: EmailLetter = {
        id: `${mailId}-me-${Date.now()}`,
        who: "me",
        when: "刚刚",
        badge: "回复",
        textHtml: `<p>${replyText ?? label}</p>`,
      };
      const thread = state.threads[mailId] ?? [];
      const threads = {
        ...state.threads,
        [mailId]: [...thread, myLetter],
      };

      // 2) 若有处理中文案，加 processing 占位
      const processing = map.proc
        ? { mailId, text: map.proc }
        : null;

      return { ...state, threads, processing };
    }

    case "approval_ack": {
      const { mailId, action: act } = action;
      const map = ACK_MAP[act] ?? ACK_MAP.text;

      // 追加 Agent 回执信件
      const ackLetter: EmailLetter = {
        id: `${mailId}-ack-${Date.now()}`,
        who: "agent",
        when: "刚刚",
        badge: "回执",
        textHtml: `<p>${map.ack}</p>`,
        evidence: map.evidence,
      };
      const thread = state.threads[mailId] ?? [];
      const threads = {
        ...state.threads,
        [mailId]: [...thread, ackLetter],
      };

      return { ...state, threads, processing: null };
    }

    case "set_filter":
      // filter 仅前端展示控制，不影响数据
      return state;

    default:
      return state;
  }
}

/** 查批复动作对应的处理中文案（外部用于模拟 SSE 延迟回流） */
export function getAckProc(action: string): string {
  return (ACK_MAP[action] ?? ACK_MAP.text).proc;
}

/** 查批复动作对应的回执文案（用于离线验证） */
export function getAckText(action: string): string {
  return (ACK_MAP[action] ?? ACK_MAP.text).ack;
}
