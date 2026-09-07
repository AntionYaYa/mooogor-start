import type { WebSiteFolder } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";

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

export async function deleteWebSiteFolder(id: number) {
  await updateStoredConfig((config) => {
    config.websiteFolders = config.websiteFolders.filter((item) => item.id !== id);
    config.websites = config.websites.map((site) =>
      site.folderId === id ? { ...site, folderId: undefined, updateAt: Date.now() } : site,
    );
  });
  notifyUpdated();
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
