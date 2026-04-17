export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode;
export type BookmarkSubType = "bookmarks-bar" | "other" | "mobile" | "managed";

export async function getBookmarks(): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getTree();
}

export async function getBookmarkChildren(id: string): Promise<BookmarkNode[]> {
  return await browser.bookmarks.getChildren(id);
}

export async function getBookmark(id: string): Promise<BookmarkNode | undefined> {
  const [bookmark] = await browser.bookmarks.get(id);
  return bookmark;
}

export async function updateBookmark(
  id: string,
  changes: Browser.bookmarks.UpdateChanges,
): Promise<BookmarkNode> {
  return await browser.bookmarks.update(id, changes);
}

export async function deleteBookmark(id: string): Promise<void> {
  const bookmark = await getBookmark(id);
  if (!bookmark) return;
  if (bookmark.url) {
    await browser.bookmarks.remove(id);
    return;
  }
  await browser.bookmarks.removeTree(id);
}

export async function moveBookmark(
  id: string,
  destination: Browser.bookmarks.MoveDestination,
): Promise<BookmarkNode> {
  return await browser.bookmarks.move(id, destination);
}

export async function createBookmark(
  bookmark: Browser.bookmarks.CreateDetails,
): Promise<BookmarkNode> {
  return await browser.bookmarks.create(bookmark);
}

export async function searchBookmarks(
  query: string,
  maxResults = 100,
): Promise<BookmarkNode[]> {
  const results = await browser.bookmarks.search({ query });
  return results.slice(0, maxResults);
}
