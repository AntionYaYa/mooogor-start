import type { TabItem } from "@/lib/components/Tab.svelte";
import type { OpenTab } from "@/lib/utils/settings";
import { t } from "@/lib/utils/i18n";

const TAB_KEY_TO_OPEN_TAB: Record<string, OpenTab> = {
  "0": "common",
  "1": "bookmark",
  "2": "history",
};

const OPEN_TAB_TO_INDEX: Record<OpenTab, number> = {
  common: 0,
  bookmark: 1,
  history: 2,
};

export function buildNewTabTabs(): TabItem[] {
  return [
    { key: "0", name: t("nt_tab_common"), sel: false },
    { key: "1", name: t("nt_tab_bookmarks"), sel: false },
    { key: "2", name: t("nt_tab_history"), sel: false },
  ];
}

export function openTabToIndex(tab: OpenTab): number {
  return OPEN_TAB_TO_INDEX[tab];
}

export function tabKeyToOpenTab(tabKey: string): OpenTab | undefined {
  return TAB_KEY_TO_OPEN_TAB[tabKey];
}
