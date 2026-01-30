
export type HistoryItem = Browser.history.HistoryItem

export async function getHistorys(maxResults = 100): Promise<HistoryItem[]> {
  return await browser.history.search({
    text: "",          // 空字符串 = 匹配所有
    startTime: 0,      // 从 1970-01-01 开始
    maxResults,        // 返回数量
  });
}
