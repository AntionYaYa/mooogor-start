import { getEffectiveLanguage } from "@/lib/utils/i18n";

export function getFeedbackUrl(): string {
  return getEffectiveLanguage().startsWith("zh_")
    ? "https://gitee.com/antion666/mooogor_start/issues"
    : "https://github.com/AntionYaYa/mooogor-start/issues";
}
