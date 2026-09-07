import defaultWebSitesRaw from "@/lib/DB/defaultWebSites.json";
import { getDomainFromUrl } from "@/lib/DB/DB";
import type { WebSite } from "@/lib/DB/DB";
import type { AppLanguage } from "@/lib/utils/settings";

type DefaultWebSiteRaw = {
  title?: string;
  url: string;
  backgroundColor?: string;
  backgroundColorAlt?: string;
};

type DefaultWebSitesByLanguage = Record<
  Exclude<AppLanguage, "auto">,
  DefaultWebSiteRaw[]
>;

const defaultWebSites = defaultWebSitesRaw as DefaultWebSitesByLanguage;

export function buildDefaultWebSites(
  language: Exclude<AppLanguage, "auto">,
): Omit<WebSite, "id">[] {
  const sites = defaultWebSites[language] ?? defaultWebSites.en;
  const result: Omit<WebSite, "id">[] = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    try {
      result.push({
        domain: getDomainFromUrl(site.url),
        url: site.url,
        title: site.title,
        backgroundColor: site.backgroundColor,
        backgroundColorAlt: site.backgroundColorAlt,
        order: i,
      });
    } catch {
      continue;
    }
  }

  return result;
}
