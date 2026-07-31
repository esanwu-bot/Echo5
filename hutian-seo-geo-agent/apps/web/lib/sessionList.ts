"use client";

/**
 * 会话列表存储（localStorage 持久化，按 user_id 分桶）。
 *
 * 为什么不用后端 agent-bridge：
 *   - 当前 agent-bridge 的 sessions / sessionHistories 都是内存 Map，无 GET /sessions 接口
 *   - bridge 重启即蒸发，无法满足"跨刷新恢复会话列表"的最小闭环
 *   - v2 持久化到 hutian 库 + 多端同步另排，这版用 localStorage 做"账号可见自己历史"的闭环
 *
 * 真相源：localStorage key = hutian_session_list_v1:<user_id>
 *   - 未登录（user_id=null）：只用 KEY_UNLOGGED（公共桶，不跨账号）
 *   - 已登录（user_id=123）：用 KEY_PREFIX + 123，账号隔离，登出不清列表（保留）
 * 标题生成规则：从首轮 user prompt 摘前 20 字，空白折到 15 字
 * 时间：会话创建时 Date.now()，前端按相对时间格式化（刚刚/分前/小时前/天前/日期）
 */

export interface SessionListItem {
  id: string;          // sessionId（从 POST /api/sessions 拿到的桥端 id）
  title: string;       // 从首轮 user prompt 摘（≤20 字），展示用
  createdAt: number;   // 创建时间 ms（Date.now()）
  lastActiveAt: number;// 最后一次活动 ms（任何工具/消息产出都更新，用于相对时间）
  toolCount: number;   // 已完成工具数（streamState.tools.filter(done).length 快照）
  /**
   * 未同步标记（登录态专用）：
   *   - true  = 本地有但远程写入失败/未确认，下次 listSessionsRemote 成功后会比对清除
   *   - false/undefined = 已同步或未登录态（未登录不关心同步）
   * UI 侧：Sidebar 在会话项上显示橙色小点提示"未同步"
   */
  dirty?: boolean;
}

const KEY_PREFIX = "hutian_session_list_v1:";
const KEY_UNLOGGED = "hutian_session_list_v1:unlogged";
const MAX_ITEMS = 50;    // 最多保留 50 条，超出按 createdAt 淘汰最旧的
const TITLE_MAX = 20;    // 标题最长字符

function keyFor(userId: number | null): string {
  return userId == null ? KEY_UNLOGGED : `${KEY_PREFIX}${userId}`;
}

function readRaw(userId: number | null): SessionListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const s = window.localStorage.getItem(keyFor(userId));
    if (!s) return [];
    const arr = JSON.parse(s) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is SessionListItem =>
      x != null &&
      typeof (x as SessionListItem).id === "string" &&
      typeof (x as SessionListItem).title === "string" &&
      typeof (x as SessionListItem).createdAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(userId: number | null, list: SessionListItem[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
      .slice(0, MAX_ITEMS);
    window.localStorage.setItem(keyFor(userId), JSON.stringify(trimmed));
  } catch {
    /* localStorage 可能禁用 / 配额满，静默失败即可，会话列表不影响主链路 */
  }
}

/** 从 prompt 生成标题：trim 后取前 20 字，换行/多空格合并为单空格 */
export function titleFromPrompt(prompt: string): string {
  const oneLine = prompt.replace(/\s+/g, " ").trim();
  if (!oneLine) return "新会话";
  if (oneLine.length <= TITLE_MAX) return oneLine;
  return oneLine.slice(0, TITLE_MAX) + "…";
}

/**
 * 相对时间格式化（UI 侧直接用，不引 dayjs，避免加依赖）。
 *   - <1min: 刚刚
 *   - <1h:  N 分钟前
 *   - <24h: N 小时前
 *   - <7d:  N 天前
 *   - else: YYYY-MM-DD
 */
export function formatRelativeTime(ts: number, nowMs?: number): string {
  const now = nowMs ?? Date.now();
  const diff = Math.max(0, now - ts);
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** 列所有会话（按 lastActiveAt 倒序）—— 组件渲染用 */
export function listSessions(userId: number | null): SessionListItem[] {
  return readRaw(userId).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

/**
 * 首次发消息时注册会话：若 id 不存在则 push，存在则只刷新 lastActiveAt。
 * 标题只在首次注册时赋值（首轮 user prompt），后续更新不改标题。
 */
export function registerSession(
  id: string,
  userId: number | null,
  opts: { titleFromFirstPrompt: string; toolCount?: number },
): SessionListItem {
  const list = readRaw(userId);
  const idx = list.findIndex((s) => s.id === id);
  const now = Date.now();
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      lastActiveAt: now,
      toolCount: opts.toolCount ?? list[idx].toolCount,
    };
  } else {
    list.unshift({
      id,
      title: titleFromPrompt(opts.titleFromFirstPrompt),
      createdAt: now,
      lastActiveAt: now,
      toolCount: opts.toolCount ?? 0,
    });
  }
  writeRaw(userId, list);
  return list.find((s) => s.id === id)!;
}

/** 刷新最后活动时间 + 工具数快照（每次 tool_end / message 产出后调用一次即可，节流靠调用方） */
export function touchSession(
  id: string,
  userId: number | null,
  toolCount: number,
): void {
  const list = readRaw(userId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], lastActiveAt: Date.now(), toolCount };
  writeRaw(userId, list);
}

/**
 * 标记单条会话 dirty=true/false（登录态远程写入失败时打 true，远程拉成功后清 false）。
 * 仅改 dirty 字段，不动 lastActiveAt/toolCount，避免污染时间线。
 */
export function markSessionDirty(
  id: string,
  userId: number | null,
  dirty: boolean,
): void {
  const list = readRaw(userId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], dirty };
  writeRaw(userId, list);
}

/** 单条改标题（用户右键改名预留，目前 UI 不暴露） */
export function renameSession(
  id: string,
  userId: number | null,
  title: string,
): void {
  const list = readRaw(userId);
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], title };
  writeRaw(userId, list);
}

/**
 * 登出时迁移未登录桶里的内容到新登录用户桶？
 *   → 默认不迁。规则：未登录产生的历史留在 unlogged 桶，登录后从新桶空开始；
 *   用户登出回到未登录态时，未登录桶内容仍在。
 *   若未来要"登录后合并"，在 login 成功回调里手动调 mergeUnloggedTo(userId) 即可。
 */
export function mergeUnloggedTo(userId: number): number {
  const unlogged = readRaw(null);
  if (unlogged.length === 0) return 0;
  const logged = readRaw(userId);
  const existingIds = new Set(logged.map((s) => s.id));
  const merged = [...unlogged.filter((s) => !existingIds.has(s.id)), ...logged];
  writeRaw(userId, merged);
  // 迁完后清空 unlogged（避免下次再迁）
  writeRaw(null, []);
  return merged.length - logged.length;
}

// ════════════════════════════════════════════════════
// 远程同步层（登录态走 tenant-api /portal/api/v1/sessions，跨设备持久化）
// 未登录 → 仍走上面的 localStorage 分桶
// ════════════════════════════════════════════════════

import { fetchWithAuth } from "@/lib/portal/auth";

/** 从后端 UserSession 行映射到前端 SessionListItem */
function fromRemote(r: RemoteUserSession): SessionListItem {
  return {
    id: r.session_id,
    title: r.title || "新会话",
    createdAt: new Date(r.created_at).getTime(),
    lastActiveAt: new Date(r.updated_at).getTime(),
    toolCount: r.tool_count || 0,
  };
}

/** 后端 user_sessions 表行的 JSON 形状 */
interface RemoteUserSession {
  session_id: string;
  title: string;
  tool_count: number;
  created_at: string;
  updated_at: string;
}

/** 远程同步状态（UI 可观测性用） */
export type SessionSyncStatus =
  | "synced"     // 远程拉成功，列表来自云端
  | "offline"    // 远程网络错，回退本地（离线）
  | "unauthed"   // cookie 失效 / 401，回退本地
  | "server_error"; // 后端 5xx，回退本地

export interface RemoteListResult {
  list: SessionListItem[];
  status: SessionSyncStatus;
}

/**
 * 拉取远程会话列表（登录态专用）。
 *   GET /portal/api/v1/sessions → { data: RemoteUserSession[] }
 * 返回 { list, status }，status 告诉 UI 同步是否成功（用于徽标/toast，避免静默降级=假成功）。
 *
 * 比对清除 dirty 标记：远程拉成功后，远程已存在的会话视为"已同步"，清掉本地 dirty=true；
 * 远程没有但本地有的（dirty=true）保留在返回列表末尾，UI 仍可见但带"未同步"提示。
 */
export async function listSessionsRemote(
  userId: number,
): Promise<RemoteListResult> {
  try {
    const resp = await fetchWithAuth("/portal/api/v1/sessions", { method: "GET" });
    if (resp.status === 401) {
      // 401：fetchWithAuth 已清 user，这里回退本地 + 标记 unauthed
      return { list: listSessions(userId), status: "unauthed" };
    }
    if (!resp.ok) {
      return { list: listSessions(userId), status: "server_error" };
    }
    const json = (await resp.json()) as { data?: RemoteUserSession[] };
    const remoteList = (json.data ?? []).map(fromRemote);
    const remoteIds = new Set(remoteList.map((s) => s.id));

    // 远程有的 → 清 dirty（已同步）；远程没有但本地 dirty=true 的 → 追加到列表末尾保留可见
    const local = readRaw(userId);
    const localOnlyDirty = local.filter(
      (s) => !remoteIds.has(s.id) && s.dirty === true,
    );
    // 批量清 dirty（远程已确认的会话）
    for (const s of local) {
      if (remoteIds.has(s.id) && s.dirty === true) {
        markSessionDirty(s.id, userId, false);
      }
    }

    const merged = [...remoteList, ...localOnlyDirty].sort(
      (a, b) => b.lastActiveAt - a.lastActiveAt,
    );
    return { list: merged, status: "synced" };
  } catch {
    // 网络错 → 回退 localStorage + 标记 offline
    return { list: listSessions(userId), status: "offline" };
  }
}

/**
 * 注册/更新会话到远程（登录态专用）。
 *   POST /portal/api/v1/sessions { session_id, title, tool_count }
 * 同时写 localStorage 做离线缓存（后端挂了本地仍能看到）。
 *
 * 失败标记：远程写失败/返回非 2xx 时打 dirty=true，UI 显示"未同步"小点；
 * 下次 listSessionsRemote 成功后比对远程列表，远程已有则清 dirty。
 */
export async function registerSessionRemote(
  id: string,
  userId: number,
  opts: { titleFromFirstPrompt: string; toolCount?: number },
): Promise<SessionListItem> {
  // 先写 localStorage（离线缓存，同步立即可见）
  const local = registerSession(id, userId, opts);

  // 异步推远程（不阻塞 UI；失败时打 dirty 标记，UI 可观测）
  try {
    const resp = await fetchWithAuth("/portal/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: id,
        title: titleFromPrompt(opts.titleFromFirstPrompt),
        tool_count: opts.toolCount ?? 0,
      }),
    });
    if (!resp.ok) {
      markSessionDirty(id, userId, true);
    }
  } catch {
    markSessionDirty(id, userId, true);
  }
  return local;
}

/**
 * 刷新远程会话的 tool_count + lastActiveAt（登录态专用）。
 * 防抖策略：调用方节流（如每 5s 最多一次），这里不做。
 *
 * 失败标记：同 registerSessionRemote，失败打 dirty=true。
 */
export async function touchSessionRemote(
  id: string,
  userId: number,
  toolCount: number,
): Promise<void> {
  // 先写 localStorage
  touchSession(id, userId, toolCount);

  // 异步推远程
  try {
    const resp = await fetchWithAuth("/portal/api/v1/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: id,
        tool_count: toolCount,
      }),
    });
    if (!resp.ok) {
      markSessionDirty(id, userId, true);
    }
  } catch {
    markSessionDirty(id, userId, true);
  }
}

/**
 * 批量迁移未登录桶的会话到远程用户桶（登录成功时调用）。
 *   - 先调 mergeUnloggedTo(userId) 把 unlogged 桶合入 localStorage 用户桶
 *   - 再把用户桶里所有会话逐条 POST 到远程（已存在的后端 upsert 跳过）
 *   - 返回成功迁移的条数
 *
 * 失败容忍：单条失败不阻断其他条，最终返回成功数；
 * 全部失败也不阻断登录（localStorage 已有数据，下次 listSessionsRemote 会拉到本地缓存的）。
 */
export async function migrateLocalToRemote(userId: number): Promise<{
  migrated: number;
  failed: number;
}> {
  // 1. 合并 unlogged → userId 桶
  mergeUnloggedTo(userId);
  // 2. 读 userId 桶所有会话
  const localSessions = listSessions(userId);
  if (localSessions.length === 0) {
    return { migrated: 0, failed: 0 };
  }
  // 3. 逐条 POST 到远程（容忍单条失败）
  let migrated = 0;
  let failed = 0;
  for (const s of localSessions) {
    try {
      const resp = await fetchWithAuth("/portal/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: s.id,
          title: s.title,
          tool_count: s.toolCount,
        }),
      });
      if (resp.ok) {
        migrated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { migrated, failed };
}
