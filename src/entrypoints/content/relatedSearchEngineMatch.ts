export type EngineUrlLike = { engineUrl: string };

export function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function getEngineHost(engine: EngineUrlLike) {
  try {
    return normalizeHost(
      new URL(engine.engineUrl.replace("%s", "search")).hostname,
    );
  } catch {
    return "";
  }
}

export function resolveEngineByDomain<T extends EngineUrlLike>(
  engines: T[],
  pageHostname: string,
  fallback: T,
): T {
  const currentHost = normalizeHost(pageHostname);
  return (
    engines.find((engine) => getEngineHost(engine) === currentHost) ?? fallback
  );
}
