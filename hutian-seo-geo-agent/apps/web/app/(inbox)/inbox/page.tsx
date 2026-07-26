"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  inboxReducer,
  initialInboxState,
  getAckProc,
} from "@/lib/inbox-reducer";
import MailboxList from "@/components/inbox/MailboxList";
import MailList from "@/components/inbox/MailList";
import MailReader from "@/components/inbox/MailReader";
import TopBar from "@/components/inbox/TopBar";

/**
 * 站长协作收件箱主页. ← v0.2 / PRD §4.3
 *
 * 三栏布局：左栏（MailboxList）· 中栏（MailList）· 右栏（MailReader）。
 *
 * 批复回流机制（v0.2 不接真 bridge，本地模拟）：
 *   1. 用户点快捷批复 → dispatch approval → 追加"我的回复"+processing 占位
 *   2. POST /api/inbox/[id]/reply（占位路由，v0.3 接 agent-bridge 时改为真 bridge）
 *   3. 1.5s 后 dispatch approval_ack → 追加 Agent 回执 + 证据卡
 *
 * 数据契约对齐 agent-protocol：approval / approval_ack 即未来 SSE 事件，
 * v0.3 替换 setTimeout 为 EventSource 即可无缝接入。
 */

type Filter = "all" | "approve" | "diag" | "report" | "unread";

export default function InboxPage() {
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const [filter, setFilter] = useState<Filter>("all");
  const [replyDraft, setReplyDraft] = useState("");
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理 ack 定时器
  useEffect(() => {
    return () => {
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
    };
  }, []);

  const handleSelectMail = useCallback((mailId: string) => {
    dispatch({ type: "select_mail", mailId });
    setReplyDraft("");
  }, []);

  /**
   * 批复 → 真的 POST /api/inbox/[id]/reply（占位路由）
   * + 本地 setTimeout 模拟 Agent 回流（v0.3 接 SSE 后移除）
   */
  const handleApproval = useCallback(
    (action: string, label: string, replyText?: string) => {
      const mailId = state.selectedMailId;
      if (!mailId) return;

      // 1) 立即 dispatch approval（追加我的回复 + processing 占位）
      dispatch({ type: "approval", mailId, action, label, replyText });
      setReplyDraft("");

      // 2) 模拟 Agent 处理延迟后回执（v0.2 本地模拟，不依赖网络）
      //    放在 fetch 之前，确保回执不会被网络阻塞
      const proc = getAckProc(action);
      const delay = proc ? 1500 : 500;
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
      ackTimerRef.current = setTimeout(() => {
        dispatch({ type: "approval_ack", mailId, action });
      }, delay);

      // 3) POST 到占位路由（v0.3 接真 bridge 时改为 SSE 订阅）
      //    fire-and-forget，失败不影响本地 mock 回流
      void fetch(`/api/inbox/${mailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, label, replyText }),
      }).catch(() => {
        // 占位路由失败不影响本地 mock 回流
      });
    },
    [state.selectedMailId],
  );

  const handleSendReply = useCallback(() => {
    const text = replyDraft.trim();
    if (!text) return;
    handleApproval("text", text, text);
  }, [replyDraft, handleApproval]);

  // 列表过滤
  const filteredMails = state.mails.filter((m) => {
    if (filter === "all") return true;
    if (filter === "unread") return m.unread;
    return m.category === filter;
  });

  const selectedThread = state.selectedMailId
    ? state.threads[state.selectedMailId] ?? []
    : [];
  const selectedMail = state.mails.find(
    (m) => m.id === state.selectedMailId,
  );

  return (
    <div className="relative z-10 flex h-screen flex-col">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：邮箱分类 */}
        <MailboxList mails={state.mails} />

        {/* 中栏：邮件列表 */}
        <MailList
          mails={filteredMails}
          allMailsCount={state.mails.length}
          unreadCount={state.mails.filter((m) => m.unread).length}
          selectedId={state.selectedMailId}
          filter={filter}
          onFilterChange={setFilter}
          onSelectMail={handleSelectMail}
        />

        {/* 右栏：邮件阅读器 */}
        <MailReader
          mail={selectedMail ?? null}
          thread={selectedThread}
          processing={state.processing}
          replyDraft={replyDraft}
          onReplyDraftChange={setReplyDraft}
          onApproval={handleApproval}
          onSendReply={handleSendReply}
        />
      </div>
    </div>
  );
}
