import type { WebSiteFolder } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";
import { deleteWebSiteScreenshot } from "./websiteScreenshots";

const WEBSITES_UPDATED_EVENT = "websites-updated";

function notifyUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WEBSITES_UPDATED_EVENT));
  }
}

function nextId(items: WebSiteFolder[]) {
  return Math.max(0, ...items.map((item) => item.id ?? 0)) + 1;
}

export async function getAllWebSiteFolders(): Promise<WebSiteFolder[]> {
  const config = await getStoredConfig();
  return [...config.websiteFolders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function addWebSiteFolder(folder: Omit<WebSiteFolder, "id">) {
  const id = await updateStoredConfig((config) => {
    const now = Date.now();
    const id = nextId(config.websiteFolders);
    const rootOrders = [
      ...config.websiteFolders.map((item) => item.order),
      ...config.websites
        .filter((site) => site.folderId == null)
        .map((site) => site.order),
    ].filter((order): order is number => typeof order === "number");
    config.websiteFolders.push({
      ...folder,
      id,
      order: folder.order ?? Math.max(-1, ...rootOrders) + 1,
      createAt: now,
      updateAt: now,
    });
    return id;
  });
  notifyUpdated();
  return id;
}

export async function updateWebSiteFolder(folder: WebSiteFolder & { id: number }) {
  await updateStoredConfig((config) => {
    const index = config.websiteFolders.findIndex((item) => item.id === folder.id);
    const existing = config.websiteFolders[index];
    const next = {
      ...existing,
      ...folder,
      createAt: existing?.createAt ?? folder.createAt ?? Date.now(),
      updateAt: Date.now(),
    };
    if (index >= 0) config.websiteFolders[index] = next;
    else config.websiteFolders.push(next);
  });
  notifyUpdated();
}

/** Combine two root sites atomically, keeping the target's root position. */
export async function combineRootWebSites(sourceId: number, targetId: number, title: string) {
  await updateStoredConfig((config) => {
    const source = config.websites.find((site) => site.id === sourceId);
    const target = config.websites.find((site) => site.id === targetId);
    const isRoot = (folderId?: number) => folderId == null ||
      !config.websiteFolders.some((folder) => folder.id === folderId);
    if (!source || !target || sourceId === targetId ||
        !isRoot(source.folderId) || !isRoot(target.folderId)) return;
    const now = Date.now();
    const id = nextId(config.websiteFolders);
    config.websiteFolders.push({ id, title, order: target.order, createAt: now, updateAt: now });
    target.folderId = source.folderId = id;
    target.order = 0;
    source.order = 1;
    target.updateAt = source.updateAt = now;
  });
  notifyUpdated();
}

export async function deleteWebSiteFolder(id: number) {
  await updateStoredConfig((config) => {
    if (!config.websiteFolders.some((group) => group.id === id)) return;
    const now = Date.now();
    const folderIds = new Set(config.websiteFolders.map((group) => group.id));
    const rootSites = config.websites.filter((site) => site.folderId == null || !folderIds.has(site.folderId));
    const members = config.websites.filter((site) => site.folderId === id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0));
    const root = [
      ...rootSites.map((site, index) => ({ key: `website:${site.id}`, order: site.order ?? index, item: site, expand: false })),
      ...config.websiteFolders.map((group, index) => ({ key: `folder:${group.id}`, order: group.order ?? rootSites.length + index, item: group, expand: group.id === id })),
    ].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
    const expanded = root.flatMap((entry) => entry.expand ? members : [entry.item]);
    members.forEach((site) => { site.folderId = undefined; });
    expanded.forEach((item, order) => { item.order = order; item.updateAt = now; });
    config.websiteFolders = config.websiteFolders.filter((group) => group.id !== id);
  });
  notifyUpdated();
}

/** Delete a group and its members in one configuration write. */
export async function deleteWebSiteGroupWithSites(id: number) {
  const siteIds = await updateStoredConfig((config) => {
    const ids = config.websites.flatMap((site) =>
      site.folderId === id && site.id != null ? [site.id] : [],
    );
    config.websiteFolders = config.websiteFolders.filter((group) => group.id !== id);
    config.websites = config.websites.filter((site) => site.folderId !== id);
    return ids;
  });
  try {
    await Promise.all(siteIds.map(deleteWebSiteScreenshot));
  } finally {
    notifyUpdated();
  }
}

export type PinnedOrderItem = {
  kind: "website" | "folder";
  id: number;
};

/** Stores one shared order for root websites and folders. */
export async function updatePinnedItemsOrder(items: PinnedOrderItem[]) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    const websiteOrders = new Map<number, number>();
    const folderOrders = new Map<number, number>();
    items.forEach((item, order) => {
      (item.kind === "website" ? websiteOrders : folderOrders).set(item.id, order);
    });
    config.websites = config.websites.map((site) =>
      site.id != null && websiteOrders.has(site.id)
        ? { ...site, order: websiteOrders.get(site.id), updateAt: now }
        : site,
    );
    config.websiteFolders = config.websiteFolders.map((folder) =>
      folder.id != null && folderOrders.has(folder.id)
        ? { ...folder, order: folderOrders.get(folder.id), updateAt: now }
        : folder,
    );
  });
  notifyUpdated();
}
