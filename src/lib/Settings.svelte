<script lang="ts">
    import { onMount } from "svelte";
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
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
    import SettingsCommonSitesSection from "@/lib/settings/SettingsCommonSitesSection.svelte";
    import SettingsSearchEnginesSection from "@/lib/settings/SettingsSearchEnginesSection.svelte";
    import type {
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
    import Button from "./components/Button.svelte";
    import BkmkIcon from "./BkmkIcon.svelte";
    import EngineIcon from "./EngineIcon.svelte";
    import { buildDefaultEngineCategories } from "@/lib/config/engineCategories";
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
    type OpenSearchEnginesRequest = { id: number; categoryId?: string | null };
    interface Props {
        children: any;
        showSetting: boolean;
        userSettings: UserSettings;
        onchangeUserSettings: (userSettings: UserSettings) => void;
        onclickAbout: () => void;
        onclickSupport: () => void;
        onOpenTab: (tab: OpenTab) => void | Promise<void>;
        currentTabPinned?: boolean;
        openSearchEnginesRequest?: OpenSearchEnginesRequest | null;
    }
    let {
        children,
        showSetting,
        userSettings,
        onchangeUserSettings,
        onclickAbout,
        onclickSupport,
        onOpenTab,
        currentTabPinned = false,
        openSearchEnginesRequest = null,
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

    const themeBase = [
        { label: t("nt_theme_default"), value: "default" },
        { label: t("nt_theme_ocean"), value: "ocean" },
        { label: t("nt_theme_sunset"), value: "sunset" },
        { label: t("nt_theme_purple"), value: "purple" },
        { label: t("nt_theme_yellow"), value: "yellow" },
        { label: t("nt_theme_random"), value: "random", dividerTop: true },
    ] as const;

    let openPosOptions = $derived(
        openPosBase.map((o) => ({
            ...o,
            sel: o.value === userSettings.defaultOpen,
        })),
    );

    let languageOptions = $derived(
        languageBase.map((o) => ({
            ...o,
            sel: o.value === userSettings.language,
        })),
    );

    let themeOptions = $derived(
        themeBase.map((o) => ({
            ...o,
            sel: o.value === userSettings.theme,
        })),
    );

    let effectiveNewTabOpenSwitch = $derived(
        userSettings.newTabOpen || currentTabPinned,
    );
    let lockNewTabOpenSwitch = $derived(currentTabPinned);
    type SettingsPage =
        | "root"
        | "searchScope"
        | "searchEngines"
        | "common"
        | "bookmarks"
        | "history"
        | "other";
    let settingPage = $state<SettingsPage>("root");
    let pageDirection = $state<1 | -1>(1);
    let settingEnabledEngines: Engine[] = $state([]);
    let settingDisabledEngines: Engine[] = $state([]);
    let settingEngineCategories: EngineCategoryItem[] = $state([]);
    let settingEngineGroups: Record<CategoryId, Engine[]> = $state({});
    let settingEnginesLoading = $state(false);
    let settingEnginesLoaded = $state(false);
    let settingEnginesSaving = $state(false);
    let expandedCategoryIds = $state<Set<string>>(new Set());
    let pendingExpandCategoryId = $state<string | null>(null);
    let lastOpenSearchEnginesRequestId = $state(0);
    let showCategoryManager = $state(false);
    let showSearchEngineEditor = $state(false);
    let editingSearchEngine: Engine | null = $state(null);
    let commonSites: WebSite[] = $state([]);
    let commonSitesLoading = $state(false);
    let commonSitesRequestId = $state(0);
    let commonSitesDragging = $state(false);
    let showCommonEditor = $state(false);
    let editingCommonSite: WebSite | null = $state(null);
    let persistEngineLayoutTimer: ReturnType<typeof setTimeout> | null =
        $state(null);

    function openSettingPage(page: Exclude<SettingsPage, "root">) {
        pageDirection = 1;
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
        settingPage = "root";
    }

    function getSettingPageTitle() {
        if (settingPage === "searchScope") return t("nt_settings_search_scope");
        if (settingPage === "searchEngines") {
            return t("nt_settings_search_engines_title");
        }
        if (settingPage === "common") return t("nt_tab_common");
        if (settingPage === "bookmarks") return t("nt_tab_bookmarks");
        if (settingPage === "history") return t("nt_tab_history");
        if (settingPage === "other") return t("nt_settings_other_title");
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

    function setOpenPos(value: string) {
        onchangeUserSettings({
            ...userSettings,
            defaultOpen: value as UserSettings["defaultOpen"],
        });
    }

    function setLanguage(value: string) {
        onchangeUserSettings({
            ...userSettings,
            language: value as UserSettings["language"],
        });
    }

    function setTheme(value: string) {
        onchangeUserSettings({
            ...userSettings,
            theme: value as UserSettings["theme"],
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

    function onswitchNewTabOpen(swith: boolean) {
        if (lockNewTabOpenSwitch) return;
        setNewTabOpen(swith);
    }

    function openFeatureTab(tab: OpenTab) {
        void onOpenTab(tab);
    }

    function openBookmarksManager() {
        if (!confirm(t("nt_manage_bookmarks_confirm"))) return;
        browser.tabs.update({ url: "chrome://bookmarks/" });
    }
    function openHistoryManager() {
        if (!confirm(t("nt_manage_history_confirm"))) return;
        browser.tabs.update({ url: "chrome://history/" });
    }

    async function loadCommonSites() {
        commonSitesRequestId += 1;
        const requestId = commonSitesRequestId;
        commonSitesLoading = true;
        try {
            const items = await fetchCommonSites();
            if (requestId !== commonSitesRequestId) return;
            commonSites = items;
            commonSitesDragging = false;
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
        if (!editingCommonSite?.id) return;
        await deleteCommonSiteEntry(editingCommonSite.id);
        await loadCommonSites();
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
        return buildSearchEngineGroupsState(settingEngineCategories, allEngines);
    }

    function syncSearchSettingEnginesFromGroups(
        groups: Record<CategoryId, Engine[]> = settingEngineGroups,
    ) {
        const nextState = splitSearchEnginesByEnabled(settingEngineCategories, groups);
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
        settingEnginesLoading = true;
        try {
            const nextState = await loadSearchEngineSettings();
            settingEngineCategories = nextState.categories;
            settingEnabledEngines = nextState.enabledEngines;
            settingDisabledEngines = nextState.disabledEngines;
            settingEngineGroups = nextState.groups;
            applyPendingCategoryExpansion();
            if (expandedCategoryIds.size === 0 && nextState.categories[0]?.id) {
                expandedCategoryIds = new Set([nextState.categories[0].id]);
            }
            settingEnginesLoaded = true;
        } finally {
            settingEnginesLoading = false;
        }
    }

    function toggleCategoryExpanded(categoryId: string) {
        expandedCategoryIds = new Set(expandedCategoryIds);
        if (expandedCategoryIds.has(categoryId)) {
            expandedCategoryIds.delete(categoryId);
        } else {
            expandedCategoryIds.add(categoryId);
        }
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
        const msg = `${t("nt_delete")}「${category.name}」？\n${t("nt_settings_search_delete_category_confirm", String(engineCount))}`;
        if (!confirm(msg)) return;
        settingEnginesSaving = true;
        try {
            await deleteEngineCategory(id);
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
                flattenSearchEngineGroups(settingEngineCategories, settingEngineGroups),
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
        if (!editingSearchEngine) return;
        await removeSearchEngine(editingSearchEngine);
    }


    async function resetSearchEnginesToDefaultConfirm() {
        if (settingEnginesSaving) return;
        const msg = t("nt_settings_search_reset_confirm");
        if (!confirm(msg)) return;
        settingEnginesSaving = true;
        try {
            const defaultCategories = buildDefaultEngineCategories();
            const defaultEngines = buildDefaultEngines(userSettings.language);
            await resetSearchEnginesToDefault(
                defaultCategories,
                defaultEngines,
            );
            await loadSearchSettingEngines(true);
            notifyEngineConfigUpdated();
        } finally {
            settingEnginesSaving = false;
        }
    }

    async function resetCommonSitesToDefaultConfirm() {
        if (commonSitesLoading) return;
        const msg = getResetCommonSitesConfirmMessage();
        if (!confirm(msg)) return;
        commonSitesLoading = true;
        try {
            await resetCommonSitesToDefaultByLanguage(userSettings.language);
            await loadCommonSites();
        } finally {
            commonSitesLoading = false;
        }
    }

    $effect(() => {
        if (!showSetting && settingPage !== "root") {
            settingPage = "root";
        }
    });

    onMount(() => {
        window.addEventListener(
            "engine-config-updated",
            handleEngineConfigUpdated,
        );
        window.addEventListener("websites-updated", handleWebSitesUpdated);
        return () => {
            window.removeEventListener(
                "engine-config-updated",
                handleEngineConfigUpdated,
            );
            window.removeEventListener(
                "websites-updated",
                handleWebSitesUpdated,
            );
        };
    });

    $effect(() => {
        if (!showSetting) return;
        if (!openSearchEnginesRequest) return;
        if (openSearchEnginesRequest.id === lastOpenSearchEnginesRequestId)
            return;
        lastOpenSearchEnginesRequestId = openSearchEnginesRequest.id;
        pendingExpandCategoryId = openSearchEnginesRequest.categoryId ?? null;
        openSettingPage("searchEngines");
    });

    $effect(() => {
        if (showSetting && settingPage === "searchEngines") return;
        closeCategoryManager();
        closeSearchEngineEditor();
    });

    $effect(() => {
        if (showSetting && settingPage === "common") return;
        closeCommonEditor();
    });

    $effect(() => {
        if (!showSetting) return;
        if (settingPage !== "searchEngines") return;
        if (settingEnginesLoaded || settingEnginesLoading) return;
        void loadSearchSettingEngines();
    });
</script>

<div class="layout">
    <div class="left" class:shrink={showSetting}>
        <div class="app_box" class:radius={showSetting}>
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
                        {:else if settingPage === "searchScope"}
                            {@render temSettingSearchScope()}
                        {:else if settingPage === "searchEngines"}
                            <SettingsSearchEnginesSection
                                settingEnginesLoading={settingEnginesLoading}
                                settingEnginesLoaded={settingEnginesLoaded}
                                settingEnginesSaving={settingEnginesSaving}
                                expandedCategoryIds={expandedCategoryIds}
                                groups={getGroupedSearchEngines()}
                                onOpenCategoryManager={openCategoryManager}
                                onToggleCategoryExpanded={toggleCategoryExpanded}
                                onConsiderGroup={handleSearchEngineGroupConsider}
                                onFinalizeGroup={handleSearchEngineGroupFinalize}
                                onEditEngine={openEditSearchEngineEditor}
                                onAddEngineToCategory={openAddSearchEngineEditorForCategory}
                            />
                        {:else if settingPage === "common"}
                            <SettingsCommonSitesSection
                                {commonSites}
                                {commonSitesLoading}
                                {commonSitesDragging}
                                onConsider={handleCommonSitesConsider}
                                onFinalize={handleCommonSitesFinalize}
                                onAdd={openAddCommonSiteEditor}
                                onEdit={openEditCommonSiteEditor}
                            />
                        {:else if settingPage === "bookmarks"}
                            {@render temSettingBookmarks()}
                        {:else if settingPage === "history"}
                            {@render temSettingHistory()}
                        {:else}
                            {@render temSettingOther()}
                        {/if}
                    </div>
                {/key}
            </div>
        </div>
    {/if}
</div>

{#if showCategoryManager}
    <ManageEngineCategories
        categories={settingEngineCategories}
        saving={settingEnginesSaving}
        lockedIds={[FALLBACK_ENGINE_CATEGORY_ID]}
        onAdd={async (name) => {
            await addSearchCategory(name);
        }}
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
    <G full>
        <T type="m" align="c">{getSettingPageTitle()}</T>
    </G>
    <Button
        onclick={settingPage === "searchEngines"
            ? resetSearchEnginesToDefaultConfirm
            : settingPage === "common"
              ? resetCommonSitesToDefaultConfirm
              : undefined}
        skipTabFocus={!(
            settingPage === "searchEngines" || settingPage === "common"
        )}
    >
        <G>
            <Icon
                name="RotateCcw"
                color="var(--c-text)"
                opacity={settingPage === "searchEngines" ||
                settingPage === "common"
                    ? 0.6
                    : 0}
            />
        </G>
    </Button>
{/snippet}

{#snippet temSettingRoot()}
    <div class="setting_con">
        {@render temSectionTitle(t("nt_settings_search_title"))}
        {@render temEntranceItem(t("nt_settings_search_scope"), () =>
            openSettingPage("searchScope"),
        )}
        {@render temEntranceItem(t("nt_settings_search_engines_title"), () =>
            openSettingPage("searchEngines"),
        )}

        <Divider />

        {@render temSectionTitle(t("nt_settings_websites_title"))}
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
        {@render temselectItem(
            t("nt_settings_default_open"),
            openPosOptions,
            setOpenPos,
        )}
        {@render temswithcItem(
            t("nt_settings_link_open_title"),
            t("nt_settings_new_tab_open"),
            t("nt_settings_new_tab_tip"),
            effectiveNewTabOpenSwitch,
            onswitchNewTabOpen,
            lockNewTabOpenSwitch,
        )}

        <Divider />
        {@render temselectItem(t("nt_settings_theme"), themeOptions, setTheme)}
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
    </div>
{/snippet}

{#snippet temSettingSearchScope()}
    <div class="setting_con">
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
    </div>
{/snippet}

{#snippet temSectionTitle(text: string)}
    <div class="section_title">
        <T type="s" color="var(--c-text-1)">{text}</T>
    </div>
{/snippet}

{#snippet temSettingBookmarks()}
    <div class="setting_con">
        {@render temEmptyItem()}
    </div>
{/snippet}

{#snippet temSettingHistory()}
    <div class="setting_con">
        {@render temEmptyItem()}
    </div>
{/snippet}

{#snippet temSettingOther()}
    <div class="setting_con">
        {@render tembuttonItem(
            t("nt_settings_about"),
            onclickAbout,
            t("nt_settings_other_title"),
        )}
        {@render tembuttonItem(t("nt_about_support_button"), onclickSupport)}
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

{#snippet temEmptyItem()}
    <div class="select_item">
        <G>
            <T type="s" color="var(--c-text-1)">{t("nt_settings_empty")}</T>
        </G>
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
    .section_title {
        display: flex;
        width: 100%;
        box-sizing: border-box;
        padding: calc(var(--gap) * 1.5) var(--gap) 0;
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
        height: 100%;
        overflow-y: auto;
    }
    .setting_page {
        grid-area: 1 / 1;
        width: 100%;
        will-change: transform, opacity;
    }
    .app_box {
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
    }
</style>
