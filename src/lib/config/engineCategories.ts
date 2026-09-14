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
    { id: "6", name: t("nt_engine_category_music") },
    { id: "4", name: t("nt_engine_category_icon") },
    { id: "5", name: t("nt_engine_category_font") },
    { id: "7", name: t("nt_engine_category_creative") },
  ];
}
