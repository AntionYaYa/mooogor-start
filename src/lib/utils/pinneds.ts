import { addWebSite, getDomainFromUrl } from "@/lib/DB/DB";

export async function addToPinneds(url: string, title?: string) {
  if (!url) return;
  const newWebSite = {
    domain: getDomainFromUrl(url),
    url,
    title: (title ?? "").trim(),
  };
  return await addWebSite(newWebSite);
}
