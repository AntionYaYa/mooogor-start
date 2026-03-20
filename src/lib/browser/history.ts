export type HistoryItem = Browser.history.HistoryItem;

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
