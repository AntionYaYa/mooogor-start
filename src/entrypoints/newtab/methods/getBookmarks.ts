
export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;
export type BookmarkSubType = "bookmarks-bar" | "other" |"mobile"|"managed";

export async function getBookmarks(): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getTree();
}

export async function getBookmarkChildren(id: string): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getChildren(id);
}

export async function searchBookmarks(
  query: string,
  maxResults = 100,
): Promise<BookmarkNode[]> {
  const results = await browser.bookmarks.search({ query });
  return results.slice(0, maxResults);
}

