import { getBuiltInWebsiteLogo } from "@/lib/DB/websiteLogos";
import type { WebSite } from "@/lib/DB/database";

export async function getWebsiteCardColors(
  url: string,
  domain: string,
): Promise<Pick<WebSite, "backgroundColor" | "backgroundColorAlt">> {
  try {
    const builtInLogo = getBuiltInWebsiteLogo(domain);
    const getRuntimeUrl = browser.runtime.getURL as (path: string) => string;
    const colorSource = builtInLogo ?? getRuntimeUrl(
      `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`,
    );
    const { extractWebsiteCardColors } = await import(
      "@/lib/background/backgroundColors"
    );
    return await extractWebsiteCardColors(colorSource);
  } catch {
    return {};
  }
}
