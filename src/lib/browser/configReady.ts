import { browser } from "wxt/browser";

const CONFIG_CLIENT_LOG_PREFIX = "[Mooogor Config Client]";

type ConfigReadyResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
};

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function validateResponse(response: unknown): asserts response is ConfigReadyResponse {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid ensureConfigReady response");
  }
  const result = response as Partial<ConfigReadyResponse>;
  if (result.ok !== true) {
    throw new Error(
      result.error || "Background configuration initialization failed",
    );
  }
}

export async function ensureConfigReady(): Promise<void> {
  const startedAt = Date.now();
  const requestId = createRequestId();
  try {
    const response = await browser.runtime.sendMessage({
      type: "ensureConfigReady",
      requestId,
    });
    validateResponse(response);
  } catch (error) {
    console.error(CONFIG_CLIENT_LOG_PREFIX, "failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: getErrorMessage(error),
    });
    throw error;
  }
}
