import { browser } from "wxt/browser";

export const LOCAL_STORAGE_RUNTIME_KEY =
  "mooogor.local-storage-runtime.v1";

export type LocalStorageHealthState = {
  phase: "idle" | "error";
  errorCode: "quota" | "write" | null;
  lastFailureAt: number | null;
};

const IDLE_STATE: LocalStorageHealthState = {
  phase: "idle",
  errorCode: null,
  lastFailureAt: null,
};

function normalizeState(value: unknown): LocalStorageHealthState {
  if (!value || typeof value !== "object") return IDLE_STATE;
  const candidate = value as Partial<LocalStorageHealthState>;
  if (candidate.phase !== "error") return IDLE_STATE;
  return {
    phase: "error",
    errorCode: candidate.errorCode === "quota" ? "quota" : "write",
    lastFailureAt:
      typeof candidate.lastFailureAt === "number"
        ? candidate.lastFailureAt
        : null,
  };
}

function classifyError(error: unknown): LocalStorageHealthState["errorCode"] {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|quota_bytes|max.*bytes|exceed/i.test(message)
    ? "quota"
    : "write";
}

async function updateSession(
  state: LocalStorageHealthState | null,
): Promise<void> {
  try {
    if (state) {
      await browser.storage.session.set({ [LOCAL_STORAGE_RUNTIME_KEY]: state });
    } else {
      await browser.storage.session.remove(LOCAL_STORAGE_RUNTIME_KEY);
    }
    return;
  } catch {
    // Content scripts cannot access storage.session by default. Let the
    // background, which is a trusted extension context, persist the status.
  }
  try {
    await browser.runtime.sendMessage({
      type: "updateLocalStorageHealth",
      state,
    });
  } catch {
    // Reporting must never replace the original storage operation result.
  }
}

export async function getLocalStorageHealth(): Promise<LocalStorageHealthState> {
  try {
    const stored = await browser.storage.session.get(LOCAL_STORAGE_RUNTIME_KEY);
    return normalizeState(stored[LOCAL_STORAGE_RUNTIME_KEY]);
  } catch {
    return IDLE_STATE;
  }
}

export async function reportLocalStorageWriteFailure(error: unknown) {
  await updateSession({
    phase: "error",
    errorCode: classifyError(error),
    lastFailureAt: Date.now(),
  });
}

export async function clearLocalStorageWriteFailure() {
  await updateSession(null);
}

export async function persistLocalStorageHealthUpdate(state: unknown) {
  if (state === null) {
    await browser.storage.session.remove(LOCAL_STORAGE_RUNTIME_KEY);
    return;
  }
  const normalized = normalizeState(state);
  if (normalized.phase !== "error") return;
  await browser.storage.session.set({
    [LOCAL_STORAGE_RUNTIME_KEY]: normalized,
  });
}
