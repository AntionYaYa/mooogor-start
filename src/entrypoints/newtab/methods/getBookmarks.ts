
export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;
export type BookmarkSubType = "bookmarks-bar" | "other";

export async function getBookmarks(): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getTree();
}

