export type HistoryItem = Browser.history.HistoryItem;

export interface FrequentSite {
  title: string;
  url: string;
  domain: string;
  visitCount: number;
  lastVisitTime: number;
  score: number;
}

export interface FrequentSitesOptions {
  days?: number;
  maxResults?: number;
  limit?: number;
}

export interface HistoryRange {
  key: string;
  label: string;
  startTime: number;
  endTime: number;
  count: number;
}

export async function getHistoryItems(maxResults = 100): Promise<HistoryItem[]> {
  return await browser.history.search({
    text: "",
    startTime: 0,
    maxResults,
  });
}

export async function searchHistory(
  query: string,
  maxResults = 100,
): Promise<HistoryItem[]> {
  return await browser.history.search({
    text: query,
    startTime: 0,
    maxResults,
  });
}

function getDomainFromHistoryUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function getHistoryScore(
  visitCount: number,
  lastVisitTime: number,
  startTime: number,
  endTime: number,
) {
  const range = Math.max(endTime - startTime, 1);
  const recency = Math.max(0, Math.min(1, (lastVisitTime - startTime) / range));
  return visitCount * 10 + recency * 5;
}

function getBetterHistoryItem(
  current: HistoryItem | undefined,
  next: HistoryItem,
) {
  if (!current) return next;

  const currentTitle = (current.title ?? "").trim();
  const nextTitle = (next.title ?? "").trim();
  if (nextTitle.length > currentTitle.length) return next;
  if (nextTitle.length === currentTitle.length) {
    return (next.lastVisitTime ?? 0) > (current.lastVisitTime ?? 0)
      ? next
      : current;
  }

  return current;
}

export async function getFrequentSites(
  options: FrequentSitesOptions = {},
): Promise<FrequentSite[]> {
  const days = options.days ?? 30;
  const maxResults = options.maxResults ?? 1000;
  const limit = options.limit ?? 24;
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;
  const items = await browser.history.search({
    text: "",
    startTime,
    endTime,
    maxResults,
  });

  const byDomain = new Map<
    string,
    { item: HistoryItem; visitCount: number; lastVisitTime: number; url: string }
  >();

  for (const item of items) {
    const url = item.url;
    if (!url) continue;
    const domain = getDomainFromHistoryUrl(url);
    if (!domain) continue;

    const visitCount = item.visitCount ?? 0;
    const lastVisitTime = item.lastVisitTime ?? 0;
    const existing = byDomain.get(domain);
    const bestItem = getBetterHistoryItem(existing?.item, item);
    byDomain.set(domain, {
      item: bestItem,
      visitCount: (existing?.visitCount ?? 0) + visitCount,
      lastVisitTime: Math.max(existing?.lastVisitTime ?? 0, lastVisitTime),
      url: (bestItem.url ?? url),
    });
  }

  return [...byDomain.entries()]
    .map(([domain, record]) => {
      const title = (record.item.title ?? domain).trim() || domain;
      const score = getHistoryScore(
        record.visitCount,
        record.lastVisitTime,
        startTime,
        endTime,
      );
      return {
        title,
        url: record.url,
        domain,
        visitCount: record.visitCount,
        lastVisitTime: record.lastVisitTime,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.lastVisitTime - a.lastVisitTime)
    .slice(0, limit);
}

export async function deleteHistoryRange(
  range: Pick<HistoryRange, "startTime" | "endTime">,
): Promise<void> {
  await browser.history.deleteRange({
    startTime: range.startTime,
    endTime: range.endTime,
  });
}
