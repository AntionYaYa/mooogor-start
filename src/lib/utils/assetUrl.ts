type RuntimeLike = {
  getURL?: (path: string) => string;
};

function getRuntime(): RuntimeLike | undefined {
  const globalApi = globalThis as {
    browser?: { runtime?: RuntimeLike };
    chrome?: { runtime?: RuntimeLike };
  };
  return globalApi.browser?.runtime ?? globalApi.chrome?.runtime;
}

export function resolvePublicAssetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const encoded = encodeURI(normalized);
  const runtime = getRuntime();
  if (runtime?.getURL) {
    return runtime.getURL(encoded);
  }
  return `/${encoded}`;
}
