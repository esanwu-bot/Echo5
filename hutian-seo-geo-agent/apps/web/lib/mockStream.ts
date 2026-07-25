import type { AgentEvent } from "@hutian/agent-protocol";
import { demoEvents } from "./demo-events";

/**
 * Replay the demo timeline (apps/web/lib/demo-events.ts) on a delay schedule.
 * Used by `useAgentSession("mock")` so the workbench can play a full mock run
 * with zero backend.  ← 技术方案 §8 mock 时间线编排
 *
 * @returns a cancel function that clears all pending timers.
 */
export function mockStream(
  onEvent: (event: AgentEvent) => void,
): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let acc = 0;

  for (const entry of demoEvents) {
    acc += entry.delay;
    const { delay: _delay, ...event } = entry;
    timers.push(
      setTimeout(() => {
        if (!cancelled) onEvent(event);
      }, acc),
    );
  }

  return () => {
    cancelled = true;
    for (const t of timers) clearTimeout(t);
  };
}
