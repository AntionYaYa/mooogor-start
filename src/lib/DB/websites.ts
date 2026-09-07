import type { WebSite } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";
import {
  clearWebSiteScreenshots,
  deleteWebSiteScreenshot,
  saveWebSiteScreenshot,
} from "./websiteScreenshots";

const WEBSITES_SEEDED_KEY = "websites_seeded_v1";
const WEBSITES_UPDATED_EVENT = "websites-updated";

function notifyWebSitesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBSITES_UPDATED_EVENT));
}

function nextId(items: WebSite[]) {
  return Math.max(0, ...items.map((item) => item.id ?? 0)) + 1;
}

export async function addWebSite(webSite: Omit<WebSite, "id">) {
  const id = await updateStoredConfig((config) => {
    const now = Date.now();
    const id = nextId(config.websites);
    const siblingOrders = webSite.folderId == null
      ? [
          ...config.websites
            .filter((site) => site.folderId == null)
            .map((site) => site.order),
          ...config.websiteFolders.map((folder) => folder.order),
        ]
      : config.websites
          .filter((site) => site.folderId === webSite.folderId)
          .map((site) => site.order);
    const numericSiblingOrders = siblingOrders.filter(
      (order): order is number => typeof order === "number",
    );
    config.websites.push({
      ...webSite,
      id,
      order: webSite.order ?? Math.max(-1, ...numericSiblingOrders) + 1,
      createAt: now,
      updateAt: now,
    });
    return id;
  });
  notifyWebSitesUpdated();
  return id;
}

export async function updateWebSite(webSite: WebSite & { id: number }) {
  const result = await updateStoredConfig((config) => {
    const index = config.websites.findIndex((item) => item.id === webSite.id);
    const existing = config.websites[index];
    const next = {
      ...existing,
      ...webSite,
      order: webSite.order ?? existing?.order,
      createAt: existing?.createAt ?? webSite.createAt ?? Date.now(),
      updateAt: Date.now(),
    };
    if (index >= 0) config.websites[index] = next;
    else config.websites.push(next);
    return webSite.id;
  });
  notifyWebSitesUpdated();
  return result;
}

export async function deleteWebSite(id: number) {
  await updateStoredConfig((config) => {
    config.websites = config.websites.filter((item) => item.id !== id);
  });
  await deleteWebSiteScreenshot(id);
  notifyWebSitesUpdated();
  return id;
}

export async function getAllWebSite(): Promise<WebSite[]> {
  const config = await getStoredConfig();
  return [...config.websites].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getWebSite(domain: string): Promise<WebSite | undefined> {
  return (await getStoredConfig()).websites.find((item) => item.domain === domain);
}

export async function updateWebSiteScreenshot(id: number, screenshot: string) {
  let colors: Pick<WebSite, "backgroundColor" | "backgroundColorAlt"> = {};
  try {
    const { extractWebsiteCardColors } = await import(
      "@/lib/background/backgroundColors"
    );
    colors = await extractWebsiteCardColors(screenshot);
  } catch {
    // A screenshot remains useful even when its palette cannot be extracted.
  }
  const config = await getStoredConfig();
  const website = config.websites.find((site) => site.id === id);
  if (!website) return;
  const blob = await (await fetch(screenshot)).blob();
  await saveWebSiteScreenshot({ websiteId: id, url: website.url, blob });
  await updateStoredConfig((nextConfig) => {
    const index = nextConfig.websites.findIndex((site) => site.id === id);
    if (index < 0) return;
    nextConfig.websites[index] = {
      ...nextConfig.websites[index],
      ...colors,
      updateAt: Date.now(),
    };
  });
  notifyWebSitesUpdated();
}

export async function updateWebSitesOrder(items: (WebSite & { id: number })[]) {
  await updateStoredConfig((config) => {
    const orderById = new Map(items.map((item, index) => [item.id, index]));
    const now = Date.now();
    config.websites = config.websites.map((item) =>
      item.id && orderById.has(item.id)
        ? { ...item, order: orderById.get(item.id), updateAt: now }
        : item,
    );
  });
  notifyWebSitesUpdated();
}

export async function moveWebSitesToFolder(
  ids: number[],
  folderId?: number,
) {
  const idSet = new Set(ids);
  const moveIndexById = new Map(ids.map((id, index) => [id, index]));
  if (!idSet.size) return;
  await updateStoredConfig((config) => {
    const now = Date.now();
    const targetOrders = folderId == null
      ? [
          ...config.websites
            .filter((site) => site.folderId == null && !idSet.has(site.id ?? -1))
            .map((site) => site.order),
          ...config.websiteFolders.map((folder) => folder.order),
        ]
      : config.websites
          .filter((site) => site.folderId === folderId && !idSet.has(site.id ?? -1))
          .map((site) => site.order);
    const nextOrder = Math.max(
      -1,
      ...targetOrders.filter((order): order is number => typeof order === "number"),
    ) + 1;
    config.websites = config.websites.map((site) =>
      site.id != null && idSet.has(site.id)
        ? {
            ...site,
            folderId,
            order: nextOrder + (moveIndexById.get(site.id) ?? 0),
            updateAt: now,
          }
        : site,
    );
  });
  notifyWebSitesUpdated();
}

export async function ensureDefaultWebSites(defaults: Omit<WebSite, "id">[]) {
  await updateStoredConfig((config) => {
    if (config.metadata[WEBSITES_SEEDED_KEY] === true) {
      const defaultsByDomain = new Map(defaults.map((site) => [site.domain, site]));
      config.websites = config.websites.map((site) => {
        const preset = defaultsByDomain.get(site.domain);
        if (!preset || site.backgroundColor) return site;
        return {
          ...site,
          backgroundColor: preset.backgroundColor,
          backgroundColorAlt: preset.backgroundColorAlt,
        };
      });
      return;
    }
    if (!config.websites.length) {
      const now = Date.now();
      config.websites = defaults.map((site, index) => ({
        ...site,
        id: index + 1,
        order: site.order ?? index,
        createAt: now,
        updateAt: now,
      }));
    }
    config.metadata[WEBSITES_SEEDED_KEY] = true;
  });
}

export async function resetWebSitesToDefault(defaults: Omit<WebSite, "id">[]) {
  await clearWebSiteScreenshots();
  await updateStoredConfig((config) => {
    const now = Date.now();
    config.websites = defaults.map((site, index) => ({
      ...site,
      id: index + 1,
      order: index,
      createAt: now,
      updateAt: now,
    }));
    config.websiteFolders = [];
    config.metadata[WEBSITES_SEEDED_KEY] = true;
  });
  notifyWebSitesUpdated();
}
