import { db } from "./database";
import type { WebSiteScreenshot } from "./database";

export async function saveWebSiteScreenshot(
  screenshot: Omit<WebSiteScreenshot, "updatedAt">,
) {
  return await db.webSiteScreenshots.put({
    ...screenshot,
    updatedAt: Date.now(),
  });
}

export async function getWebSiteScreenshot(websiteId: number, url: string) {
  const screenshot = await db.webSiteScreenshots.get(websiteId);
  return screenshot?.url === url ? screenshot : undefined;
}

export async function deleteWebSiteScreenshot(websiteId: number) {
  await db.webSiteScreenshots.delete(websiteId);
}

export async function clearWebSiteScreenshots() {
  await db.webSiteScreenshots.clear();
}
