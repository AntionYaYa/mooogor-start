import type { WebSite } from "./database";
import { getStoredConfig, updateStoredConfig } from "./configStorage";
import { ensureWebSiteFavicons } from "./websiteFavicons";

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
    config.websites.push({
      ...webSite,
      id,
      order: webSite.order ?? config.websites.length,
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

export async function ensureDefaultWebSites(defaults: Omit<WebSite, "id">[]) {
  await updateStoredConfig((config) => {
    if (config.metadata[WEBSITES_SEEDED_KEY] === true) return;
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
  await ensureWebSiteFavicons(defaults);
}

export async function resetWebSitesToDefault(defaults: Omit<WebSite, "id">[]) {
  await updateStoredConfig((config) => {
    const now = Date.now();
    config.websites = defaults.map((site, index) => ({
      ...site,
      id: index + 1,
      order: index,
      createAt: now,
      updateAt: now,
    }));
    config.metadata[WEBSITES_SEEDED_KEY] = true;
  });
  await ensureWebSiteFavicons(defaults);
  notifyWebSitesUpdated();
}
