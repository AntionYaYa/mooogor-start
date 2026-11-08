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

/** Resolve only a folder's ancestors; never download unrelated subtrees. */
export async function getBookmarkFolderPath(id: string): Promise<BookmarkNode[] | undefined> {
  const path: BookmarkNode[] = [];
  const seen = new Set<string>();
  try {
    while (id) {
      if (seen.has(id)) return undefined;
      seen.add(id);
      const node = await getBookmark(id);
      if (!node || node.url) return undefined;
      path.unshift(node);
      if (!node.parentId) return path;
      id = node.parentId;
    }
  } catch {
    // The requested folder may have been deleted in another browser window.
  }
  return undefined;
}

export async function getInitialBookmarkFolderId(): Promise<string> {
  const roots = await getBookmarkChildren("0");
  return roots.find(node => !node.url)?.id ?? "0";
}

export async function getBookmarkFolderView(id?: string | null) {
  let path = id ? await getBookmarkFolderPath(id) : undefined;
  if (!path) path = await getBookmarkFolderPath(await getInitialBookmarkFolderId());
  if (!path?.length) throw new Error("Bookmark folder is unavailable");
  const target = path[path.length - 1];
  const node = { ...target, children: await getBookmarkChildren(target.id) };
  path[path.length - 1] = node;
  return { path, node };
}

/** Move only the selected nodes, preserving their order, before a stable sibling. */
export async function moveBookmarksBefore(ids: string[], parentId: string, beforeId?: string) {
  const order = (await getBookmarkChildren(parentId)).map(node => node.id);
  let anchor = beforeId;
  for (const id of [...ids].reverse()) {
    const source = order.indexOf(id);
    const destination = anchor ? order.indexOf(anchor) : order.length;
    if (source < 0 || destination < 0) throw new Error("Bookmark folder changed during drag");
    if (source + 1 !== destination) {
      const moved = await moveBookmark(id, { parentId, index: destination });
      order.splice(source, 1);
      order.splice(moved.index ?? destination, 0, id);
    }
    anchor = id;
  }
}
