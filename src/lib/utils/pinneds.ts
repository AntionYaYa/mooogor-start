import { addWebSite, getDomainFromUrl } from "@/lib/DB/DB";
import { getWebsiteCardColors } from "./websiteCardColors";

export async function addToPinneds(url: string, title?: string) {
  if (!url) return;
  const domain = getDomainFromUrl(url);
  const newWebSite = {
    domain,
    url,
    title: (title ?? "").trim(),
    ...(await getWebsiteCardColors(url, domain)),
  };
  return await addWebSite(newWebSite);
}
