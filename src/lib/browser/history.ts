export type HistoryItem = Browser.history.HistoryItem;
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

export async function deleteHistoryRange(
  range: Pick<HistoryRange, "startTime" | "endTime">,
): Promise<void> {
  await browser.history.deleteRange({
    startTime: range.startTime,
    endTime: range.endTime,
  });
}
