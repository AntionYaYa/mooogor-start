import { browser } from "wxt/browser";

type TraceValue = string | number | boolean | null | undefined;
type TraceDetails = Record<string, TraceValue>;
const traceSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Sends a best-effort new-tab checkpoint to the service worker.
 * Diagnostics must never delay or change new-tab initialization.
 */
export function traceNewTab(phase: string, details: TraceDetails = {}) {
  void browser.runtime
    .sendMessage({
      type: "newTabTrace",
      payload: {
        sessionId: traceSessionId,
        phase,
        at: Date.now(),
        details,
      },
    })
    .catch(() => undefined);
}

export function traceError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
