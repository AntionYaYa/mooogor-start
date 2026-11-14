import type { EngineCategoryItem } from "@/lib/DB/DB";
import { t } from "@/lib/utils/i18n";

export function buildDefaultEngineCategories(): Pick<
  EngineCategoryItem,
  "id" | "name"
>[] {
  return [
    { id: "1", name: t("nt_engine_category_all") },
    { id: "2", name: t("nt_engine_category_image") },
    { id: "3", name: t("nt_engine_category_video") },
  ];
}
