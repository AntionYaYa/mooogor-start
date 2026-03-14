import type { WebSite } from "./database";
import { ensureEngineFavicons } from "./favicons";
import { getDomainFromUrl } from "./utils";
import { websiteLogoMap } from "./websiteLogos";

type FaviconSource = {
  engineUrl: string;
  faviconUrl: string;
};

export async function ensureWebSiteFavicons(
  websites: Omit<WebSite, "id">[],
) {
  if (!websites.length) return;
  const sources: FaviconSource[] = [];
  for (const site of websites) {
    let domain: string;
    try {
      domain = getDomainFromUrl(site.url);
    } catch {
      continue;
    }
    const faviconUrl = websiteLogoMap[domain];
    if (!faviconUrl) continue;
    sources.push({ engineUrl: site.url, faviconUrl });
  }
  await ensureEngineFavicons(sources);
}
