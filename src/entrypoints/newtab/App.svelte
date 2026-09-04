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
  import { hasPermission, requestPermission } from "@/lib/browser/permissions";
  import type { Permission } from "@/lib/browser/permissions";
  import { getBookmarkChildren, getBookmarks } from "@/lib/browser/bookmarks";
  import type { BookmarkNode } from "@/lib/browser/bookmarks";
  import type { FrequentSite } from "@/lib/browser/history";
  import { ensureConfigReady } from "@/lib/browser/configReady";
  import { getAllWebSite } from "@/lib/DB/DB";
  import type { WebSite } from "@/lib/DB/DB";
  import { fly, slide } from "svelte/transition";
  import { onMount, tick } from "svelte";
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

  let showSetting = $state(false);
  let allPinneds: WebSite[] = $state([]);
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

  let selTab: TabItem | undefined = $state();
  let showNext = $state(false);
  let firstMount = $state(true);
  let settingsLoaded = $state(false);
  let initializationFailed = $state(false);
  let configurationState: "loading" | "ready" | "fallback" = $state("loading");
  let websitesState: "loading" | "ready" | "fallback" = $state("loading");
  let websitesRequestId = 0;
  let i18nRenderKey = $state(0);
  const NEW_TAB_LOG_PREFIX = "[Mooogor NewTab]";
  const debugConfigFallback =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") ===
      "config-fallback";

  let userSettings: UserSettings = $state(DEFAULT_SETTINGS);
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

  async function initializePage() {
    const startedAt = Date.now();
    configurationState = "loading";
    websitesState = "loading";
    initializationFailed = false;
    showSetting = false;
    showAdd = false;
    showAddBookmark = false;
    // Render the page shell immediately. Data-dependent areas use skeletons
    // until persisted configuration is available.
    userSettings = DEFAULT_SETTINGS;
    backgroundItems = PRESET_BACKGROUNDS.map(cloneBackgroundItem);
    activeBackground = null;
    applyTheme(DEFAULT_SETTINGS.theme);
    allPinneds = [];
    updateSelTab(tabs[0]);
    settingsLoaded = true;
    try {
      await setLanguage(DEFAULT_SETTINGS.language);
      updateTabLabels();
      i18nRenderKey += 1;
    } catch (error) {
      console.warn(NEW_TAB_LOG_PREFIX, "fallback:language-load-failed", error);
    }
    await tick();
    firstMount = false;
    try {
      if (debugConfigFallback) {
        throw new Error("Debug configuration fallback");
      }
      await ensureConfigReady();
      [userSettings, backgroundItems] = await Promise.all([
        loadSettings(),
        loadBackgroundItems(),
      ]);
      activeBackground = userSettings.background.enabled
        ? resolveBackgroundItem(backgroundItems, userSettings.background.id)
        : null;
      if (userSettings.background.enabled && !activeBackground) {
        userSettings = {
          ...userSettings,
          background: { enabled: false, id: null },
        };
        await saveSettings(userSettings);
      }
      applyTheme(userSettings.theme);
      await refreshCurrentTabPinnedState();
      await setLanguage(userSettings.language);
      settingsLoaded = true;
      updateTabLabels();
      i18nRenderKey += 1;
      const startOpenTab: OpenTab =
        userSettings.defaultOpen === "last"
          ? userSettings.lastOpenTab
          : userSettings.defaultOpen;
      const defaultIndex = openTabToIndex(startOpenTab);
      const bookmarkFolderId =
        startOpenTab !== "bookmark"
          ? undefined
          : userSettings.defaultOpen === "last"
            ? userSettings.lastBookmarkFolderId
            : userSettings.defaultBookmarkFolderId;
      // From this point persisted stores are available, so tab loaders and edits
      // may safely switch from the local fallback to real data.
      configurationState = "ready";
      await clickTab(tabs[defaultIndex], defaultIndex, {
        rememberLast: false,
        bookmarkFolderId,
      });
    } catch (error) {
      // Keep an extension-page failure from leaving Edge with a blank new tab.
      console.error(NEW_TAB_LOG_PREFIX, "initialization:failed", {
        durationMs: Date.now() - startedAt,
        error,
      });
      initializationFailed = true;
      configurationState = "fallback";
      applyWebsitesFailureState();
      updateTabLabels();
      updateSelTab(tabs[0]);
    } finally {
      await tick();
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
      i18nRenderKey += 1;
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
    tabs[0].name = t("nt_tab_common");
    if (historyStack.length <= 2) {
      tabs[1].name = t("nt_tab_bookmarks");
    }
    tabs[2].name = t("nt_tab_history");
  }

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
      bookmarkFolderId?: string | null;
    } = {},
  ) {
    const { rememberLast = true, bookmarkFolderId } = options;
    //书签选中情况下再点击回到顶层，
    if (tab.sel) {
      if (tab.key === "0") {
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
      await rememberLastOpenTab(tab);
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
        const nextItems = await getAllWebSite();
        if (requestId !== websitesRequestId) return;
        allPinneds = nextItems;
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
      const items = await getAllWebSite();
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
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
      const items = await getAllWebSite();
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
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
    websitesState = "fallback";
  }

  async function resetFailedWebsites() {
    const requestId = ++websitesRequestId;
    websitesState = "loading";
    try {
      await resetCommonSitesToDefaultByLanguage(userSettings.language);
      const items = await getAllWebSite();
      if (requestId !== websitesRequestId) return;
      allPinneds = items;
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
    const [root] = await getBookmarks();
    if (!root) return;
    const currentPath = findBookmarkPath(root as BookmarkNode, currentNode.id);
    const nextPath =
      currentPath ?? getInitialBookmarkPath(root as BookmarkNode);
    currentNode = nextPath[nextPath.length - 1];
    historyStack = nextPath;
    await repairMissingBookmarkFolderSettings(root as BookmarkNode);
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

  function findBookmarkPath(
    node: BookmarkNode,
    id: string,
    parents: BookmarkNode[] = [],
  ): BookmarkNode[] | undefined {
    const path = [...parents, node];
    if (node.id === id && !node.url) return path;
    for (const child of node.children ?? []) {
      if (child.url) continue;
      const found = findBookmarkPath(child as BookmarkNode, id, path);
      if (found) return found;
    }
    return undefined;
  }

  function getInitialBookmarkPath(root: BookmarkNode) {
    const initialFolder = root.children?.find((child) => !child.url);
    return initialFolder ? [root, initialFolder as BookmarkNode] : [root];
  }

  async function repairMissingBookmarkFolderSettings(root: BookmarkNode) {
    const initialFolderId = getInitialBookmarkPath(root).at(-1)?.id;
    if (!initialFolderId) return;
    const defaultFolderMissing =
      userSettings.defaultOpen === "bookmark" &&
      (!userSettings.defaultBookmarkFolderId ||
        !findBookmarkPath(root, userSettings.defaultBookmarkFolderId));
    const lastFolderMissing =
      !!userSettings.lastBookmarkFolderId &&
      !findBookmarkPath(root, userSettings.lastBookmarkFolderId);
    if (!defaultFolderMissing && !lastFolderMissing) return;
    const nextSettings: UserSettings = {
      ...userSettings,
      defaultBookmarkFolderId: defaultFolderMissing
        ? initialFolderId
        : userSettings.defaultBookmarkFolderId,
      lastBookmarkFolderId: lastFolderMissing
        ? initialFolderId
        : userSettings.lastBookmarkFolderId,
    };
    userSettings = nextSettings;
    await saveSettings(nextSettings);
  }

  async function initBookmarkView(folderId?: string | null) {
    const [root] = await getBookmarks();
    if (!root) return undefined;
    const fallbackPath = getInitialBookmarkPath(root as BookmarkNode);
    const requestedPath = folderId
      ? findBookmarkPath(root as BookmarkNode, folderId)
      : undefined;
    const path = requestedPath ?? fallbackPath;
    const target = path[path.length - 1];
    historyStack = path;
    currentNode = target;
    updateBookmarkTabName(target);
    await repairMissingBookmarkFolderSettings(root as BookmarkNode);
    return target.id;
  }

  async function clickFolder(bkmk: BookmarkNode) {
    const node = bkmk.children
      ? bkmk
      : {
          ...bkmk,
          children: await getBookmarkChildren(bkmk.id),
        };
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
    currentNode = historyStack[historyStack.length - 1];
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
  {#key i18nRenderKey}
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
      onResetAllData={() => openFullResetDialog("manual")}
      onOpenTab={handleSettingsOpenTab}
    >
      <div class="top">
        {@render headBar()}
      </div>
      {#if settingsLoaded}
        <Search
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
      {/if}
      <div class="content">
        <div class="tabs">
          <div class="side side-left">
            {#if selTab?.key === "1" && historyStack.length > 1}
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

{#snippet headBar()}
  <G full align="c">
    <G full>
      <Button align="c" onclick={() => (showAbout = true)}>
        <G align="c">
          <G>
            <img class="logo" src="/Mooogor.svg" alt="Mooogor Start" />
          </G>
          <T>Mooogor Start</T>
        </G>
      </Button>
    </G>
    <G gap>
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
  </G>
{/snippet}

{#snippet pinneds()}
  <Pinneds
    {allPinneds}
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
    <History
      newTabOpen={effectiveNewTabOpen}
      settingsOpen={showSetting}
      clearRequestKey={clearHistoryRequestKey}
      onClearableChange={(clearable) => (historyClearable = clearable)}
    />
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
    padding: var(--gap);
    width: 100%;
    max-width: 1280px;
    box-sizing: border-box;
    height: 100%;
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
    top: 0;
    left: 0;
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
