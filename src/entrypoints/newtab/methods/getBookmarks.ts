
export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;
export type BookmarkSubType = "bookmarks-bar" | "other" |"mobile"|"managed";

export async function getBookmarks(): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getTree();
}

export async function moveBookmark(
  id: string,
  parentId: string,
  index: number
) {
  return await browser.bookmarks.move(id, { parentId, index });
}