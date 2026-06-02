import type { BookmarkNode, BookmarkSubType } from "@/lib/browser/bookmarks";
import type { HistoryItem } from "@/lib/browser/history";

export type SearchItemType = BookmarkSubType | "engine" | "todo" | "history";

export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  url?: string;
  folderPath?: string;
  iconUrl?: string;
}

export function mapBookmarkResults(
  items: BookmarkNode[],
  fallbackTitle: string,
): SearchItem[] {
  return items
    .filter((item) => !!item.url)
    .map((item) => ({
      id: item.id,
      type: "other" as BookmarkSubType,
      title: getDisplayTitle(item.title, item.url, fallbackTitle),
      url: item.url,
    }));
}

export function mapHistoryResults(
  items: HistoryItem[],
  fallbackTitle: string,
): SearchItem[] {
  return items
    .filter((item) => !!item.url)
    .map((item) => ({
      id: String(item.id ?? item.url ?? item.lastVisitTime ?? ""),
      type: "history" as const,
      title: getDisplayTitle(item.title, item.url, fallbackTitle),
      url: item.url,
    }));
}

function getDisplayTitle(
  title: string | null | undefined,
  url: string | null | undefined,
  fallbackTitle: string,
) {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  return url ?? fallbackTitle;
}

export function sortResults(items: SearchItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  const score = (item: SearchItem) => {
    const title = item.title.toLowerCase();
    const url = item.url?.toLowerCase() ?? "";
    if (title.startsWith(needle)) return 3;
    if (title.includes(needle)) return 2;
    if (url.includes(needle)) return 1;
    return 0;
  };
  return [...items].sort((a, b) => score(b) - score(a));
}
