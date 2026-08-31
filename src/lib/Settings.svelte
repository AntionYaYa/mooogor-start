<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { DndEvent } from "svelte-dnd-action";
    import { fly, slide } from "svelte/transition";
    import G from "./components/G.svelte";
    import T from "./components/T.svelte";
    import Switch from "./components/Switch.svelte";
    import Select, { type SelectOption } from "./components/Select.svelte";
    import Divider from "./components/Divider.svelte";
    import EditSearchEngine from "./EditSearchEngine.svelte";
    import ManageEngineCategories from "./ManageEngineCategories.svelte";
    import AddPinned from "./AddPinned.svelte";
    import ConfirmDialog from "./ConfirmDialog.svelte";
    import BatchToolbar from "./components/BatchToolbar.svelte";
    import SettingsCommonSitesSection from "@/lib/settings/SettingsCommonSitesSection.svelte";
    import SettingsSearchEnginesSection from "@/lib/settings/SettingsSearchEnginesSection.svelte";
    import SettingsBackgroundSection from "@/lib/settings/SettingsBackgroundSection.svelte";
    import SettingsDataSyncSection from "@/lib/settings/SettingsDataSyncSection.svelte";
    import SettingsThemePicker from "@/lib/settings/SettingsThemePicker.svelte";
    import BackgroundUrlDialog from "@/lib/settings/BackgroundUrlDialog.svelte";
    import BackgroundLayer from "@/lib/background/BackgroundLayer.svelte";
    import {
        cloneBackgroundItem,
        createBackgroundItem,
        type BackgroundConfig,
        type BackgroundItem,
    } from "@/lib/background/background";
    import { getBookmarks } from "@/lib/browser/bookmarks";
    import type { BookmarkNode } from "@/lib/browser/bookmarks";
    import { hasPermission } from "@/lib/browser/permissions";
    import type {
        AppTheme,
        OpenTab,
        UserSettings,
    } from "@/lib/utils/settings";
    import type { Engine, EngineCategoryItem, WebSite } from "@/lib/DB/DB";
    import {
        addEngine,
        deleteEngine,
        FALLBACK_ENGINE_CATEGORY_ID,
        renameEngineCategory,
        addEngineCategory,
        deleteEngineCategory,
        updateEngineCategoriesOrder,
        updateEngine,
        resetSearchEnginesToDefault,
    } from "@/lib/DB/DB";
    import { buildDefaultEngines } from "@/lib/DB/defaultEnginesFactory";
    import { t } from "@/lib/utils/i18n";
    import Icon from "./components/Icon.svelte";
    import type { IconName } from "@/lib/components/Icon.svelte";
    import Button from "./components/Button.svelte";
    import Checkbox from "./components/Checkbox.svelte";
    import { buildDefaultEngineCategories } from "@/lib/config/engineCategories";
    import {
        deleteSearchKeysForCategory,
        retainSearchKeysForCategories,
    } from "@/lib/search/searchStorage";
    import {
        deleteCommonSiteEntry,
        fetchCommonSites,
        getResetCommonSitesConfirmMessage,
        persistCommonSitesOrder,
        resetCommonSitesToDefaultByLanguage,
        saveCommonSiteEntry,
    } from "@/lib/settings/commonSites";
    import {
        buildEngineFaviconUrl,
        buildSearchEngineGroups as buildSearchEngineGroupsState,
        type CategoryId,
        flattenSearchEngineGroups,
        getAllSearchSettingEngines as collectAllSearchSettingEngines,
        getGroupedSearchEngines as collectGroupedSearchEngines,
        loadSearchEngineSettings,
        normalizeEngineCategory as normalizeSearchEngineCategory,
        persistSearchEngineLayout as persistSearchEngineLayoutToDb,
        resolveMissingCategoryId as resolveMissingSearchCategoryId,
        splitSearchEnginesByEnabled,
    } from "@/lib/settings/searchEngines";
    interface Props {
        children: any;
        showSetting: boolean;
        userSettings: UserSettings;
        backgroundItems: BackgroundItem[];
        activeBackground: BackgroundItem | null;
        onchangeUserSettings: (userSettings: UserSettings) => void;
        onchangeBackground: (background: BackgroundConfig) => void;
        onclickAbout: () => void;
        onclickSupport: () => void;
        onResetAllData: () => void;
        onOpenTab: (tab: OpenTab) => void | Promise<void>;
        currentTabPinned?: boolean;
    }
    let {
        children,
        showSetting,
        userSettings,
        backgroundItems,
        activeBackground,
        onchangeUserSettings,
        onchangeBackground,
        onclickAbout,
        onclickSupport,
        onResetAllData,
        onOpenTab,
        currentTabPinned = false,
    }: Props = $props();

    const openPosBase = [
        { label: t("nt_default_common"), value: "common" },
        { label: t("nt_default_bookmark"), value: "bookmark" },
        { label: t("nt_default_history"), value: "history" },
        { label: t("nt_default_last"), value: "last", dividerTop: true },
    ] as const;

    const languageBase = [
        { label: t("nt_lang_auto"), value: "auto" },
        { label: "简体中文", value: "zh_CN", dividerTop: true },
        { label: "繁體中文", value: "zh_TW" },
        { label: "English", value: "en" },
    ] as const;

    let openPosOptions = $derived(
        openPosBase.map((o) => ({
            ...o,
            sel: o.value === userSettings.defaultOpen,
        })),
    );
    let bookmarkFolderChoices = $state<{ label: string; value: string }[]>([]);
    let bookmarkFolderOptions = $derived(
        bookmarkFolderChoices.map((option) => ({
            ...option,
            sel: option.value === userSettings.defaultBookmarkFolderId,
        })),
    );
    let languageOptions = $derived(
        languageBase.map((o) => ({
            ...o,
            sel: o.value === userSettings.language,
        })),
    );

    let effectiveNewTabOpenSwitch = $derived(
        userSettings.newTabOpen || currentTabPinned,
    );
    let lockNewTabOpenSwitch = $derived(currentTabPinned);
    type SettingsPage =
        | "root"
        | "searchEngines"
        | "common"
        | "background"
        | "dataSync"
        | "history";
    let settingPage = $state<SettingsPage>("root");
    let searchSettingsExpanded = $state(true);
    let websiteSettingsExpanded = $state(true);
    let otherSettingsExpanded = $state(true);
    let backgroundPreview = $state<BackgroundConfig | null>(null);
    let backgroundDraft = $derived(
        backgroundPreview ?? {
            enabled: userSettings.background.enabled && !!activeBackground,
            current: cloneBackgroundItem(
                activeBackground ?? backgroundItems[0],
            ),
            items: backgroundItems.map(cloneBackgroundItem),
        },
    );
    let showBackgroundUrlDialog = $state(false);
    let pageDirection = $state<1 | -1>(1);
    let settingEnabledEngines: Engine[] = $state([]);
    let settingDisabledEngines: Engine[] = $state([]);
    let settingEngineCategories: EngineCategoryItem[] = $state([]);
    let settingEngineGroups: Record<CategoryId, Engine[]> = $state({});
    let settingEnginesLoading = $state(false);
    let settingEnginesLoaded = $state(false);
    let settingEnginesError = $state(false);
    let settingEnginesRequestId = 0;
    let settingEnginesSaving = $state(false);
    let expandedCategoryIds = $state<Set<string>>(new Set());
    let pendingExpandCategoryId = $state<string | null>(null);
    let showCategoryManager = $state(false);
    let showSearchEngineEditor = $state(false);
    let editingSearchEngine: Engine | null = $state(null);
    let selectedSearchEngineIds = $state<Set<number>>(new Set());
    let searchEngineMoveMenuOpen = $state(false);
    let searchEngineMoveActionEl: HTMLDivElement | undefined = $state();
    let commonSites: WebSite[] = $state([]);
    let commonSitesLoading = $state(false);
    let commonSitesError = $state(false);
    let commonSitesRequestId = $state(0);
    let commonSitesDragging = $state(false);
    let selectedCommonSiteIds = $state<Set<number>>(new Set());
    let showCommonEditor = $state(false);
    let editingCommonSite: WebSite | null = $state(null);
    let confirmOptions = $state<{
        title: string;
        description: string;
        confirmText?: string;
        resolve: (value: boolean) => void;
    } | null>(null);
    let persistEngineLayoutTimer: ReturnType<typeof setTimeout> | null =
        $state(null);
    let bookmarkFolderRequestId = 0;
    let bookmarkAccessRequestId = 0;
    let bookmarkFolderRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let registeredBookmarksApi: typeof browser.bookmarks | null = null;
    let selectableSearchEngineIds = $derived.by(() =>
        settingEngineCategories.flatMap((category) =>
            !expandedCategoryIds.has(category.id)
                ? []
                : (settingEngineGroups[category.id] ?? []).flatMap((engine) =>
                      engine.id ? [engine.id] : [],
                  ),
        ),
    );
    let selectedSearchEngineCount = $derived(selectedSearchEngineIds.size);
    let allSearchEnginesSelected = $derived(
        selectableSearchEngineIds.length > 0 &&
            selectedSearchEngineIds.size === selectableSearchEngineIds.length,
    );
    let partlySearchEnginesSelected = $derived(
        selectedSearchEngineCount > 0 && !allSearchEnginesSelected,
    );
    let selectableCommonSiteIds = $derived(
        commonSites.flatMap((site) => (site.id ? [site.id] : [])),
    );
    let selectedCommonSiteCount = $derived(selectedCommonSiteIds.size);
    let allCommonSitesSelected = $derived(
        selectableCommonSiteIds.length > 0 &&
            selectedCommonSiteIds.size === selectableCommonSiteIds.length,
    );
    let partlyCommonSitesSelected = $derived(
        selectedCommonSiteCount > 0 && !allCommonSitesSelected,
    );

    function setSelectedSearchEngineIds(ids: Iterable<number>) {
        selectedSearchEngineIds = new Set(ids);
    }

    function toggleSearchEngineSelected(engine: Engine) {
        if (!engine.id || settingEnginesSaving) return;
        const next = new Set(selectedSearchEngineIds);
        if (next.has(engine.id)) {
            next.delete(engine.id);
        } else {
            next.add(engine.id);
        }
        selectedSearchEngineIds = next;
        if (next.size === 0) searchEngineMoveMenuOpen = false;
    }

    function toggleSelectAllSearchEngines() {
        if (settingEnginesSaving) return;
        if (allSearchEnginesSelected) {
            setSelectedSearchEngineIds([]);
            searchEngineMoveMenuOpen = false;
            return;
        }
        setSelectedSearchEngineIds(selectableSearchEngineIds);
    }

    async function moveSelectedSearchEngines(categoryId: string) {
        if (!selectedSearchEngineIds.size || settingEnginesSaving) return;
        const engineIds = [...selectedSearchEngineIds];
        searchEngineMoveMenuOpen = false;
        if (await batchMoveSearchEngines(engineIds, categoryId)) {
            setSelectedSearchEngineIds([]);
        }
    }

    async function deleteSelectedSearchEngines() {
        if (!selectedSearchEngineIds.size || settingEnginesSaving) return;
        const engineIds = [...selectedSearchEngineIds];
        if (await batchDeleteSearchEngines(engineIds)) {
            setSelectedSearchEngineIds([]);
            searchEngineMoveMenuOpen = false;
        }
    }

    function handleSearchEngineMoveMouseDown(event: MouseEvent) {
        if (!searchEngineMoveMenuOpen) return;
        if (searchEngineMoveActionEl?.contains(event.target as Node)) return;
        searchEngineMoveMenuOpen = false;
    }

    onMount(() => {
        window.addEventListener("mousedown", handleSearchEngineMoveMouseDown);
    });

    onDestroy(() => {
        window.removeEventListener(
            "mousedown",
            handleSearchEngineMoveMouseDown,
        );
    });

    function pruneSearchEngineSelection() {
        const validIds = new Set(selectableSearchEngineIds);
        const nextIds = [...selectedSearchEngineIds].filter((id) =>
            validIds.has(id),
        );
        if (nextIds.length !== selectedSearchEngineIds.size) {
            selectedSearchEngineIds = new Set(nextIds);
        }
        if (selectedSearchEngineIds.size === 0) {
            searchEngineMoveMenuOpen = false;
        }
    }

    function setSelectedCommonSiteIds(ids: Iterable<number>) {
        selectedCommonSiteIds = new Set(ids);
    }

    function toggleCommonSiteSelected(site: WebSite) {
        if (!site.id || commonSitesLoading) return;
        const next = new Set(selectedCommonSiteIds);
        if (next.has(site.id)) {
            next.delete(site.id);
        } else {
            next.add(site.id);
        }
        selectedCommonSiteIds = next;
    }

    function toggleSelectAllCommonSites() {
        if (commonSitesLoading) return;
        if (allCommonSitesSelected) {
            setSelectedCommonSiteIds([]);
            return;
        }
        setSelectedCommonSiteIds(selectableCommonSiteIds);
    }

    async function deleteSelectedCommonSites() {
        if (!selectedCommonSiteIds.size || commonSitesLoading) return;
        const siteIds = [...selectedCommonSiteIds];
        if (
            !(await requestConfirm(
                t("nt_confirm_delete_common_sites_title"),
                t(
                    "nt_settings_common_delete_sites_confirm",
                    String(siteIds.length),
                ),
                t("nt_delete"),
            ))
        ) {
            return;
        }
        commonSitesLoading = true;
        try {
            await Promise.all(siteIds.map((id) => deleteCommonSiteEntry(id)));
            setSelectedCommonSiteIds([]);
            await loadCommonSites();
        } finally {
            commonSitesLoading = false;
        }
    }

    function pruneCommonSiteSelection() {
        const validIds = new Set(selectableCommonSiteIds);
        const nextIds = [...selectedCommonSiteIds].filter((id) =>
            validIds.has(id),
        );
        if (nextIds.length !== selectedCommonSiteIds.size) {
            selectedCommonSiteIds = new Set(nextIds);
        }
    }
    function requestConfirm(
        title: string,
        description: string,
        confirmText?: string,
    ) {
        return new Promise<boolean>((resolve) => {
            confirmOptions = {
                title,
                description,
                confirmText,
                resolve,
            };
        });
    }

    function closeConfirm(result: boolean) {
        confirmOptions?.resolve(result);
        confirmOptions = null;
    }

    function openSettingPage(page: Exclude<SettingsPage, "root">) {
        pageDirection = 1;
        if (page !== "searchEngines") {
            closeCategoryManager();
            closeSearchEngineEditor();
        }
        if (page !== "common") {
            closeCommonEditor();
        }
        settingPage = page;
        if (page === "searchEngines") {
            void loadSearchSettingEngines(true);
        }
        if (page === "common") {
            void loadCommonSites();
        }
    }

    function goBackSettingPage() {
        pageDirection = -1;
        closeCategoryManager();
        closeSearchEngineEditor();
        closeCommonEditor();
        settingPage = "root";
    }

    function getSettingPageTitle() {
        if (settingPage === "searchEngines") {
            return t("nt_settings_search_engines_title");
        }
        if (settingPage === "common") return t("nt_tab_common");
        if (settingPage === "background") {
            return t("nt_settings_background_title");
        }
        if (settingPage === "dataSync") {
            return t("nt_settings_data_sync_title");
        }
        if (settingPage === "history") return t("nt_tab_history");
        return t("nt_settings_title");
    }

    function resolveMissingCategoryId(
        categories: EngineCategoryItem[] = settingEngineCategories,
    ): CategoryId {
        return resolveMissingSearchCategoryId(categories);
    }

    function getFallbackCategoryId(): CategoryId {
        return settingEngineCategories[0]?.id ?? "1";
    }

    function normalizeEngineCategory(category?: string): CategoryId {
        return normalizeSearchEngineCategory(category, settingEngineCategories);
    }

    function resolveSearchEngineCategoryId(categoryId?: string | null) {
        if (!settingEngineCategories.length) return null;
        if (categoryId) {
            const exists = settingEngineCategories.some(
                (category) => category.id === categoryId,
            );
            if (exists) return categoryId;
        }
        return settingEngineCategories[0]?.id ?? null;
    }

    function applyPendingCategoryExpansion() {
        if (!pendingExpandCategoryId) return;
        const resolvedId = resolveSearchEngineCategoryId(
            pendingExpandCategoryId,
        );
        pendingExpandCategoryId = null;
        if (!resolvedId) return;
        expandedCategoryIds = new Set([resolvedId]);
    }

    function notifyEngineConfigUpdated() {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("engine-config-updated"));
    }

    function handleEngineConfigUpdated() {
        if (!showSetting) return;
        if (settingPage !== "searchEngines") return;
        void loadSearchSettingEngines(true);
    }

    function handleWebSitesUpdated() {
        if (!showSetting) return;
        if (settingPage !== "common") return;
        void loadCommonSites();
    }

    function handleBookmarksUpdated() {
        if (!showSetting) return;
        scheduleBookmarkFolderChoicesRefresh();
    }

    function handleBrowserBookmarksChanged() {
        if (!showSetting) return;
        scheduleBookmarkFolderChoicesRefresh();
    }

    function registerBookmarkListeners() {
        if (registeredBookmarksApi) return;
        const bookmarksApi = browser.bookmarks;
        bookmarksApi.onCreated.addListener(handleBrowserBookmarksChanged);
        bookmarksApi.onRemoved.addListener(handleBrowserBookmarksChanged);
        bookmarksApi.onChanged.addListener(handleBrowserBookmarksChanged);
        bookmarksApi.onMoved.addListener(handleBrowserBookmarksChanged);
        registeredBookmarksApi = bookmarksApi;
    }

    function unregisterBookmarkListeners() {
        const bookmarksApi = registeredBookmarksApi;
        if (!bookmarksApi) return;
        bookmarksApi.onCreated.removeListener(handleBrowserBookmarksChanged);
        bookmarksApi.onRemoved.removeListener(handleBrowserBookmarksChanged);
        bookmarksApi.onChanged.removeListener(handleBrowserBookmarksChanged);
        bookmarksApi.onMoved.removeListener(handleBrowserBookmarksChanged);
        registeredBookmarksApi = null;
    }

    function cancelBookmarkFolderChoicesRefresh() {
        if (bookmarkFolderRefreshTimer === null) return;
        clearTimeout(bookmarkFolderRefreshTimer);
        bookmarkFolderRefreshTimer = null;
    }

    function scheduleBookmarkFolderChoicesRefresh() {
        cancelBookmarkFolderChoicesRefresh();
        bookmarkFolderRefreshTimer = setTimeout(() => {
            bookmarkFolderRefreshTimer = null;
            void syncBookmarkFolderAccess();
        }, 120);
    }

    async function syncBookmarkFolderAccess() {
        const accessRequestId = ++bookmarkAccessRequestId;
        const granted = await hasPermission("bookmarks");
        if (accessRequestId !== bookmarkAccessRequestId) return;
        if (!granted) {
            unregisterBookmarkListeners();
            bookmarkFolderChoices = [];
            return;
        }
        registerBookmarkListeners();
        await loadBookmarkFolderChoices();
    }

    function setOpenPos(value: string) {
        const defaultBookmarkFolderId =
            value === "bookmark" &&
            !bookmarkFolderChoices.some(
                (option) =>
                    option.value === userSettings.defaultBookmarkFolderId,
            )
                ? (bookmarkFolderChoices[0]?.value ?? null)
                : userSettings.defaultBookmarkFolderId;
        onchangeUserSettings({
            ...userSettings,
            defaultOpen: value as UserSettings["defaultOpen"],
            defaultBookmarkFolderId,
        });
    }

    function setDefaultBookmarkFolder(value: string) {
        if (!bookmarkFolderChoices.some((option) => option.value === value)) {
            return;
        }
        onchangeUserSettings({
            ...userSettings,
            defaultBookmarkFolderId: value,
        });
    }

    function collectBookmarkFolderChoices(root: BookmarkNode) {
        const choices: { label: string; value: string }[] = [];
        const visit = (node: BookmarkNode, parentTitles: string[]) => {
            for (const child of node.children ?? []) {
                if (child.url) continue;
                const title = child.title || "--";
                const titles = [...parentTitles, title];
                choices.push({
                    label: titles.join(" / "),
                    value: child.id,
                });
                visit(child as BookmarkNode, titles);
            }
        };
        visit(root, []);
        return choices;
    }

    async function loadBookmarkFolderChoices() {
        const requestId = ++bookmarkFolderRequestId;
        try {
            const [root] = await getBookmarks();
            if (requestId !== bookmarkFolderRequestId) return;
            if (!root) {
                bookmarkFolderChoices = [];
                return;
            }
            const choices = collectBookmarkFolderChoices(root as BookmarkNode);
            bookmarkFolderChoices = choices;
            const selectedId = userSettings.defaultBookmarkFolderId;
            if (
                userSettings.defaultOpen !== "bookmark" ||
                (selectedId &&
                    choices.some((option) => option.value === selectedId)) ||
                !choices.length
            ) {
                return;
            }
            onchangeUserSettings({
                ...userSettings,
                defaultBookmarkFolderId: choices[0].value,
            });
        } catch {
            if (requestId === bookmarkFolderRequestId) {
                bookmarkFolderChoices = [];
            }
        }
    }

    function setLanguage(value: string) {
        onchangeUserSettings({
            ...userSettings,
            language: value as UserSettings["language"],
        });
    }

    function setTheme(value: AppTheme) {
        onchangeUserSettings({
            ...userSettings,
            theme: value,
        });
    }

    function previewBackground(background: BackgroundConfig) {
        backgroundPreview = {
            ...background,
            current: cloneBackgroundItem(background.current),
            items: background.items.map(cloneBackgroundItem),
        };
    }

    function commitBackground(background: BackgroundConfig) {
        previewBackground(background);
        onchangeBackground({
            ...background,
            current: cloneBackgroundItem(background.current),
            items: background.items.map(cloneBackgroundItem),
        });
        backgroundPreview = null;
    }

    async function addBackgroundUrl(url: string) {
        const background = backgroundDraft;
        const existing = background.items.find((item) => item.url === url);
        let item: BackgroundItem = existing
            ? cloneBackgroundItem(existing)
            : createBackgroundItem(url);
        if (!item.options.length) {
            try {
                const { extractBackgroundColorScheme } = await import(
                    "@/lib/background/backgroundColors"
                );
                item = {
                    ...item,
                    ...(await extractBackgroundColorScheme(url)),
                };
            } catch {
                // 配色不是必填项，失败或超时后继续使用现有的 --c-bg。
            }
        }
        const items = existing
            ? background.items.map((backgroundItem) =>
                  backgroundItem.url === url
                      ? cloneBackgroundItem(item)
                      : backgroundItem,
              )
            : [...background.items, cloneBackgroundItem(item)];
        commitBackground({
            ...background,
            enabled: true,
            current: cloneBackgroundItem(item),
            items,
        });
    }

    async function removeBackgroundUrl(id: string) {
        const confirmed = await requestConfirm(
            t("nt_confirm_delete_background_title"),
            t("nt_settings_background_delete_confirm"),
            t("nt_delete"),
        );
        if (!confirmed) return;
        const background = backgroundDraft;
        const target = background.items.find((item) => item.id === id);
        if (!target?.deletable) return;
        const items = background.items.filter((item) => item.id !== id);
        const removingCurrent = background.current.id === id;
        commitBackground({
            ...background,
            enabled: removingCurrent ? false : background.enabled,
            current: removingCurrent
                ? cloneBackgroundItem(items[0])
                : background.current,
            items,
        });
    }

    function setNewTabOpen(value: boolean) {
        onchangeUserSettings({ ...userSettings, newTabOpen: value });
    }

    function setSearchBookmarks(value: boolean) {
        onchangeUserSettings({ ...userSettings, searchBookmarks: value });
    }

    function setSearchHistory(value: boolean) {
        onchangeUserSettings({ ...userSettings, searchHistory: value });
    }

    function setRecordSearchKeywords(value: boolean) {
        onchangeUserSettings({ ...userSettings, recordSearchKeywords: value });
    }

    function setRememberSearchEngineCategory(value: boolean) {
        onchangeUserSettings({
            ...userSettings,
            rememberSearchEngineCategory: value,
        });
    }

    function setInjectRelatedSearch(value: boolean) {
        onchangeUserSettings({
            ...userSettings,
            injectRelatedSearch: value,
        });
    }

    function onswitchNewTabOpen(swith: boolean) {
        if (lockNewTabOpenSwitch) return;
        setNewTabOpen(swith);
    }

    function openFeatureTab(tab: OpenTab) {
        void onOpenTab(tab);
    }

    function openHistoryManager() {
        void (async () => {
            if (
                !(await requestConfirm(
                    t("nt_confirm_manage_history_title"),
                    t("nt_manage_history_confirm"),
                ))
            )
                return;
            if (import.meta.env.FIREFOX) {
                await onOpenTab("history");
                return;
            }
            browser.tabs.update({ url: "chrome://history/" });
        })();
    }

    function openBookmarksManager() {
        void (async () => {
            if (
                !(await requestConfirm(
                    t("nt_confirm_manage_bookmarks_title"),
                    t("nt_manage_bookmarks_confirm"),
                ))
            )
                return;
            if (import.meta.env.FIREFOX) {
                await onOpenTab("bookmark");
                return;
            }
            browser.tabs.update({ url: "chrome://bookmarks/" });
        })();
    }

    async function loadCommonSites() {
        commonSitesRequestId += 1;
        const requestId = commonSitesRequestId;
        commonSitesLoading = true;
        commonSitesError = false;
        try {
            const items = await fetchCommonSites();
            if (requestId !== commonSitesRequestId) return;
            commonSites = items;
            pruneCommonSiteSelection();
            commonSitesDragging = false;
        } catch (error) {
            if (requestId !== commonSitesRequestId) return;
            commonSites = [];
            commonSitesError = true;
            console.error("[Mooogor Settings]", "common-sites:load-failed", error);
        } finally {
            if (requestId === commonSitesRequestId) {
                commonSitesLoading = false;
            }
        }
    }

    function openAddCommonSiteEditor() {
        editingCommonSite = null;
        showCommonEditor = true;
    }

    function openEditCommonSiteEditor(site: WebSite) {
        editingCommonSite = site;
        showCommonEditor = true;
    }

    function closeCommonEditor() {
        editingCommonSite = null;
        showCommonEditor = false;
    }

    async function saveCommonSite(payload: WebSite) {
        await saveCommonSiteEntry(payload, editingCommonSite?.id);
        await loadCommonSites();
    }

    async function removeEditingCommonSite() {
        if (!editingCommonSite?.id) return false;
        if (
            !(await requestConfirm(
                t("nt_confirm_delete_common_sites_title"),
                t("nt_settings_common_delete_sites_confirm", "1"),
                t("nt_delete"),
            ))
        ) {
            return false;
        }
        await deleteCommonSiteEntry(editingCommonSite.id);
        await loadCommonSites();
        return true;
    }

    function handleCommonSitesConsider(e: CustomEvent<DndEvent<WebSite>>) {
        commonSitesDragging = true;
        commonSites = e.detail.items;
    }

    async function handleCommonSitesFinalize(
        e: CustomEvent<DndEvent<WebSite>>,
    ) {
        commonSitesDragging = false;
        const items = e.detail.items;
        commonSites = items;
        await persistCommonSitesOrder(items);
    }

    function getSearchEngineCategoryOptions(): SelectOption[] {
        return settingEngineCategories.map((item) => ({
            label: item.name,
            value: item.id,
            sel: false,
        }));
    }

    function buildSearchEngineGroups(
        allEngines: Engine[] = getAllSearchSettingEngines(),
    ) {
        return buildSearchEngineGroupsState(
            settingEngineCategories,
            allEngines,
        );
    }

    function syncSearchSettingEnginesFromGroups(
        groups: Record<CategoryId, Engine[]> = settingEngineGroups,
    ) {
        const nextState = splitSearchEnginesByEnabled(
            settingEngineCategories,
            groups,
        );
        settingEnabledEngines = nextState.enabledEngines;
        settingDisabledEngines = nextState.disabledEngines;
    }

    function syncSearchEngineGroups() {
        const nextGroups = buildSearchEngineGroups();
        settingEngineGroups = nextGroups;
        syncSearchSettingEnginesFromGroups(nextGroups);
    }

    function setSearchEngineGroupItems(
        categoryId: CategoryId,
        items: Engine[],
    ) {
        const nextGroups = {
            ...settingEngineGroups,
            [categoryId]: items.map((item) => ({
                ...item,
                category: categoryId,
            })),
        };
        settingEngineGroups = nextGroups;
        syncSearchSettingEnginesFromGroups(nextGroups);
    }

    function queuePersistSearchEngineLayout() {
        if (persistEngineLayoutTimer) {
            clearTimeout(persistEngineLayoutTimer);
        }
        persistEngineLayoutTimer = setTimeout(() => {
            persistEngineLayoutTimer = null;
            void persistSearchEngineLayout();
        }, 16);
    }

    async function persistSearchEngineLayout() {
        settingEnginesSaving = true;
        try {
            const nextState = await persistSearchEngineLayoutToDb(
                settingEngineCategories,
                settingEngineGroups,
            );
            settingEngineGroups = nextState.groups;
            settingEnabledEngines = nextState.enabledEngines;
            settingDisabledEngines = nextState.disabledEngines;
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    function handleSearchEngineGroupConsider(
        categoryId: CategoryId,
        e: CustomEvent<DndEvent<Engine>>,
    ) {
        setSearchEngineGroupItems(categoryId, e.detail.items);
    }

    function handleSearchEngineGroupFinalize(
        categoryId: CategoryId,
        e: CustomEvent<DndEvent<Engine>>,
    ) {
        setSearchEngineGroupItems(categoryId, e.detail.items);
        queuePersistSearchEngineLayout();
    }

    async function batchMoveSearchEngines(
        engineIds: number[],
        categoryId: string,
    ): Promise<boolean> {
        if (!engineIds.length || settingEnginesSaving) return false;
        const targetCategory = settingEngineCategories.find(
            (item) => item.id === categoryId,
        );
        if (!targetCategory) return false;
        const selectedIds = new Set(engineIds);
        const selectedEngines: Engine[] = [];
        const nextGroups: Record<CategoryId, Engine[]> = {};
        for (const category of settingEngineCategories) {
            const items = settingEngineGroups[category.id] ?? [];
            nextGroups[category.id] = [];
            for (const engine of items) {
                if (engine.id && selectedIds.has(engine.id)) {
                    selectedEngines.push(engine);
                    continue;
                }
                nextGroups[category.id].push(engine);
            }
        }
        if (!selectedEngines.length) return false;
        nextGroups[categoryId] = [
            ...(nextGroups[categoryId] ?? []),
            ...selectedEngines.map((engine) => ({
                ...engine,
                category: categoryId,
            })),
        ];
        settingEngineGroups = nextGroups;
        syncSearchSettingEnginesFromGroups(nextGroups);
        if (persistEngineLayoutTimer) {
            clearTimeout(persistEngineLayoutTimer);
            persistEngineLayoutTimer = null;
        }
        await persistSearchEngineLayout();
        return true;
    }

    async function batchDeleteSearchEngines(
        engineIds: number[],
    ): Promise<boolean> {
        if (!engineIds.length || settingEnginesSaving) return false;
        if (
            !(await requestConfirm(
                t("nt_confirm_delete_search_engines_title"),
                t(
                    "nt_settings_search_delete_engines_confirm",
                    String(engineIds.length),
                ),
                t("nt_delete"),
            ))
        ) {
            return false;
        }
        settingEnginesSaving = true;
        try {
            await Promise.all(engineIds.map((id) => deleteEngine(id)));
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
            return true;
        } finally {
            settingEnginesSaving = false;
        }
    }

    function openCategoryManager() {
        showCategoryManager = true;
        closeSearchEngineEditor();
    }

    function closeCategoryManager() {
        showCategoryManager = false;
    }

    let addingToCategoryId = $state<string | null>(null);

    function openAddSearchEngineEditor() {
        editingSearchEngine = null;
        addingToCategoryId = null;
        showSearchEngineEditor = true;
        closeCategoryManager();
    }

    function openAddSearchEngineEditorForCategory(categoryId: string) {
        editingSearchEngine = null;
        addingToCategoryId = categoryId;
        showSearchEngineEditor = true;
        closeCategoryManager();
    }

    function openEditSearchEngineEditor(engine: Engine) {
        editingSearchEngine = engine;
        showSearchEngineEditor = true;
        closeCategoryManager();
    }

    function closeSearchEngineEditor() {
        editingSearchEngine = null;
        addingToCategoryId = null;
        showSearchEngineEditor = false;
    }

    async function loadSearchSettingEngines(force: boolean = false) {
        if (settingEnginesLoading) return;
        if (!force && settingEnginesLoaded) return;
        if (persistEngineLayoutTimer) {
            clearTimeout(persistEngineLayoutTimer);
            persistEngineLayoutTimer = null;
        }
        const requestId = ++settingEnginesRequestId;
        settingEnginesLoading = true;
        settingEnginesError = false;
        try {
            const nextState = await loadSearchEngineSettings();
            if (requestId !== settingEnginesRequestId) return;
            settingEngineCategories = nextState.categories;
            settingEnabledEngines = nextState.enabledEngines;
            settingDisabledEngines = nextState.disabledEngines;
            settingEngineGroups = nextState.groups;
            applyPendingCategoryExpansion();
            if (expandedCategoryIds.size === 0 && nextState.categories[0]?.id) {
                expandedCategoryIds = new Set([nextState.categories[0].id]);
            }
            settingEnginesLoaded = true;
            pruneSearchEngineSelection();
        } catch (error) {
            if (requestId !== settingEnginesRequestId) return;
            settingEnginesLoaded = false;
            settingEnginesError = true;
            console.error("[Mooogor Settings]", "search-engines:load-failed", error);
        } finally {
            if (requestId === settingEnginesRequestId) {
                settingEnginesLoading = false;
            }
        }
    }

    function toggleCategoryExpanded(categoryId: string) {
        expandedCategoryIds = new Set(expandedCategoryIds);
        if (expandedCategoryIds.has(categoryId)) {
            expandedCategoryIds.delete(categoryId);
        } else {
            expandedCategoryIds.add(categoryId);
        }
        pruneSearchEngineSelection();
    }

    function getAllSearchSettingEngines() {
        return collectAllSearchSettingEngines(
            settingEnabledEngines,
            settingDisabledEngines,
        );
    }

    function getGroupedSearchEngines() {
        return collectGroupedSearchEngines(
            settingEngineCategories,
            settingEngineGroups,
        );
    }

    async function addSearchCategory(name: string): Promise<string | void> {
        settingEnginesSaving = true;
        try {
            const newId = await addEngineCategory(name);
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
            return newId;
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function renameSearchCategoryById(id: string, name: string) {
        settingEnginesSaving = true;
        try {
            await renameEngineCategory(id, name);
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function deleteSearchCategoryById(id: string) {
        if (settingEngineCategories.length <= 1) return;
        if (id === FALLBACK_ENGINE_CATEGORY_ID) return;
        const category = settingEngineCategories.find((item) => item.id === id);
        if (!category) return;
        const engineCount = (settingEngineGroups[id] ?? []).length;
        const title = `${t("nt_confirm_delete_search_category_title")}「${category.name}」`;
        const description = t(
            "nt_settings_search_delete_category_confirm",
            String(engineCount),
        );
        if (!(await requestConfirm(title, description, t("nt_delete")))) return;
        settingEnginesSaving = true;
        try {
            await deleteEngineCategory(id);
            await deleteSearchKeysForCategory(id);
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function reorderSearchCategories(
        items: (EngineCategoryItem & { id: string })[],
    ) {
        settingEnginesSaving = true;
        try {
            settingEngineCategories = items.map((item, index) => ({
                ...item,
                order: index,
            }));
            const nextGroups = buildSearchEngineGroupsState(
                settingEngineCategories,
                flattenSearchEngineGroups(
                    settingEngineCategories,
                    settingEngineGroups,
                ),
            );
            settingEngineGroups = nextGroups;
            syncSearchSettingEnginesFromGroups(nextGroups);
            await updateEngineCategoriesOrder(items);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function saveSearchEngineEditor(payload: {
        title: string;
        engineUrl: string;
        category: string;
        enabled: boolean;
    }) {
        const normalizedCategory = normalizeEngineCategory(payload.category);
        settingEnginesSaving = true;
        try {
            if (editingSearchEngine?.id) {
                const currentEngine =
                    settingEnabledEngines.find(
                        (item) => item.id === editingSearchEngine?.id,
                    ) ??
                    settingDisabledEngines.find(
                        (item) => item.id === editingSearchEngine?.id,
                    );
                if (!currentEngine) return;
                await updateEngine({
                    ...currentEngine,
                    id: editingSearchEngine.id,
                    title: payload.title,
                    engineUrl: payload.engineUrl,
                    faviconUrl:
                        buildEngineFaviconUrl(payload.engineUrl) ||
                        currentEngine.faviconUrl,
                    category: normalizedCategory,
                    enabled: payload.enabled,
                });
            } else {
                await addEngine({
                    title: payload.title,
                    engineUrl: payload.engineUrl,
                    faviconUrl: buildEngineFaviconUrl(payload.engineUrl),
                    category: normalizedCategory,
                    enabled: payload.enabled,
                });
            }
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function removeSearchEngine(engine: Engine) {
        if (!engine.id) return;
        settingEnginesSaving = true;
        try {
            await deleteEngine(engine.id);
            if (editingSearchEngine?.id === engine.id) {
                closeSearchEngineEditor();
            }
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function removeEditingSearchEngine() {
        if (!editingSearchEngine) return false;
        if (
            !(await requestConfirm(
                t("nt_confirm_delete_search_engines_title"),
                t("nt_settings_search_delete_engines_confirm", "1"),
                t("nt_delete"),
            ))
        ) {
            return false;
        }
        await removeSearchEngine(editingSearchEngine);
        return true;
    }

    async function resetSearchEnginesToDefaultConfirm() {
        if (settingEnginesSaving) return;
        if (
            !(await requestConfirm(
                t("nt_confirm_reset_search_engines_title"),
                t("nt_settings_search_reset_confirm"),
            ))
        )
            return;
        settingEnginesSaving = true;
        try {
            const defaultCategories = buildDefaultEngineCategories();
            const defaultEngines = buildDefaultEngines(userSettings.language);
            await resetSearchEnginesToDefault(
                defaultCategories,
                defaultEngines,
            );
            await retainSearchKeysForCategories(
                defaultCategories.map((category) => category.id),
            );
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } catch (error) {
            settingEnginesError = true;
            console.error("[Mooogor Settings]", "search-engines:reset-failed", error);
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function resetCommonSitesToDefaultConfirm() {
        if (commonSitesLoading) return;
        if (
            !(await requestConfirm(
                t("nt_confirm_reset_common_sites_title"),
                getResetCommonSitesConfirmMessage(),
            ))
        )
            return;
        commonSitesLoading = true;
        try {
            await resetCommonSitesToDefaultByLanguage(userSettings.language);
            await loadCommonSites();
        } catch (error) {
            commonSitesError = true;
            console.error("[Mooogor Settings]", "common-sites:reset-failed", error);
        } finally {
            commonSitesLoading = false;
        }
    }

    function handleSettingsVisibility(event: Event) {
        const visible = (event as CustomEvent<{ visible: boolean }>).detail
            ?.visible;
        if (visible === true) {
            void syncBookmarkFolderAccess();
            return;
        }
        if (visible !== false) return;
        closeCategoryManager();
        closeSearchEngineEditor();
        closeCommonEditor();
        cancelBookmarkFolderChoicesRefresh();
        settingPage = "root";
    }

    function handleOpenSearchEngines(event: Event) {
        const detail = (event as CustomEvent<{ categoryId?: string }>).detail;
        pendingExpandCategoryId = detail?.categoryId ?? null;
        void syncBookmarkFolderAccess();
        openSettingPage("searchEngines");
    }

    onMount(() => {
        window.addEventListener(
            "engine-config-updated",
            handleEngineConfigUpdated,
        );
        window.addEventListener("websites-updated", handleWebSitesUpdated);
        window.addEventListener("bookmarks-updated", handleBookmarksUpdated);
        window.addEventListener(
            "settings-visibility-changed",
            handleSettingsVisibility,
        );
        window.addEventListener(
            "open-settings-search-engines",
            handleOpenSearchEngines,
        );
    });

    onDestroy(() => {
        window.removeEventListener(
            "engine-config-updated",
            handleEngineConfigUpdated,
        );
        window.removeEventListener("websites-updated", handleWebSitesUpdated);
        window.removeEventListener("bookmarks-updated", handleBookmarksUpdated);
        cancelBookmarkFolderChoicesRefresh();
        bookmarkAccessRequestId += 1;
        bookmarkFolderRequestId += 1;
        unregisterBookmarkListeners();
        window.removeEventListener(
            "settings-visibility-changed",
            handleSettingsVisibility,
        );
        window.removeEventListener(
            "open-settings-search-engines",
            handleOpenSearchEngines,
        );
    });
</script>

<div class="layout">
    <div class="left" class:shrink={showSetting}>
        <div
            class="app_box"
            class:radius={showSetting}
            class:background_active={backgroundDraft.enabled}
            style:--c-background-surface-light={backgroundDraft.enabled
                ? (backgroundDraft.current.lightColor ?? "var(--c-bg)")
                : "var(--c-bg1)"}
            style:--c-background-surface-dark={backgroundDraft.enabled
                ? (backgroundDraft.current.darkColor ?? "var(--c-bg)")
                : "var(--c-bg1)"}
        >
            {#if backgroundDraft.enabled}
                <BackgroundLayer background={backgroundDraft.current} />
            {/if}
            {@render children()}
        </div>
    </div>
    {#if showSetting}
        <div class="setting" transition:slide={{ duration: 200, axis: "x" }}>
            <div class="header">
                {@render temHeader()}
            </div>
            <div class="setting_body">
                {#key settingPage}
                    <div
                        class="setting_page"
                        in:fly={{
                            x: pageDirection === 1 ? 160 : -160,
                            duration: 200,
                        }}
                        out:fly={{
                            x: pageDirection === 1 ? -160 : 160,
                            duration: 200,
                        }}
                    >
                        {#if settingPage === "root"}
                            {@render temSettingRoot()}
                        {:else if settingPage === "searchEngines"}
                            <SettingsSearchEnginesSection
                                {settingEnginesLoading}
                                {settingEnginesLoaded}
                                {settingEnginesError}
                                {settingEnginesSaving}
                                {expandedCategoryIds}
                                selectedEngineIds={selectedSearchEngineIds}
                                groups={getGroupedSearchEngines()}
                                onOpenCategoryManager={openCategoryManager}
                                onToggleCategoryExpanded={toggleCategoryExpanded}
                                onConsiderGroup={handleSearchEngineGroupConsider}
                                onFinalizeGroup={handleSearchEngineGroupFinalize}
                                onEditEngine={openEditSearchEngineEditor}
                                onAddEngineToCategory={openAddSearchEngineEditorForCategory}
                                onToggleEngineSelected={toggleSearchEngineSelected}
                                onReset={resetSearchEnginesToDefaultConfirm}
                            />
                        {:else if settingPage === "common"}
                            <SettingsCommonSitesSection
                                {commonSites}
                                {commonSitesLoading}
                                {commonSitesError}
                                {commonSitesDragging}
                                selectedSiteIds={selectedCommonSiteIds}
                                onConsider={handleCommonSitesConsider}
                                onFinalize={handleCommonSitesFinalize}
                                onAdd={openAddCommonSiteEditor}
                                onEdit={openEditCommonSiteEditor}
                                onToggleSelected={toggleCommonSiteSelected}
                                onReset={resetCommonSitesToDefaultConfirm}
                            />
                        {:else if settingPage === "background"}
                            <SettingsBackgroundSection
                                config={backgroundDraft}
                                onPreview={previewBackground}
                                onCommit={commitBackground}
                                onOpenAdd={() =>
                                    (showBackgroundUrlDialog = true)}
                                onRemove={(url) =>
                                    void removeBackgroundUrl(url)}
                            />
                        {:else if settingPage === "dataSync"}
                            <SettingsDataSyncSection />
                        {/if}
                    </div>
                {/key}
            </div>
            {#if settingPage === "searchEngines" && selectedSearchEngineCount > 0}
                {@render temSearchEngineBatchToolbar()}
            {:else if settingPage === "common"}
                {@render temCommonSitesBatchToolbar()}
            {/if}
        </div>
    {/if}
</div>

{#if showCategoryManager}
    <ManageEngineCategories
        categories={settingEngineCategories}
        saving={settingEnginesSaving}
        lockedIds={[FALLBACK_ENGINE_CATEGORY_ID]}
        onAdd={(name) => addSearchCategory(name)}
        onRename={renameSearchCategoryById}
        onDelete={deleteSearchCategoryById}
        onReorder={reorderSearchCategories}
        onclickClose={closeCategoryManager}
    />
{/if}

{#if showSearchEngineEditor}
    <EditSearchEngine
        isEdit={!!editingSearchEngine}
        titleValue={editingSearchEngine?.title}
        urlValue={editingSearchEngine?.engineUrl}
        categoryValue={editingSearchEngine
            ? normalizeEngineCategory(editingSearchEngine.category)
            : (addingToCategoryId ?? getFallbackCategoryId())}
        enabledValue={editingSearchEngine?.enabled !== false}
        categoryOptions={getSearchEngineCategoryOptions()}
        saving={settingEnginesSaving}
        onSave={saveSearchEngineEditor}
        onDelete={editingSearchEngine ? removeEditingSearchEngine : undefined}
        onclickClose={closeSearchEngineEditor}
    />
{/if}

{#if showCommonEditor}
    <AddPinned
        isEdit={!!editingCommonSite}
        urlValue={editingCommonSite?.url}
        titleValue={editingCommonSite?.title}
        onSave={saveCommonSite}
        onDelete={editingCommonSite ? removeEditingCommonSite : undefined}
        onclickClose={closeCommonEditor}
    />
{/if}

{#if confirmOptions}
    <ConfirmDialog
        title={confirmOptions.title}
        description={confirmOptions.description}
        confirmText={confirmOptions.confirmText}
        onclickClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
    />
{/if}

{#if showBackgroundUrlDialog}
    <BackgroundUrlDialog
        onclickClose={() => (showBackgroundUrlDialog = false)}
        onConfirm={addBackgroundUrl}
    />
{/if}

{#snippet temSearchEngineBatchToolbar()}
    <div class="batch_toolbar" transition:slide={{ duration: 180 }}>
        <div
            class="select_all"
            class:select_all_disabled={settingEnginesSaving}
            role="button"
            tabindex="0"
            onclick={toggleSelectAllSearchEngines}
            onkeydown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleSelectAllSearchEngines();
            }}
        >
            <Checkbox
                checked={allSearchEnginesSelected}
                indeterminate={partlySearchEnginesSelected}
                disabled={settingEnginesSaving}
                skipTabFocus
            />
            <T type="s" nowrap>{selectedSearchEngineCount}</T>
        </div>
        <div class="move_action" bind:this={searchEngineMoveActionEl}>
            <Button
                onclick={() =>
                    (searchEngineMoveMenuOpen = !searchEngineMoveMenuOpen)}
                disabled={settingEnginesSaving}
                fill
            >
                <G align="c">
                    <Icon name="FolderOpen" color="var(--c-text)" />
                    <T type="m">{t("nt_move")}</T>
                </G>
            </Button>
            {#if searchEngineMoveMenuOpen}
                <div class="move_menu" transition:slide={{ duration: 160 }}>
                    <div class="scrool">
                        {#each getGroupedSearchEngines() as group (group.id)}
                            <button
                                class="move_option"
                                type="button"
                                onclick={() =>
                                    moveSelectedSearchEngines(group.id)}
                            >
                                <G full align="c">
                                    <Icon
                                        name="FolderOpen"
                                        color="var(--c-text)"
                                    />
                                    <T type="m" color="var(--c-text)" nowrap>
                                        {group.name}
                                    </T>
                                </G>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        <Button
            onclick={deleteSelectedSearchEngines}
            disabled={settingEnginesSaving}
            fill
        >
            <G align="c">
                <Icon name="Trash2" color="var(--c-red)" />
            </G>
        </Button>
    </div>
{/snippet}

{#snippet temCommonSitesBatchToolbar()}
    <BatchToolbar
        show={selectedCommonSiteCount > 0}
        count={selectedCommonSiteCount}
        allSelected={allCommonSitesSelected}
        indeterminate={partlyCommonSitesSelected}
        disabled={commonSitesLoading}
        onselectall={toggleSelectAllCommonSites}
        ondelete={deleteSelectedCommonSites}
    />
{/snippet}

{#snippet temHeader()}
    <Button
        onclick={settingPage === "root" ? undefined : goBackSettingPage}
        skipTabFocus={settingPage === "root"}
    >
        <G>
            <Icon
                name="ChevronLeft"
                color="var(--c-text)"
                opacity={settingPage === "root" ? 0 : 0.6}
            />
        </G>
    </Button>
    <div class="title_center">
        <T type="m" align="c" nowrap>{getSettingPageTitle()}</T>
    </div>
    <Button
        onclick={settingPage === "searchEngines"
            ? resetSearchEnginesToDefaultConfirm
            : settingPage === "common"
              ? resetCommonSitesToDefaultConfirm
              : settingPage === "dataSync"
                ? onResetAllData
              : undefined}
        skipTabFocus={!(
            settingPage === "searchEngines" ||
            settingPage === "common" ||
            settingPage === "dataSync"
        )}
        title={settingPage === "dataSync"
            ? t("nt_config_reset_all")
            : undefined}
    >
        <G>
            <Icon
                name="RotateCcw"
                color="var(--c-text)"
                opacity={settingPage === "searchEngines" ||
                settingPage === "common" ||
                settingPage === "dataSync"
                    ? 0.6
                    : 0}
            />
        </G>
    </Button>
{/snippet}

{#snippet temSettingRoot()}
    <div class="setting_con">
        {@render temCollapsibleSection(
            t("nt_settings_search_title"),
            'Search',
            searchSettingsExpanded,
            () => (searchSettingsExpanded = !searchSettingsExpanded),
            temSearchSettingsGroup,
        )}
        <G full>
            <Divider />
        </G>

        {@render temCollapsibleSection(
            t("nt_settings_websites_title"),
            'Globe',
            websiteSettingsExpanded,
            () => (websiteSettingsExpanded = !websiteSettingsExpanded),
            temWebsiteSettingsGroup,
        )}

       <G full>
            <Divider />
        </G>


        {@render temCollapsibleSection(
            t("nt_settings_other_section_title"),
            'Bolt',
            otherSettingsExpanded,
            () => (otherSettingsExpanded = !otherSettingsExpanded),
            temOtherSettingsGroup,
        )}
    </div>
{/snippet}

{#snippet temSearchSettingsGroup()}
    {@render temEntranceItem(t("nt_settings_search_engines_title"), () =>
        openSettingPage("searchEngines"),
    )}
    {@render temswithcItem(
        undefined,
        t("nt_settings_search_remember_engine_category"),
        t("nt_settings_search_remember_engine_category_tip"),
        userSettings.rememberSearchEngineCategory,
        setRememberSearchEngineCategory,
    )}
    {@render temswithcItem(
        undefined,
        t("nt_settings_search_inject_related"),
        t("nt_settings_search_inject_related_tip"),
        userSettings.injectRelatedSearch,
        setInjectRelatedSearch,
    )}
    {@render temswithcItem(
        undefined,
        t("nt_settings_record_search_keywords"),
        t("nt_settings_record_search_keywords_tip"),
        userSettings.recordSearchKeywords,
        setRecordSearchKeywords,
    )}
    {@render temswithcItem(
        t("nt_settings_search_scope"),
        t("nt_settings_search_bookmarks"),
        undefined,
        userSettings.searchBookmarks,
        setSearchBookmarks,
    )}
    {@render temswithcItem(
        undefined,
        t("nt_settings_search_history"),
        undefined,
        userSettings.searchHistory,
        setSearchHistory,
    )}

{/snippet}

{#snippet temWebsiteSettingsGroup()}
    {@render temEntranceItem(t("nt_manage_common"), () =>
        openSettingPage("common"),
    )}
    {@render tembuttonItem(
        t("nt_manage_bookmarks"),
        openBookmarksManager,
        "",
        true,
    )}
    {@render tembuttonItem(
        t("nt_manage_history"),
        openHistoryManager,
        "",
        true,
    )}
    <div class="select_item default_open_selects">
        <G vertical full>
            <T type="s" color="var(--c-text-1)">{t("nt_settings_default_open")}</T>
        </G>
        <Select options={openPosOptions} onChange={setOpenPos} />
        {#if userSettings.defaultOpen === "bookmark"}
            <Select
                options={bookmarkFolderOptions}
                onChange={setDefaultBookmarkFolder}
                disabled={!bookmarkFolderChoices.length}
            />
        {/if}
    </div>
    {@render temswithcItem(
        t("nt_settings_link_open_title"),
        t("nt_settings_new_tab_open"),
        t("nt_settings_new_tab_tip"),
        effectiveNewTabOpenSwitch,
        onswitchNewTabOpen,
        lockNewTabOpenSwitch,
    )}
{/snippet}

{#snippet temOtherSettingsGroup()}
    {@render temEntranceItem(t("nt_settings_data_sync_title"), () =>
        openSettingPage("dataSync"),
    )}
    <SettingsThemePicker value={userSettings.theme} onChange={setTheme} />
    {@render temEntranceItem(t("nt_settings_background_title"), () =>
        openSettingPage("background"),
    )}
    {@render temselectItem(
        t("nt_settings_language"),
        languageOptions,
        setLanguage,
    )}
    {@render tembuttonItem(
        t("nt_settings_about"),
        onclickAbout,
        t("nt_settings_other_title"),
    )}
    {@render tembuttonItem(t("nt_about_support_button"), onclickSupport)}
{/snippet}

{#snippet temCollapsibleSection(
    title: string,
    iconName: IconName,
    expanded: boolean,
    onToggle: () => void,
    content: any,
)}
    <div class="collapsible_section">
     <G full >
        <Button full onclick={onToggle}>
                <G full align="c">
                    <Icon
                        name={iconName}
                        color="var(--c-text)"
                        size={16}
                        opacity={0.6}
                    />
                    <T type="m" color="var(--c-text-1)">{title}</T>
                </G>
                <G>
                    <Icon
                        name={expanded ? "ChevronUp" : "ChevronDown"}
                        color="var(--c-text)"
                        opacity={0.4}
                    />
                </G>
        </Button>
     </G>
        {#if expanded}
            <div
                class="collapsible_content"
                transition:slide={{ duration: 200 }}
            >
                {@render content()}
            </div>
        {/if}
    </div>
{/snippet}


{#snippet temEntranceItem(text: string, onChange: () => void, title?: string)}
    <div class="select_item">
        {#if title}
            <G>
                <T type="s" color="var(--c-text-1)">{title}</T>
            </G>
        {/if}
        <Button full align="c" onclick={onChange} fill r="r1">
            <G full align="c">
                <G vertical full>
                    <T>{text}</T>
                </G>
                <G>
                    <Icon
                        name="ChevronRight"
                        color="var(--c-text)"
                        opacity={0.6}
                    />
                </G>
            </G>
        </Button>
    </div>
{/snippet}


{#snippet tembuttonItem(
    text: string,
    onChange: () => void,
    title?: string,
    externalLink?: boolean,
)}
    <div class="select_item">
        {#if title}
            <G>
                <T type="s" color="var(--c-text-1)">{title}</T>
            </G>
        {/if}
        <Button onclick={onChange} full align="c" fill r="r1">
            <G full align="c">
                <G vertical full>
                    <T>{text}</T>
                </G>
                <G>
                    <Icon
                        name="ArrowUpRight"
                        color="var(--c-text)"
                        opacity={externalLink ? 0.6 : 0}
                    />
                </G>
            </G>
        </Button>
    </div>
{/snippet}

{#snippet temswithcItem(
    title: string | undefined,
    swcText: string,
    des: string | undefined,
    turnOn: boolean,
    onChange: (value: boolean) => void,
    switchDisabled: boolean = false,
)}
    <div class="select_item">
        {#if title}
            <G>
                <T type="s" color="var(--c-text-1)">{title}</T>
            </G>
        {/if}
        <Button onclick={() => onChange(!turnOn)} full fill align="c" r="r1">
            <G full align="c">
                <G vertical full>
                    <T>{swcText}</T>
                </G>
                <G>
                    <Switch {turnOn} disabled={switchDisabled} />
                </G>
            </G>
        </Button>
        {#if des}
            <G>
                <T type="s">{des}</T>
            </G>
        {/if}
    </div>
{/snippet}

{#snippet temselectItem(
    title: string,
    options: SelectOption[],
    onChange: (value: string) => void,
)}
    <div class="select_item">
        <G vertical full>
            <T type="s" color="var(--c-text-1)">{title}</T>
        </G>
        <Select {options} {onChange} />
    </div>
{/snippet}

<style>
    .select_item {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
        /* gap: var(--gap); */
    }
    .default_open_selects {
        gap: var(--gap);
    }
    .collapsible_section {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
    }
    .collapsible_content {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
    }
    .setting_con {
        width: 300px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .setting_body {
        display: grid;
        width: 300px;
        overflow: hidden;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }
    .setting_page {
        grid-area: 1 / 1;
        width: 100%;
        will-change: transform, opacity;
    }
    .app_box {
        --c-background-surface: var(--c-background-surface-light);
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        background: radial-gradient(
            circle at bottom,
            var(--c-main-3) 0%,
            var(--c-bg) 50%
        );
        isolation: isolate;
    }
    @media (prefers-color-scheme: dark) {
        .app_box {
            --c-background-surface: var(--c-background-surface-dark);
        }
    }
    .app_box.background_active {
        background: none;
    }
    .radius {
        border-radius: var(--r1);
    }
    .shrink {
        padding: var(--gap);
    }
    .left {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        align-items: center;
        transition: padding 0.3s ease-out;
    }
    .setting {
        display: flex;
        flex-direction: column;
        padding: var(--gap) var(--gap) var(--gap) 0;
        height: 100%;
        box-sizing: border-box;
    }
    .batch_toolbar {
        display: flex;
        align-items: center;
        width: 300px;
        box-sizing: border-box;
        padding: var(--gap);
        gap: var(--gap);
        background-color: var(--c-bg1);
        border-radius: var(--r);
        box-shadow: var(--shadow);
        z-index: 5;
    }
    .select_all {
        display: flex;
        align-items: center;
        gap: var(--gap);
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
    }
    .select_all_disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .move_action {
        position: relative;
        width: 100%;
        box-sizing: border-box;
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }
    .move_menu {
        position: absolute;
        bottom: calc(100% + var(--gap) * 2);
        display: flex;
        flex-direction: column;
        min-width: 148px;
        max-width: 220px;
        max-height: 300px;
        padding: var(--gap);
        box-sizing: border-box;
        background-color: var(--c-bg1);
        border-radius: var(--r);
        box-shadow: var(--shadow);
        z-index: 6;
    }
    .scrool {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: var(--gap);
    }
    .move_option {
        display: flex;
        width: 100%;
        border: none;
        border-radius: var(--r);
        padding: var(--gap);
        background: none;
        cursor: pointer;
    }
    .move_option:active {
        background-color: var(--c-mask);
    }
    .layout {
        display: flex;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
    }
    .header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        flex-wrap: nowrap;
        padding: var(--gap);
        position: relative;
        width: 290px;
    }
    .title_center {
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
    }
</style>
