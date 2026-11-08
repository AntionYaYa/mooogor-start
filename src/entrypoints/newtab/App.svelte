<script lang="ts">
  import Search from "@/lib/Search.svelte";
  import Settings from "@/lib/Settings.svelte";
  import Button from "@/lib/components/Button.svelte";
  import G from "@/lib/components/G.svelte";
  import T from "@/lib/components/T.svelte";
  import Tab from "@/lib/components/Tab.svelte";
  import type { TabItem } from "@/lib/components/Tab.svelte";
  import Bookmarks from "@/lib/Bookmarks.svelte";
  import Pinneds from "@/lib/Pinneds.svelte";
  import { hasPermission, requestPermission } from "@/lib/browser/permissions";
  import type { Permission } from "@/lib/browser/permissions";
  import { getBookmarkChildren, getBookmark, getBookmarkFolderView, getInitialBookmarkFolderId } from "@/lib/browser/bookmarks";
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import type { FrequentSite } from "@/lib/browser/history";
  import { ensureConfigReady } from "@/lib/browser/configReady";
  import { getAllWebSite, getAllWebSiteFolders } from "@/lib/DB/DB";
  import type { WebSite, WebSiteFolder } from "@/lib/DB/DB";
  import { fly, slide } from "svelte/transition";
  import { onMount, tick, untrack } from "svelte";
  import type { Snippet } from "svelte";
  import Icon from "@/lib/components/Icon.svelte";
  import type { IconName } from "@/lib/components/Icon.svelte";
  import {
    loadSettings,
    saveSettings,
    DEFAULT_SETTINGS,
  } from "@/lib/utils/settings";
  import type { OpenTab, UserSettings } from "@/lib/utils/settings";
  import {
    PRESET_BACKGROUNDS,
    cloneBackgroundItem,
    resolveBackgroundItem,
    type BackgroundConfig,
    type BackgroundItem,
  } from "@/lib/background/background";
  import {
    loadBackgroundItems,
    saveBackgroundConfiguration,
  } from "@/lib/background/backgroundStorage";
  import { setLanguage, t } from "@/lib/utils/i18n";
  import { applyTheme } from "@/lib/utils/theme";
  import { resetCommonSitesToDefaultByLanguage } from "@/lib/settings/commonSites";
  import { resetConfigurationToDefaults } from "@/lib/DB/configRecovery";
  import ConfirmDialog from "@/lib/ConfirmDialog.svelte";
  import DataSyncIssueDialog from "@/lib/DataSyncIssueDialog.svelte";
  import LocalStorageIssueDialog from "@/lib/LocalStorageIssueDialog.svelte";
  import {
    DATA_SYNC_RUNTIME_KEY,
    getDataSyncState,
    retryDataSync,
    type DataSyncState,
  } from "@/lib/sync/dataSync";
  import {
    getLocalStorageHealth,
    LOCAL_STORAGE_RUNTIME_KEY,
    type LocalStorageHealthState,
  } from "@/lib/storage/localStorageHealth";
  import {
    buildNewTabTabs,
    openTabToIndex,
    tabKeyToOpenTab,
  } from "@/lib/config/newtabTabs";

  let { startupSettings = null }: { startupSettings?: UserSettings | null } = $props();
  let initialSettings = untrack(() => startupSettings);
  let showSetting = $state(false);
  let allPinneds: WebSite[] = $state([]);
  let webSiteFolders: WebSiteFolder[] = $state([]);
  let currentCommonFolder: WebSiteFolder | undefined = $state();
  let frequentSites: FrequentSite[] = $state([]);
  let frequentSitesLoading = $state(false);
  let frequentSitesRequestId = $state(0);
  let frequentSitesIdleCallbackId: number | undefined;
  let frequentSitesTimerId: number | undefined;

  let bookmarksPermission = $state(false);
  let currentNode: BookmarkNode | undefined = $state();
  let historyStack: BookmarkNode[] = $state([]);
  let historyPermission = $state(false);
  let commonListView = $state(true);
  let gridView = $state(false);

  let tabs: TabItem[] = $state(buildNewTabTabs());

  const initialOpen = initialSettings?.defaultOpen === "last"
    ? initialSettings.lastOpenTab : initialSettings?.defaultOpen ?? "common";
  tabs[openTabToIndex(initialOpen)].sel = true;
  let selTab: TabItem | undefined = $state(tabs[openTabToIndex(initialOpen)]);
  let showNext = $state(false);
  let firstMount = $state(true);
  let scrollRoot: HTMLDivElement | undefined = $state();
  let headerHeight = $state(0);
  const autoFocusSearch =
    new URLSearchParams(window.location.search).get("focus") === "search";
  let initializationFailed = $state(false);
  let configurationState: "loading" | "ready" | "fallback" = $state("loading");
  let websitesState: "loading" | "ready" | "fallback" = $state("loading");
  let websitesRequestId = 0;
  let initializationTask: Promise<void> | null = null;
  const NEW_TAB_LOG_PREFIX = "[Mooogor NewTab]";
  const debugConfigFallback =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") ===
      "config-fallback";

  let userSettings: UserSettings = $state(initialSettings ?? DEFAULT_SETTINGS);
  let backgroundItems: BackgroundItem[] = $state(
    PRESET_BACKGROUNDS.map(cloneBackgroundItem),
  );
  let activeBackground: BackgroundItem | null = $state(null);
  let currentTabId: number | undefined = $state();
  let currentTabPinned = $state(false);
  let showAdd = $state(false);
  let showAddBookmark = $state(false);
  let showAbout = $state(false);
  let showSupport = $state(false);
  let clearHistoryRequestKey = $state(0);
  let historyClearable = $state(false);
  let showFullResetConfirm = $state(false);
  let fullResetDialogMode: "recovery" | "manual" = $state("recovery");
  let fullResetting = $state(false);
  let dataSyncState = $state<DataSyncState>({
    enabled: false,
    lastSyncedAt: null,
    phase: "idle",
    errorCode: null,
    usedBytes: 0,
    quotaBytes: 102_400,
    localUsedBytes: 0,
    localQuotaBytes: 10_485_760,
  });
  let showDataSyncIssue = $state(false);
  let dataSyncRetrying = $state(false);
  let localStorageHealth = $state<LocalStorageHealthState>({
    phase: "idle",
    errorCode: null,
    lastFailureAt: null,
  });
  let showLocalStorageIssue = $state(false);
  let effectiveNewTabOpen = $derived(
    userSettings.newTabOpen || currentTabPinned,
  );
  function isSameSettings(a: UserSettings, b: UserSettings) {
    return (
      a.defaultOpen === b.defaultOpen &&
      a.lastOpenTab === b.lastOpenTab &&
      a.defaultBookmarkFolderId === b.defaultBookmarkFolderId &&
      a.lastBookmarkFolderId === b.lastBookmarkFolderId &&
      a.newTabOpen === b.newTabOpen &&
      a.searchBookmarks === b.searchBookmarks &&
      a.searchHistory === b.searchHistory &&
      a.recordSearchKeywords === b.recordSearchKeywords &&
      a.rememberSearchEngineCategory === b.rememberSearchEngineCategory &&
      a.autoFocusSearch === b.autoFocusSearch &&
      a.injectRelatedSearch === b.injectRelatedSearch &&
      a.language === b.language &&
      a.theme === b.theme &&
      JSON.stringify(a.background) === JSON.stringify(b.background)
    );
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

  async function rememberBookmarkFolder(folderId: string) {
    if (userSettings.lastBookmarkFolderId === folderId) return;
    const nextSettings: UserSettings = {
      ...userSettings,
      lastBookmarkFolderId: folderId,
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

  onMount(() => {
    void initializePage();
  });

  onMount(() => {
    const handleRuntimeMessage = (message: unknown) => {
      if (
        !message ||
        typeof message !== "object" ||
        (message as { type?: string }).type !== "dataSyncApplied"
      ) {
        return;
      }
      void initializePage();
    };
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => browser.runtime.onMessage.removeListener(handleRuntimeMessage);
  });

  onMount(() => {
    void refreshDataSyncState();
    void refreshLocalStorageHealth();
    const handleStorageChanged = (
      changes: Record<string, unknown>,
      areaName: string,
    ) => {
      if (
        areaName === "sync" ||
        (areaName === "local" && DATA_SYNC_RUNTIME_KEY in changes)
      ) {
        void refreshDataSyncState();
      }
      if (
        areaName === "session" &&
        LOCAL_STORAGE_RUNTIME_KEY in changes
      ) {
        void refreshLocalStorageHealth();
      }
    };
    browser.storage.onChanged.addListener(handleStorageChanged);
    return () => browser.storage.onChanged.removeListener(handleStorageChanged);
  });

  async function refreshDataSyncState() {
    try {
      dataSyncState = await getDataSyncState();
      if (!dataSyncState.enabled || dataSyncState.phase === "idle") {
        showDataSyncIssue = false;
      }
    } catch (error) {
      console.error("[Mooogor Data Sync]", "indicator:failed", error);
    }
  }

  async function refreshLocalStorageHealth() {
    localStorageHealth = await getLocalStorageHealth();
    if (localStorageHealth.phase !== "error") {
      showLocalStorageIssue = false;
    }
  }

  async function retryDataSyncFromIndicator() {
    if (dataSyncRetrying) return;
    dataSyncRetrying = true;
    try {
      dataSyncState = await retryDataSync();
      if (dataSyncState.phase !== "error") showDataSyncIssue = false;
    } catch (error) {
      console.error("[Mooogor Data Sync]", "indicator:retry-failed", error);
      await refreshDataSyncState();
    } finally {
      dataSyncRetrying = false;
    }
  }

  function initializePage(): Promise<void> {
    // Sync notifications can arrive during startup; finish this pass first.
    const task = (initializationTask ?? Promise.resolve()).then(initializePageData);
    initializationTask = task;
    return task;
  }

  async function initializePageData() {
    const startedAt = Date.now();
    initializationFailed = false;
    try {
      if (debugConfigFallback) throw new Error("Debug configuration fallback");
      // Existing local data can render without waiting for a service-worker
      // wakeup. A missing/migrating store still goes through background recovery.
      try {
        userSettings = initialSettings ?? await loadSettings();
      } catch {
        await ensureConfigReady();
        userSettings = await loadSettings();
      }
      if (!firstMount || !initialSettings) applyTheme(userSettings.theme);
      initialSettings = null;
      const languageTask = setLanguage(userSettings.language).then(updateTabLabels);
      const backgroundSettings = userSettings.background;
      const backgroundTask = loadBackgroundItems().then((items) => {
        backgroundItems = items;
        if (userSettings.background !== backgroundSettings) return;
        activeBackground = backgroundSettings.enabled
          ? resolveBackgroundItem(items, backgroundSettings.id) : null;
        if (backgroundSettings.enabled && !activeBackground) {
          userSettings = { ...userSettings, background: { enabled: false, id: null } };
          void saveSettings(userSettings).catch((error) => {
            console.warn(NEW_TAB_LOG_PREFIX, "background:repair-failed", error);
          });
        }
      }).catch((error) => {
        console.warn(NEW_TAB_LOG_PREFIX, "background:load-failed", error);
      });
      void refreshCurrentTabPinnedState();
      const startOpenTab: OpenTab = userSettings.defaultOpen === "last"
        ? userSettings.lastOpenTab : userSettings.defaultOpen;
      const defaultIndex = openTabToIndex(startOpenTab);
      const bookmarkFolderId = startOpenTab !== "bookmark" ? undefined
        : userSettings.defaultOpen === "last"
          ? userSettings.lastBookmarkFolderId : userSettings.defaultBookmarkFolderId;
      configurationState = "ready";
      await clickTab(tabs[defaultIndex], defaultIndex, {
        rememberLast: false, bookmarkFolderId, forceLoad: true,
      });
      firstMount = false;
      // Maintenance and sync no longer gate the local first screen.
      void ensureConfigReady().catch((error) => {
        console.warn(NEW_TAB_LOG_PREFIX, "background:maintenance-failed", error);
      });
      await Promise.all([languageTask, backgroundTask]);
    } catch (error) {
      console.error(NEW_TAB_LOG_PREFIX, "initialization:failed", {
        durationMs: Date.now() - startedAt, error,
      });
      initializationFailed = true;
      configurationState = "fallback";
      applyWebsitesFailureState();
      updateTabLabels();
      updateSelTab(tabs[0]);
    }
  }

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
    const handleOpenSearchEngines = () => {
      showSetting = true;
    };
    window.addEventListener(
      "open-settings-search-engines",
      handleOpenSearchEngines,
    );

    const handleWebSitesUpdated = () => {
      void refreshPinnedsFromDb();
    };
    const handleBookmarksUpdated = () => {
      void refreshBookmarkViewFromSettings();
    };
    window.addEventListener("websites-updated", handleWebSitesUpdated);
    window.addEventListener("bookmarks-updated", handleBookmarksUpdated);

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
      window.removeEventListener("bookmarks-updated", handleBookmarksUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelFrequentSitesRefresh();
    };
  });

  function toggleSettings() {
    showSetting = !showSetting;
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("settings-visibility-changed", {
        detail: { visible: showSetting },
      }),
    );
  }

  function closeSettings() {
    showSetting = false;
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("settings-visibility-changed", {
        detail: { visible: false },
      }),
    );
  }

  async function handleUserSettingsChange(next: UserSettings) {
    if (isSameSettings(userSettings, next)) return;

    const languageChanged = userSettings.language !== next.language;
    const themeChanged = userSettings.theme !== next.theme;
    const relatedSearchChanged =
      languageChanged ||
      themeChanged ||
      userSettings.injectRelatedSearch !== next.injectRelatedSearch;
    userSettings = next;
    if (themeChanged) {
      applyTheme(next.theme);
    }
    if (languageChanged) {
      await Promise.all([saveSettings(next), setLanguage(next.language)]);
      updateTabLabels();
      if (relatedSearchChanged) {
        await refreshRelatedSearchPanels();
      }
      return;
    }
    await saveSettings(next);
    if (relatedSearchChanged) {
      await refreshRelatedSearchPanels();
    }
  }

  async function handleBackgroundConfigurationChange(
    background: BackgroundConfig,
  ) {
    const setting = {
      enabled: background.enabled,
      id: background.enabled ? background.current.id : null,
    };
    backgroundItems = background.items.map(cloneBackgroundItem);
    activeBackground = background.enabled
      ? cloneBackgroundItem(background.current)
      : null;
    userSettings = { ...userSettings, background: setting };
    await saveBackgroundConfiguration(setting, backgroundItems);
  }

  async function refreshRelatedSearchPanels() {
    try {
      const tabs = await browser.tabs.query({});
      await Promise.allSettled(
        tabs.map((tab) =>
          typeof tab.id === "number"
            ? browser.tabs.sendMessage(tab.id, {
                type: "refreshRelatedSearchPanel",
              })
            : Promise.resolve(),
        ),
      );
    } catch {
      // Content pages will refresh naturally on navigation if tab messaging is unavailable.
    }
  }

  function updateTabLabels() {
    tabs[0].name = currentCommonFolder?.title ?? t("nt_tab_common");
    if (historyStack.length <= 2) {
      tabs[1].name = t("nt_tab_bookmarks");
    }
    tabs[2].name = t("nt_tab_history");
  }

  $effect(() => {
    tabs[0].name = currentCommonFolder?.title ?? t("nt_tab_common");
  });

  async function clickGetPermission(permission: Permission) {
    if (permission === "bookmarks") {
      bookmarksPermission = await requestPermission(permission);
      if (!bookmarksPermission) return;
      if (!currentNode) {
        const folderId = await initBookmarkView();
        if (folderId) await rememberBookmarkFolder(folderId);
      }
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
    options: {
      rememberLast?: boolean;
      forceLoad?: boolean;
      bookmarkFolderId?: string | null;
    } = {},
  ) {
    const { rememberLast = true, bookmarkFolderId, forceLoad = false } = options;
    //书签选中情况下再点击回到顶层，
    if (tab.sel && !forceLoad) {
      if (tab.key === "0") {
        if (currentCommonFolder) {
          currentCommonFolder = undefined;
          updateTabLabels();
          return;
        }
        await refreshCommonTab();
      }
      if (tab.key === "1" && historyStack.length > 1) {
        await goBack();
      }
      return;
    }

    updateShowNext(i);
    updateSelTab(tab);
    if (rememberLast && configurationState === "ready") {
      void rememberLastOpenTab(tab).catch(error => console.warn(NEW_TAB_LOG_PREFIX, "settings:last-tab-failed", error));
    }

    if (tab.key === "0") {
      await refreshCommonTab();
      return;
    }
    if (tab.key === "1") {
      bookmarksPermission = await hasPermission("bookmarks");
      if (!bookmarksPermission) return;
      if (!currentNode) {
        const folderId = await initBookmarkView(bookmarkFolderId);
        if (folderId) {
          await rememberBookmarkFolder(folderId);
        }
      }
      return;
    }
    if (tab.key === "2") {
      historyPermission = await hasPermission("history");
      return;
    }
  }

  async function clickUpdatePinneds(items: WebSite[] | undefined) {
    if (configurationState !== "ready" || websitesState !== "ready") return;
    if (items) {
      allPinneds = items;
    } else {
      const requestId = ++websitesRequestId;
      try {
        const [nextItems, nextFolders] = await Promise.all([
          getAllWebSite(),
          getAllWebSiteFolders(),
        ]);
        if (requestId !== websitesRequestId) return;
        allPinneds = nextItems;
        webSiteFolders = nextFolders;
      } catch (error) {
        if (requestId !== websitesRequestId) return;
        console.error(
          NEW_TAB_LOG_PREFIX,
          "websites:update-refresh-failed",
          error,
        );
        applyWebsitesFailureState();
      }
    }
  }

  async function refreshPinnedsFromDb() {
    if (configurationState !== "ready") return;
    const requestId = ++websitesRequestId;
    try {
      const [items, folders] = await Promise.all([
        getAllWebSite(),
        getAllWebSiteFolders(),
      ]);
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
      webSiteFolders = folders;
      websitesState = "ready";
    } catch (error) {
      if (requestId !== websitesRequestId) return;
      console.error(NEW_TAB_LOG_PREFIX, "websites:refresh-failed", error);
      applyWebsitesFailureState();
    }
  }

  async function refreshCommonTab() {
    if (configurationState !== "ready") return;
    const requestId = ++websitesRequestId;
    websitesState = "loading";
    try {
      const [items, folders] = await Promise.all([
        getAllWebSite(),
        getAllWebSiteFolders(),
      ]);
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
      webSiteFolders = folders;
      websitesState = "ready";
    } catch (error) {
      if (requestId !== websitesRequestId) return;
      console.error(NEW_TAB_LOG_PREFIX, "websites:load-failed", error);
      applyWebsitesFailureState();
      return;
    }
    try {
      historyPermission = await hasPermission("history");
      if (!historyPermission) {
        cancelFrequentSitesRefresh();
        frequentSites = [];
        frequentSitesLoading = false;
        return;
      }
      scheduleFrequentSitesRefresh();
    } catch (error) {
      console.warn(
        NEW_TAB_LOG_PREFIX,
        "frequent-sites:permission-check-failed",
        error,
      );
      historyPermission = false;
      frequentSites = [];
      frequentSitesLoading = false;
    }
  }

  function applyWebsitesFailureState() {
    allPinneds = [];
    webSiteFolders = [];
    websitesState = "fallback";
  }

  async function resetFailedWebsites() {
    const requestId = ++websitesRequestId;
    websitesState = "loading";
    try {
      await resetCommonSitesToDefaultByLanguage(userSettings.language);
      const [items, folders] = await Promise.all([
        getAllWebSite(),
        getAllWebSiteFolders(),
      ]);
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
      webSiteFolders = folders;
      websitesState = "ready";
    } catch (error) {
      if (requestId !== websitesRequestId) return;
      console.error(NEW_TAB_LOG_PREFIX, "websites:reset-failed", error);
      applyWebsitesFailureState();
    }
  }

  async function resetEntireConfiguration() {
    showFullResetConfirm = false;
    fullResetting = true;
    configurationState = "loading";
    websitesState = "loading";
    try {
      await resetConfigurationToDefaults(userSettings.language);
      await initializePage();
    } catch (error) {
      console.error(
        NEW_TAB_LOG_PREFIX,
        "configuration:full-reset-failed",
        error,
      );
      configurationState = "fallback";
      applyWebsitesFailureState();
    } finally {
      fullResetting = false;
    }
  }

  function openFullResetDialog(mode: "recovery" | "manual") {
    fullResetDialogMode = mode;
    showFullResetConfirm = true;
  }

  function cancelFrequentSitesRefresh() {
    const idleWindow = window as Window & {
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof frequentSitesIdleCallbackId === "number") {
      idleWindow.cancelIdleCallback?.(frequentSitesIdleCallbackId);
      frequentSitesIdleCallbackId = undefined;
    }
    if (frequentSitesTimerId) {
      clearTimeout(frequentSitesTimerId);
      frequentSitesTimerId = undefined;
    }
    frequentSitesRequestId += 1;
  }

  function scheduleFrequentSitesRefresh() {
    cancelFrequentSitesRefresh();
    frequentSitesLoading = true;
    const run = () => {
      frequentSitesIdleCallbackId = undefined;
      frequentSitesTimerId = undefined;
      void refreshFrequentSites();
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    };
    if (idleWindow.requestIdleCallback) {
      frequentSitesIdleCallbackId = idleWindow.requestIdleCallback(run, {
        timeout: 1_200,
      });
      return;
    }
    frequentSitesTimerId = window.setTimeout(run, 0);
  }

  async function refreshFrequentSites() {
    const requestId = ++frequentSitesRequestId;
    frequentSitesLoading = true;
    try {
      const sites = (await browser.runtime.sendMessage({
        type: "getFrequentSites",
      })) as FrequentSite[];
      if (requestId !== frequentSitesRequestId) return;
      frequentSites = sites;
    } catch {
      if (requestId === frequentSitesRequestId) {
        frequentSites = [];
      }
    } finally {
      if (requestId === frequentSitesRequestId) {
        frequentSitesLoading = false;
      }
    }
  }

  async function refreshCurrentBookmarkNode() {
    if (!currentNode) return;
    const nextChildren = await getBookmarkChildren(currentNode.id);
    currentNode = {
      ...currentNode,
      children: nextChildren,
    };
    historyStack = historyStack.map((node) =>
      node.id === currentNode?.id ? currentNode : node,
    );
  }

  async function refreshBookmarkViewFromSettings() {
    if (!bookmarksPermission || !currentNode) return;
    const view = await getBookmarkFolderView(currentNode.id);
    currentNode = view.node;
    historyStack = view.path;
    await repairMissingBookmarkFolderSettings();
    if (!currentNode.url && currentNode.title) {
      tabs[1].name = currentNode.title;
    } else {
      tabs[1].name = t("nt_tab_bookmarks");
    }
  }

  async function handleSettingsOpenTab(tab: OpenTab) {
    const targetIndex = openTabToIndex(tab);
    const targetTab = tabs[targetIndex];
    if (!targetTab) return;
    await clickTab(targetTab, targetIndex);
    closeSettings();
  }

  function updateSelTab(tab: TabItem) {
    if (scrollRoot && selTab?.key !== tab.key) {
      scrollRoot.scrollTop = 0;
    }
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

  async function repairMissingBookmarkFolderSettings() {
    const isFolder = async (id?: string | null) => {
      if (!id) return false;
      try { const node = await getBookmark(id); return !!node && !node.url; }
      catch { return false; }
    };
    const [defaultValid, lastValid] = await Promise.all([
      userSettings.defaultOpen !== "bookmark" ? true : isFolder(userSettings.defaultBookmarkFolderId),
      !userSettings.lastBookmarkFolderId ? true : isFolder(userSettings.lastBookmarkFolderId),
    ]);
    if (defaultValid && lastValid) return;
    const fallbackId = await getInitialBookmarkFolderId();
    const nextSettings = {
      ...userSettings,
      defaultBookmarkFolderId: defaultValid ? userSettings.defaultBookmarkFolderId : fallbackId,
      lastBookmarkFolderId: lastValid ? userSettings.lastBookmarkFolderId : fallbackId,
    };
    userSettings = nextSettings;
    await saveSettings(nextSettings);
  }

  async function initBookmarkView(folderId?: string | null) {
    const view = await getBookmarkFolderView(folderId);
    historyStack = view.path;
    currentNode = view.node;
    updateBookmarkTabName(view.node);
    void repairMissingBookmarkFolderSettings().catch(error => console.warn(NEW_TAB_LOG_PREFIX, "bookmarks:repair-failed", error));
    return view.node.id;
  }

  async function clickFolder(bkmk: BookmarkNode) {
    const node = { ...bkmk, children: await getBookmarkChildren(bkmk.id) };
    bkmk = node;
    tabs[1].name = bkmk.title;
    historyStack.push(bkmk);
    currentNode = bkmk;
    await rememberBookmarkFolder(bkmk.id);
  }

  function updateBookmarkTabName(node: BookmarkNode) {
    tabs[1].name =
      node.url || node.id === "0" ? t("nt_tab_bookmarks") : node.title;
  }

  async function goBack() {
    if (historyStack.length <= 1) return;
    historyStack.pop()!;
    const previous = historyStack[historyStack.length - 1];
    currentNode = { ...previous, children: await getBookmarkChildren(previous.id) };
    if (currentNode) {
      updateBookmarkTabName(currentNode);
      await rememberBookmarkFolder(currentNode.id);
    }
  }
</script>

<svelte:head>
  <title>{t("nt_title")}</title>
</svelte:head>

<main>
    <Settings
      {showSetting}
      {userSettings}
      {backgroundItems}
      {activeBackground}
      {currentTabPinned}
      onchangeUserSettings={handleUserSettingsChange}
      onchangeBackground={handleBackgroundConfigurationChange}
      onclickAbout={() => (showAbout = true)}
      onclickSupport={() => (showSupport = true)}
      onClose={closeSettings}
      onResetAllData={() => openFullResetDialog("manual")}
      onOpenTab={handleSettingsOpenTab}
    >
      <Search
        layout={pageLayout}
        {autoFocusSearch}
        newTabOpen={effectiveNewTabOpen}
        searchBookmarks={userSettings.searchBookmarks}
        searchHistory={userSettings.searchHistory}
        recordSearchKeywords={userSettings.recordSearchKeywords}
        rememberSearchEngineCategory={userSettings.rememberSearchEngineCategory}
        settingsReady={configurationState === "ready"}
        configReady={configurationState === "ready"}
        loading={configurationState === "loading"}
        readOnly={configurationState !== "ready"}
      />
    </Settings>
</main>

{#snippet pageLayout(compactSearch: Snippet, mainSearch: Snippet)}
  {@render headBar(compactSearch)}
  <G full vertical grow flushTop>
    <div
      class="page_scroll"
      bind:this={scrollRoot}
      style:--newtab-header-height={`${headerHeight}px`}
    >
      <button
        class="scroll_to_top"
        type="button"
        aria-label={t("nt_scroll_to_top")}
        onclick={() => scrollRoot?.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })}
      ></button>
      {@render mainSearch()}
      <div class="content">
        <div class="tabs">
          <div class="side side-left">
            {#if selTab?.key === "0" && currentCommonFolder}
              <div in:fly={{ x: 50, duration: 300 }}>
                <G align="c">
                  <Button onclick={() => {
                    currentCommonFolder = undefined;
                    updateTabLabels();
                  }}>
                    <G align="c">
                      <Icon
                        name="ChevronLeft"
                        color="var(--c-text)"
                        opacity={0.6}
                      />
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
            <Tab {tabs} onclick={(tab, i) => clickTab(tab, i)} />
          </div>
          <div class="side side-right">
            {#if selTab?.key === "0" && websitesState === "ready"}
              <div in:fly={{ x: -50, duration: 300 }}>
                <G align="c">
                  <Button onclick={() => (showAdd = true)}>
                    <G>
                      <Icon name="Plus" color="var(--c-text)" opacity={0.6} />
                    </G>
                  </Button>
                </G>
              </div>
            {:else if selTab?.key === "1" && historyStack.length > 0}
              <div in:fly={{ x: -50, duration: 300 }}>
                <G align="c">
                  {#if currentNode?.id !== "0"}
                    <Button onclick={() => (showAddBookmark = true)}>
                      <G>
                        <Icon name="Plus" color="var(--c-text)" opacity={0.6} />
                      </G>
                    </Button>
                  {/if}
                  {#if gridView}
                    <Button
                      onclick={() => (gridView = false)}
                      bg="var(--c-text)"
                    >
                      <G>
                        <Icon name="Rows3" color="var(--c-bg)" />
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
            {:else if selTab?.key === "2" && historyPermission}
              <div in:fly={{ x: -50, duration: 300 }}>
                <G align="c">
                  <Button
                    disabled={!historyClearable}
                    onclick={() => (clearHistoryRequestKey += 1)}
                    title={t("nt_history_clear_title")}
                  >
                    <G>
                      <Icon
                        name="BrushCleaning"
                        color="var(--c-text)"
                        opacity={historyClearable ? 0.6 : 0.2}
                      />
                    </G>
                  </Button>
                </G>
              </div>
            {/if}
          </div>
        </div>
        {#each tabs as tab (tab.key)}
          {#if tab.sel}
            <div
              class="tab_content"
              in:fly={firstMount
                ? undefined
                : { x: showNext ? 180 : -180, duration: 250 }}
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
  </G>
{/snippet}

{#if showAbout}
  {#await import("@/lib/About.svelte") then { default: About }}
    <About
      onclickClose={() => (showAbout = false)}
      onclickSupport={() => {
        showAbout = false;
        showSupport = true;
      }}
    />
  {/await}
{/if}

{#if showSupport}
  {#await import("@/lib/Support.svelte") then { default: Support }}
    <Support onclickClose={() => (showSupport = false)} />
  {/await}
{/if}

{#if showDataSyncIssue && dataSyncState.enabled}
  <DataSyncIssueDialog
    errorCode={dataSyncState.errorCode}
    retrying={dataSyncRetrying}
    onclickClose={() => (showDataSyncIssue = false)}
    onRetry={retryDataSyncFromIndicator}
  />
{/if}

{#if showLocalStorageIssue && localStorageHealth.phase === "error"}
  <LocalStorageIssueDialog
    errorCode={localStorageHealth.errorCode}
    onclickClose={() => (showLocalStorageIssue = false)}
  />
{/if}

{#if showFullResetConfirm}
  <ConfirmDialog
    title={fullResetDialogMode === "recovery"
      ? t("nt_config_load_failed")
      : t("nt_config_reset_all")}
    description={fullResetDialogMode === "recovery"
      ? `${t("nt_config_load_failed_desc")}\n\n${t("nt_config_reset_all_confirm")}`
      : t("nt_config_reset_all_confirm")}
    confirmText={t("nt_config_reset_all")}
    onclickClose={() => (showFullResetConfirm = false)}
    onConfirm={() => {
      if (debugConfigFallback) {
        showFullResetConfirm = false;
        return;
      }
      void resetEntireConfiguration();
    }}
  />
{/if}

{#snippet headBar(compactSearch: Snippet)}
  <header class="top" bind:clientHeight={headerHeight}>
    <G>
      <Button align="c" onclick={() => (showAbout = true)}>
        <G align="c">
          <G>
            <img class="logo" src="/Mooogor.svg" alt="Mooogor Start" />
          </G>
          <span class="brand_name"><T nowrap>Mooogor Start</T></span>
        </G>
      </Button>
    </G>
    <G full>
      {@render compactSearch()}
    </G>
    <G align="r" gap>
      {#if localStorageHealth.phase === "error"}
        <Button
          onclick={() => (showLocalStorageIssue = true)}
          title={t("nt_local_storage_error_title")}
        >
          <G>
            <Icon name="TriangleAlert" color="var(--c-red)" />
          </G>
        </Button>
      {/if}
      {#if dataSyncState.enabled && dataSyncState.phase === "pending"}
        <Button
          disabled
          skipTabFocus
          title={t("nt_data_sync_loading_title")}
        >
          <G>
            <Icon name="Loading" color="var(--c-text)" />
          </G>
        </Button>
      {:else if dataSyncState.enabled && dataSyncState.phase === "error"}
        <Button
          onclick={() => (showDataSyncIssue = true)}
          title={t("nt_data_sync_error_title")}
        >
          <G>
            <Icon name="TriangleAlert" color="var(--c-red)" />
          </G>
        </Button>
      {/if}
      <Button
        onclick={() => (showSupport = true)}
        title={t("nt_about_support_button")}
      >
        <G>
          <Icon name="Coffee" color="var(--c-text)" />
        </G>
      </Button>
      {#if configurationState === "fallback"}
        <Button
          onclick={() => openFullResetDialog("recovery")}
          title={t("nt_config_load_failed")}
          bg="var(--c-red)"
          disabled={fullResetting}
        >
          <G>
            <Icon name="TriangleAlert" color="#fff" />
          </G>
        </Button>
      {:else if showSetting}
        <Button
          disabled={configurationState !== "ready"}
          onclick={toggleSettings}
          bg="var(--c-text)"
        >
          <G>
            <Icon name="Settings2" color="var(--c-bg)" />
          </G>
        </Button>
      {:else}
        <Button
          disabled={configurationState !== "ready"}
          onclick={toggleSettings}
        >
          <G>
            <Icon name="Settings2" color="var(--c-text)" />
          </G>
        </Button>
      {/if}
    </G>
  </header>
{/snippet}

{#snippet pinneds()}
  <Pinneds
    {scrollRoot}
    {allPinneds}
    {webSiteFolders}
    newTabOpen={effectiveNewTabOpen}
    list={commonListView}
    {frequentSites}
    {showAdd}
    loading={websitesState === "loading"}
    error={websitesState === "fallback"}
    readOnly={websitesState !== "ready"}
    onReset={resetFailedWebsites}
    onopenAdd={() => (showAdd = true)}
    oncloseAdd={() => (showAdd = false)}
    onUpdate={(items) => clickUpdatePinneds(items)}
    onToggleList={() => (commonListView = !commonListView)}
    bind:currentFolder={currentCommonFolder}
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
    {#key currentNode.id}
      <Bookmarks
        {scrollRoot}
        {headerHeight}
        list={gridView}
        bookmarkNode={currentNode}
        bind:showAddBookmark
        newTabOpen={effectiveNewTabOpen}
        settingsOpen={showSetting}
        onclickFolder={(bkmk) => clickFolder(bkmk)}
        onback={goBack}
        onChanged={refreshCurrentBookmarkNode}
      />
    {/key}
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
    {#await import("@/lib/History.svelte") then { default: History }}
      <History
        {scrollRoot}
        newTabOpen={effectiveNewTabOpen}
        settingsOpen={showSetting}
        clearRequestKey={clearHistoryRequestKey}
        onClearableChange={(clearable) => (historyClearable = clearable)}
      />
    {/await}
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
        <Button
          onclick={() => clickGetPermission(permission)}
          bg="var(--c-text)"
        >
          <G>
            <T color="var(--c-bg)">{t("nt_authorize")}</T>
          </G>
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
  .page_scroll {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-padding-block-start: var(--newtab-header-height);
  }
  .scroll_to_top {
    position: sticky;
    inset-block-start: 0;
    z-index: 29;
    flex: none;
    width: 100%;
    height: var(--newtab-header-height);
    padding: 0;
    border: 0;
    background: none;
    cursor: n-resize;
    outline-offset: -2px;
  }
  .top {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: 30;
    width: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(max-content, 1fr) minmax(0, 420px) minmax(max-content, 1fr);
    align-items: center;
    padding: var(--gap);
    background: linear-gradient(to bottom, var(--c-page-background), transparent);
    pointer-events: none;
  }
  .top :global(button),
  .top :global(form) {
    pointer-events: auto;
  }
  @media (max-width: 640px) {
    .brand_name {
      display: none;
    }
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
    padding: var(--gap);
    width: 100%;
    max-width: 1280px;
    box-sizing: border-box;
    flex: 1 0 auto;
    background: linear-gradient(180deg, var(--c-card), rgba(0, 0, 0, 0));
    border-radius: var(--r3);
    position: relative;
  }
  @supports (corner-shape: squircle) {
    .content {
      border-radius: 50px;
      corner-shape: squircle;
    }
  }

  /* On screens smaller than 1024px, use full width */
  @media screen and (max-width: 1024px) {
    .content {
      max-width: 100%;
    }
  }

  .tab_content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: var(--gap);
  }
  .tabs {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr) 88px;
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
