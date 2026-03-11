import type { Engine, EngineCategory } from "./database";
import defaultEngineGroupsRaw from "./defaultEngines.json";
import type { AppLanguage } from "@/lib/utils/settings";
import { getEffectiveLanguage } from "@/lib/utils/i18n";

import Baidu from "../../assets/engines/Baidu.jpg";
import Qihu360 from "../../assets/engines/360.jpg";
import Bing from "../../assets/engines/Bing.jpg";
import DuckDuckGo from "../../assets/engines/DuckDuckGo.jpg";
import Google from "../../assets/engines/Google.jpg";
import Naver from "../../assets/engines/Naver.jpg";
import Perplexity from "../../assets/engines/Perplexity.jpg";
import Sougou from "../../assets/engines/Sougou.jpg";
import Yahoo from "../../assets/engines/Yahoo.jpg";
import Yandex from "../../assets/engines/Yandex.jpg";

const faviconMap: Record<string, string> = {
  Baidu,
  Qihu360,
  Bing,
  DuckDuckGo,
  Google,
  Naver,
  Perplexity,
  Sougou,
  Yahoo,
  Yandex,
};

type DefaultEngineItem = {
  title?: string;
  engineUrl: string;
  faviconKey?: string;
  enabledByLanguage?: Partial<
    Record<Exclude<AppLanguage, "auto"> | "default", boolean>
  >;
};

type DefaultEngineGroup = {
  category?: EngineCategory;
  engines: DefaultEngineItem[];
};

function resolveEngineEnabled(
  item: DefaultEngineItem,
  language: Exclude<AppLanguage, "auto">,
) {
  const byLanguage = item.enabledByLanguage;
  if (typeof byLanguage?.[language] === "boolean") {
    return byLanguage[language];
  }
  if (typeof byLanguage?.default === "boolean") {
    return byLanguage.default;
  }
  return true;
}

function resolveEngineCategory(category?: EngineCategory): EngineCategory {
  if (category === "2") return "2";
  if (category === "3") return "3";
  if (category === "4") return "4";
  if (category === "5") return "5";
  if (category === "6") return "6";
  return "1";
}

export function buildDefaultEngines(
  language?: AppLanguage,
): Omit<Engine, "id">[] {
  const effectiveLang = getEffectiveLanguage(language);
  const groups = defaultEngineGroupsRaw as DefaultEngineGroup[];
  return groups.flatMap((group) => {
    const category = resolveEngineCategory(group.category);
    return (group.engines ?? []).map((item) => ({
      title: item.title,
      engineUrl: item.engineUrl,
      faviconUrl: item.faviconKey ? faviconMap[item.faviconKey] ?? "" : "",
      category,
      enabled: resolveEngineEnabled(item, effectiveLang),
    }));
  });
}
