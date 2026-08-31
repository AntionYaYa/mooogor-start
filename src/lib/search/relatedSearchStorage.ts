import { getExtensionStorage } from "@/lib/DB/configStorage";

const STORAGE_KEY = "mooogor.related-search-ui.v1";
const LEGACY_POSITION_KEY_PREFIX = "mooogor.related-search-position.v1:";

export type RelatedSearchPosition = {
  left: number;
  top: number;
};

type RelatedSearchUiState = {
  positions: Record<string, RelatedSearchPosition>;
};

let writeQueue = Promise.resolve();
let migrationPromise: Promise<void> | null = null;

function isPosition(value: unknown): value is RelatedSearchPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<RelatedSearchPosition>;
  return (
    typeof position.left === "number" &&
    Number.isFinite(position.left) &&
    typeof position.top === "number" &&
    Number.isFinite(position.top)
  );
}

function normalizeState(value: unknown): RelatedSearchUiState {
  if (!value || typeof value !== "object") return { positions: {} };
  const positions = (value as Partial<RelatedSearchUiState>).positions;
  if (!positions || typeof positions !== "object") return { positions: {} };
  return {
    positions: Object.fromEntries(
      Object.entries(positions).filter(
        (entry): entry is [string, RelatedSearchPosition] =>
          isPosition(entry[1]),
      ),
    ),
  };
}

function legacyPositionKey(hostname: string) {
  return `${LEGACY_POSITION_KEY_PREFIX}${hostname}`;
}

async function migrateLegacyPositions() {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const storage = getExtensionStorage();
    const current = await storage.get(STORAGE_KEY);
    if (current[STORAGE_KEY] !== undefined) return;

    const allStored = await storage.get(null);
    const state: RelatedSearchUiState = { positions: {} };
    const legacyKeys: string[] = [];
    for (const [key, value] of Object.entries(allStored)) {
      if (!key.startsWith(LEGACY_POSITION_KEY_PREFIX)) continue;
      legacyKeys.push(key);
      if (!isPosition(value)) continue;
      const hostname = key.slice(LEGACY_POSITION_KEY_PREFIX.length);
      if (hostname) state.positions[hostname] = value;
    }

    await storage.set({ [STORAGE_KEY]: state });
    if (legacyKeys.length) await storage.remove(legacyKeys);
  })().catch((error) => {
    migrationPromise = null;
    throw error;
  });
  return migrationPromise;
}

export async function readRelatedSearchPosition(
  hostname: string,
): Promise<RelatedSearchPosition | null> {
  await migrateLegacyPositions();
  const storage = getExtensionStorage();
  const stored = await storage.get(STORAGE_KEY);
  const state = normalizeState(stored[STORAGE_KEY]);
  return state.positions[hostname] ?? null;
}

export async function saveRelatedSearchPosition(
  hostname: string,
  position: RelatedSearchPosition,
): Promise<void> {
  const task = writeQueue.then(async () => {
    await migrateLegacyPositions();
    const storage = getExtensionStorage();
    const stored = await storage.get(STORAGE_KEY);
    const state = normalizeState(stored[STORAGE_KEY]);
    state.positions[hostname] = position;
    await storage.set({ [STORAGE_KEY]: state });
    await storage.remove(legacyPositionKey(hostname));
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  await task;
}
