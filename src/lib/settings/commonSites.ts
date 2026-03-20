import {
  addWebSite,
  deleteWebSite,
  getAllWebSite,
  resetWebSitesToDefault,
  updateWebSite,
  updateWebSitesOrder,
} from "@/lib/DB/DB";
import type { WebSite } from "@/lib/DB/DB";
import { buildDefaultWebSites } from "@/lib/config/defaultWebSites";
import { getEffectiveLanguage, t } from "@/lib/utils/i18n";
import type { AppLanguage } from "@/lib/utils/settings";

export async function fetchCommonSites(): Promise<WebSite[]> {
  return await getAllWebSite();
}

export async function saveCommonSiteEntry(
  payload: WebSite,
  editingSiteId?: number,
): Promise<void> {
  if (editingSiteId) {
    await updateWebSite({ ...payload, id: editingSiteId });
    return;
  }

  await addWebSite(payload);
}

export async function deleteCommonSiteEntry(siteId: number): Promise<void> {
  await deleteWebSite(siteId);
}

export async function persistCommonSitesOrder(items: WebSite[]): Promise<void> {
  const withIds = items.filter(
    (item): item is WebSite & { id: number } => !!item.id,
  );

  if (!withIds.length) return;
  await updateWebSitesOrder(withIds);
}

export async function resetCommonSitesToDefaultByLanguage(
  language: AppLanguage,
): Promise<void> {
  const effectiveLanguage = getEffectiveLanguage(language);
  const defaults = buildDefaultWebSites(effectiveLanguage);
  await resetWebSitesToDefault(defaults);
}

export function getResetCommonSitesConfirmMessage(): string {
  return t("nt_settings_common_reset_confirm");
}
