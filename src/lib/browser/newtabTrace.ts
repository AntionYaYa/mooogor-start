import { browser } from "wxt/browser";

type TraceValue = string | number | boolean | null | undefined;
type TraceDetails = Record<string, TraceValue>;

/**
 * Sends a best-effort new-tab checkpoint to the service worker.
 * Diagnostics must never delay or change new-tab initialization.
 */
export function traceNewTab(phase: string, details: TraceDetails = {}) {
  void browser.runtime
    .sendMessage({
      type: "newTabTrace",
      payload: {
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
