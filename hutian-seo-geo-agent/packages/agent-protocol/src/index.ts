export type PlanStatus = "pending" | "now" | "ok";
export interface PlanItem { text: string; status: PlanStatus }
export interface StatItem { label: string; value: number; prefix?: string; suffix?: string; dec?: number; accent: "amber"|"teal"|"violet"|"green"; sub?: string }
export interface DiffData { file: string; additions: number; deletions: number; lines: { no: number; text: string; kind: "ctx"|"add"|"del" }[] }
export interface ArtifactData { file: string; size: string; status: string; kind: "mod"|"add" }
export type AgentEvent =
  | { type: "meta"; totalTools: number }
  | { type: "thinking"; on: boolean }
  | { type: "message"; role: "user"|"agent"; content: string }
  | { type: "plan"; items: string[] }
  | { type: "plan_update"; done: number; current: number }
  | { type: "tool_start"; id: string; name: string; args: string }
  | { type: "tool_end"; id: string; ok: boolean; durationMs: number; output: unknown }
  | { type: "diff"; data: DiffData }
  | { type: "terminal"; line: string }
  | { type: "artifact"; data: ArtifactData }
  | { type: "stats"; items: StatItem[] }
  | { type: "done" };