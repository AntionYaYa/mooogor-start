<script lang="ts">
  import Search from "@/lib/Search.svelte";
  import Settings from "@/lib/Settings.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import Tab from "@/lib/components/Tab.svelte";
  import type { TabItem } from "@/lib/components/Tab.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import History from "@/lib/History.svelte";
  import Pinneds from "@/lib/Pinneds.svelte";
  import About from "@/lib/About.svelte";
  import Support from "@/lib/Support.svelte";
  import { hasPermission, requestPermission } from "./methods/getPermission";
  import type { Permission } from "./methods/getPermission";
  import { getBookmarkChildren } from "./methods/getBookmarks";
  import type { BookmarkNode } from "./methods/getBookmarks";
  import defaultWebSitesRaw from "@/lib/DB/defaultWebSites.json";
  import {
    ensureDefaultWebSites,
    getAllWebSite,
    getDomainFromUrl,
  } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import { addToPinneds } from "@/lib/utils/pinneds";
  import { fly, slide } from "svelte/transition";
  import { onMount, tick } from "svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import type { IconName } from "@/lib/components/Icon.svelte";
  import {
    loadSettings,
    saveSettings,
    DEFAULT_SETTINGS,
  } from "@/lib/utils/settings";
  import type { AppLanguage, OpenTab, UserSettings } from "@/lib/utils/settings";
  import { getEffectiveLanguage, setLanguage, t } from "@/lib/utils/i18n";
  import { applyTheme } from "@/lib/utils/theme";
  import DragToPinneds from "@/lib/DragToPinneds.svelte";

  let showSetting = $state(false);
  let allPinneds: WebSite[] = $state([]);
  type OpenSearchEnginesRequest = { id: number; categoryId?: string };
  let openSearchEnginesRequest = $state<OpenSearchEnginesRequest | null>(null);

  let bookmarksPermission = $state(false);
  let currentNode: BookmarkNode | undefined = $state();
  let historyStack: BookmarkNode[] = $state([]);
  $inspect(historyStack);
  let historyPermission = $state(false);
  let gridView = $state(false);

  let tabs: TabItem[] = $state([
    { key: "0", name: t("nt_tab_common"), sel: false },
    { key: "1", name: t("nt_tab_bookmarks"), sel: false },
    { key: "2", name: t("nt_tab_history"), sel: false },
  ]);

  let selTab: TabItem | undefined = $state();
  let showNext = $state(false);
  let firstMount = $state(true);
  let i18nRenderKey = $state(0);

  let darging = $state(false);
  let draggingItem = $state<{ url: string; title?: string } | null>(null);

  let userSettings: UserSettings = $state(DEFAULT_SETTINGS);
  let currentTabId: number | undefined = $state();
  let currentTabPinned = $state(false);
  let showAdd = $state(false);
  let showAbout = $state(false);
  let showSupport = $state(false);
  let effectiveNewTabOpen = $derived(
    userSettings.newTabOpen || currentTabPinned,
  );

  function isSameSettings(a: UserSettings, b: UserSettings) {
    return (
      a.defaultOpen === b.defaultOpen &&
      a.lastOpenTab === b.lastOpenTab &&
      a.newTabOpen === b.newTabOpen &&
      a.searchBookmarks === b.searchBookmarks &&
      a.searchHistory === b.searchHistory &&
      a.language === b.language &&
      a.theme === b.theme
    );
  }

  function openTabToIndex(tab: OpenTab): number {
    return tab === "bookmark" ? 1 : tab === "history" ? 2 : 0;
  }

  function tabKeyToOpenTab(tabKey: string): OpenTab | undefined {
    if (tabKey === "0") return "common";
    if (tabKey === "1") return "bookmark";
    if (tabKey === "2") return "history";
    return undefined;
  }

  type DefaultWebSiteRaw = {
    title?: string;
    url: string;
  };

  type DefaultWebSitesByLanguage = Record<
    Exclude<AppLanguage, "auto">,
    DefaultWebSiteRaw[]
  >;

  const defaultWebSites = defaultWebSitesRaw as DefaultWebSitesByLanguage;

  function buildDefaultWebSites(
    language: Exclude<AppLanguage, "auto">,
  ): Omit<WebSite, "id">[] {
    const sites = defaultWebSites[language] ?? defaultWebSites.en;
    const result: Omit<WebSite, "id">[] = [];
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      try {
        result.push({
          domain: getDomainFromUrl(site.url),
          url: site.url,
          title: site.title,
          order: i,
        });
      } catch {
        continue;
      }
    }
    return result;
  }

  async function rememberLastOpenTab(tab: TabItem) {
    const nextLastOpenTab = tabKeyToOpenTab(tab.key);
    if (!nextLastOpenTab) return;
    if (userSettings.lastOpenTab === nextLastOpenTab) return;
    const nextSettings: UserSettings = {
      ...userSettings,
      lastOpenTab: nextLastOpenTab,
    };
    userSettings = nextSettings;
    await saveSettings(nextSettings);
  }

  async function refreshCurrentTabPinnedState() {
    try {
      const tab = await browser.tabs.getCurrent();
      currentTabId = tab?.id;
      currentTabPinned = !!tab?.pinned;
    } catch {
      currentTabId = undefined;
      currentTabPinned = false;
    }
  }

  function handleCurrentTabUpdated(
    tabId: number,
    changeInfo: { pinned?: boolean },
    tab: { pinned?: boolean },
  ) {
    if (!currentTabId || tabId !== currentTabId) return;
    if (typeof changeInfo.pinned === "boolean") {
      currentTabPinned = changeInfo.pinned;
      return;
    }
    if (typeof tab.pinned === "boolean") {
      currentTabPinned = tab.pinned;
    }
  }

  onMount(async () => {
    userSettings = await loadSettings();
    applyTheme(userSettings.theme);
    const language = getEffectiveLanguage(userSettings.language);
    await ensureDefaultWebSites(buildDefaultWebSites(language));
    await refreshCurrentTabPinnedState();
    await setLanguage(userSettings.language);
    updateTabLabels();
    i18nRenderKey += 1;
    const startOpenTab: OpenTab =
      userSettings.defaultOpen === "last"
        ? userSettings.lastOpenTab
        : userSettings.defaultOpen;
    const defaultIndex = openTabToIndex(startOpenTab);
    clickTab(tabs[defaultIndex], defaultIndex, { rememberLast: false });
    await tick();
    firstMount = false;
  });

  onMount(() => {
    browser.tabs.onUpdated.addListener(handleCurrentTabUpdated);
    const handleTabActivated = () => {
      void refreshCurrentTabPinnedState();
    };
    const handleWindowFocusChanged = (windowId: number) => {
      const noneId =
        (browser.windows as { WINDOW_ID_NONE?: number } | undefined)
          ?.WINDOW_ID_NONE ?? -1;
      if (windowId === noneId) return;
      void refreshCurrentTabPinnedState();
    };

    const refreshPinnedOnFocus = () => {
      void refreshCurrentTabPinnedState();
    };
    window.addEventListener("focus", refreshPinnedOnFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCurrentTabPinnedState();
      }
    };
    const handleOpenSearchEngines = (event: Event) => {
      const detail = (event as CustomEvent<{ categoryId?: string }>).detail;
      showSetting = true;
      const nextId = (openSearchEnginesRequest?.id ?? 0) + 1;
      openSearchEnginesRequest = {
        id: nextId,
        categoryId: detail?.categoryId,
      };
    };
    window.addEventListener(
      "open-settings-search-engines",
      handleOpenSearchEngines,
    );

    const handleWebSitesUpdated = () => {
      void refreshPinnedsFromDb();
    };
    window.addEventListener("websites-updated", handleWebSitesUpdated);

    browser.tabs.onActivated.addListener(handleTabActivated);
    browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      browser.tabs.onUpdated.removeListener(handleCurrentTabUpdated);
      browser.tabs.onActivated.removeListener(handleTabActivated);
      browser.windows.onFocusChanged.removeListener(handleWindowFocusChanged);
      window.removeEventListener("focus", refreshPinnedOnFocus);
      window.removeEventListener(
        "open-settings-search-engines",
        handleOpenSearchEngines,
      );
      window.removeEventListener("websites-updated", handleWebSitesUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });

  async function handleUserSettingsChange(next: UserSettings) {
    if (isSameSettings(userSettings, next)) return;

    const languageChanged = userSettings.language !== next.language;
    const themeChanged = userSettings.theme !== next.theme;
    userSettings = next;
    if (themeChanged) {
      applyTheme(next.theme);
    }
    if (languageChanged) {
      await Promise.all([saveSettings(next), setLanguage(next.language)]);
      updateTabLabels();
      i18nRenderKey += 1;
      return;
    }
    await saveSettings(next);
  }

  function updateTabLabels() {
    tabs[0].name = t("nt_tab_common");
    if (historyStack.length <= 2) {
      tabs[1].name = t("nt_tab_bookmarks");
    }
    tabs[2].name = t("nt_tab_history");
  }

  async function getBookmarksRoot() {
    const children = await getBookmarkChildren("0");
    return {
      id: "0",
      title: "root",
      children,
    } as BookmarkNode;
  }

  async function clickGetPermission(permission: Permission) {
    if (permission === "bookmarks") {
      bookmarksPermission = await requestPermission(permission);
      if (!bookmarksPermission) return;
      if (!currentNode) await initBookmarkView();
    }
    if (permission === "history") {
      historyPermission = await requestPermission(permission);
      if (historyPermission) {
        clickTab(tabs[2], 2);
      }
    }
  }

  async function clickTab(
    tab: TabItem,
    i: number,
    options: { rememberLast?: boolean } = {},
  ) {
    const { rememberLast = true } = options;
    //书签选中情况下再点击回到顶层，
    if (tab.sel) {
      if (tab.key === "1" && historyStack.length === 2) {
        tabs[1].name = t("nt_tab_bookmarks");
        goBack();
      }
      return;
    }

    updateShowNext(i);
    updateSelTab(tab);
    if (rememberLast) {
      await rememberLastOpenTab(tab);
    }

    if (tab.key === "0") {
      allPinneds = await getAllWebSite();
      return;
    }
    if (tab.key === "1") {
      bookmarksPermission = await hasPermission("bookmarks");
      if (!bookmarksPermission) return;
      if (!currentNode) await initBookmarkView();
      return;
    }
    if (tab.key === "2") {
      historyPermission = await hasPermission("history");
      return;
    }
  }

  async function clickUpdatePinneds(items: WebSite[] | undefined) {
    if (items) {
      allPinneds = items;
    } else {
      allPinneds = await getAllWebSite();
    }
  }

  function handleDarging(item: { url: string; title?: string } | null) {
    if (item) {
      draggingItem = item;
      darging = true;
      return;
    }
    draggingItem = null;
    darging = false;
  }

  async function handleDropToPinneds() {
    if (!draggingItem?.url) return;
    await addToPinneds(draggingItem.url, draggingItem.title);
    draggingItem = null;
    darging = false;
  }

  async function refreshPinnedsFromDb() {
    allPinneds = await getAllWebSite();
  }

  async function handleSettingsOpenTab(tab: OpenTab) {
    const targetIndex = openTabToIndex(tab);
    const targetTab = tabs[targetIndex];
    if (!targetTab) return;
    await clickTab(targetTab, targetIndex);
    showSetting = false;
  }

  function updateSelTab(tab: TabItem) {
    tabs.forEach((item) => {
      item.sel = item.key === tab.key;
    });
    selTab = tab;
  }

  function updateShowNext(i: number) {
    if (selTab) {
      const selTabIndex = tabs.findIndex((item) => item.key === selTab!.key);
      showNext = selTabIndex < i;
    }
  }

  async function initBookmarkView() {
    const root = await getBookmarksRoot();
    await clickFolder(root);
    if (!root.children?.length) return;
    await clickFolder(root.children[0]);
  }

  async function clickFolder(bkmk: BookmarkNode) {
    const node = bkmk.children
      ? bkmk
      : {
          ...bkmk,
          children: await getBookmarkChildren(bkmk.id),
        };
    bkmk = node;
    if (bkmk.folderType) {
      tabs[1].name = bkmk.title;
    }
    historyStack.push(bkmk);
    currentNode = bkmk;
  }

  function goBack() {
    if (historyStack.length <= 1) return;
    historyStack.pop()!;
    currentNode = historyStack[historyStack.length - 1];
  }
</script>

<svelte:head>
  <title>{t("nt_title")}</title>
</svelte:head>

<main>
  {#key i18nRenderKey}
    <Settings
      {showSetting}
      {userSettings}
      {currentTabPinned}
      onchangeUserSettings={handleUserSettingsChange}
      onclickAbout={() => (showAbout = true)}
      onclickSupport={() => (showSupport = true)}
      onOpenTab={handleSettingsOpenTab}
      {openSearchEnginesRequest}
    >
      <div class="top">
        {@render headBar()}
      </div>
        <Search
          newTabOpen={effectiveNewTabOpen}
          searchBookmarks={userSettings.searchBookmarks}
          searchHistory={userSettings.searchHistory}
        />
      <div class="content">
        <DragToPinneds active={darging} onDrop={handleDropToPinneds} />
        <div class="tabs">
          <div class="side side-left">
            {#if selTab?.key === "0"}
              <div in:fly={{ x: -50, duration: 300 }}>
                <G align="c">
                  <Button onclick={() => (showAdd = true)}>
                    <G>
                      <Icon name="Plus" color="var(--c-text)" opacity={0.6} />
                    </G>
                  </Button>
                </G>
              </div>
            {:else if selTab?.key === "1" && historyStack.length > 1}
              <div in:fly={{ x: 50, duration: 300 }}>
                <G align="c">
                  <Button onclick={goBack}>
                    <G align="c">
                      <Icon
                        name="ChevronLeft"
                        color="var(--c-text)"
                        opacity={0.6}
                      />
                      <!-- <T nowrap>{t("nt_back")}</T> -->
                    </G>
                  </Button>
                </G>
              </div>
            {/if}
          </div>
          <div class="center">
            {#if historyStack.length <= 2}
              <Tab {tabs} onclick={(tab, i) => clickTab(tab, i)} />
            {:else}
              <T nowrap align="c"
                >{historyStack[historyStack.length - 1].title}</T
              >
            {/if}
          </div>
          <div class="side side-right">
            {#if selTab?.key === "1" && historyStack.length > 0}
              <div in:fly={{ x: -50, duration: 300 }}>
                <G align="c">
                  {#if gridView}
                    <Button onclick={() => (gridView = false)} bg='var(--c-text)'>
                      <G>
                        <Icon name="Rows3" color="var(--c-bg)"/>
                      </G>
                    </Button>
                  {:else}
                    <Button onclick={() => (gridView = true)}>
                      <G>
                        <Icon
                          name="Rows3"
                          color="var(--c-text)"
                          opacity={0.6}
                        />
                      </G>
                    </Button>
                  {/if}
                </G>
              </div>
            {/if}
          </div>
        </div>
        <div class="tabs_contents">
          {#each tabs as tab (tab.key)}
            {#if tab.sel}
              <div
                class="tab_content"
                in:fly={firstMount
                  ? undefined
                  : { x: showNext ? 180 : -180, duration: 250 }}
                out:fly={firstMount
                  ? undefined
                  : { x: showNext ? -180 : 180, duration: 200 }}
              >
                {#if tab.key === "0"}
                  {@render pinneds()}
                {:else if tab.key === "1"}
                  {@render bookmarks()}
                {:else if tab.key === "2"}
                  {@render history()}
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </Settings>
  {/key}
</main>

{#if showAbout}
  <About
    onclickClose={() => (showAbout = false)}
    onclickSupport={() => {
      showAbout = false;
      showSupport = true;
    }}
  />
{/if}

{#if showSupport}
  <Support onclickClose={() => (showSupport = false)} />
{/if}

{#snippet headBar()}
  <G full align="c">
    <G full>
      <Button align="c" onclick={() => (showAbout = true)}>
        <G align='c'>
        <G>
          <img class="logo" src="/Mooogor.svg" alt="Mooogor Start" />
        </G>
        <T>Mooogor Start</T>
      </G>
      </Button>
    </G>
    <G>
      {#if showSetting}
        <Button onclick={() => (showSetting = !showSetting)} bg='var(--c-text)'>
          <G>
          <Icon name="Settings2" color="var(--c-bg)" />
        </G>
        </Button>
      {:else}
        <Button onclick={() => (showSetting = !showSetting)}>
          <G>
            <Icon name="Settings2" color="var(--c-text)" />
          </G>
        </Button>
      {/if}
    </G>
  </G>
{/snippet}

{#snippet pinneds()}
  <Pinneds
    {allPinneds}
    newTabOpen={effectiveNewTabOpen}
    {showAdd}
    onopenAdd={() => (showAdd = true)}
    oncloseAdd={() => (showAdd = false)}
    onUpdate={(items) => clickUpdatePinneds(items)}
  />
{/snippet}

{#snippet bookmarks()}
  {#if !bookmarksPermission}
    {@render temNeedPermission(
      "Bookmark",
      t("nt_need_permission_bookmarks"),
      t("nt_permission_desc_bookmarks"),
      "bookmarks",
    )}
  {:else if currentNode}
    <Bookmarks
      list={gridView}
      bookmarkNode={currentNode}
      newTabOpen={effectiveNewTabOpen}
      onclickFolder={(bkmk) => clickFolder(bkmk)}
      onDarging={handleDarging}
    />
  {/if}
{/snippet}

{#snippet history()}
  {#if !historyPermission}
    {@render temNeedPermission(
      "History",
      t("nt_need_permission_history"),
      t("nt_permission_desc_history"),
      "history",
    )}
  {:else}
    <History newTabOpen={effectiveNewTabOpen} onDarging={handleDarging} />
  {/if}
{/snippet}

{#snippet temNeedPermission(
  iconName: IconName,
  titl: string,
  desc: string,
  permission: Permission,
)}
  <div class="get_permission">
    <G vertical align="c">
      <G vertical align="c">
        <Icon name={iconName} color="var(--c-text)" size={30} />
      </G>
      <G vertical align="c">
        <T align="c" type="l" bold>{titl}</T>
        <T align="c" type="s">{desc}</T>
      </G>
      <G vertical align="c">
        <Button onclick={() => clickGetPermission(permission)} bg='var(--c-text)'>
          <G >
            <T color="var(--c-bg)">{t("nt_authorize")}</T>
          </G >
        </Button>
      </G>
    </G>
  </div>
{/snippet}

<style>
  .logo {
    width: 24px;
  }
  .get_permission {
    display: flex;
    flex-direction: column;
    align-items: center;
    border: var(--border);
    border-radius: var(--r1);
    padding: var(--gap);
    box-sizing: border-box;
  }
  .top {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--gap);
  }

  main {
    display: flex;
    flex-direction: row;
    height: 100vh;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    align-items: flex-start;
    background-color: var(--c-bg-1);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding:var(--gap);
    width: 100%;
    max-width: 1280px;
    box-sizing: border-box;
    height: 100%;
    background: linear-gradient(180deg, var(--c-card), rgba(0,0,0,0));
    border-radius: var(--r3);
    position: relative;
  }

  /* On screens smaller than 1024px, use full width */
  @media screen and (max-width: 1024px) {
    .content {
      max-width: 100%;
    }
  }

  .tabs_contents {
    display: flex;
    flex-direction: row;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    height: 100%;
    border-radius: var(--r1);
    padding: var(--gap);
    overflow-y: auto;
    overflow-x: hidden;
  }
  .tab_content {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .tabs {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    align-items: center;
    width: 100%;
    box-sizing: border-box;
    padding: var(--gap);
    height: 60px;
  }
  .tabs .side {
    display: flex;
    align-items: center;
    min-height: 32px;
  }
  .tabs .side-left {
    justify-content: flex-start;
  }
  .tabs .side-right {
    justify-content: flex-end;
  }
  .tabs .center {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
</style>
