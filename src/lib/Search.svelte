<script lang="ts">
    import { onMount, tick } from "svelte";
    import { subscribeEngineConfigChanges } from "@/lib/search/engineConfigChanges";
    import { getEngineConfigSnapshot } from "@/lib/DB/configStorage";
    import { slide } from "svelte/transition";
    import { flip } from "svelte/animate";
    import { dragHandle, dragHandleZone, SOURCES, TRIGGERS } from "svelte-dnd-action";
    import type { DndEvent } from "svelte-dnd-action";
    import type {
        Engine,
        EngineCategoryItem,
    } from "@/lib/DB/DB";
    import {
        FALLBACK_ENGINE_CATEGORY_ID,
        addEngine,
        setEngineEnabled,
        reorderEngineCategory,
    } from "@/lib/DB/DB";
    import { searchBookmarks } from "@/lib/browser/bookmarks";
    import type { HistoryItem } from "@/lib/browser/history";
    import Button from "./components/Button.svelte";
    import Popup from "./components/Popup.svelte";
    import Switch from "./components/Switch.svelte";
    import BkmkIcon from "./BkmkIcon.svelte";
    import Icon from "./components/Icon.svelte";
    import T from "./components/T.svelte";
    import G from "./components/G.svelte";
    import { t } from "@/lib/utils/i18n";
    import Tab from "./components/Tab.svelte";
    import type { TabItem } from "./components/Tab.svelte";
    import EngineIcon from "./EngineIcon.svelte";
    import EditSearchEngine from "./EditSearchEngine.svelte";
    import { buildEngineFaviconUrl } from "@/lib/settings/searchEngines";
    import {
        clearPersistedSelectedCategoryId,
        hydrateSearchStorage,
        MAX_SEARCH_KEYS,
        migrateLegacySearchKeys,
        normalizeSearchKey,
        persistSearchKeys,
        persistSelectedCategoryId,
        persistSelectedEngineId,
        readSearchKeys,
        readSelectedCategoryId,
        readSelectedEngineUrl,
        readSelectedEngineId,
    } from "@/lib/search/searchStorage";
    import {
        mapBookmarkResults,
        mapHistoryResults,
        sortResults,
        type SearchItem,
    } from "@/lib/search/searchResults";
    import { buildDefaultEngineCategories } from "@/lib/config/engineCategories";
    import { buildDefaultEngines } from "@/lib/DB/defaultEnginesFactory";

    interface Props {
        newTabOpen?: boolean;
        searchBookmarks?: boolean;
        searchHistory?: boolean;
        recordSearchKeywords?: boolean;
        rememberSearchEngineCategory?: boolean;
        settingsReady?: boolean;
        configReady?: boolean;
        loading?: boolean;
        readOnly?: boolean;
        autoFocusSearch?: boolean;
        onAutoFocusHandled?: () => void;
    }

    let {
        newTabOpen = false,
        searchBookmarks: searchBookmarksEnabled = true,
        searchHistory: searchHistoryEnabled = true,
        recordSearchKeywords = true,
        rememberSearchEngineCategory = false,
        settingsReady = true,
        configReady = true,
        loading = false,
        readOnly = false,
        autoFocusSearch = false,
        onAutoFocusHandled,
    }: Props = $props();

    let engineCategories: EngineCategoryItem[] = $state([]);
    let selectedCategoryId = $state("1");
    let enginesGroup: TabItem[] = $state([]);
    let engines: Engine[] = $state([]);
    let dialogEngines: Engine[] = $state([]);
    let engineSaving = $state(false);
    let engineSaveError = $state(false);
    let engineRefreshPending = false;
    let bookmarksResults: SearchItem[] = $state([]);
    let historyResults: SearchItem[] = $state([]);
    let historyLoading = $state(false);
    let searchKeys: string[] = $state([]);

    let searchEl: HTMLInputElement | undefined = $state();
    let engineEls: HTMLDivElement | undefined = $state();
    let listEls: HTMLDivElement | undefined = $state();
    let searchPanelEl: HTMLDivElement | undefined = $state();
    let inputValue: string = $state("");
    let showEngineDialog = $state(false);
    let showCustomEngineEditor = $state(false);
    let searchSeq = $state(0);
    let historySeq = $state(0);
    let bookmarksDebounceId: ReturnType<typeof setTimeout> | null = null;
    let historyDebounceId: ReturnType<typeof setTimeout> | null = null;
    let bookmarksLoading = $state(false);
    let selectedEngineId = $state<number | undefined>();
    let selectedEngineCategoryId = $state("");
    let searchAreaFocused = $state(false);
    let searchInputFocused = $state(false);
    let searchEngineFocused = $state(false);
    let lastSearchScope = $state<string | null>(null);
    let engineConfigReady = $state(false);
    let syncedRememberedCategory = $state(false);
    let mounted = $state(false);
    let databaseConfigLoaded = $state(false);
    let databaseConfigAttempted = $state(false);
    let fallbackConfigApplied = $state(false);
    let engineConfigRequestId = 0;
    let searchStorageReady = false;
    let engineListDragging = $state(false);
    let autoFocusScheduled = false;
    let searchConfigLoading = $derived(loading || !engineConfigReady);
    let effectiveReadOnly = $derived(readOnly || !databaseConfigLoaded);

    $effect(() => {
        if (
            !autoFocusSearch ||
            autoFocusScheduled ||
            searchConfigLoading ||
            !searchEl
        ) {
            return;
        }
        autoFocusScheduled = true;
        void tick().then(() => {
            requestAnimationFrame(() => {
                window.focus();
                searchEl?.focus({ preventScroll: true });
                const url = new URL(window.location.href);
                url.searchParams.delete("focus");
                window.history.replaceState(window.history.state, "", url);
                onAutoFocusHandled?.();
            });
        });
    });
    let showSearchKeys = $derived(
        recordSearchKeywords &&
            searchAreaFocused &&
            !inputValue.trim() &&
            !bookmarksResults.length &&
            !historyResults.length &&
            !bookmarksLoading &&
            !historyLoading &&
            searchKeys.length > 0,
    );
    let showSearchShortcutTip = $derived(
        searchInputFocused && !!inputValue.trim(),
    );
    let showSwitchShortcutTip = $derived(searchEngineFocused);

    const SEARCH_DEBOUNCE_MS = 200;
    let isComposing = $state(false);
    function getFallbackCategoryId() {
        return engineCategories[0]?.id ?? "1";
    }

    let categoryEngines = $derived(
        engines.filter((engine) => engine.category === selectedCategoryId),
    );
    let displayEnabledEngines = $derived(
        categoryEngines.filter((engine) => engine.enabled !== false),
    );
    let selectedCategory = $derived(
        engineCategories.find((category) => category.id === selectedCategoryId),
    );
    let displayPlaceholderEngineTitle = $derived(
        getSelectedEngine()?.title ?? displayEnabledEngines[0]?.title,
    );

    function syncSelectedEngine() {
        const categoryId = selectedCategoryId || "all";
        if (!displayEnabledEngines.length) {
            selectedEngineId = undefined;
            selectedEngineCategoryId = categoryId;
            return;
        }
        const savedId = readSelectedEngineId(categoryId);
        const savedUrl = readSelectedEngineUrl(categoryId);
        const savedEngine = displayEnabledEngines.find((engine) => engine.id === savedId) ??
            displayEnabledEngines.find((engine) => engine.engineUrl === savedUrl);
        if (selectedEngineCategoryId === categoryId && displayEnabledEngines.some((engine) => engine.id === selectedEngineId)) return;
        selectedEngineCategoryId = categoryId;
        selectedEngineId = savedEngine?.id ?? displayEnabledEngines[0]?.id;
    }

    function openSearchEngineSettings() {
        if (engineSaving || engineListDragging) return;
        if (typeof window === "undefined") return;
        showEngineDialog = false;
        const categoryId = selectedCategoryId || getFallbackCategoryId();
        window.dispatchEvent(
            new CustomEvent("open-settings-search-engines", {
                detail: { categoryId },
            }),
        );
    }

    function syncEnginesGroupTabs() {
        enginesGroup = engineCategories.map((item) => ({
            key: item.id,
            name: item.name,
            sel: item.id === selectedCategoryId,
        }));
    }

    function loadSelectedCategorySearchKeys() {
        if (!searchStorageReady) return;
        searchKeys = readSearchKeys(selectedCategoryId);
    }

    async function migrateAndLoadSearchKeys() {
        if (!searchStorageReady || !engineCategories.length) return;
        await migrateLegacySearchKeys(engineCategories[0].id);
        loadSelectedCategorySearchKeys();
    }

    function applyFallbackEngineConfig() {
        const fallbackCategoryIds = ["1", "2", "3", "6"];
        engineCategories = buildDefaultEngineCategories()
            .filter((item) => fallbackCategoryIds.includes(item.id))
            .map((item, index) => ({ ...item, order: index }));
        const languageEngines = buildDefaultEngines().filter(
            (engine) =>
                engine.enabled !== false &&
                fallbackCategoryIds.includes(engine.category ?? "1"),
        );
        engines = fallbackCategoryIds
            .flatMap((categoryId) =>
                languageEngines
                    .filter((engine) => (engine.category ?? "1") === categoryId)
                    .slice(0, 3),
            )
            .map((engine, index) => ({
                ...engine,
                id: -(index + 1),
                order: index,
            }));
        if (!engineCategories.some((item) => item.id === selectedCategoryId)) {
            selectedCategoryId = engineCategories[0]?.id ?? "1";
        }
        syncEnginesGroupTabs();
        syncSelectedEngine();
    }

    function applyEngineCategories(categories: EngineCategoryItem[]) {
        const visibleCategories = categories.filter(
            (item) => item.id !== FALLBACK_ENGINE_CATEGORY_ID,
        );
        engineCategories = visibleCategories.length ? visibleCategories : categories;
        if (!engineCategories.length) {
            selectedCategoryId = "1";
            enginesGroup = [];
            return;
        }
        if (!engineCategories.some((item) => item.id === selectedCategoryId)) {
            selectedCategoryId = engineCategories[0].id;
        }
        if (settingsReady) {
            if (rememberSearchEngineCategory) {
                persistSelectedCategoryId(selectedCategoryId);
            } else {
                clearPersistedSelectedCategoryId();
            }
        }
        syncEnginesGroupTabs();
    }

    async function refreshEngineConfig() {
        if (engineSaving || engineListDragging) {
            engineRefreshPending = true;
            return;
        }
        const requestId = ++engineConfigRequestId;
        if (!configReady) {
            if (!loading) {
                applyFallbackEngineConfig();
                engineConfigReady = true;
            }
            databaseConfigLoaded = false;
            databaseConfigAttempted = false;
            return;
        }
        try {
            const { categories, engines: loadedEngines } = await getEngineConfigSnapshot();
            if (requestId !== engineConfigRequestId) return;
            engines = loadedEngines;
            applyEngineCategories(categories);
            if (showEngineDialog) dialogEngines = [...categoryEngines];
            syncSelectedEngine();
            void migrateAndLoadSearchKeys();
            databaseConfigLoaded = true;
            engineConfigReady = true;
        } catch (error) {
            if (requestId !== engineConfigRequestId) return;
            console.error(
                "[Mooogor NewTab]",
                "search-config:load-failed",
                error,
            );
            applyFallbackEngineConfig();
            databaseConfigLoaded = false;
            engineConfigReady = true;
        }
    }

    onMount(() => {
        const unsubscribe = subscribeEngineConfigChanges(() => {
            if (!configReady) return;
            void refreshEngineConfig();
        });

        mounted = true;
        inputValue = backPageInitInputValue();
        void hydrateSearchStorage()
            .then(async () => {
                searchStorageReady = true;
                await migrateAndLoadSearchKeys();
            })
            .catch((error) => {
                console.warn(
                    "[Mooogor NewTab]",
                    "search-storage:hydrate-failed",
                    error,
                );
            });

        return () => {
            unsubscribe();
        };
    });

    $effect(() => {
        if (!mounted) return;
        if (loading) {
            engineConfigReady = false;
            databaseConfigLoaded = false;
            databaseConfigAttempted = false;
            fallbackConfigApplied = false;
            return;
        }
        if (!configReady) {
            if (!fallbackConfigApplied) {
                fallbackConfigApplied = true;
                applyFallbackEngineConfig();
            }
            engineConfigReady = true;
            databaseConfigLoaded = false;
            databaseConfigAttempted = false;
            return;
        }
        fallbackConfigApplied = false;
        if (!databaseConfigAttempted) {
            databaseConfigAttempted = true;
            void refreshEngineConfig();
        }
    });

    function clickEngineGroup(tab: TabItem) {
        selectedCategoryId = tab.key;
        if (rememberSearchEngineCategory) {
            persistSelectedCategoryId(selectedCategoryId);
        }
        syncEnginesGroupTabs();
        syncSelectedEngine();
        loadSelectedCategorySearchKeys();
        searchEl?.focus();
    }

    $effect(() => {
        if (!settingsReady) return;
        if (rememberSearchEngineCategory) {
            if (!syncedRememberedCategory) {
                syncedRememberedCategory = true;
                const rememberedCategoryId = readSelectedCategoryId();
                if (
                    rememberedCategoryId &&
                    rememberedCategoryId !== selectedCategoryId
                ) {
                    selectedCategoryId = rememberedCategoryId;
                    syncEnginesGroupTabs();
                    loadSelectedCategorySearchKeys();
                    return;
                }
            }
            if (
                engineCategories.length &&
                !engineCategories.some((item) => item.id === selectedCategoryId)
            ) {
                selectedCategoryId = engineCategories[0].id;
            }
            persistSelectedCategoryId(selectedCategoryId);
            syncEnginesGroupTabs();
            loadSelectedCategorySearchKeys();
            return;
        }
        syncedRememberedCategory = false;
        clearPersistedSelectedCategoryId();
    });

    $effect(() => {
        const scope = `${searchBookmarksEnabled}-${searchHistoryEnabled}`;
        if (lastSearchScope === null) {
            lastSearchScope = scope;
            return;
        }
        if (lastSearchScope === scope) return;
        lastSearchScope = scope;

        const currentInput = searchEl?.value ?? inputValue;
        if (!currentInput) {
            bookmarksResults = [];
            historyResults = [];
            bookmarksLoading = false;
            historyLoading = false;
            return;
        }
        void searchInput(currentInput);
    });

    function backPageInitInputValue(): string {
        if (!searchEl) return "";
        return searchEl.value;
    }

    function requireEngineId(engine: Engine): number {
        if (engine.id === undefined) throw new Error("Search engine id is required");
        return engine.id;
    }

    function refreshAfterEngineInteraction() {
        if (!engineRefreshPending) return;
        engineRefreshPending = false;
        void refreshEngineConfig();
    }

    async function saveEngineChange(write: () => Promise<void>) {
        engineSaving = true;
        engineSaveError = false;
        ++engineConfigRequestId;
        try {
            await write();
            engineRefreshPending = true;
        } catch (error) {
            console.error("[Mooogor NewTab]", "search-engine:save-failed", error);
            engineSaveError = true;
            dialogEngines = [...categoryEngines];
        } finally {
            engineSaving = false;
            refreshAfterEngineInteraction();
        }
    }

    function handleConsiderEngineList(e: CustomEvent<DndEvent<Engine>>) {
        dialogEngines = e.detail.items;
        if (e.detail.info.trigger === TRIGGERS.DRAG_STARTED) {
            ++engineConfigRequestId;
            engineRefreshPending = true;
            engineListDragging = true;
        }
        if (e.detail.info.trigger === TRIGGERS.DRAG_STOPPED) {
            void commitEngineOrder();
        }
    }

    function handleFinalizeEngineList(e: CustomEvent<DndEvent<Engine>>) {
        dialogEngines = e.detail.items;
        // Keyboard sorting emits finalize on each move; commit when dragging stops.
        if (e.detail.info.source === SOURCES.POINTER) void commitEngineOrder();
    }

    async function commitEngineOrder() {
        engineListDragging = false;
        if (effectiveReadOnly || engineSaving) {
            dialogEngines = [...categoryEngines];
            refreshAfterEngineInteraction();
            return;
        }
        if (dialogEngines.every((engine, index) => engine.id === categoryEngines[index]?.id) &&
            dialogEngines.length === categoryEngines.length) {
            refreshAfterEngineInteraction();
            return;
        }
        const category = selectedCategoryId;
        const ordered = dialogEngines.map((engine, order) => ({ ...engine, order }));
        await saveEngineChange(
            () => reorderEngineCategory(category, ordered.map(requireEngineId)),
        );
    }

    async function searchInput(value: string) {
        if (isComposing) return;
        if (!value) {
            searchSeq += 1;
            historySeq += 1;
            if (bookmarksDebounceId) {
                clearTimeout(bookmarksDebounceId);
                bookmarksDebounceId = null;
            }
            if (historyDebounceId) {
                clearTimeout(historyDebounceId);
                historyDebounceId = null;
            }
            bookmarksResults = [];
            historyResults = [];
            bookmarksLoading = false;
            historyLoading = false;
            listEls?.scrollTo({ top: 0 });
            return;
        }
        const seq = ++searchSeq;
        const hSeq = ++historySeq;
        listEls?.scrollTo({ top: 0 });
        if (bookmarksDebounceId) {
            clearTimeout(bookmarksDebounceId);
            bookmarksDebounceId = null;
        }
        if (searchBookmarksEnabled) {
            bookmarksLoading = true;
            const bookmarkQuery = value;
            bookmarksDebounceId = setTimeout(async () => {
                if (seq !== searchSeq) return;
                try {
                    const results = await searchBookmarks(bookmarkQuery, 200);
                    if (seq !== searchSeq) return;
                    bookmarksResults = sortResults(
                        mapBookmarkResults(results, t("nt_unnamed")),
                        bookmarkQuery,
                    );
                } catch {
                    if (seq !== searchSeq) return;
                    bookmarksResults = [];
                } finally {
                    if (seq === searchSeq) bookmarksLoading = false;
                }
            }, SEARCH_DEBOUNCE_MS);
        } else {
            bookmarksResults = [];
            bookmarksLoading = false;
        }

        if (historyDebounceId) {
            clearTimeout(historyDebounceId);
            historyDebounceId = null;
        }
        if (searchHistoryEnabled) {
            historyLoading = true;
            const query = value;
            historyDebounceId = setTimeout(async () => {
                if (hSeq !== historySeq) return;
                try {
                    const results = (await browser.runtime.sendMessage({
                        type: "searchHistory",
                        payload: { query },
                    })) as HistoryItem[];
                    if (hSeq !== historySeq) return;
                    historyResults = sortResults(
                        mapHistoryResults(results, t("nt_unnamed")),
                        query,
                    );
                } catch {
                    if (hSeq !== historySeq) return;
                    historyResults = [];
                } finally {
                    if (hSeq === historySeq) historyLoading = false;
                }
            }, SEARCH_DEBOUNCE_MS);
        } else {
            historyResults = [];
            historyLoading = false;
        }
    }

    function saveSearchKey(value: string) {
        if (!recordSearchKeywords) return;
        const next = normalizeSearchKey(value);
        if (!next) return;
        searchKeys = [
            next,
            ...searchKeys.filter((item) => item !== next),
        ].slice(0, MAX_SEARCH_KEYS);
        persistSearchKeys(selectedCategoryId, searchKeys);
    }

    function clearSearchKeys() {
        searchKeys = [];
        persistSearchKeys(selectedCategoryId, []);
    }

    function fillSearchKey(value: string) {
        inputValue = value;
        searchEl?.focus();
        void searchInput(value);
    }

    function submitSearch() {
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) return;
        saveSearchKey(keyword);
    }

    function getSelectedEngine() {
        return (
            displayEnabledEngines.find(
                (engine) => engine.id === selectedEngineId,
            ) ?? displayEnabledEngines[0]
        );
    }

    function selectEngine(engine: Engine) {
        const categoryId = selectedCategoryId || "all";
        selectedEngineId = engine.id;
        selectedEngineCategoryId = categoryId;
        if (engine.id !== undefined) persistSelectedEngineId(engine.id, categoryId, engine.engineUrl);
    }

    function getEngineLink(engineId: number | undefined) {
        if (!engineEls) return null;
        return engineEls.querySelector<HTMLAnchorElement>(
            `.engine[data-engine-id="${engineId}"]`,
        );
    }

    function getSelectedEngineLink() {
        return selectedEngineId ? getEngineLink(selectedEngineId) : null;
    }

    function getEngineSearchUrl(engine: Engine) {
        return engine.engineUrl.replace(
            "%s",
            encodeURIComponent(normalizeSearchKey(inputValue)),
        );
    }

    function openEngineSearch(engine: Engine) {
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) {
            searchEl?.focus();
            return;
        }
        selectEngine(engine);
        saveSearchKey(keyword);
        const url = getEngineSearchUrl(engine);
        if (newTabOpen) {
            window.open(url, "_blank", "noreferrer");
            return;
        }
        window.location.href = url;
    }

    function handleEngineClick(event: MouseEvent, engine: Engine) {
        selectEngine(engine);
        const keyword = normalizeSearchKey(inputValue);
        if (!keyword) {
            event.preventDefault();
            searchEl?.focus();
            return;
        }
        submitSearch();
    }

    function inputKey(e: KeyboardEvent) {
        const key = e.key;
        if (isComposing || e.isComposing) return;
        if (key === "ArrowUp") {
            return;
        }
        if (key === "ArrowDown") {
            if (!bookmarksResults.length && !historyResults.length) return;
            e.preventDefault();
            e.stopPropagation();
            const [first] = getResultEls();
            if (first) {
                first.focus();
                first.scrollIntoView({ block: "nearest" });
            }
            return;
        }
        if (key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const engine = getSelectedEngine();
            if (!engine) return;
            if (!e.shiftKey) {
                openEngineSearch(engine);
                return;
            }
            getSelectedEngineLink()?.focus();
        }
    }

    function handleEngineKeydown(e: KeyboardEvent, engine: Engine) {
        if (e.key === "Enter") {
            e.stopPropagation();
            return;
        }
        if (e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openEngineSearch(engine);
            return;
        }
        if (e.key === "Backspace") {
            e.preventDefault();
            e.stopPropagation();
            searchEl?.focus();
            return;
        }
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

        e.preventDefault();
        e.stopPropagation();
        const index = displayEnabledEngines.findIndex(
            (item) => item.id === engine.id,
        );
        const nextIndex =
            e.key === "ArrowLeft"
                ? (index - 1 + displayEnabledEngines.length) %
                  displayEnabledEngines.length
                : (index + 1) % displayEnabledEngines.length;
        const nextEngine = displayEnabledEngines[nextIndex];
        if (!nextEngine) return;
        selectEngine(nextEngine);
        getEngineLink(nextEngine.id)?.focus();
    }

    async function toggleEngine(engine: Engine) {
        if (effectiveReadOnly || engineSaving || engineListDragging) return;
        const enabled = engine.enabled === false;
        await saveEngineChange(
            () => setEngineEnabled(requireEngineId(engine), enabled),
        );
    }

    function handleResultKeydown(e: KeyboardEvent) {
        const items = getResultEls();
        const current = e.currentTarget as HTMLElement;
        const index = items.indexOf(current);
        if (index === -1) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = items[index + 1];
            if (next) {
                next.focus();
                next.scrollIntoView({ block: "nearest" });
            }
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = items[index - 1];
            if (prev) {
                prev.focus();
                prev.scrollIntoView({ block: "nearest" });
            } else {
                searchEl?.focus();
            }
        }
    }

    function openEngineDialog() {
        if (effectiveReadOnly) return;
        dialogEngines = [...categoryEngines];
        engineSaveError = false;
        showEngineDialog = true;
    }

    async function addCustomEngine(payload: {
        title: string;
        engineUrl: string;
        category: string;
        enabled: boolean;
    }) {
        if (effectiveReadOnly || engineSaving) {
            throw new Error("Search engine configuration is not editable");
        }
        engineSaving = true;
        ++engineConfigRequestId;
        try {
            await addEngine({
                ...payload,
                faviconUrl: buildEngineFaviconUrl(payload.engineUrl),
            });
            engineRefreshPending = true;
        } finally {
            engineSaving = false;
            refreshAfterEngineInteraction();
        }
    }

    function getResultEls() {
        if (!listEls) return [] as HTMLElement[];
        return Array.from(
            listEls.querySelectorAll<HTMLElement>("[data-result='true']"),
        );
    }

    function handleInputFocus() {
        searchInputFocused = true;
        searchAreaFocused = true;
    }

    function handleInputBlur(e: FocusEvent) {
        searchInputFocused = false;
        const next = e.relatedTarget as Node | null;
        if (next && searchPanelEl?.contains(next)) return;
        searchAreaFocused = false;
    }

    function handleListFocusOut(e: FocusEvent) {
        const next = e.relatedTarget as Node | null;
        if (next === searchEl) return;
        if (next && searchPanelEl?.contains(next)) return;
        searchAreaFocused = false;
    }
</script>

<div
    class="search"
    class:hided_tab={!searchConfigLoading && enginesGroup.length <= 1}
>
    {#if searchConfigLoading}
        <div
            class="search_skeleton"
            role="status"
            aria-label="Loading search configuration"
        >
            <div class="skeleton_tabs" aria-hidden="true">
                {#each Array.from({ length: 4 }) as _}
                    <div class="skeleton_tab skeleton_shimmer"></div>
                {/each}
            </div>
            <div class="skeleton_search_box" aria-hidden="true">
                <div class="skeleton_input skeleton_shimmer"></div>
                <div class="skeleton_engines">
                    {#each Array.from({ length: 4 }) as _}
                        <div class="skeleton_engine skeleton_shimmer"></div>
                    {/each}
                </div>
            </div>
        </div>
    {:else}
        {#if engineConfigReady && enginesGroup.length > 1}
            <Tab
                tabs={enginesGroup}
                onclick={clickEngineGroup}
                selectedBg={false}
            />
        {/if}
        <div
            class="search_g"
            bind:this={searchPanelEl}
            class:search_g_hidden={!engineConfigReady}
            class:bg={searchAreaFocused &&
                    ((searchBookmarksEnabled &&
                        (bookmarksResults.length || bookmarksLoading)) ||
                        (searchHistoryEnabled &&
                            (historyResults.length || historyLoading)) ||
                        showSearchKeys ||
                        showSearchShortcutTip ||
                        showSwitchShortcutTip)}
            class:top0={enginesGroup.length <= 1}
        >
            {@render temInputGroup()}
            {#if showSearchShortcutTip}
                {@render temShortcutTip(t("nt_related_search_shortcut_search"))}
            {/if}
            {#if showSwitchShortcutTip}
                {@render temShortcutTip(t("nt_related_search_shortcut_switch"))}
            {/if}
            {#if showSearchKeys}
                {@render temSearchKeys()}
            {/if}
            {#if searchAreaFocused && ((searchBookmarksEnabled && (bookmarksResults.length || bookmarksLoading)) || (searchHistoryEnabled && (historyResults.length || historyLoading)))}
                <div
                    class="list"
                    bind:this={listEls}
                    onfocusout={handleListFocusOut}
                    transition:slide={{ duration: 200 }}
                >
                    {#if searchBookmarksEnabled && bookmarksResults.length}
                        <G>
                            <T type="s">{t("nt_label_bookmarks")}</T>
                        </G>
                        {#each bookmarksResults as bookmark}
                            {@render temBkmk(bookmark)}
                        {/each}
                    {/if}

                    {#if searchHistoryEnabled && historyResults.length}
                        <G>
                            <T type="s">{t("nt_label_history")}</T>
                        </G>
                        {#each historyResults as history}
                            {@render temBkmk(history)}
                        {/each}
                    {/if}

                    {#if (searchHistoryEnabled && historyLoading) || (searchBookmarksEnabled && bookmarksLoading)}
                        <div class="more_trigger">
                            <Icon name="Loading" color="var(--c-text)" />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>

{#if showEngineDialog && selectedCategory && !showCustomEngineEditor}
    <Popup
        type="s"
        title={selectedCategory.name}
        onclickClose={() => {
            if (!engineSaving && !engineListDragging) showEngineDialog = false;
        }}
    >
        {@render temEngineDialogContent()}
    </Popup>
{/if}

{#if showCustomEngineEditor}
    <EditSearchEngine
        categoryValue={selectedCategoryId}
        categoryOptions={engineCategories.map((category) => ({
            label: category.name,
            value: category.id,
            sel: false,
        }))}
        saving={engineSaving}
        onSave={addCustomEngine}
        onclickClose={() => {
            if (!engineSaving) showCustomEngineEditor = false;
        }}
    />
{/if}

{#snippet temInputGroup()}
    <div class="input_group_border">
        <div class="input_group">
            <div class="input_box">
                <input
                    name="Search"
                    class="input"
                    bind:this={searchEl}
                    bind:value={inputValue}
                    type="search"
                    placeholder={displayPlaceholderEngineTitle
                        ? t("nt_search_placeholder", displayPlaceholderEngineTitle)
                        : t("nt_search_placeholder_fallback")}
                    oncompositionstart={() => (isComposing = true)}
                    oncompositionend={(e) => {
                        isComposing = false;
                        searchInput((e.currentTarget as HTMLInputElement).value);
                    }}
                    onfocus={handleInputFocus}
                    onblur={handleInputBlur}
                    oninput={() => searchInput(inputValue)}
                    onkeydown={inputKey}
                />
                {#if inputValue.length}
                    <Button
                        onclick={() => {
                            inputValue = "";
                            searchInput("");
                            searchEl?.focus();
                        }}
                    >
                        <G>
                            <Icon
                                name="X"
                                color="var(--c-text)"
                                opacity={0.4}
                                size={16}
                            />
                        </G>
                    </Button>
                {/if}
            </div>
            {@render temEngines()}
        </div>
    </div>
{/snippet}

{#snippet temSearchKeys()}
    <div class="search_keys" transition:slide={{ duration: 200 }}>
        <div class="search_keys_list">
            {#each searchKeys as key (key)}
                <button
                    type="button"
                    class="search_key"
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => fillSearchKey(key)}
                >
                    <T type="s" nowrap>{key}</T>
                </button>
            {/each}
        </div>
        <button
            type="button"
            class="search_keys_clear"
            aria-label={t("nt_clear_search_keywords")}
            title={t("nt_clear_search_keywords")}
            onmousedown={(e) => e.preventDefault()}
            onclick={clearSearchKeys}
        >
            <G>
                <Icon
                    name="BrushCleaning"
                    color="var(--c-text)"
                    opacity={0.6}
                    size={16}
                />
            </G>
        </button>
    </div>
{/snippet}

{#snippet temEngines()}
    <div class="engines_M">
        <div bind:this={engineEls} class="engines">
            {#each displayEnabledEngines as engine (engine.id)}
                <div class="engine_item" animate:flip={{ duration: 200 }}>
                    <a
                        class="engine"
                        class:selected={engine.id === selectedEngineId}
                        data-engine-id={engine.id}
                        href={getEngineSearchUrl(engine)}
                        draggable="false"
                        target={newTabOpen ? "_blank" : "_self"}
                        rel={newTabOpen ? "noreferrer" : undefined}
                        onclick={(event) => handleEngineClick(event, engine)}
                        onfocus={() => {
                            searchEngineFocused = true;
                            selectEngine(engine);
                        }}
                        onblur={() => (searchEngineFocused = false)}
                        onkeydown={(event) =>
                            handleEngineKeydown(event, engine)}
                    >
                        <EngineIcon
                            alt={engine.title ?? ""}
                            engineUrl={engine.engineUrl}
                            src={engine.faviconUrl}
                        />
                    </a>
                </div>
            {/each}
        </div>
        {#if !effectiveReadOnly}
            <Button onclick={openEngineDialog}>
                <G>
                    <Icon
                        name="Plus"
                        color="var(--c-text)"
                        opacity={0.6}
                    />
                </G>
            </Button>
        {/if}
    </div>
{/snippet}

{#snippet temShortcutTip(text: string)}
    <div class="shortcut_tip" transition:slide={{ duration: 200 }}>
        <T type="s" color="var(--c-text-2)">{text}</T>
    </div>
{/snippet}

{#snippet temEngineDialogContent()}
    <G vertical full gap>
        <div
            class="engine_list"
            use:dragHandleZone={{
                items: dialogEngines,
                flipDurationMs: 200,
                type: `category-engines-${selectedCategoryId}`,
                zoneTabIndex: -1,
                zoneItemTabIndex: -1,
                dropTargetStyle: {},
                dragDisabled: effectiveReadOnly || engineSaving,
                dropFromOthersDisabled: true,
            }}
            onconsider={handleConsiderEngineList}
            onfinalize={handleFinalizeEngineList}
        >
            {#each dialogEngines as engine (engine.id)}
                <div class="engine_row" animate:flip={{ duration: 200 }}>
                    <div class="engine_drag_handle" use:dragHandle>
                        <Icon
                            name="GripHorizontal"
                            color="var(--c-text-2)"
                            size={16}
                        />
                    </div>
                    <EngineIcon
                        alt={engine.title ?? ""}
                        engineUrl={engine.engineUrl}
                        src={engine.faviconUrl}
                    />
                    <div class="engine_name">
                        <T nowrap>{engine.title ?? t("nt_unnamed")}</T>
                    </div>
                    <Switch
                        turnOn={engine.enabled !== false}
                        disabled={effectiveReadOnly || engineSaving || engineListDragging}
                        onclick={() => void toggleEngine(engine)}
                        label={t("nt_settings_search_engine_enabled") + ": " + engine.title}
                    />
                </div>
            {/each}
        </div>
        {#if engineSaveError}
            <T type="s" color="var(--c-red)">{t("nt_common_save_failed")}</T>
        {/if}
        <div class="engine_dialog_actions">
            <Button
                fill
                r="r1"
                disabled={effectiveReadOnly || engineSaving || engineListDragging}
                onclick={() => (showCustomEngineEditor = true)}
            >
                <G align="c">
                    <G align="c">
                        <T nowrap>{t("nt_search_engine_custom")}</T>
                    </G>
                </G>
            </Button>
            <Button
                align="c"
                fill
                r="r1"
                disabled={engineSaving || engineListDragging}
                onclick={openSearchEngineSettings}
            >
                <G align="c">
                    <G align="c">
                        <T nowrap>{t("nt_search_engine_manage")}</T>
                        <Icon
                            name="ArrowUpRight"
                            color="var(--c-text)"
                            opacity={0.6}
                        />
                    </G>
                </G>
            </Button>
        </div>
    </G>
{/snippet}

{#snippet temBkmk(bookmark: SearchItem)}
    <a
        class="item"
        href={bookmark.url}
        target={newTabOpen ? "_blank" : "_self"}
        rel={newTabOpen ? "noreferrer" : undefined}
        onkeydown={handleResultKeydown}
        data-result="true"
    >
        <G>
            <BkmkIcon imgUrl={bookmark.url} alt={bookmark.title} size="s" />
        </G>
        <G vertical full>
            <T type="m" bold nowrap>{bookmark.title}</T>
        </G>
    </a>
{/snippet}

<style>
    .search_skeleton {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: var(--gap);
    }
    .skeleton_tabs,
    .skeleton_engines,
    .skeleton_search_box {
        display: flex;
        align-items: center;
        gap: var(--gap);
    }
    .skeleton_tabs {
        justify-content: center;
        height: 36px;
    }
    .skeleton_tab,
    .skeleton_input,
    .skeleton_engine {
        position: relative;
        overflow: hidden;
        background: var(--c-mask);
    }
    .skeleton_tab {
        width: 64px;
        height: 12px;
        border-radius: 999px;
    }
    .skeleton_search_box {
        height: 58px;
        padding: var(--gap);
        border-radius: var(--r2);
        background: var(--c-card);
        box-sizing: border-box;
    }
    .skeleton_input {
        height: 14px;
        flex: 1;
        border-radius: 999px;
    }
    .skeleton_engines {
        flex: 0 0 auto;
    }
    .skeleton_engine {
        width: 28px;
        height: 28px;
        border-radius: 50%;
    }
    .skeleton_shimmer::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
            90deg,
            transparent,
            var(--c-mask1),
            transparent
        );
        animation: skeleton-shimmer 1.25s ease-in-out infinite;
    }
    @keyframes skeleton-shimmer {
        to {
            transform: translateX(100%);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .skeleton_shimmer::after {
            animation: none;
        }
    }
    .search_keys {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: var(--gap);
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
    }
    .shortcut_tip {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--gap);
        width: 100%;
        box-sizing: border-box;
    }
    .search_keys_list {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--gap);
        min-width: 0;
        max-width: 100%;
    }
    .search_key {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        border: none;
        border-radius: 999px;
        background-color: var(--c-mask);
        color: var(--c-text);
        padding: var(--gap) calc(var(--gap) * 2);
    }
    .search_key:focus-visible,
    .search_keys_clear:focus-visible {
        outline: solid 2px var(--c-text);
    }
    .search_key:active,
    .search_keys_clear:active {
        background-color: var(--c-mask1);
    }
    .search_keys_clear {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        background: transparent;
        flex: 0 0 auto;
        border-radius: var(--r);
    }
    .input::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
        display: none;
    }

    .input::-moz-search-clear {
        display: none;
    }
    .search {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 600px;
        max-width: 100%;
        padding: var(--gap);
        position: relative;
        min-height: 120px;
    }
    .hided_tab {
        height: 60px;
    }

    .engines_M {
        display: flex;
        align-items: center;
        flex-direction: row;
        flex: 0 0 auto;
    }
    .engine_list {
        display: flex;
        flex-direction: column;
        gap: var(--gap);
        width: 100%;
        max-height: min(420px, calc(100vh - 220px));
        overflow-y: auto;
        box-sizing: border-box;
        padding: var(--gap);
        border: var(--border);
        border-radius: var(--r1);
    }
    .engine_dialog_actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--gap);
        width: 100%;
    }
    .engine_row {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--gap);
        width: 100%;
        min-height: 44px;
        padding: var(--gap);
        border-radius: var(--r);
        background-color: var(--c-mask);
        box-sizing: border-box;
    }
    .engine_drag_handle {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
    }
    .engine_drag_handle:active {
        cursor: grabbing;
    }
    .engine_name {
        min-width: 0;
        overflow: hidden;
    }
    .search_g {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        width: 100%;
        box-sizing: border-box;
        position: absolute;
        top: 45px;
        left: 0;
        z-index: 10;
        padding: var(--gap);
        border-radius: var(--r2);
        isolation: isolate;
    }
    .search_g::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: inherit;
        background-color: var(--c-bg1);
        opacity: 0;
        transform: scaleY(0);
        transform-origin: top;
        transition:
            opacity 180ms ease,
            transform 180ms ease;
    }
    .search_g_hidden {
        visibility: hidden;
    }
    .top0 {
        top: 0;
    }
    .bg {
        background-color: transparent;
    }
    .bg::before {
        opacity: 1;
        transform: scaleY(1);
    }

    .list {
        display: flex;
        gap: var(--gap);
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
        padding: var(--gap);
        max-height: calc(100vh - 110px);
        overflow-y: auto;
    }
    .more_trigger {
        display: flex;
        justify-content: center;
        padding: var(--gap) 0;
    }

    .input_group_border {
        width: 100%;
        padding: 2px;
        box-sizing: border-box;
        border-radius: var(--r1);
        background: transparent;
    }

    .input_group_border:has(input:focus) {
        background: linear-gradient(0deg, var(--c-main), var(--c-main-1));
    }

    .input_group {
        display: flex;
        flex-direction: row;
        align-items: center;
        border-radius: calc(var(--r1) - 2px);
        padding: var(--gap);
        background-color: var(--c-background-surface, var(--c-bg1));
        background-image: linear-gradient(var(--c-surface), var(--c-surface));
        width: 100%;
        box-sizing: border-box;
        justify-content: flex-end;
        gap: var(--gap);
    }

    @supports (corner-shape: squircle) {
        .input_group {
            border-radius: 100px;
            corner-shape: squircle;
        }
    }
    .input_box {
        display: flex;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
    }
    .input {
        color: var(--c-text);
        font-size: var(--f-size-m);
        background-color: unset;
        border: none;
        padding: var(--gap) calc(var(--gap) + var(--gap));
        width: 100%;
        min-width: 0;
        flex: 1 1 auto;
        height: 40px;
        caret-color: var(--c-main);
    }
    .input::selection {
        background-color: var(--c-main);
        color: var(--c-bg);
    }
    .input::placeholder {
        color: var(--c-text-2);
    }
    .input:focus {
        outline: none;
    }

    .engines {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: var(--gap);
        padding: var(--gap);
        border-radius: var(--r);
        min-height: 40px;
        min-width: max-content;
        width: max-content;
        box-sizing: border-box;
        position: relative;
        flex-wrap: nowrap;
    }
    .engine_item {
        display: flex;
        flex: 0 0 auto;
    }
    .engine_item:focus {
        outline: none;
    }
    .engine {
        display: flex;
        border-radius: calc(var(--r) / 2 + 2px);
        overflow: hidden;
        cursor: default !important;
        min-width: 30px;
        flex: 0 0 auto;
    }
    .engine.selected {
        outline: 2px var(--c-text-2) solid;
    }
    .item {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
        text-decoration: none;
        gap: var(--gap);
        padding: var(--gap);
        border-radius: var(--r);
        cursor: default;
    }
    .engine:active,
    .item:active {
        background-color: var(--c-mask);
    }
    .engine:focus {
        outline: 2px var(--c-main) solid;
    }
    .item:focus {
        outline: 2px var(--c-text) solid;
    }
    a {
        text-decoration: none;
    }
</style>
