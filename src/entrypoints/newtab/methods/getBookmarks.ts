
export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;
export type BookmarkSubType = "bookmarks-bar" | "other" |"mobile"|"managed";

export async function getBookmarks(): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getTree();
}

export async function searchBookmarks(
  query: string,
  maxResults = 100,
): Promise<BookmarkNode[]> {
  const results = await browser.bookmarks.search({ query });
  return results.slice(0, maxResults);
}

export async function moveBookmark(
  id: string,
  parentId: string,
  index: number
) {
  return await browser.bookmarks.move(id, { parentId, index });
}
