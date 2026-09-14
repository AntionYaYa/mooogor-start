import type { Engine } from "./database";

// Keep numeric IDs for stored engines, but never allocate them from list order.
export function createEngineId(engines: Pick<Engine, "id">[] = []): number {
  const used = new Set(engines.map((engine) => engine.id));
  const words = new Uint32Array(2);
  let id: number;
  do {
    crypto.getRandomValues(words);
    id = (words[0] & 0x1fffff) * 0x100000000 + words[1];
  } while (!id || used.has(id));
  return id;
}
