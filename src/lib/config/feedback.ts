import { getEffectiveLanguage } from "@/lib/utils/i18n";

export function getRepositoryUrl(): string {
  return getEffectiveLanguage().startsWith("zh_")
    ? "https://gitee.com/antion666/mooogor_start"
    : "https://github.com/AntionYaYa/mooogor-start";
}

export function getFeedbackUrl(): string {
  return `${getRepositoryUrl()}/issues`;
}
