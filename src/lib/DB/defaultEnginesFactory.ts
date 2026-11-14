import type { Engine } from "./database";
import defaultEngineGroups from "./defaultEngines.json";
import type { AppLanguage } from "@/lib/utils/settings";
import { getEffectiveLanguage } from "@/lib/utils/i18n";

import { faviconMap } from "./engineFavicons";


export function buildDefaultEngines(
  language?: AppLanguage,
): Omit<Engine, "id">[] {
  const effectiveLang = getEffectiveLanguage(language);
  const starterEngineKeys = new Set(
    effectiveLang === "zh_CN"
      ? [
          "Bing", "Qihu360", "Baidu",
          "Unsplash", "Pexels", "Huaban",
          "Bilibili", "Douyin", "Vimeo",
        ]
      : [
          "Google", "Bing", "DuckDuckGo",
          "Unsplash", "Pexels", "Pinterest",
          "YouTube", "Bilibili", "Vimeo",
        ],
  );
  return defaultEngineGroups.flatMap(({ category, engines }) =>
    engines
      .filter((item) => starterEngineKeys.has(item.faviconKey))
      .map((item) => ({
        title: item.title,
        engineUrl: item.engineUrl,
        faviconUrl: faviconMap[item.faviconKey] ?? "",
        category,
        enabled: true,
      })),
  );
}
